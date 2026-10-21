// Live: the real tagger (a `pi -p` process, calls the model) on a HANDWRITTEN note in a throwaway
// vault. The page is synthesized with headless Chrome in a handwriting font (no scanner needed).
//   node --import ./register.mjs notebook.live.mts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const nb = await import("../extensions/review/notebook.ts");
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "learn-nb-live-"));
fs.mkdirSync(path.join(cwd, ".learn"), { recursive: true });
fs.mkdirSync(path.join(cwd, ".pi"), { recursive: true });
fs.copyFileSync(path.join(os.homedir(), "learn", ".pi", "settings.json"), path.join(cwd, ".pi", "settings.json"));
fs.writeFileSync(
	path.join(cwd, ".learn", "learner.json"),
	JSON.stringify({ version: 1, lessons: [{ slug: "hdx", title: "HDX kinetics", status: "open", created: "", updated: "2026-10-01", nodes: [{ id: "R1", label: "the rate constant", kind: "derived", check: "explain", status: "confirmed", hints: 0 }, { id: "D1", label: "survival as e^{-kt}", kind: "derived", check: "explain", status: "pending", hints: 0 }] }], misconceptions: [], calibration: [], sessions: [], goals: [], fundamentals: [], interests: [] }),
);
nb.addNote(cwd, { text: "Half-life is $\\ln 2 / k$, not $1/k$ (that one is the mean lifetime).", title: "Half-life vs mean lifetime", tags: ["mistake", "hdx"] });

// a "handwritten" page: Bradley Hand, slightly rotated lines, a sketched curve
const html = `<!doctype html><body style="margin:0;background:#fff"><div style="width:1100px;padding:50px;font:38px 'Bradley Hand', 'Chalkboard SE', cursive;color:#223;line-height:1.5">
<div style="transform:rotate(-1deg)">rate k is per second</div>
<div style="transform:rotate(0.6deg)">chance in a slice = k · dt   (NOT k !!)</div>
<div style="transform:rotate(-0.4deg);margin-left:40px">so  dU/dt = -k U  →  U(t) = U₀ e^(-kt)</div>
<div style="transform:rotate(0.8deg)">half life = ln2 / k  ≈ 0.69/k</div>
<svg width="520" height="220" style="margin:20px 0 0 60px"><path d="M20 20 C 120 30, 200 150, 480 190" stroke="#223" stroke-width="3" fill="none"/><line x1="20" y1="200" x2="500" y2="200" stroke="#223" stroke-width="2"/><line x1="20" y1="10" x2="20" y2="200" stroke="#223" stroke-width="2"/><text x="440" y="180" font-family="Bradley Hand" font-size="30">t</text><text x="30" y="30" font-family="Bradley Hand" font-size="30">U</text></svg>
<div style="transform:rotate(-0.7deg)">Q: why ln2 and not 1 ??</div></div></body>`;
const htmlFile = path.join(cwd, "page.html");
fs.writeFileSync(htmlFile, html);
const png = path.join(cwd, "page.png");
execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless", "--disable-gpu", "--hide-scrollbars", `--screenshot=${png}`, "--window-size=1200,900", `file://${htmlFile}`], { stdio: "ignore" });
const id = nb.newNoteId();
const pages = nb.saveNoteImages(cwd, id, [{ data: fs.readFileSync(png).toString("base64"), mimeType: "image/png" }]);
const a = nb.addNote(cwd, { id, text: "", images: pages, lesson: "hdx" });
const t0 = Date.now();
const n = await nb.tagNote(cwd, a.id);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(JSON.stringify({ title: n?.title, tags: n?.tags, lesson: n?.lesson, concepts: n?.concepts, summary: n?.summary, related: n?.related }, null, 1));
console.log("--- transcript ---\n" + n?.transcript);
console.log("--- file ---\n" + fs.readFileSync(path.join(cwd, n!.file!), "utf8"));
console.log("page image:", png);
process.exit(0);
