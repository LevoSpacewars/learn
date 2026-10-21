/**
 * phone-work — the learn web surface: lesson viewer + answer pad, for
 * phone, iPad and laptop (any device on the tailnet, plus this Mac).
 *
 * A tiny HTTP server serves a mobile page that mirrors whatever prompt the
 * tutor is waiting on (a `recall` question), an answer box, a camera button
 * for paper work, and a microphone
 * button whose audio is transcribed locally with whisper.cpp. Whichever
 * surface answers first (terminal or phone) wins; the other dismisses.
 *
 * When no prompt is open, the page falls back to the original behaviour:
 * send a photo (plus a note) into the session as a user message.
 *
 * Binds ONLY to this Mac's Tailscale address (100.64.0.0/10); every request
 * must carry the secret token persisted in <cwd>/.learn/phone-token.
 * Photos and audio are saved under <cwd>/work/ (inside the Obsidian vault).
 *
 * Commands:
 *   /phone       — show the pad link + QR code (starts the server if needed)
 *   /phone hide  — hide the QR code
 *   alt+q        — toggle the QR code at any time (also mid-lesson)
 *   GET /qr.svg  — the same QR as an image, for the "Phone" button on the laptop page
 *   The start menu's "Connect my phone" item does the same through
 *   globalThis.__learnPhone.show / hide (each extension is its own module).
 *   /ask <q>     — side chat from the terminal (/ask hide to dismiss the answer)
 *
 * Side chat (review/sidechat.ts): GET /chat returns the current thread and the
 * lesson list; POST /chat {text, lesson?, thread?} asks and waits for the
 * reply; POST /chat {new: true} starts a fresh thread.
 *
 * Notebook (review/notebook.ts): GET /notebook lists his notes, tags and
 * lessons; POST /note {text, title?, lesson?, tags?, images?} saves one and
 * tags it in the background; POST /note/update {id, …}, /note/retag {id},
 * /note/delete {id}.
 *
 * Env: PI_PHONE_PORT (default 8787), PI_PHONE_BIND (override bind address),
 *      PI_WHISPER_MODEL (default ~/.cache/whisper/ggml-medium.en.bin),
 *      PI_WHISPER_BIN (default whisper-cli).
 *
 * Not loaded into subagents.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFile } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import qrcode from "qrcode-terminal";
import { answerPending, getLastResult, getPending } from "../review/prompts.ts";
import { askSide, chatLessons, currentThread, loadChat, newThreadId } from "../review/sidechat.ts";
import { plainMath } from "../review/plainmath.ts";
import { buildGraph, loadLearner } from "../review/store.ts";
import { bookList } from "../review/book.ts";
import { addNote, deleteNote, notebookView, noteTitle, tagNote, updateNote } from "../review/notebook.ts";

const PORT = Number(process.env.PI_PHONE_PORT) || 8787;
const MAX_BODY = 60 * 1024 * 1024;
const MAX_IMAGES = 8;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AUDIO_EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-m4a": "m4a", "audio/aac": "aac" };
const WHISPER_MODEL = process.env.PI_WHISPER_MODEL || path.join(os.homedir(), ".cache", "whisper", "ggml-medium.en.bin");
const WHISPER_BIN = process.env.PI_WHISPER_BIN || "whisper-cli";

const PAGE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "page.html");
function pageHtml(): string {
	try {
		// Inline the scratchpad engine so the page is one request and never depends on a separate route.
		const page = fs.readFileSync(PAGE_FILE, "utf8");
		let engine = "";
		try {
			engine = fs.readFileSync(path.join(path.dirname(PAGE_FILE), "scratch.js"), "utf8");
		} catch {
			// marker stays; the page shows a notice
		}
		return engine ? page.replace("<!--SCRATCH-->", `<script>\n${engine.replace(/<\/script/gi, "<\\/script")}\n</script>`) : page;
	} catch (e: any) {
		return `<!doctype html><meta charset="utf-8"><p>page.html missing next to phone-work/index.ts (${String(e?.message ?? e)})</p>`;
	}
}

/** Files the viewer may fetch: images and audio under these vault folders only. */
const SERVABLE_DIRS = ["work", "viz", "inbox", "knowledge", "lessons"];
const SERVE_MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".m4a": "audio/mp4", ".webm": "audio/webm", ".mp3": "audio/mpeg" };

