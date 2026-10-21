// phone-work: alt+q / f2 toggle the QR at any time; /qr.svg serves the pad link as an image; the page has a Phone button.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.PI_PHONE_PORT = "8795";
process.env.PI_PHONE_BIND = "127.0.0.1";
const WT = new URL("../extensions", import.meta.url).pathname;
const phoneMod = await import(WT + "/phone-work/index.ts");

// qrSvg: a real QR matrix, square, with the finder pattern's 7x7 corner
const svg = phoneMod.qrSvg("http://100.1.2.3:8787/?t=abcdef");
assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 (\d+) \1"/, "square viewBox");
const n = (svg.match(/<rect x=/g) ?? []).length;
assert.ok(n > 200, `enough modules (${n})`);
for (let i = 0; i < 7; i++) assert.ok(svg.includes(`<rect x="${4 + i}" y="4" width="1" height="1"/>`), `finder top row module ${i}`);
assert.ok(!svg.includes(`<rect x="${4 + 7}" y="4" `), "quiet column after the finder");
// all three finder patterns: a 7x7 ring (outer dark, inner ring light, 3x3 dark centre) at TL, TR, BL
const size = Number(svg.match(/viewBox="0 0 (\d+)/)![1]);
const N = size - 8; // modules without the quiet zone
const dark = new Set([...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="1"/g)].map((m) => `${m[1]},${m[2]}`));
const isDark = (x: number, y: number) => dark.has(`${x + 4},${y + 4}`);
const finderAt = (ox: number, oy: number) => {
	for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
		const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3)); // 0,1 centre; 2 light ring; 3 outer dark
		const expect = ring !== 2;
		if (isDark(ox + dx, oy + dy) !== expect) return false;
	}
	return true;
};
assert.ok(finderAt(0, 0), "top-left finder");
assert.ok(finderAt(N - 7, 0), "top-right finder");
assert.ok(finderAt(0, N - 7), "bottom-left finder");
assert.ok(!finderAt(N - 7, N - 7), "no finder bottom-right");
assert.equal(N % 4, 1, `QR side ${N} is 4k+1`);

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "learn-qr2-"));
fs.mkdirSync(path.join(cwd, ".learn"), { recursive: true });
const handlers: Record<string, Function[]> = {};
const shortcuts: Record<string, any> = {};
const fakePi: any = {
	on: (e: string, f: Function) => (handlers[e] ??= []).push(f),
	registerTool() {},
	registerCommand() {},
	registerShortcut: (k: string, o: any) => (shortcuts[k] = o),
	events: { on() {}, emit() {} },
	sendUserMessage() {},
	appendEntry() {},
};
phoneMod.default(fakePi);
assert.ok(shortcuts["alt+q"] && shortcuts["f2"], "alt+q and f2 registered");
assert.match(shortcuts["alt+q"].description, /QR/);

let widget: any = "unset";
const theme = new Proxy({}, { get: () => (_a: any, b: any) => b });
const ctx = { cwd, hasUI: true, ui: { theme, setStatus() {}, notify() {}, setWidget: (_id: string, w: any) => (widget = w) } };
for (const f of handlers.session_start ?? []) await f({}, ctx);
const sh = (globalThis as any).__learnPhone;
for (let i = 0; i < 40 && !sh.url; i++) await new Promise((r) => setTimeout(r, 50));
assert.ok(sh.url, "server up");

// first device connects → startup QR gone; then the shortcut brings it back and takes it away
const ping = String(sh.url).replace("/?t=", "/ping?t=");
assert.equal((await fetch(ping)).status, 200);
await new Promise((r) => setTimeout(r, 20));
assert.equal(widget, undefined, "startup QR hidden after first device");
await shortcuts["alt+q"].handler(ctx);
assert.ok(widget && widget !== "unset", "alt+q shows the QR mid-session");
await shortcuts["f2"].handler(ctx);
assert.equal(widget, undefined, "f2 toggles it off again");

// /qr.svg: token-protected, svg, same content as qrSvg(url)
const qrUrl = String(sh.url).replace("/?t=", "/qr.svg?t=");
const r = await fetch(qrUrl);
assert.equal(r.status, 200);
assert.match(r.headers.get("content-type") ?? "", /image\/svg\+xml/);
assert.equal(await r.text(), phoneMod.qrSvg(sh.url));
assert.equal((await fetch(`http://127.0.0.1:8795/qr.svg`)).status, 403, "no token, no QR");

// the page has the button and the overlay
const page = await (await fetch(sh.url)).text();
assert.match(page, /id="phoneBtn"/);
assert.match(page, /id="qrImg"/);
assert.match(page, /api\("\/qr\.svg"\)/);

for (const f of handlers.session_shutdown ?? []) await f({}, ctx);
console.log("qr2 tests ok");
process.exit(0);
