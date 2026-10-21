import puppeteer from "../extensions/visual-tools/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900 });
page.on("console", (m) => console.log("console:", m.type(), m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0, 300)));
await page.goto(url, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 4000));
const info = await page.evaluate(async () => {
	const pres = [...document.querySelectorAll("#bookBody pre.mermaid")];
	const out = { mermaid: typeof window.mermaid, pres: pres.length, svgs: document.querySelectorAll("#bookBody svg").length, first: pres[0]?.textContent?.slice(0, 200) };
	try {
		if (window.mermaid && pres[0]) {
			const r = await mermaid.parse(pres[0].textContent);
			out.parse = String(r);
		}
	} catch (e) {
		out.parseError = String(e).slice(0, 400);
	}
	return out;
});
console.log(JSON.stringify(info, null, 2));
if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
await browser.close();
