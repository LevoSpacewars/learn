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
const received = [];
const srv = http.createServer((req, res) => {
	const u = new URL(req.url, "http://x");
	const j = (o, s = 200) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
	if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); const engine = fs.readFileSync(WT + "/scratch.js", "utf8"); return res.end(fs.readFileSync(WT + "/page.html", "utf8").replace("<!--SCRATCH-->", `<script>\n${engine.replace(/<\/script/gi, "<\\/script")}\n</script>`)); }
	if (u.pathname === "/scratch.js") { res.writeHead(200, { "content-type": "application/javascript" }); return res.end(fs.readFileSync(WT + "/scratch.js", "utf8")); }
	if (u.pathname === "/ping") return j({ ok: true });
	if (u.pathname === "/prompt") return j({ now: Date.now(), pending: null, last: null });
	if (u.pathname === "/lesson") return j({ file: "lessons/hdx.md", title: "hdx", markdown: "# HDX\n\nA rate becomes a chance only over a slice of time: $k\\,dt$.", mtime: 1 });
	if (u.pathname === "/file") { const n = notes.find((x) => (x.images || []).includes(u.searchParams.get("p"))); const d = n && n._pages && n._pages[u.searchParams.get("p")]; if (!d) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": "image/png" }); return res.end(Buffer.from(d, "base64")); }
	if (u.pathname === "/notebook") { const tags = {}; for (const n of notes) for (const t of n.tags) tags[t] = (tags[t] || 0) + 1; return j({ notes: [...notes].reverse(), tags: Object.entries(tags).map(([tag, count]) => ({ tag, count })), lessons: [{ slug: "hdx", title: "HDX kinetics" }], viewing: "hdx", mtime }); }
	if (req.method === "POST") { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { const body = JSON.parse(b || "{}"); mtime++;
		if (u.pathname === "/note") { const id = "n" + mtime; const imgs = body.images || []; const n = { id, at: new Date().toISOString(), updated: new Date().toISOString(), text: body.text || "", title: body.title || undefined, tags: body.tags || [], lesson: body.lesson || undefined, lessonTitle: body.lesson ? "HDX kinetics" : undefined, tagged: !!(body.tags && body.tags.length), source: "web", tagging: !(body.tags && body.tags.length), images: imgs.map((_, i) => `notebook/pages/${id}-${i + 1}.png`), _pages: Object.fromEntries(imgs.map((im, i) => [`notebook/pages/${id}-${i + 1}.png`, im.data])) }; received.push({ text: n.text, images: imgs.length, mime: imgs[0] && imgs[0].mimeType }); notes.push(n); setTimeout(() => { n.tagging = false; n.tagged = true; n.title = n.title || "Rate times slice width"; n.tags = n.tags.length ? n.tags : ["hdx", "insight"]; n.summary = "A rate is a chance only over a slice."; if (imgs.length) n.transcript = "k dt = chance per slice\n\n$k$ alone is a rate"; mtime++; }, 2500); return j({ ok: true, note: n }); }
		if (u.pathname === "/note/update") { const n = notes.find((x) => x.id === body.id); if (!n) return j({ error: "no" }, 404); const imgs = body.images || []; for (const im of imgs) { const p = `notebook/pages/${n.id}-${n.images.length + 1}.png`; n.images.push(p); n._pages[p] = im.data; } received.push({ update: n.id, images: imgs.length }); Object.assign(n, { text: body.text ?? n.text, title: body.title || n.title, tags: body.tags ?? n.tags }); return j({ ok: true, note: n }); }
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

// new note: the editor opens on the pen pad; draw two strokes with the mouse, save
await page.click("#nbNew");
await page.waitForSelector("#nbBody .editor .nbdraw.on .scratch-host canvas");
const lessonSel = await page.$eval("#nbBody .editor select", (s) => s.value);
assert.equal(lessonSel, "hdx", "editor defaults to the lesson being viewed");
const typedHidden = await page.$eval("#nbBody .editor textarea", (t) => getComputedStyle(t).display === "none");
assert.ok(typedHidden, "typing is hidden in pen mode");
const box = await (await page.$("#nbBody .editor .scratch-host")).boundingBox();
const stroke = async (pts) => { await page.mouse.move(box.x + pts[0][0], box.y + pts[0][1]); await page.mouse.down(); for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + x, box.y + y, { steps: 4 }); await page.mouse.up(); };
await stroke([[40, 60], [80, 120], [120, 60], [160, 120]]);
await stroke([[200, 60], [200, 140], [260, 140]]);
await stroke([[40, 200], [400, 200]]);
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: `${TMP}/shot-nb-editor.png` });
await page.click("#nbBody .editor button.primary");
await page.waitForSelector("#nbBody .view");
assert.equal(received.length, 1); assert.equal(received[0].images, 1); assert.equal(received[0].mime, "image/png"); assert.equal(received[0].text, "");
let meta = await page.$eval("#nbBody .view .meta", (e) => e.textContent);
assert.match(meta, /✎ 1 page · reading it…/, "view shows the page count and that it is being read");
const pageImg = await page.$eval("#nbBody .view img.page", (i) => [i.naturalWidth, i.naturalHeight, i.complete]);
assert.ok(pageImg[0] > 100 && pageImg[1] > 50 && pageImg[2], `the drawn page is shown (${pageImg})`);
await page.screenshot({ path: `${TMP}/shot-nb-view-tagging.png` });
await new Promise((r) => setTimeout(r, 6500)); // poll picks up the reading
meta = await page.$eval("#nbBody .view .meta", (e) => e.textContent);
assert.doesNotMatch(meta, /reading it…/, "reading finished");
const h1 = await page.$eval("#nbBody .view h1", (e) => e.textContent);
assert.equal(h1, "Rate times slice width", "auto title shown");
const chips = await page.$$eval("#nbBody .view .chips .chip", (els) => els.map((e) => e.textContent));
assert.deepEqual(chips, ["#hdx", "#insight"]);
const transcript = await page.$eval("#nbBody .view .transcript", (e) => e.textContent);
assert.match(transcript, /Transcript \(read from your handwriting; searchable\)k dt = chance per slice/);
const katex = await page.$$eval("#nbBody .view .transcript .katex", (els) => els.length);
assert.ok(katex >= 1, "LaTeX rendered in the transcript");
await page.screenshot({ path: `${TMP}/shot-nb-view.png` });

