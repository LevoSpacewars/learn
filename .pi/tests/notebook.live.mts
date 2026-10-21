// Live: runs the real tagger (a `pi -p` process, calls the model) on one note in a throwaway vault.
//   node --import ./register.mjs notebook.live.mts
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
const a = nb.addNote(cwd, { text: "I keep multiplying the two rates. A rate only becomes a chance once I say how long I watch: the slice width $dt$ has to appear, so it is $k\\,dt$, not $k$.", lesson: "hdx" });
const t0 = Date.now();
const n = await nb.tagNote(cwd, a.id);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(JSON.stringify({ title: n?.title, tags: n?.tags, lesson: n?.lesson, concepts: n?.concepts, summary: n?.summary, related: n?.related }, null, 1));
console.log(fs.readFileSync(path.join(cwd, n!.file!), "utf8"));
process.exit(0);
