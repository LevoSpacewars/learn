import puppeteer from "../extensions/visual-tools/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { spawn } from "node:child_process";
import fs from "node:fs"; import assert from "node:assert/strict";
const TMP = new URL("./tmp", import.meta.url).pathname;
const servers = [];
function serve(port, pending) {
	const log = `${TMP}/answers-${pending}.log`; try { fs.unlinkSync(log); } catch {}
	const p = spawn(process.execPath, [new URL("./fakeserver.mjs", import.meta.url).pathname], { env: { ...process.env, PORT: String(port), PENDING: pending, ANSWERS: log }, stdio: "ignore" });
	servers.push(p); return log;
}
const readLog = serve(8799, "read"), sayLog = serve(8800, "say"); serve(8801, "predict");
await new Promise((r) => setTimeout(r, 600));
const lastAnswer = (log) => { const l = fs.readFileSync(log, "utf8").trim().split("\n").pop(); return JSON.parse(l.slice(l.indexOf(" ") + 1)); };
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
try {
	// ---- read card (phone width) ----
	let page = await browser.newPage(); await page.setViewport({ width: 430, height: 1500, deviceScaleFactor: 2 });
	await page.goto("http://127.0.0.1:8799/?t=x&mode=full", { waitUntil: "networkidle0" });
	await page.waitForFunction(() => document.querySelector("#prompt .katex-display") !== null);
	assert.equal(await page.$eval("#kind", (n) => n.textContent), "Reading");
	assert.equal(await page.$eval("#qcard", (n) => n.classList.contains("reading")), true);
	assert.equal(await page.$eval("#prompt h2", (n) => n.textContent.includes("Why the pool decays")), true);
	assert.equal(await page.$eval("#prompt img", (n) => n.getAttribute("src").includes("viz%2Fdecay.svg")), true, "figure shown");
	assert.equal(await page.$$eval("#quiz button", (b) => b.map((x) => x.textContent.trim()).join("|")), "Read it, ask me", "exactly one button");
	for (const id of ["confrow", "hint", "idk", "skip", "endrecall"]) assert.equal(await page.$eval("#" + id, (n) => n.offsetParent === null), true, id + " hidden on a reading");
	assert.equal(await page.$eval("#text", (n) => n.offsetParent !== null), true, "question box visible");
	assert.equal(await page.$eval("#send", (b) => b.disabled), true);
	await page.screenshot({ path: `${TMP}/shot-read-phone.png`, fullPage: true });
	await page.type("#text", "Why is it 1 - k dt and not k dt?");
	assert.equal(await page.$eval("#send", (b) => !b.disabled && b.textContent === "Ask about it"), true);
	await page.click("#send");
	await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Sent"));
	assert.deepEqual(lastAnswer(readLog), { id: "read1", text: "Why is it 1 - k dt and not k dt?" });
	await page.reload({ waitUntil: "networkidle0" });
	await page.waitForFunction(() => document.querySelector("#quiz button.readbtn") !== null);
	await page.click("#quiz button.readbtn");
	await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Sent"));
	assert.deepEqual(lastAnswer(readLog), { id: "read1", choices: [1] }, "one tap sends Read it");
	await page.close();
	// ---- read card + lesson pane (desktop) ----
	page = await browser.newPage(); await page.setViewport({ width: 1400, height: 1100 });
	await page.goto("http://127.0.0.1:8799/?t=x&mode=full", { waitUntil: "networkidle0" });
	await page.waitForFunction(() => document.querySelector("#lesson h2") !== null && document.querySelector("#prompt .katex") !== null);
	assert.equal(await page.$eval("#lesson h2", (n) => n.textContent.startsWith("Reading — ")), true, "lesson note shows the reading as a section");
	await page.screenshot({ path: `${TMP}/shot-read-desktop.png` });
	await page.close();
	// ---- say line above a recall ----
	page = await browser.newPage(); await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });
	await page.goto("http://127.0.0.1:8800/?t=x&mode=full", { waitUntil: "networkidle0" });
	await page.waitForFunction(() => document.querySelector("#say .katex") !== null);
	assert.equal(await page.$eval("#say", (n) => n.offsetParent !== null && n.getBoundingClientRect().top < document.querySelector("#prompt").getBoundingClientRect().top), true, "say above the prompt");
	assert.equal(await page.$eval("#banner", (n) => n.offsetParent === null), true, "no banner on a non-predict");
	await page.screenshot({ path: `${TMP}/shot-say.png` });
	await page.close();
	// ---- predict banner ----
	page = await browser.newPage(); await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });
	await page.goto("http://127.0.0.1:8801/?t=x&mode=full", { waitUntil: "networkidle0" });
	await page.waitForFunction(() => document.querySelector("#prompt .katex") !== null);
	assert.match(await page.$eval("#banner", (n) => n.offsetParent !== null ? n.textContent : ""), /^Quick guess: one line, under two minutes/);
	await page.screenshot({ path: `${TMP}/shot-predict.png` });
	console.log("page tests ok");
} finally { await browser.close(); for (const s of servers) s.kill(); }