function serveVaultFile(cwd: string, rel: string, res: http.ServerResponse) {
	const clean = rel.replace(/^\/+/, "");
	const abs = path.resolve(cwd, clean);
	const top = clean.split("/")[0];
	if (!SERVABLE_DIRS.includes(top) || !abs.startsWith(path.resolve(cwd) + path.sep) || abs.includes("..")) return send(res, 403, "text/plain", "Forbidden");
	if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return send(res, 404, "text/plain", "Not found");
	const type = SERVE_MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream";
	res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
	fs.createReadStream(abs).pipe(res);
}

/** Resolve an Obsidian embed name (work-….jpg) to a vault-relative path. */
function findEmbed(cwd: string, name: string): string | undefined {
	// A vault-relative path (viz/sub/plot.svg, from lesson_read) is used as is.
	if (SERVABLE_DIRS.includes(name.split("/")[0]) && !name.includes("..") && fs.existsSync(path.join(cwd, name))) return name;
	for (const d of SERVABLE_DIRS) {
		const p = path.join(cwd, d, name);
		if (fs.existsSync(p)) return `${d}/${name}`;
	}
	return undefined;
}

function tailscaleIPv4(): string | undefined {
	for (const addrs of Object.values(os.networkInterfaces())) {
		for (const a of addrs ?? []) {
			if (a.family !== "IPv4" || a.internal) continue;
			const [o1, o2] = a.address.split(".").map(Number);
			if (o1 === 100 && o2 >= 64 && o2 <= 127) return a.address;
		}
	}
	return undefined;
}

function loadToken(cwd: string): string {
	const file = path.join(cwd, ".learn", "phone-token");
	if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
	const token = crypto.randomBytes(18).toString("base64url");
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, token, { mode: 0o600 });
	return token;
}

/**
 * The QR code as an SVG. qrcode-terminal only emits text, so we parse its
 * "small" output back into modules and draw squares. The text is drawn for a
 * dark terminal, i.e. INVERTED: a full block is a LIGHT module, a space is a
 * DARK one, ▀ = top light / bottom dark, ▄ = top dark / bottom light. Each
 * character covers two module rows; the lib also emits an all-dark half-row
 * artifact at the top, which is dropped.
 */
export function qrSvg(text: string): string {
	let out = "";
	qrcode.generate(text, { small: true }, (q: string) => (out = q));
	const rows: boolean[][] = [];
	for (const line of out.split("\n")) {
		if (!line.trim() && rows.length === 0) continue;
		const top: boolean[] = [];
		const bottom: boolean[] = [];
		for (const ch of line) {
			top.push(ch === " " || ch === "▄");
			bottom.push(ch === " " || ch === "▀");
		}
		if (top.length) rows.push(top, bottom);
	}
	// A real QR row always has light quiet-zone cells at both ends; an all-dark row is the lib's artifact.
	const real = rows.filter((r) => !r.every((m) => m));
	rows.length = 0;
	rows.push(...real);
	// Crop the text's own margin to the dark modules, then add the standard 4-module quiet zone.
	let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
	rows.forEach((r, y) => r.forEach((m, x) => { if (m) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }));
	if (maxX < 0) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="#fff"/></svg>`;
	const pad = 4;
	const n = Math.max(maxX - minX, maxY - minY) + 1;
	const size = n + pad * 2;
	const rects: string[] = [];
	rows.forEach((r, y) => r.forEach((m, x) => m && rects.push(`<rect x="${x - minX + pad}" y="${y - minY + pad}" width="1" height="1"/>`)));
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${rects.join("")}</g></svg>`;
}

function tokenOk(given: string | null, token: string): boolean {
	if (!given) return false;
	const a = Buffer.from(given);
	const b = Buffer.from(token);
	return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function stamp(d: Date): string {
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function readBody(req: http.IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		req.on("data", (c: Buffer) => {
			size += c.length;
			if (size > MAX_BODY) {
				reject(new Error("too large"));
				req.destroy();
				return;
			}
			chunks.push(c);
		});
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

function send(res: http.ServerResponse, status: number, type: string, body: string) {
	res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
	res.end(body);
}

function json(res: http.ServerResponse, status: number, obj: unknown) {
	send(res, status, "application/json", JSON.stringify(obj));
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
			if (err) reject(new Error(`${cmd} failed: ${err.message}\n${stderr}`));
			else resolve(stdout);
		});
		child.stdin?.end();
	});
}

/** Transcribe an audio file locally: ffmpeg → 16 kHz mono wav → whisper.cpp. */
async function transcribe(audioFile: string): Promise<string> {
	if (!fs.existsSync(WHISPER_MODEL)) throw new Error(`whisper model not found at ${WHISPER_MODEL}`);
	const wav = `${audioFile}.16k.wav`;
	await run("ffmpeg", ["-y", "-loglevel", "error", "-i", audioFile, "-ar", "16000", "-ac", "1", wav], 60_000);
	try {
		const out = await run(WHISPER_BIN, ["-m", WHISPER_MODEL, "-f", wav, "-l", "en", "-nt", "-np"], 180_000);
		return out.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
	} finally {
		try {
			fs.unlinkSync(wav);
		} catch {
			// ignore
		}
	}
}

