// Serves the worktree's page.html with no pending prompt, an empty lesson and a
// real /book built from VAULT (book/*.md + .learn/learner.json), so the Book
// view can be screenshotted without pi. PORT, VAULT env.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const WT = process.env.WT || new URL("../extensions", import.meta.url).pathname;
const VAULT = process.env.VAULT;
const PORT = Number(process.env.PORT || 8798);
const { bookList } = await import(`${WT}/review/book.ts`);
http.createServer((req, res) => {
	const u = new URL(req.url, "http://x");
	const j = (o) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
	if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(WT + "/phone-work/page.html", "utf8")); }
	if (u.pathname === "/scratch.js") { res.writeHead(200, { "content-type": "application/javascript" }); return res.end(fs.readFileSync(WT + "/phone-work/scratch.js", "utf8")); }
	if (u.pathname === "/ping") return j({ ok: true });
	if (u.pathname === "/lesson") return j({ file: null, markdown: "", mtime: 0 });
	if (u.pathname === "/prompt") return j({ now: Date.now(), pending: null, last: null });
	if (u.pathname === "/chat") return j({ thread: null, turns: [], lessons: [], viewing: null });
	if (u.pathname === "/book") {
		const books = bookList(VAULT);
		const want = u.searchParams.get("slug") || books[0]?.slug;
		const entry = books.find((b) => b.slug === want);
		if (!entry) return j({ slug: null, title: null, markdown: "", mtime: 0, books, viewing: null });
		const raw = fs.readFileSync(path.join(VAULT, entry.file), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
		const markdown = raw.replace(/!\[\[([^\]|]+)(?:\|(\d+))?\]\]/g, (m, name, w) => `![${name}](/file?p=${encodeURIComponent(name)}${w ? `#w=${w}` : ""})`);
		return j({ slug: entry.slug, title: entry.title, markdown, mtime: 1, books, viewing: null });
	}
	if (u.pathname === "/file") {
		const p = path.join(VAULT, u.searchParams.get("p") || "");
		if (fs.existsSync(p)) { res.writeHead(200, { "content-type": "image/svg+xml" }); return res.end(fs.readFileSync(p)); }
		res.writeHead(404); return res.end("no");
	}
	res.writeHead(404); res.end("no");
}).listen(PORT, "127.0.0.1", () => console.log("fakebook on", PORT));
