import puppeteer from "../extensions/visual-tools/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs"; import assert from "node:assert/strict";
const LOG = new URL("./tmp/fake-answers.log", import.meta.url).pathname; try { fs.unlinkSync(LOG); } catch {}
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
try {
  const page = await browser.newPage(); await page.setViewport({ width: 520, height: 900 });
  await page.goto("http://127.0.0.1:8794/?t=x", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.querySelector("#prompt .katex") !== null);
  assert.equal(await page.$eval("#skip", (b) => b.offsetParent !== null && !b.disabled), true, "skip visible and enabled on an open check");
  // skip needs no answer and no confidence
  await page.click("#skip");
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Sent"));
  const sent = ((l) => JSON.parse(l.slice(l.indexOf(" ") + 1)))(fs.readFileSync(LOG, "utf8").trim().split("\n").pop());
  assert.equal(sent.skip, true); assert.equal(sent.id, "p2");
  await page.screenshot({ path: new URL("./tmp/shot-skip.png", import.meta.url).pathname });
  console.log("skip ui ok");
} finally { await browser.close(); }
