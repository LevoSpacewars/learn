/**
 * phone-work — photograph handwritten work on your phone and send it into the
 * running pi session for the teacher to review.
 *
 * A tiny HTTP server serves a mobile upload page. It binds ONLY to this Mac's
 * Tailscale address (100.64.0.0/10), so only devices on your tailnet can reach
 * it, and every request must carry a secret token (persisted in
 * <cwd>/.learn/phone-token so a bookmarked link keeps working).
 *
 * On upload, each photo is saved to <cwd>/work/ (inside the Obsidian vault)
 * and delivered to the session as a user message with the images attached.
 * The message text embeds the photos (![[work-….jpg|500]]), so md-log mirrors
 * them into the linked lesson note too.
 *
 * Commands:
 *   /phone       — show the upload link + QR code (starts the server if needed)
 *   /phone hide  — hide the QR code
 *
 * Env: PI_PHONE_PORT (default 8787), PI_PHONE_BIND (override the bind address,
 * e.g. a LAN IP — the token is then the only protection).
 *
 * Not loaded into subagents.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import qrcode from "qrcode-terminal";
import { answerPending } from "../review/prompts.ts";

const PORT = Number(process.env.PI_PHONE_PORT) || 8787;
const MAX_BODY = 40 * 1024 * 1024;
const MAX_IMAGES = 8;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

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

	async function handleUpload(req: http.IncomingMessage, res: http.ServerResponse) {
		const ctx = latestCtx;
		if (!ctx) return send(res, 503, "application/json", JSON.stringify({ error: "pi session not ready" }));
		let payload: { note?: string; images?: Array<{ data: string; mimeType: string }> };
		try {
			payload = JSON.parse((await readBody(req)).toString("utf8"));
		} catch (e: any) {
			return send(res, 400, "application/json", JSON.stringify({ error: e?.message === "too large" ? "Upload too large" : "Bad request" }));
		}
		const images = (payload.images ?? []).filter((i) => MIME_EXT[i?.mimeType] && typeof i.data === "string").slice(0, MAX_IMAGES);
		if (images.length === 0) return send(res, 400, "application/json", JSON.stringify({ error: "No images" }));

		const dir = path.join(ctx.cwd, "work");
		fs.mkdirSync(dir, { recursive: true });
		const base = `work-${stamp(new Date())}`;
		const names = images.map((img, i) => {
			const name = `${base}${images.length > 1 ? `-${i + 1}` : ""}.${MIME_EXT[img.mimeType]}`;
			fs.writeFileSync(path.join(dir, name), Buffer.from(img.data, "base64"));
			return name;
		});

		// If a learner prompt (recall) is waiting, the photo IS the answer: hand it
		// to that prompt instead of posting a new user message.
		const answered = answerPending({
			source: "phone",
			text: payload.note?.trim() || undefined,
			photos: names.map((n, i) => ({ file: path.join(dir, n), data: images[i].data, mimeType: images[i].mimeType })),
		});
		if (answered) {
			ctx.ui.setWidget("phone-work", undefined);
			ctx.ui.notify(`📱 Photo received as your answer`, "info");
			return send(res, 200, "application/json", JSON.stringify({ ok: true, answered: true, files: names }));
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
		send(res, 200, "application/json", JSON.stringify({ ok: true, queued: !idle, files: names }));
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
			if (req.method === "GET" && u.pathname === "/ping") return send(res, 200, "application/json", JSON.stringify({ ok: true }));
			if (req.method === "POST" && u.pathname === "/upload") {
				handleUpload(req, res).catch((e) => send(res, 500, "application/json", JSON.stringify({ error: String(e?.message ?? e) })));
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
		description: "Show the phone upload link + QR code (/phone hide to dismiss)",
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
						: `Phone upload unavailable: ${startError ?? "server not started"}`,
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
<title>Send work</title>
<style>
:root { --bg:#f6f5f2; --fg:#1d1d1f; --muted:#6e6e73; --card:#fff; --line:#e3e1dc; --accent:#2f6fde; --ok:#1f8a4c; --err:#c0392b; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg:#141416; --fg:#f2f2f4; --muted:#9a9aa1; --card:#1f1f23; --line:#2e2e34; --accent:#5b8ff0; --ok:#3fbf73; --err:#e5675a; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.4 -apple-system, system-ui, sans-serif; padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom)); }
main { max-width: 520px; margin: 0 auto; display:flex; flex-direction:column; gap:14px; }
h1 { font-size: 22px; margin: 4px 0 0; }
.conn { font-size: 13px; color: var(--muted); }
.conn.ok::before { content:"● "; color: var(--ok); }
.conn.bad::before { content:"● "; color: var(--err); }
.btns { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
label.btn, button { display:flex; align-items:center; justify-content:center; min-height:52px; border-radius:12px; border:1px solid var(--line); background:var(--card); color:var(--fg); font:inherit; font-weight:600; cursor:pointer; }
label.btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
input[type=file] { display:none; }
.grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; }
.grid:empty { display:none; }
.thumb { position:relative; aspect-ratio: 3/4; border-radius:10px; overflow:hidden; background:var(--card); border:1px solid var(--line); }
.thumb img { width:100%; height:100%; object-fit:cover; display:block; }
.thumb button { position:absolute; top:4px; right:4px; min-height:0; width:28px; height:28px; border-radius:50%; padding:0; background:rgba(0,0,0,.6); color:#fff; border:0; font-size:16px; }
textarea { width:100%; min-height:72px; border-radius:12px; border:1px solid var(--line); background:var(--card); color:var(--fg); font:inherit; padding:12px; resize:vertical; }
#send { background:var(--accent); border-color:var(--accent); color:#fff; font-size:17px; }
#send:disabled { opacity:.45; }
.status { min-height: 1.4em; font-size: 15px; text-align:center; }
.status.ok { color: var(--ok); } .status.err { color: var(--err); }
</style>
</head><body><main>
<h1>Send your work</h1>
<div id="conn" class="conn">Checking connection…</div>
<div class="btns">
  <label class="btn primary">📷 Take photo<input id="cam" type="file" accept="image/*" capture="environment"></label>
  <label class="btn">🖼 Choose<input id="pick" type="file" accept="image/*" multiple></label>
</div>
<div id="grid" class="grid"></div>
<textarea id="note" placeholder="Optional note — e.g. “stuck on step 3” or “is this right?”"></textarea>
<button id="send" disabled>Send to pi</button>
<div id="status" class="status" role="status"></div>
</main>
<script>
const token = new URLSearchParams(location.search).get("t");
const files = [];
const $ = (id) => document.getElementById(id);
const MAX = 2000;

fetch("/ping?t=" + encodeURIComponent(token)).then(r => {
  $("conn").textContent = r.ok ? "Connected to pi" : "Link invalid — rescan the QR code";
  $("conn").className = "conn " + (r.ok ? "ok" : "bad");
}).catch(() => { $("conn").textContent = "Can't reach your Mac — is Tailscale on?"; $("conn").className = "conn bad"; });

function render() {
  $("grid").innerHTML = "";
  files.forEach((f, i) => {
    const d = document.createElement("div"); d.className = "thumb";
    const img = document.createElement("img"); img.src = f.preview; d.appendChild(img);
    const x = document.createElement("button"); x.textContent = "×"; x.setAttribute("aria-label", "Remove photo");
    x.onclick = () => { files.splice(i, 1); render(); };
    d.appendChild(x); $("grid").appendChild(d);
  });
  $("send").disabled = files.length === 0;
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

async function add(list) {
  $("status").textContent = ""; $("status").className = "status";
  for (const f of list) {
    try { files.push(await shrink(f)); } catch { $("status").textContent = "Couldn't read that image."; $("status").className = "status err"; }
  }
  render();
}
$("cam").onchange = (e) => { add([...e.target.files]); e.target.value = ""; };
$("pick").onchange = (e) => { add([...e.target.files]); e.target.value = ""; };

$("send").onclick = async () => {
  $("send").disabled = true; $("status").className = "status"; $("status").textContent = "Sending…";
  try {
    const r = await fetch("/upload?t=" + encodeURIComponent(token), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: $("note").value, images: files.map(f => ({ data: f.data, mimeType: f.mimeType })) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ("HTTP " + r.status));
    files.length = 0; $("note").value = ""; render();
    $("status").textContent = j.answered ? "Sent ✓ — received as your answer" : j.queued ? "Sent ✓ — queued until pi finishes its turn" : "Sent ✓ — check pi";
    $("status").className = "status ok";
  } catch (e) {
    $("status").textContent = "Failed: " + e.message; $("status").className = "status err";
    $("send").disabled = files.length === 0;
  }
};
</script>
</body></html>`;
