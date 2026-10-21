// Drives the Notebook panel of page.html against a fake server (no pi): writes a
// note, sees it listed, opens it, edits it, filters by tag; screenshots along the way.
//   node nb.check.mjs            (serves page.html from ../extensions/phone-work on PORT 8792)
import puppeteer from "../extensions/visual-tools/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import http from "node:http";
import fs from "node:fs";
import assert from "node:assert/strict";
const WT = new URL("../extensions/phone-work", import.meta.url).pathname;
const TMP = new URL("./tmp", import.meta.url).pathname;
fs.mkdirSync(TMP, { recursive: true });
const PORT = Number(process.env.PORT || 8792);
let notes = [{ id: "n1", at: "2026-10-18T10:00:00Z", updated: "2026-10-18T10:00:00Z", text: "Half-life is $\\ln 2 / k$, not $1/k$.", title: "Half-life vs mean lifetime", tags: ["hdx", "mistake"], lesson: "hdx", lessonTitle: "HDX kinetics", summary: "Mean lifetime is 1/k; half-life is ln2/k.", tagged: true, source: "web", concepts: ["the rate constant"] }];
let mtime = 1;
const srv = http.createServer((req, res) => {
	const u = new URL(req.url, "http://x");
	const j = (o, s = 200) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
	if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(WT + "/page.html", "utf8")); }
	if (u.pathname === "/scratch.js") { res.writeHead(200, { "content-type": "application/javascript" }); return res.end(fs.readFileSync(WT + "/scratch.js", "utf8")); }
	if (u.pathname === "/ping") return j({ ok: true });
	if (u.pathname === "/prompt") return j({ now: Date.now(), pending: null, last: null });
	if (u.pathname === "/lesson") return j({ file: "lessons/hdx.md", title: "hdx", markdown: "# HDX\n\nA rate becomes a chance only over a slice of time: $k\\,dt$.", mtime: 1 });
	if (u.pathname === "/notebook") { const tags = {}; for (const n of notes) for (const t of n.tags) tags[t] = (tags[t] || 0) + 1; return j({ notes: [...notes].reverse(), tags: Object.entries(tags).map(([tag, count]) => ({ tag, count })), lessons: [{ slug: "hdx", title: "HDX kinetics" }], viewing: "hdx", mtime }); }
	if (req.method === "POST") { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { const body = JSON.parse(b || "{}"); mtime++;
		if (u.pathname === "/note") { const n = { id: "n" + mtime, at: new Date().toISOString(), updated: new Date().toISOString(), text: body.text, title: body.title || undefined, tags: body.tags || [], lesson: body.lesson || undefined, lessonTitle: body.lesson ? "HDX kinetics" : undefined, tagged: !!(body.tags && body.tags.length), source: "web", tagging: !(body.tags && body.tags.length) }; notes.push(n); setTimeout(() => { n.tagging = false; n.tagged = true; n.title = n.title || "Rate times slice width"; n.tags = n.tags.length ? n.tags : ["hdx", "insight"]; n.summary = "A rate is a chance only over a slice."; mtime++; }, 2500); return j({ ok: true, note: n }); }
		if (u.pathname === "/note/update") { const n = notes.find((x) => x.id === body.id); if (!n) return j({ error: "no" }, 404); Object.assign(n, { text: body.text ?? n.text, title: body.title || n.title, tags: body.tags ?? n.tags }); return j({ ok: true, note: n }); }
		if (u.pathname === "/note/delete") { notes = notes.filter((x) => x.id !== body.id); return j({ ok: true }); }
		if (u.pathname === "/note/retag") return j({ ok: true });
		j({ error: "?" }, 404); }); return; }
	res.writeHead(404); res.end();
}).listen(PORT, "127.0.0.1");
await new Promise((r) => setTimeout(r, 300));

