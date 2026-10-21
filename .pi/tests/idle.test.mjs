import puppeteer from "../extensions/visual-tools/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs"; import assert from "node:assert/strict";
const LOG = new URL("./tmp/fake-answers.log", import.meta.url).pathname; try { fs.unlinkSync(LOG); } catch {}
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
try {
  for (const mode of ["full", "viewer"]) {
    const page = await browser.newPage(); await page.setViewport({ width: 520, height: 900 });
    await page.goto("http://127.0.0.1:8795/?t=x&mode=" + mode, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.querySelector("#conn").textContent === "Connected");
    assert.equal(await page.$eval("#freetext", (n) => n.offsetParent !== null), true, mode + ": text box visible when idle");
    assert.equal(await page.$eval("#freesend", (b) => b.disabled), true);
    await page.type("#freetext", "The 10^-2 is wrong: 0.95 x 400 = 380");
    assert.equal(await page.$eval("#freesend", (b) => b.disabled), false);
    await page.click("#freesend");
    await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Sent"));
    assert.equal(await page.$eval("#freetext", (n) => n.value), "");
    if (mode === "full") await page.screenshot({ path: new URL("./tmp/shot-idle.png", import.meta.url).pathname });
  }
  const sent = fs.readFileSync(LOG, "utf8").trim().split("\n").map((l) => JSON.parse(l.slice(l.indexOf(" ") + 1)));
  assert.equal(sent.length, 2); assert.equal(sent[0].note, "The 10^-2 is wrong: 0.95 x 400 = 380"); assert.equal(sent[0].images.length, 0);
  console.log("idle tests ok");
} finally { await browser.close(); }
