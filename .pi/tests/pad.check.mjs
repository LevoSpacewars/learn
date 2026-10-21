// Loads the page against the fake server, types an answer, and reports whether
// the send button enables without any confidence slider; screenshots the card.
import puppeteer from "../extensions/visual-tools/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const [url, out] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
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
await browser.close();