const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--window-size=1300,900"] });
const page = await browser.newPage();
page.on("pageerror", (e) => { console.error("PAGE ERROR", e.message); process.exitCode = 1; });
await page.setViewport({ width: 1300, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/?t=x`, { waitUntil: "networkidle0" });
await page.click("#noteBtn");
await page.waitForSelector("#nb.open #nbBody .note");
let titles = await page.$$eval("#nbBody .note h3", (els) => els.map((e) => e.textContent));
assert.deepEqual(titles, ["Half-life vs mean lifetime"]);
await page.screenshot({ path: `${TMP}/shot-nb-list.png` });

// new note from the editor (no title, no tags: the fake server "tags" it after 2.5 s)
await page.click("#nbNew");
await page.waitForSelector("#nbBody .editor textarea");
await page.type("#nbBody .editor textarea", "k is a rate: $k\\,dt$ is the chance per slice, not $k$ itself.");
const lessonSel = await page.$eval("#nbBody .editor select", (s) => s.value);
assert.equal(lessonSel, "hdx", "editor defaults to the lesson being viewed");
await page.screenshot({ path: `${TMP}/shot-nb-editor.png` });
await page.click("#nbBody .editor button.primary");
await page.waitForSelector("#nbBody .view");
let meta = await page.$eval("#nbBody .view .meta", (e) => e.textContent);
assert.match(meta, /tagging…/, "view shows tagging in progress");
await page.screenshot({ path: `${TMP}/shot-nb-view-tagging.png` });
await new Promise((r) => setTimeout(r, 6500)); // poll picks up the tags
meta = await page.$eval("#nbBody .view .meta", (e) => e.textContent);
assert.doesNotMatch(meta, /tagging…/, "tagging finished");
const h1 = await page.$eval("#nbBody .view h1", (e) => e.textContent);
assert.equal(h1, "Rate times slice width", "auto title shown");
const chips = await page.$$eval("#nbBody .view .chips .chip", (els) => els.map((e) => e.textContent));
assert.deepEqual(chips, ["#hdx", "#insight"]);
const katex = await page.$$eval("#nbBody .view .katex", (els) => els.length);
assert.ok(katex >= 2, "LaTeX rendered in the note");
await page.screenshot({ path: `${TMP}/shot-nb-view.png` });

// edit: title + tags
await page.click("#nbBody .vbtns button:nth-child(2)");
await page.waitForSelector("#nbBody .editor input");
await page.$eval("#nbBody .editor input", (i) => (i.value = ""));
await page.type("#nbBody .editor input", "Rate vs chance");
await page.$eval("#nbBody .editor .row input", (i) => (i.value = ""));
await page.type("#nbBody .editor .row input", "hdx, definition");
await page.click("#nbBody .editor button.primary");
await page.waitForFunction(() => document.querySelector("#nbBody .view h1")?.textContent === "Rate vs chance");

// tag filter + search
await page.click("#nbBody .vbtns button:nth-child(1)");
await page.waitForSelector("#nbBody .note");
const tagChips = await page.$$eval("#nbTags .chip", (els) => els.map((e) => e.textContent));
assert.ok(tagChips.includes("#definition · 1") && tagChips.includes("#hdx · 2"), `tag chips ${tagChips}`);
const chipIdx = tagChips.indexOf("#mistake · 1");
await (await page.$$("#nbTags .chip"))[chipIdx].click();
titles = await page.$$eval("#nbBody .note h3", (els) => els.map((e) => e.textContent));
assert.deepEqual(titles, ["Half-life vs mean lifetime"], "tag filter");
await (await page.$$("#nbTags .chip"))[0].click();
await page.type("#nbSearch", "chance");
titles = await page.$$eval("#nbBody .note h3", (els) => els.map((e) => e.textContent));
assert.deepEqual(titles, ["Rate vs chance"], "search");
await page.screenshot({ path: `${TMP}/shot-nb-search.png` });

// phone width
await page.setViewport({ width: 500, height: 900 });
await page.$eval("#nbSearch", (i) => (i.value = ""));
await page.$$eval("#nbTags .chip", (els) => els[0].click());
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${TMP}/shot-nb-phone.png` });

// "Note this" from a lesson selection (desktop)
await page.setViewport({ width: 1300, height: 900 });
await page.click("#nbClose");
await page.waitForFunction(() => document.querySelector("#lesson .doc, #lesson p"));
await page.evaluate(() => { const p = document.querySelector("#lesson p"); const r = document.createRange(); r.selectNodeContents(p); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event("selectionchange")); });
await page.waitForSelector("#noteSel:not(.hidden)");
await page.click("#noteSel");
await page.waitForSelector("#nb.open #nbBody .editor textarea");
const quoted = await page.$eval("#nbBody .editor textarea", (t) => t.value);
assert.match(quoted, /^> A rate becomes a chance only over a slice of time: \$k\\,dt\$\.\n\n$/, "selection quoted into a new note, math back as $LaTeX$");
await page.screenshot({ path: `${TMP}/shot-nb-notethis.png` });

await browser.close();
srv.close();
console.log("notebook page ok; screenshots in", TMP);
process.exit(process.exitCode || 0);
