/**
 * phone-work — the answer pad: your phone as the answering surface.
 *
 * A tiny HTTP server serves a mobile page that mirrors whatever prompt the
 * tutor is waiting on (a `recall` question), with a running timer, an answer
 * box, a confidence slider, a camera button for paper work, and a microphone
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
import qrcode from "qrcode-terminal";
import { answerPending, getPending } from "../review/prompts.ts";

const PORT = Number(process.env.PI_PHONE_PORT) || 8787;
const MAX_BODY = 60 * 1024 * 1024;
const MAX_IMAGES = 8;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AUDIO_EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-m4a": "m4a", "audio/aac": "aac" };
const WHISPER_MODEL = process.env.PI_WHISPER_MODEL || path.join(os.homedir(), ".cache", "whisper", "ggml-medium.en.bin");
const WHISPER_BIN = process.env.PI_WHISPER_BIN || "whisper-cli";

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
	hint?: boolean;
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

export default function phoneWork(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	let server: http.Server | undefined;
	let url: string | undefined;
	let latestCtx: any;
	let startError: string | undefined;

	function setStatus() {
		const ctx = latestCtx;
		if (!ctx) return;
		const theme = ctx.ui.theme;
		if (url) ctx.ui.setStatus("phone-work", theme.fg("accent", "📱 ") + theme.fg("dim", "phone ready"));
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
		if (images.length === 0) return json(res, 400, { error: "No images" });
		const saved = saveImages(ctx.cwd, images);
		const names = saved.map((s) => s.name);

		const answered = answerPending({ source: "phone", text: payload.note?.trim() || undefined, photos: saved.map(({ file, data, mimeType }) => ({ file, data, mimeType })) });
		if (answered) {
			ctx.ui.setWidget("phone-work", undefined);
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
		ctx.ui.setWidget("phone-work", undefined);
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
		if (payload.dontKnow) return json(res, 200, { ok: true, answered: answerPending({ source: "pad", dontKnow: true }) });

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
			if (req.method === "GET" && u.pathname === "/") return send(res, 200, "text/html; charset=utf-8", PAGE);
			if (req.method === "GET" && u.pathname === "/ping") return json(res, 200, { ok: true });
			if (req.method === "GET" && u.pathname === "/prompt") {
				const p = getPending();
				return json(res, 200, { now: Date.now(), pending: p ? { id: p.id, kind: p.kind, prompt: p.prompt, startedAt: p.startedAt } : null });
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
			startError = undefined;
			setStatus();
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
				ctx.ui.setWidget("phone-work", undefined);
				return;
			}
			start(ctx);
			// listen() is async; give it a moment on first start.
			for (let i = 0; i < 20 && !url && !startError; i++) await new Promise((r) => setTimeout(r, 50));
			if (!url) {
				ctx.ui.notify(
					startError === "tailscale not connected"
						? "Tailscale isn't connected on this Mac. Install/sign in to Tailscale on the Mac and your phone, then run /phone again."
						: `Answer pad unavailable: ${startError ?? "server not started"}`,
					"warning",
				);
				return;
			}
			let qr = "";
			qrcode.generate(url, { small: true }, (q: string) => (qr = q));
			const lines = [
				...qr.split("\n").filter((l) => l.trim()),
				"Scan with your phone (Tailscale on) or open:",
				url,
				"Bookmark it — the link stays the same. /phone hide to dismiss.",
			];
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
		},
	});
}

const PAGE = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Answer pad</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/contrib/auto-render.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<style>
:root { --bg:#f6f5f2; --fg:#1d1d1f; --muted:#6e6e73; --card:#fff; --line:#e3e1dc; --accent:#2f6fde; --ok:#1f8a4c; --err:#c0392b; --warn:#b7791f; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg:#141416; --fg:#f2f2f4; --muted:#9a9aa1; --card:#1f1f23; --line:#2e2e34; --accent:#5b8ff0; --ok:#3fbf73; --err:#e5675a; --warn:#e0a83a; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.45 -apple-system, system-ui, sans-serif; padding: max(12px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom)); }
main { max-width: 560px; margin: 0 auto; display:flex; flex-direction:column; gap:12px; }
.top { display:flex; justify-content:space-between; align-items:baseline; }
h1 { font-size: 20px; margin: 0; }
.conn { font-size: 13px; color: var(--muted); }
.conn.ok::before { content:"● "; color: var(--ok); }
.conn.bad::before { content:"● "; color: var(--err); }
.card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px; }
.kind { display:inline-block; font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--accent); }
.timer { float:right; font-variant-numeric: tabular-nums; color:var(--muted); font-size:14px; }
.prompt { margin-top:8px; font-size:17px; }
.prompt p { margin: 0 0 8px; }
.idle { color:var(--muted); text-align:center; padding:18px 0; }
textarea { width:100%; min-height:110px; border-radius:12px; border:1px solid var(--line); background:var(--card); color:var(--fg); font:inherit; padding:12px; resize:vertical; }
.conf { display:flex; align-items:center; gap:12px; }
.conf label { color:var(--muted); font-size:14px; white-space:nowrap; }
.conf input { flex:1; accent-color: var(--accent); }
.conf output { min-width:3.2em; text-align:right; font-variant-numeric: tabular-nums; font-weight:600; }
.btns { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
label.btn, button { display:flex; align-items:center; justify-content:center; min-height:50px; border-radius:12px; border:1px solid var(--line); background:var(--card); color:var(--fg); font:inherit; font-weight:600; cursor:pointer; }
button.primary { background:var(--accent); border-color:var(--accent); color:#fff; grid-column: 1 / -1; font-size:17px; }
button.rec.on { border-color: var(--err); color: var(--err); }
button:disabled { opacity:.45; }
input[type=file] { display:none; }
.grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; }
.grid:empty { display:none; }
.thumb { position:relative; aspect-ratio: 3/4; border-radius:10px; overflow:hidden; background:var(--card); border:1px solid var(--line); }
.thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.thumb button { position:absolute; top:4px; right:4px; min-height:0; width:28px; height:28px; border-radius:50%; padding:0; background:rgba(0,0,0,.6); color:#fff; border:0; font-size:16px; }
.status { min-height: 1.4em; font-size: 15px; text-align:center; }
.status.ok { color: var(--ok); } .status.err { color: var(--err); } .status.warn { color: var(--warn); }
.small { font-size:13px; color:var(--muted); text-align:center; }
</style>
</head><body><main>
<div class="top"><h1>Answer pad</h1><div id="conn" class="conn">Connecting…</div></div>

<section id="qcard" class="card">
  <span id="kind" class="kind"></span><span id="timer" class="timer"></span>
  <div id="prompt" class="prompt"></div>
  <div id="idle" class="idle">No open question. When the tutor asks something, it appears here.</div>
</section>

<textarea id="text" placeholder="Type your answer… (or use photo / voice)"></textarea>
<div id="audioline" class="small"></div>
<div class="conf"><label for="conf">Confidence</label><input id="conf" type="range" min="0" max="100" step="5" value="70"><output id="confv">70%</output></div>
<div id="grid" class="grid"></div>
<div class="btns">
  <label class="btn">📷 Photo<input id="cam" type="file" accept="image/*" capture="environment"></label>
  <button id="rec" class="rec">🎙 Record</button>
  <button id="hint">? Hint</button>
  <button id="idk">I don't know</button>
  <button id="send" class="primary" disabled>Send answer</button>
</div>
<div id="status" class="status" role="status"></div>
<div class="small">Photos and voice are saved into the vault. Voice is transcribed on the Mac.</div>
</main>
<script>
const token = new URLSearchParams(location.search).get("t");
const $ = (id) => document.getElementById(id);
const api = (p) => p + (p.includes("?") ? "&" : "?") + "t=" + encodeURIComponent(token);
const files = [];
let pending = null, audio = null, recorder = null, chunks = [], skew = 0, busy = false;
const MAX = 2000;

function setStatus(msg, cls) { $("status").textContent = msg || ""; $("status").className = "status " + (cls || ""); }
function fmt(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
function renderPrompt(p) {
  const el = $("prompt");
  try { el.innerHTML = window.marked ? marked.parse(p.prompt) : ""; if (!window.marked) el.textContent = p.prompt; } catch { el.textContent = p.prompt; }
  try { if (window.renderMathInElement) renderMathInElement(el, { delimiters: [{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}], throwOnError:false }); } catch {}
  $("kind").textContent = ({recall:"Recall", explain:"Explain it back", predict:"Predict", boundary:"Boundary", flaw:"Find the flaw", transfer:"Transfer", problem:"Problem"})[p.kind] || p.kind;
}
function updateButtons() {
  const has = files.length || audio || $("text").value.trim();
  $("send").disabled = !pending || busy || !has;
  for (const id of ["hint","idk","rec","cam"]) $(id).disabled = !pending || busy;
}
function resetAnswer() { files.length = 0; audio = null; $("text").value = ""; $("audioline").textContent = ""; renderGrid(); $("conf").value = 70; $("confv").textContent = "70%"; updateButtons(); }

async function poll() {
  try {
    const r = await fetch(api("/prompt"), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    skew = Date.now() - j.now;
    $("conn").textContent = "Connected"; $("conn").className = "conn ok";
    const p = j.pending;
    if (p && (!pending || pending.id !== p.id)) {
      pending = p; renderPrompt(p); $("idle").style.display = "none"; $("prompt").style.display = ""; $("kind").style.display = "";
      resetAnswer(); setStatus("");
      try { navigator.vibrate && navigator.vibrate(80); } catch {}
    } else if (!p && pending) {
      pending = null; $("idle").style.display = ""; $("prompt").style.display = "none"; $("kind").style.display = "none"; $("timer").textContent = "";
      updateButtons();
    } else if (!p) { $("idle").style.display = ""; $("prompt").style.display = "none"; $("kind").style.display = "none"; }
  } catch (e) {
    $("conn").textContent = "Can't reach your Mac — is Tailscale on?"; $("conn").className = "conn bad";
  }
}
setInterval(poll, 1500); poll();
setInterval(() => { if (pending) $("timer").textContent = fmt(Date.now() - skew - pending.startedAt); }, 500);

function renderGrid() {
  $("grid").innerHTML = "";
  files.forEach((f, i) => {
    const d = document.createElement("div"); d.className = "thumb";
    const img = document.createElement("img"); img.src = f.preview; d.appendChild(img);
    const x = document.createElement("button"); x.textContent = "×"; x.setAttribute("aria-label", "Remove photo");
    x.onclick = () => { files.splice(i, 1); renderGrid(); updateButtons(); };
    d.appendChild(x); $("grid").appendChild(d);
  });
}
async function shrink(file) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { src = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = URL.createObjectURL(file); }); }
  const w = src.width, h = src.height, s = Math.min(1, MAX / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.85);
  return { preview: url, data: url.split(",")[1], mimeType: "image/jpeg" };
}
$("cam").onchange = async (e) => {
  for (const f of [...e.target.files]) { try { files.push(await shrink(f)); } catch { setStatus("Couldn't read that image.", "err"); } }
  e.target.value = ""; renderGrid(); updateButtons();
};
$("text").oninput = updateButtons;
$("conf").oninput = () => { $("confv").textContent = $("conf").value + "%"; };

$("rec").onclick = async () => {
  if (recorder && recorder.state === "recording") { recorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); chunks = [];
    recorder.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
      const b64 = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
      audio = { data: b64, mimeType: blob.type };
      $("rec").textContent = "🎙 Record"; $("rec").classList.remove("on");
      $("audioline").textContent = "Voice answer recorded (" + Math.round(blob.size / 1024) + " KB) — will be transcribed on send.";
      updateButtons();
    };
    recorder.start(); $("rec").textContent = "■ Stop"; $("rec").classList.add("on"); setStatus("");
  } catch (e) { setStatus("Microphone unavailable: " + e.message, "err"); }
};

async function post(path, body) {
  const r = await fetch(api(path), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ("HTTP " + r.status));
  return j;
}
async function submit(body, label) {
  busy = true; updateButtons(); setStatus(label || "Sending…");
  try {
    const j = await post("/answer", { id: pending && pending.id, ...body });
    setStatus(j.transcript ? "Sent ✓ — heard: “" + j.transcript + "”" : "Sent ✓", "ok");
    resetAnswer();
  } catch (e) { setStatus("Failed: " + e.message, "err"); }
  busy = false; updateButtons();
}
$("send").onclick = () => submit({ text: $("text").value, confidence: Number($("conf").value), images: files.map((f) => ({ data: f.data, mimeType: f.mimeType })), audio }, audio ? "Transcribing on the Mac…" : "Sending…");
$("hint").onclick = () => submit({ hint: true });
$("idk").onclick = () => submit({ dontKnow: true });
updateButtons();
</script>
</body></html>`;