interface Upload {
	images?: Array<{ data: string; mimeType: string }>;
	audio?: { data: string; mimeType: string };
	note?: string;
	text?: string;
	confidence?: number;
	dontKnow?: boolean;
	skip?: boolean;
	endRecall?: boolean;
	hint?: boolean;
	choices?: number[]; // quiz / menu / ask: 1-based option indices
	id?: string;
}

function saveImages(cwd: string, images: Array<{ data: string; mimeType: string }>): Array<{ file: string; name: string; data: string; mimeType: string }> {
	const dir = path.join(cwd, "work");
	fs.mkdirSync(dir, { recursive: true });
	const base = `work-${stamp(new Date())}`;
	return images.map((img, i) => {
		const name = `${base}${images.length > 1 ? `-${i + 1}` : ""}.${MIME_EXT[img.mimeType]}`;
		const file = path.join(dir, name);
		fs.writeFileSync(file, Buffer.from(img.data, "base64"));
		return { file, name, data: img.data, mimeType: img.mimeType };
	});
}

/** Shared with recall.ts (which can draw the QR inside an open prompt). */
interface PhoneShared {
	url?: string;
	localUrl?: string;
	qrLines?: string[];
	connected: boolean;
	/** Show the QR code (starting the server if needed). Resolves to an error message, or undefined when shown. */
	show?: (ctx: any) => Promise<string | undefined>;
	/** Hide a QR code that was shown on request (the one shown at startup stays until a device connects). */
	hide?: (ctx: any) => void;
}
function shared(): PhoneShared {
	const g = globalThis as any;
	if (!g.__learnPhone) g.__learnPhone = { connected: false } satisfies PhoneShared;
	return g.__learnPhone as PhoneShared;
}

