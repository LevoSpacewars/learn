// phone-work: show/hide shared on globalThis for the start menu; a NEW device hides the QR.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.PI_PHONE_PORT = "8796";
process.env.PI_PHONE_BIND = "127.0.0.1";
const WT = new URL("../extensions", import.meta.url).pathname;
const phoneMod = await import(WT + "/phone-work/index.ts");
const menuMod = await import(WT + "/start-menu.ts");

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "learn-phone-"));
fs.mkdirSync(path.join(cwd, ".learn"), { recursive: true });

const handlers: Record<string, Function[]> = {};
const commands: Record<string, any> = {};
const fakePi: any = {
	on: (e: string, f: Function) => (handlers[e] ??= []).push(f),
	registerTool: () => {},
	registerCommand: (name: string, c: any) => (commands[name] = c),
	registerShortcut() {},
	events: { on: () => {}, emit: () => {} },
	sendUserMessage: () => {},
	appendEntry: () => {},
};
phoneMod.default(fakePi);
const fire = async (e: string, ev: any, ctx: any) => { for (const f of handlers[e] ?? []) await f(ev, ctx); };

let widget: any = "unset";
const notices: string[] = [];
const theme = new Proxy({}, { get: () => (_a: any, b: any) => b });
const ctx = { cwd, hasUI: true, ui: { theme, setStatus() {}, notify: (m: string) => notices.push(m), setWidget: (_id: string, w: any) => (widget = w) } };

const sh = (globalThis as any).__learnPhone;
assert.equal(typeof sh.show, "function", "show shared on globalThis");
assert.equal(typeof sh.hide, "function", "hide shared on globalThis");

await fire("session_start", {}, ctx);
for (let i = 0; i < 40 && !sh.url; i++) await new Promise((r) => setTimeout(r, 50));
assert.ok(sh.url, "server started on the bind address");
assert.ok(widget && widget !== "unset", "startup auto-show of the QR widget");
const lines = widget().render(120);
assert.ok(lines.length > 10 && lines.some((l: string) => l.includes(sh.url)), "widget renders the QR code and the link");

// hide() does nothing to the startup auto-show (it stays until a device connects)
sh.hide(ctx);
assert.notEqual(widget, undefined, "startup QR not hidden by menu hide");

// the first device connects: QR goes away
const pingUrl = String(sh.url).replace("/?t=", "/ping?t=");
const ping = await fetch(pingUrl);
assert.equal(ping.status, 200);
await new Promise((r) => setTimeout(r, 20));
assert.equal(widget, undefined, "first device hides the QR");

// menu item: show on request
widget = "unset";
assert.equal(await sh.show(ctx), undefined, "show succeeds");
assert.ok(widget && widget !== "unset", "QR shown on request");

// the same (already seen) device polling does NOT hide a requested QR
assert.equal((await fetch(pingUrl)).status, 200);
await new Promise((r) => setTimeout(r, 20));
assert.notEqual(widget, undefined, "same device polling leaves the requested QR up");

// menu hide takes it down
sh.hide(ctx);
assert.equal(widget, undefined, "menu hide removes a requested QR");

// /phone command still works through show()
widget = "unset";
await commands.phone.handler("", ctx);
assert.ok(widget && widget !== "unset", "/phone shows the QR");
await commands.phone.handler("hide", ctx);
assert.equal(widget, undefined, "/phone hide");

// start menu offers the item last
const opts = menuMod.orderOptions(["Review (3 due)", "Learn something new", "Connect my phone (show the QR code)"], undefined, "Review (3 due)");
assert.equal(opts.at(-1), "Connect my phone (show the QR code)");

await fire("session_shutdown", {}, ctx);
console.log("phone tests ok");
process.exit(0);