// add a page to the existing note
await page.click("#nbBody .vbtns button:nth-child(2)");
await page.waitForSelector("#nbBody .editor .nbdraw.on .scratch-host canvas");
const thumbs = await page.$$eval("#nbBody .editor .pages img", (els) => els.length);
assert.equal(thumbs, 1, "existing page shown as a thumbnail");
const box2 = await (await page.$("#nbBody .editor .scratch-host")).boundingBox();
await page.mouse.move(box2.x + 50, box2.y + 50); await page.mouse.down(); await page.mouse.move(box2.x + 300, box2.y + 160, { steps: 6 }); await page.mouse.up();
await page.click("#nbBody .editor button.primary");
await page.waitForSelector("#nbBody .view");
assert.deepEqual(received[1], { update: received.length && notes[notes.length - 1].id, images: 1 }, "add page appends one image");
const pagesShown = await page.$$eval("#nbBody .view img.page", (els) => els.length);
assert.equal(pagesShown, 2);

// edit: title + tags
await page.click("#nbBody .vbtns button:nth-child(3)");
await page.waitForSelector("#nbBody .editor input");
const typeShown = await page.$eval("#nbBody .editor textarea", (t) => getComputedStyle(t).display !== "none");
assert.ok(typeShown, "Edit opens in type mode");
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
const quotedShown = await page.$eval("#nbBody .editor textarea", (t) => getComputedStyle(t).display !== "none");
assert.ok(quotedShown, "Note this opens in type mode with the quote");
const quoted = await page.$eval("#nbBody .editor textarea", (t) => t.value);
assert.match(quoted, /^> A rate becomes a chance only over a slice of time: \$k\\,dt\$\.\n\n$/, "selection quoted into a new note, math back as $LaTeX$");
await page.screenshot({ path: `${TMP}/shot-nb-notethis.png` });

await browser.close();
srv.close();
console.log("notebook page ok; screenshots in", TMP);
process.exit(process.exitCode || 0);
