// Loads the page against the fake server, types an answer, and checks that the send button
// enables without any confidence slider or timer; screenshots the card.
//   node pad.check.mjs                 starts its own fake server (an open explain check)
//   node pad.check.mjs <url> [out.png] against a server you started
import puppeteer from "../extensions/visual-tools/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
let [url, out] = process.argv.slice(2);
let server;
if (!url) {
	server = spawn(process.execPath, [new URL("./fakeserver.mjs", import.meta.url).pathname], { env: { ...process.env, PORT: "8802", PENDING: "say", ANSWERS: new URL("./tmp/fake-answers-pad.log", import.meta.url).pathname }, stdio: "ignore" });
	await new Promise((r) => setTimeout(r, 600));
	url = "http://127.0.0.1:8802/?t=x";
	out = new URL("./tmp/shot-pad.png", import.meta.url).pathname;
}
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
try {
	const page = await browser.newPage();
	await page.setViewport({ width: 500, height: 900 });
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
	await page.goto(url, { waitUntil: "networkidle0" });
	await new Promise((r) => setTimeout(r, 2500));
	const before = await page.evaluate(() => ({ disabled: document.getElementById("send").disabled, label: document.getElementById("send").textContent, slider: !!document.getElementById("conf"), timer: !!document.getElementById("timer"), confrow: !!document.getElementById("confrow") }));
	await page.type("#text", "because k is a rate; it becomes a chance only over a slice dt");
	await new Promise((r) => setTimeout(r, 300));
	const after = await page.evaluate(() => ({ disabled: document.getElementById("send").disabled, label: document.getElementById("send").textContent }));
	console.log(JSON.stringify({ before, after, errors }, null, 2));
	if (out) await page.screenshot({ path: out });
	assert.deepEqual(errors, [], "no page errors");
	assert.equal(before.disabled, true, "send disabled before typing");
	assert.equal(before.slider || before.timer || before.confrow, false, "no confidence slider, no timer");
	assert.equal(after.disabled, false, "send enables once there is an answer");
	console.log("pad check ok");
} finally {
	await browser.close();
	server?.kill();
}
