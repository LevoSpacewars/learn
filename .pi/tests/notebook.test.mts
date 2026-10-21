// notebook: the store folds add/update/delete; the tagger (fake runner) titles, tags, links;
// his own title/tags win; Obsidian files + index are rebuilt; the web endpoints work with a fake pi.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.PI_PHONE_PORT = "8793";
process.env.PI_PHONE_BIND = "127.0.0.1";
const EXT = new URL("../extensions", import.meta.url).pathname;
const nb = await import(EXT + "/review/notebook.ts");
const store = await import(EXT + "/review/store.ts");

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "learn-nb-"));
fs.mkdirSync(path.join(cwd, ".learn"), { recursive: true });
fs.writeFileSync(
	path.join(cwd, ".learn", "learner.json"),
	JSON.stringify({ version: 1, lessons: [{ slug: "hdx", title: "HDX kinetics", status: "open", created: "", updated: "2026-10-01", file: "lessons/hdx.md", nodes: [{ id: "R1", label: "the rate constant", kind: "derived", check: "explain", status: "confirmed", hints: 0 }] }], misconceptions: [], calibration: [], sessions: [], goals: [], fundamentals: [], interests: [] }),
);

// 1. add → file + index, untagged
const a = nb.addNote(cwd, { text: "k is a rate: $k\\,dt$ is the chance per slice, not $k$ itself.", lesson: "hdx" });
assert.equal(a.tagged, false);
let notes = nb.loadNotes(cwd);
assert.equal(notes.length, 1);
assert.ok(notes[0].file?.startsWith("notebook/") && fs.existsSync(path.join(cwd, notes[0].file!)), "markdown copy written");
assert.equal(notes[0].updated, a.updated, "recording the file name is not an edit");
const idx = fs.readFileSync(path.join(cwd, "notebook", "Notebook.md"), "utf8");
assert.match(idx, /## Not tagged yet/);
assert.match(idx, /\[\[2026-\d\d-\d\d-k-is-a-rate[^\]|]*\|k is a rate: k dt is the chance per slice, not k itself\./);

// 2. tagger with a fake runner: fills title, tags, summary, concepts, lesson, related
const b = nb.addNote(cwd, { text: "Half-life is $\\ln 2 / k$, not $1/k$ (that is the mean lifetime).", title: "Half-life vs mean lifetime", tags: ["Mistake"] });
assert.deepEqual(b.tags, ["mistake"], "tags normalized");
assert.equal(b.tagged, true, "his own tags count as tagged");
let promptSeen = "";
const fake = async (prompt: string) => {
	promptSeen = prompt;
	return `Here you go:\n{"title": "Rate times slice width", "tags": ["HDX", "Rate Constant", "insight"], "lesson": "hdx", "concepts": ["the rate constant"], "summary": "A rate becomes a chance only over a slice of time.", "related": ["${b.id}", "nope"]}`;
};
const tagged = await nb.tagNote(cwd, a.id, fake);
assert.match(promptSeen, /existing tags \(count\)\nmistake \(1\)/, "tag vocabulary in the prompt");
assert.match(promptSeen, /hdx · HDX kinetics · the rate constant/, "lessons and concept labels in the prompt");
assert.match(promptSeen, new RegExp(`${b.id} · .* · Half-life vs mean lifetime · mistake`), "other notes with ids for related");
assert.equal(tagged.title, "Rate times slice width");
assert.deepEqual(tagged.tags, ["hdx", "rate-constant", "insight"]);
assert.equal(tagged.lesson, "hdx");
assert.deepEqual(tagged.concepts, ["the rate constant"]);
assert.deepEqual(tagged.related, [b.id], "unknown related ids dropped");
assert.equal(tagged.tagged, true);
// the file follows the title
assert.match(tagged.file!, /notebook\/2026-\d\d-\d\d-rate-times-slice-width\.md$/);
assert.equal(fs.existsSync(path.join(cwd, notes[0].file!)), false, "old file removed on retitle");
const md = fs.readFileSync(path.join(cwd, tagged.file!), "utf8");
assert.match(md, /^---\nid: n[a-z0-9]+\ncreated: .*\nupdated: .*\ntags: \["hdx", "rate-constant", "insight"\]\nlesson: hdx\nconcepts: \["the rate constant"\]\n---\n\n# Rate times slice width/);
assert.match(md, /lesson: \[\[HDX kinetics\]\]/);
assert.match(md, /> \[!abstract\] In short\n> A rate becomes a chance/);
assert.match(md, /\*\*Related:\*\* \[\[2026-\d\d-\d\d-half-life-vs-mean-lifetime\]\]/);

// 3. the tagger never removes his tags; his title wins
const c = await nb.tagNote(cwd, b.id, async () => '{"title": "Ignored", "tags": ["hdx"], "lesson": null, "concepts": [], "summary": "Mean lifetime is 1/k.", "related": []}');
assert.equal(c.title, "Half-life vs mean lifetime");
assert.deepEqual(c.tags, ["mistake", "hdx"]);
assert.equal(c.summary, "Mean lifetime is 1/k.");

// 4. index: by tag, by lesson, all
const idx2 = fs.readFileSync(path.join(cwd, "notebook", "Notebook.md"), "utf8");
assert.match(idx2, /### #hdx \(2\)/);
assert.match(idx2, /## By lesson\n\n### HDX kinetics\n\n- .*Rate times slice width/);
assert.doesNotMatch(idx2, /Not tagged yet/);

// 5. search, counts, slice lines
assert.equal(nb.searchNotes(nb.loadNotes(cwd), "lifetime").length, 1);
assert.equal(nb.searchNotes(nb.loadNotes(cwd), "slice chance").length, 1);
assert.deepEqual(nb.tagCounts(nb.loadNotes(cwd)).map((t: any) => t.tag), ["hdx", "insight", "mistake", "rate-constant"]);
const slice = store.learnerSlice(cwd, { lesson: "hdx" });
assert.match(slice, /## His notebook/);
assert.match(slice, /"Half-life vs mean lifetime" #mistake #hdx: Mean lifetime is 1\/k\./);

// 6. update by hand, then delete
const u = nb.updateNote(cwd, b.id, { tags: ["mistake"], text: "Half-life is $\\ln 2 / k$." });
assert.deepEqual(u.tags, ["mistake"]);
assert.ok(nb.deleteNote(cwd, a.id));
assert.equal(nb.loadNotes(cwd).length, 1);
assert.equal(fs.existsSync(path.join(cwd, tagged.file!)), false, "deleted note's file removed");
assert.equal(fs.readdirSync(path.join(cwd, "notebook")).filter((f) => f.endsWith(".md")).length, 2, "one note file + the index");

// 7. bad tagger output
await assert.rejects(nb.tagNote(cwd, b.id, async () => "I cannot do that."), /no JSON/);

// 8. web endpoints with a fake pi
const phoneMod = await import(EXT + "/phone-work/index.ts");
const handlers: Record<string, Function[]> = {};
const notices: string[] = [];
phoneMod.default({ on: (e: string, f: Function) => (handlers[e] ??= []).push(f), registerTool() {}, registerCommand() {}, registerShortcut() {}, events: { on() {}, emit() {} }, sendUserMessage() {}, appendEntry() {} } as any);
const theme = new Proxy({}, { get: () => (_a: any, b: any) => b });
const ctx = { cwd, hasUI: true, ui: { theme, setStatus() {}, notify: (m: string) => notices.push(m), setWidget() {} } };
for (const f of handlers.session_start ?? []) await f({}, ctx);
const sh = (globalThis as any).__learnPhone;
for (let i = 0; i < 40 && !sh.url; i++) await new Promise((r) => setTimeout(r, 50));
const token = new URL(sh.url).searchParams.get("t");
const base = `http://127.0.0.1:8793`;
const get = async (p: string) => (await fetch(`${base}${p}${p.includes("?") ? "&" : "?"}t=${token}`)).json();
const post = async (p: string, body: any) => { const r = await fetch(`${base}${p}?t=${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };

let v = await get("/notebook");
assert.equal(v.notes.length, 1);
assert.deepEqual(v.lessons, [{ slug: "hdx", title: "HDX kinetics" }]);
assert.equal(v.viewing, null);
const added = await post("/note", { text: "From the page", lesson: "hdx", tags: ["todo"] });
assert.equal(added.status, 200);
assert.equal(added.json.note.source, "web");
assert.deepEqual(added.json.note.tags, ["todo"]);
assert.ok(notices.some((m) => m.includes("Note saved from your device")), "terminal is told");
v = await get("/notebook");
assert.equal(v.notes[0].id, added.json.note.id, "newest first");
assert.equal(v.notes[0].lessonTitle, "HDX kinetics");
const upd = await post("/note/update", { id: added.json.note.id, title: "A todo", tags: ["todo", "hdx"] });
assert.equal(upd.json.note.title, "A todo");
assert.equal((await post("/note/update", { id: "nope", title: "x" })).status, 404);
assert.equal((await post("/note", { text: "   " })).status, 400);
const del = await post("/note/delete", { id: added.json.note.id });
assert.equal(del.status, 200);
assert.equal((await get("/notebook")).notes.length, 1);

for (const f of handlers.session_shutdown ?? []) await f({}, ctx);
console.log("notebook tests ok");
process.exit(0);
