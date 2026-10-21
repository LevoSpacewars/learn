// Serves the worktree's page.html with a fake /lesson and a fake pending
// prompt (PENDING=read | say | predict), so the cards can be screenshotted and
// clicked without running pi. Answers are appended to ANSWERS (a log file).
import http from "node:http";
import fs from "node:fs";
const WT = new URL("../extensions/phone-work", import.meta.url).pathname;
const TMP = new URL("./tmp", import.meta.url).pathname;
const PORT = Number(process.env.PORT || 8799);
const ANSWERS = process.env.ANSWERS || TMP + "/fake-answers.log";
const started = Date.now();
const BODY = [
	"Every site in the protein is either still protected ($U$) or already exchanged. In one thin slice of time $dt$, each protected site exchanges with chance $k\\,dt$. Why a product? Because $k$ is a rate (per second), and a rate becomes a chance only once you say *how long* you watch.",
	"",
	"**Derivation.** Out of $U(t)$ protected sites, the expected number lost in the slice is $k\\,dt \\cdot U(t)$. So",
	"$$U(t+dt) = U(t)\\,(1 - k\\,dt) \\quad\\Longrightarrow\\quad \\frac{U(t+dt)-U(t)}{dt} = -k\\,U(t).$$",
	"Let $dt \\to 0$: $\\dfrac{dU}{dt} = -kU$, whose solution is $U(t) = U_0 e^{-kt}$.",
	"",
	"**Worked instance.** $k = 3\\ \\mathrm{s^{-1}}$, $U_0 = 1000$, $t = 0.5$ s. Chop into $n = 1000$ slices of $dt = 0.0005$ s: each slice keeps $1 - 0.0015$ of the pool, so $U = 1000 \\cdot 0.9985^{1000} \\approx 223$. The formula gives $1000\\,e^{-1.5} \\approx 223$. Same number: the slices *are* the exponential.",
	"",
	"**What it hangs off.** The rate definition from R1 ($k\\,dt$ is the chance per slice) and the product rule for independent slices (D1).",
].join("\n");
const PEND = {
	read: { id: "read1", kind: "read", prompt: "## Why the pool decays as $e^{-kt}$\n\n" + BODY, startedAt: started, options: [{ index: 1, label: "Read it, ask me" }], figure: "viz/decay.svg" },
	say: { id: "p2", kind: "explain", prompt: "In one line: why is the chance of exchange in a slice $k\\,dt$ and not $k$?", startedAt: started, paper: false, say: "Close: you multiplied the two rates. A rate becomes a chance only once you fix how long you watch, so the slice width $dt$ has to appear." },
	predict: { id: "p3", kind: "predict", prompt: "If $k$ doubles, what happens to the half-life? One line.", startedAt: started, paper: false, say: "Quick one before the reading.", banner: "Quick guess: one line, under two minutes, no derivation. Being wrong is fine; committing is the point." },
};
const LESSON = "# HDX kinetics\n\n> [!abstract] PI\n\n## Reading — Why the pool decays as $e^{-kt}$\n\n" + BODY + "\n\n![[viz/decay.svg|600]]\n\n> [!example] Reading — read ✓\n> Read it; ready for the question.\n\n> [!abstract] PI\n\nClose: you multiplied the two rates.\n\n> [!question] Recall — Predict\n> If $k$ doubles, what happens to the half-life?\n>\n> *Quick guess: one line, under two minutes, no derivation.*\n";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="220" viewBox="0 0 560 220"><rect width="560" height="220" fill="#fff"/><path d="M40 20 Q 160 170 520 196" stroke="#2f6fde" stroke-width="3" fill="none"/><line x1="40" y1="200" x2="530" y2="200" stroke="#888"/><line x1="40" y1="10" x2="40" y2="200" stroke="#888"/><text x="300" y="120" font-family="sans-serif" font-size="14" fill="#333">U(t) = U0 e^(-kt)</text></svg>';
http.createServer((req, res) => {
	const u = new URL(req.url, "http://x");
	const j = (o) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
	if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(WT + "/page.html", "utf8")); }
	if (u.pathname === "/scratch.js") { res.writeHead(200, { "content-type": "application/javascript" }); return res.end(fs.readFileSync(WT + "/scratch.js", "utf8")); }
	if (u.pathname === "/ping") return j({ ok: true });
	if (u.pathname === "/lesson") {
		const md = LESSON.replace(/!\[\[([^\]|]+)(?:\|(\d+))?\]\]/g, (m, name, w) => `![${name}](/file?p=${encodeURIComponent(name)}${w ? `#w=${w}` : ""})`);
		return j({ file: "lessons/hdx.md", title: "hdx-kinetics", markdown: md, mtime: 1 });
	}
	if (u.pathname === "/file") { res.writeHead(200, { "content-type": "image/svg+xml" }); return res.end(SVG); }
	if (u.pathname === "/prompt") return j({ now: Date.now(), pending: process.env.NOPENDING ? null : PEND[process.env.PENDING || "read"], last: null });
	if (u.pathname === "/upload" || u.pathname === "/answer") { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { fs.appendFileSync(ANSWERS, u.pathname + " " + b + "\n"); j({ ok: true, answered: true }); }); return; }
	res.writeHead(404); res.end();
}).listen(PORT, "127.0.0.1", () => console.log("fake server on", PORT));