export default function phoneWork(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	let server: http.Server | undefined;
	let url: string | undefined;
	let latestCtx: any;
	let startError: string | undefined;
	let widgetShown = false;
	let manualShown = false; // shown via the menu or /phone, not the startup auto-show
	const seenHosts = new Set<string>();

	function qrLines(): string[] {
		const sh = shared();
		if (sh.qrLines) return sh.qrLines;
		if (!url) return [];
		let qr = "";
		qrcode.generate(url, { small: true }, (q: string) => (qr = q));
		sh.qrLines = [
			...qr.split("\n").filter((l) => l.trim()),
			"Scan with your phone or iPad (Tailscale on), or open:",
			url,
			`On this Mac (viewer): ${sh.localUrl ?? ""}&mode=viewer`,
			`iPad as scratchpad: ${url}&mode=scratch`,
			`Knowledge map: ${url.replace("/?t=", "/graph?t=")}`,
			"Bookmark it — the link stays the same. Hides once a device connects. /phone hide to dismiss.",
		];
		return sh.qrLines;
	}

	function showWidget(ctx: any) {
		const lines = qrLines();
		if (lines.length === 0) return;
		widgetShown = true;
		// A component, not a string[]: pi cuts string widgets off at 10
		// lines, which chops the QR code in half.
		ctx.ui.setWidget("phone-work", () => ({
			render: (width: number) =>
				lines.flatMap((l) => {
					const w = Math.max(1, width - 1);
					const out = [];
					for (let i = 0; i < l.length; i += w) out.push(" " + l.slice(i, i + w));
					return out.length ? out : [""];
				}),
			invalidate: () => {},
		}));
	}

	function hideWidget(ctx: any) {
		if (!widgetShown) return;
		widgetShown = false;
		ctx.ui.setWidget("phone-work", undefined);
	}

	/** A device reached us: remember it. The first device, or a NEW one, drops the QR code from the screen. */
	function phoneSeen(req?: http.IncomingMessage) {
		const sh = shared();
		const first = !sh.connected;
		sh.connected = true;
		const host = req?.socket?.remoteAddress;
		const fresh = !!host && !seenHosts.has(host);
		if (host) seenHosts.add(host);
		if ((first || fresh) && latestCtx) {
			manualShown = false;
			hideWidget(latestCtx);
			setStatus();
		}
	}

	/** Show the QR code on request (menu item or /phone). Returns an error message when the pad is unavailable. */
	async function show(ctx: any): Promise<string | undefined> {
		latestCtx = ctx;
		start(ctx);
		// listen() is async; give it a moment on first start.
		for (let i = 0; i < 20 && !url && !startError; i++) await new Promise((r) => setTimeout(r, 50));
		if (!url) {
			return startError === "tailscale not connected"
				? "Tailscale isn't connected on this Mac. Install/sign in to Tailscale on the Mac and your phone, then try again."
				: `Answer pad unavailable: ${startError ?? "server not started"}`;
		}
		manualShown = true;
		showWidget(ctx);
		return undefined;
	}
	shared().show = show;
	shared().hide = (ctx: any) => {
		if (!manualShown) return;
		manualShown = false;
		hideWidget(ctx);
	};

	function setStatus() {
		const ctx = latestCtx;
		if (!ctx) return;
		const theme = ctx.ui.theme;
		if (url) ctx.ui.setStatus("phone-work", theme.fg("accent", "📱 ") + theme.fg("dim", shared().connected ? "phone connected · alt+q for QR" : "phone ready · alt+q for QR"));
		else ctx.ui.setStatus("phone-work", startError ? theme.fg("dim", `📱 ${startError}`) : undefined);
	}

	async function parse(req: http.IncomingMessage, res: http.ServerResponse): Promise<Upload | undefined> {
		try {
			return JSON.parse((await readBody(req)).toString("utf8")) as Upload;
		} catch (e: any) {
			json(res, 400, { error: e?.message === "too large" ? "Upload too large" : "Bad request" });
			return undefined;
		}
	}

	/** Legacy route: photos become a user message, unless a prompt is open (then they answer it). */
	async function handleUpload(req: http.IncomingMessage, res: http.ServerResponse) {
		const ctx = latestCtx;
		if (!ctx) return json(res, 503, { error: "pi session not ready" });
		const payload = await parse(req, res);
		if (!payload) return;
		const images = (payload.images ?? []).filter((i) => MIME_EXT[i?.mimeType] && typeof i.data === "string").slice(0, MAX_IMAGES);
		const noteText = payload.note?.trim();
		if (images.length === 0 && !noteText) return json(res, 400, { error: "Nothing to send" });
		if (images.length === 0) {
			// A typed reply with no question open: the tutor asked something in prose.
			if (answerPending({ source: "phone", text: noteText })) return json(res, 200, { ok: true, answered: true });
			const idle = typeof ctx.isIdle === "function" ? ctx.isIdle() : true;
			pi.sendUserMessage(noteText!, idle ? undefined : { deliverAs: "followUp" });
			hideWidget(ctx);
			ctx.ui.notify(`📱 Message received${idle ? "" : " (queued until the agent finishes)"}`, "info");
			return json(res, 200, { ok: true, queued: !idle });
		}
		const saved = saveImages(ctx.cwd, images);
		const names = saved.map((s) => s.name);

		const answered = answerPending({ source: "phone", text: payload.note?.trim() || undefined, photos: saved.map(({ file, data, mimeType }) => ({ file, data, mimeType })) });
		if (answered) {
			hideWidget(ctx);
			ctx.ui.notify("📱 Photo received as your answer", "info");
			return json(res, 200, { ok: true, answered: true, files: names });
		}

		const note = payload.note?.trim() || "Here's my work (photo from my phone).";
		const embeds = names.map((n) => `![[${n}|500]]`).join("\n");
		const content = [
			{ type: "text" as const, text: `${note}\n\n${embeds}` },
			...images.map((img) => ({ type: "image" as const, data: img.data, mimeType: img.mimeType })),
		];
		const idle = typeof ctx.isIdle === "function" ? ctx.isIdle() : true;
		pi.sendUserMessage(content, idle ? undefined : { deliverAs: "followUp" });
		hideWidget(ctx);
		ctx.ui.notify(`📱 Received ${names.length} photo${names.length > 1 ? "s" : ""}${idle ? "" : " (queued until the agent finishes)"}`, "info");
		json(res, 200, { ok: true, queued: !idle, files: names });
	}

	/** Answer-pad route: text / confidence / photos / audio / hint / idk for the open prompt. */
	async function handleAnswer(req: http.IncomingMessage, res: http.ServerResponse) {
		const ctx = latestCtx;
		if (!ctx) return json(res, 503, { error: "pi session not ready" });
		const payload = await parse(req, res);
		if (!payload) return;
		const pending = getPending();
		if (!pending) return json(res, 409, { error: "No open question right now" });
		if (payload.id && payload.id !== pending.id) return json(res, 409, { error: "That question has already been answered" });

		if (payload.hint) return json(res, 200, { ok: true, answered: answerPending({ source: "pad", hint: true }) });
		if (pending.kind === "read" && Array.isArray(payload.choices) && payload.choices[0] === 1) {
			const ok = answerPending({ source: "pad", choices: [1] });
			if (ok) ctx.ui.notify("📱 Reading marked read", "info");
			return ok ? json(res, 200, { ok: true, answered: true }) : json(res, 409, { error: "That reading has already been answered" });
		}
		if (payload.endRecall) {
			ctx.ui.notify("📱 Recall ended: starting the lesson", "info");
			return json(res, 200, { ok: true, answered: answerPending({ source: "pad", endRecall: true }) });
		}
		if (payload.skip) {
			ctx.ui.notify("📱 Check skipped: moving on", "info");
			return json(res, 200, { ok: true, answered: answerPending({ source: "pad", skip: true }) });
		}
		if (payload.dontKnow) return json(res, 200, { ok: true, answered: answerPending({ source: "pad", dontKnow: true }) });
		if (Array.isArray(payload.choices) && payload.choices.length) {
			const choices = payload.choices.map(Number).filter((n) => Number.isInteger(n) && n > 0);
			const conf = typeof payload.confidence === "number" && Number.isFinite(payload.confidence) ? Math.max(0, Math.min(100, Math.round(payload.confidence))) : undefined;
			const ok = answerPending({ source: "pad", choices, confidence: conf, text: payload.text?.trim() || undefined });
			if (!ok) return json(res, 409, { error: "That question has already been answered" });
			ctx.ui.notify("📱 Choice received from your device", "info");
			return json(res, 200, { ok: true, answered: true });
		}

		const images = (payload.images ?? []).filter((i) => MIME_EXT[i?.mimeType] && typeof i.data === "string").slice(0, MAX_IMAGES);
		const saved = images.length ? saveImages(ctx.cwd, images) : [];
		let audio: { file: string; transcript: string } | undefined;
		if (payload.audio?.data && AUDIO_EXT[payload.audio.mimeType?.split(";")[0]]) {
			const dir = path.join(ctx.cwd, "work");
			fs.mkdirSync(dir, { recursive: true });
			const file = path.join(dir, `audio-${stamp(new Date())}.${AUDIO_EXT[payload.audio.mimeType.split(";")[0]]}`);
			fs.writeFileSync(file, Buffer.from(payload.audio.data, "base64"));
			try {
				audio = { file, transcript: await transcribe(file) };
			} catch (e: any) {
				return json(res, 500, { error: `Transcription failed: ${String(e?.message ?? e).split("\n")[0]}` });
			}
		}
		const text = [payload.text?.trim(), audio?.transcript].filter(Boolean).join("\n").trim() || undefined;
		if (!text && saved.length === 0) return json(res, 400, { error: "Nothing to send" });
		const confidence = typeof payload.confidence === "number" && Number.isFinite(payload.confidence) ? Math.max(0, Math.min(100, Math.round(payload.confidence))) : undefined;
		const answered = answerPending({
			source: "pad",
			text,
			confidence,
			photos: saved.map(({ file, data, mimeType }) => ({ file, data, mimeType })),
			audio,
		});
		if (!answered) return json(res, 409, { error: "That question has already been answered" });
		ctx.ui.notify(`📱 Answer received from your phone${audio ? " (transcribed)" : ""}`, "info");
		json(res, 200, { ok: true, answered: true, transcript: audio?.transcript, files: saved.map((s) => s.name) });
	}

	/** Side chat: questions about the material, answered by a separate process. */
	async function handleChat(req: http.IncomingMessage, res: http.ServerResponse) {
		const cwd = latestCtx?.cwd ?? process.cwd();
		let body: { text?: string; lesson?: string; thread?: string; new?: boolean };
		try {
			body = JSON.parse((await readBody(req)).toString("utf8"));
		} catch {
			return json(res, 400, { error: "Bad request" });
		}
		if (body.new) return json(res, 200, { ok: true, thread: newThreadId() });
		const text = body.text?.trim();
		if (!text) return json(res, 400, { error: "Nothing to ask" });
		try {
			const turn = await askSide({ cwd, question: text.slice(0, 8000), lesson: body.lesson || undefined, thread: body.thread || undefined });
			json(res, 200, { ok: true, turn });
		} catch (e: any) {
			json(res, 500, { error: String(e?.message ?? e).split("\n")[0] });
		}
	}

	/** Notebook: his notes. Saving returns at once; the tagger runs in the background and the page polls. */
	async function handleNote(req: http.IncomingMessage, res: http.ServerResponse, action: string) {
		const cwd = latestCtx?.cwd ?? process.cwd();
		let body: { id?: string; text?: string; title?: string; lesson?: string; tags?: string[]; summary?: string; images?: Array<{ data: string; mimeType: string }> };
		try {
			body = JSON.parse((await readBody(req)).toString("utf8"));
		} catch {
			return json(res, 400, { error: "Bad request" });
		}
		const tagLater = (id: string) =>
			void tagNote(cwd, id)
				.then((n) => n && latestCtx?.ui?.notify?.(`📓 Note tagged: "${noteTitle(n)}" · ${n.tags.map((t) => `#${t}`).join(" ")}`, "info"))
				.catch((e: any) => latestCtx?.ui?.notify?.(`📓 Note saved but not tagged: ${String(e?.message ?? e).split("\n")[0]}`, "warning"));
		if (action === "add") {
			const images = (body.images ?? []).filter((i) => MIME_EXT[i?.mimeType] && typeof i.data === "string").slice(0, MAX_IMAGES);
			const saved = images.length ? saveImages(cwd, images) : [];
			const text = body.text?.trim() ?? "";
			if (!text && !saved.length) return json(res, 400, { error: "Nothing to save" });
			const note = addNote(cwd, { text, title: body.title, lesson: body.lesson, tags: body.tags, images: saved.map((s) => path.relative(cwd, s.file)), source: "web" });
			latestCtx?.ui?.notify?.(`📓 Note saved from your device${note.title ? `: "${note.title}"` : ""}`, "info");
			tagLater(note.id);
			return json(res, 200, { ok: true, note });
		}
		if (!body.id) return json(res, 400, { error: "Missing id" });
		if (action === "update") {
			const note = updateNote(cwd, body.id, { text: body.text, title: body.title, tags: body.tags, lesson: body.lesson, summary: body.summary });
			return note ? json(res, 200, { ok: true, note }) : json(res, 404, { error: "No such note" });
		}
		if (action === "retag") {
			tagLater(body.id);
			return json(res, 200, { ok: true });
		}
		if (action === "delete") return deleteNote(cwd, body.id) ? json(res, 200, { ok: true }) : json(res, 404, { error: "No such note" });
		json(res, 404, { error: "Unknown action" });
	}

	function start(ctx: any): void {
		if (server) return;
		const host = process.env.PI_PHONE_BIND || tailscaleIPv4();
		if (!host) {
			startError = "tailscale not connected";
			setStatus();
			return;
		}
		const token = loadToken(ctx.cwd);
		const s = http.createServer((req, res) => {
			const u = new URL(req.url ?? "/", "http://x");
			if (!tokenOk(u.searchParams.get("t"), token)) return send(res, 403, "text/plain", "Forbidden");
			if (req.method === "GET" && u.pathname === "/") return send(res, 200, "text/html; charset=utf-8", pageHtml());
			if (req.method === "GET" && u.pathname === "/graph") {
				try {
					return send(res, 200, "text/html; charset=utf-8", fs.readFileSync(path.join(path.dirname(PAGE_FILE), "graph.html"), "utf8"));
				} catch {
					return send(res, 404, "text/plain", "graph.html missing");
				}
			}
			if (req.method === "GET" && u.pathname === "/graph.json") {
				try {
					return json(res, 200, buildGraph(latestCtx?.cwd ?? process.cwd()));
				} catch (e: any) {
					return json(res, 500, { error: String(e?.message ?? e) });
				}
			}
			if (req.method === "GET" && u.pathname === "/scratch.js") {
				try {
					return send(res, 200, "application/javascript; charset=utf-8", fs.readFileSync(path.join(path.dirname(PAGE_FILE), "scratch.js"), "utf8"));
				} catch {
					return send(res, 404, "text/plain", "scratch.js missing");
				}
			}
			if (req.method === "GET" && u.pathname === "/qr.svg") {
				// Connect another device from the laptop page: the pad link as a QR image.
				return send(res, 200, "image/svg+xml; charset=utf-8", qrSvg(url ?? shared().url ?? ""));
			}
			if (req.method === "GET" && u.pathname === "/ping") {
				phoneSeen(req);
				return json(res, 200, { ok: true });
			}
			if (req.method === "GET" && u.pathname === "/prompt") {
				phoneSeen(req);
				const p = getPending();
				const last = getLastResult();
				return json(res, 200, {
					now: Date.now(),
					pending: p ? { id: p.id, kind: p.kind, prompt: p.prompt, context: p.context, startedAt: p.startedAt, paper: p.paper, options: p.options, multi: p.multi, say: p.say, banner: p.banner, figure: p.figure } : null,
					last: last ?? null,
				});
			}
			if (req.method === "GET" && u.pathname === "/lesson") {
				// The live lesson note (md-log's file), with embeds resolved to servable paths.
				const file = (globalThis as any).__learnLogFile as string | null | undefined;
				const cwd = latestCtx?.cwd ?? process.cwd();
				if (!file || !fs.existsSync(file)) return json(res, 200, { file: null, markdown: "", mtime: 0 });
				const raw = fs.readFileSync(file, "utf8");
				const markdown = raw.replace(/!\[\[([^\]|]+)(?:\|(\d+))?\]\]/g, (m, name: string, w?: string) => {
					const rel = findEmbed(cwd, name.trim());
					return rel ? `![${name}](/file?p=${encodeURIComponent(rel)}&t=${encodeURIComponent(token)}${w ? `#w=${w}` : ""})` : m;
				});
				return json(res, 200, { file: path.relative(cwd, file), title: path.basename(file, ".md"), markdown, mtime: fs.statSync(file).mtimeMs });
			}
			if (req.method === "GET" && u.pathname === "/book") {
				// A lesson's book (readings only, no cards): the picker list plus one book's markdown.
				const cwd = latestCtx?.cwd ?? process.cwd();
				try {
					const books = bookList(cwd);
					const logFile = (globalThis as any).__learnLogFile as string | null | undefined;
					const viewing = logFile ? loadLearner(cwd).lessons.find((l) => l.file && path.resolve(cwd, l.file) === path.resolve(logFile))?.slug ?? null : null;
					const want = u.searchParams.get("slug") || viewing || books[0]?.slug;
					const entry = books.find((b) => b.slug === want);
					if (!entry) return json(res, 200, { slug: null, title: null, markdown: "", mtime: 0, books, viewing });
					const file = path.join(cwd, entry.file);
					const raw = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
					const markdown = raw.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/!\[\[([^\]|]+)(?:\|(\d+))?\]\]/g, (m, name: string, w?: string) => {
						const rel = findEmbed(cwd, name.trim());
						return rel ? `![${name}](/file?p=${encodeURIComponent(rel)}&t=${encodeURIComponent(token)}${w ? `#w=${w}` : ""})` : m;
					});
					return json(res, 200, { slug: entry.slug, title: entry.title, markdown, mtime: fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0, books, viewing });
				} catch (e: any) {
					return json(res, 500, { error: String(e?.message ?? e) });
				}
			}
			if (req.method === "GET" && u.pathname === "/file") {
				const p = u.searchParams.get("p") ?? "";
				return serveVaultFile(latestCtx?.cwd ?? process.cwd(), p, res);
			}
			if (req.method === "GET" && u.pathname === "/notebook") {
				try {
					const cwd = latestCtx?.cwd ?? process.cwd();
					const logFile = (globalThis as any).__learnLogFile as string | null | undefined;
					const viewing = logFile ? loadLearner(cwd).lessons.find((l) => l.file && path.resolve(cwd, l.file) === path.resolve(logFile))?.slug ?? null : null;
					return json(res, 200, { ...notebookView(cwd), viewing });
				} catch (e: any) {
					return json(res, 500, { error: String(e?.message ?? e) });
				}
			}
			if (req.method === "POST" && /^\/note(\/(update|retag|delete))?$/.test(u.pathname)) {
				handleNote(req, res, u.pathname.split("/")[2] ?? "add").catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
				return;
			}
			if (req.method === "GET" && u.pathname === "/chat") {
				const cwd = latestCtx?.cwd ?? process.cwd();
				const thread = u.searchParams.get("thread") || currentThread(cwd);
				const logFile = (globalThis as any).__learnLogFile as string | null | undefined;
				return json(res, 200, { thread: thread ?? null, turns: thread ? loadChat(cwd).filter((x) => x.thread === thread) : [], lessons: chatLessons(cwd), viewing: logFile ? path.basename(logFile, ".md") : null });
			}
			if (req.method === "POST" && u.pathname === "/chat") {
				handleChat(req, res).catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
				return;
			}
			if (req.method === "POST" && u.pathname === "/upload") {
				handleUpload(req, res).catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
				return;
			}
			if (req.method === "POST" && u.pathname === "/answer") {
				handleAnswer(req, res).catch((e) => json(res, 500, { error: String(e?.message ?? e) }));
				return;
			}
			send(res, 404, "text/plain", "Not found");
		});
		// Also reachable from this Mac's own browser (unless the main server already
		// binds loopback, e.g. PI_PHONE_BIND=127.0.0.1: a second listener would EADDRINUSE).
		if (host !== "127.0.0.1" && host !== "localhost") {
			const local = http.createServer((req, res) => s.emit("request", req, res));
			local.on("error", () => {});
			local.listen(PORT, "127.0.0.1");
			s.on("close", () => local.close());
		}
		// Claim the slot before listen() resolves so a quick /phone can't start a second server.
		server = s;
		s.on("error", (e: any) => {
			if (server !== s) return;
			startError = e?.code === "EADDRINUSE" ? `port ${PORT} in use (another pi?)` : `server error: ${e?.code ?? e}`;
			server = undefined;
			url = undefined;
			setStatus();
		});
		s.listen(PORT, host, () => {
			url = `http://${host}:${PORT}/?t=${token}`;
			shared().url = url;
			shared().localUrl = `http://127.0.0.1:${PORT}/?t=${token}`;
			shared().qrLines = undefined;
			startError = undefined;
			setStatus();
			// Show the QR code until the phone connects, so it's never needed mid-question.
			if (latestCtx?.hasUI && !shared().connected) showWidget(latestCtx);
		});
	}

	pi.on("session_start", async (_event, ctx) => {
		latestCtx = ctx;
		start(ctx);
		setStatus();
	});

	pi.on("session_shutdown", async () => {
		server?.close();
		server?.closeAllConnections();
		server = undefined;
		url = undefined;
	});

	pi.registerCommand("phone", {
		description: "Show the answer-pad link + QR code (/phone hide to dismiss)",
		handler: async (args, ctx: any) => {
			latestCtx = ctx;
			if (args.trim() === "hide") {
				widgetShown = true;
				manualShown = false;
				hideWidget(ctx);
				return;
			}
			const err = await show(ctx);
			if (err) ctx.ui.notify(err, "warning");
		},
	});
	// Any time, including mid-lesson: toggle the QR code with one key.
	const toggleQr = async (ctx: any) => {
		latestCtx = ctx;
		if (widgetShown) {
			manualShown = false;
			hideWidget(ctx);
			return;
		}
		const err = await show(ctx);
		if (err) ctx.ui.notify(err, "warning");
	};
	pi.registerShortcut("alt+q", { description: "Phone: show/hide the answer-pad QR code", handler: toggleQr });
	pi.registerShortcut("f2", { description: "Phone: show/hide the answer-pad QR code", handler: toggleQr });

	pi.registerCommand("ask", {
		description: "Side chat: ask about the lesson material without interrupting the lesson (/ask hide to dismiss)",
		handler: async (args, ctx: any) => {
			latestCtx = ctx;
			const q = args.trim();
			if (!q || q === "hide") {
				ctx.ui.setWidget("side-chat", undefined);
				if (!q) ctx.ui.notify("Usage: /ask <your question about the material>. The app has a Side chat too (Ask button).", "info");
				return;
			}
			const box = (lines: string[]) =>
				ctx.ui.setWidget("side-chat", () => ({
					render: (width: number) => {
						const w = Math.max(10, width - 2);
						return lines.flatMap((l) => {
							if (!l) return [""];
							const out: string[] = [];
							let rest = l;
							while (rest.length > w) {
								const cut = rest.lastIndexOf(" ", w) > w / 2 ? rest.lastIndexOf(" ", w) : w;
								out.push(" " + rest.slice(0, cut));
								rest = rest.slice(cut).trimStart();
							}
							out.push(" " + rest);
							return out;
						});
					},
					invalidate: () => {},
				}));
			box([ctx.ui.theme.fg("accent", "Side chat") + ctx.ui.theme.fg("dim", " · thinking…"), `> ${q}`]);
			// Not awaited: the answer takes a while and the terminal stays usable meanwhile.
			void (async () => {
				try {
					const lesson = ((globalThis as any).__learnLogFile as string | undefined)?.split("/").pop()?.replace(/\.md$/, "");
					const known = chatLessons(ctx.cwd).some((l) => l.slug === lesson);
					const turn = await askSide({ cwd: ctx.cwd, question: q, lesson: known ? lesson : undefined });
					box([ctx.ui.theme.fg("accent", "Side chat") + ctx.ui.theme.fg("dim", " · /ask hide to dismiss · full thread in the app"), `> ${q}`, "", ...plainMath(turn.text).split("\n")]);
				} catch (e: any) {
					box([ctx.ui.theme.fg("accent", "Side chat"), `> ${q}`, ctx.ui.theme.fg("error", String(e?.message ?? e).split("\n")[0])]);
				}
			})();
		},
	});
}
