// node --import ./register.mjs book.test.mts
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const WT = new URL("../extensions", import.meta.url).pathname;
const { bookMarkdown, mapWithoutIds, nameNodeIds, recordReading, loadReadings, readingsFor, writeBook, writeAllBooks, bookList, importSessionReadings, sessionsDirFor } = await import(`${WT}/review/book.ts`);

// ---- historic ids inside readings become section references
const mxNodes = [{ id: "R", label: "Handles" }, { id: "D1", label: "Along an eigenvector" }, { id: "D2", label: "Superposition: $p(t)$" }];
assert.equal(nameNodeIds("D2 gives you a recipe. It hangs off D1 ($v_i Q = \\lambda_i v_i$) and $$D1$$; see D2's boundary case.", mxNodes), "§3 (Superposition: $p(t)$) gives you a recipe. It hangs off §2 (Along an eigenvector) ($v_i Q = \\lambda_i v_i$) and $$D1$$; see §3 (Superposition: $p(t)$)'s boundary case.");
assert.equal(nameNodeIds("The R handle and D10", mxNodes), "The R handle and D10");
const { demoteHeadings } = await import(`${WT}/review/book.ts`);
assert.equal(demoteHeadings("## Why now\n\ntext\n\n### Sub\n\n```\n## not a heading\n```\n\n##### deep\n#nospace"), "#### Why now\n\ntext\n\n##### Sub\n\n```\n## not a heading\n```\n\n###### deep\n#nospace");
assert.equal(bookMarkdown(undefined, "x", [{ at: "", slug: "x", node: "A", title: "t", body: "D1 stays: no plan" }]).includes("D1 stays"), true, "without a plan there is nothing to name");
const { findNodeIds, nodeIdReason } = await import(`${WT}/review/pedagogy.ts`);
const { learnerFields } = await import(`${WT}/recall.ts`);
const { lessonNoteFiles } = await import(`${WT}/review/sidechat.ts`);
const { sizeBatch } = await import(`${WT}/review/index.ts`); assert.deepEqual(sizeBatch([{k:"problem"},{k:"problem"},{k:"problem"},{k:"problem"},{k:"recall"}], (c: any) => c.k, undefined).map((c: any) => c.k), ["problem","problem","problem","recall"], "count-based: at most three problems, no clock");

const lessons = [
	{ slug: "mx", nodes: [{ id: "R", label: "Handles: scalar ODE and eigenvector" }, { id: "D1", label: "Along an eigenvector the ODE collapses" }, { id: "D2", label: "Superposition: p(t) = Σ c_i e^{λ_i t} v_i" }, { id: "D3", label: "e^{Qt}: definition, series" }, { id: "G", label: "Slow eigenvalue = k_obs" }] },
	{ slug: "hdx", nodes: [{ id: "R1", label: "rate = prob k·dt" }, { id: "EX1", label: "would collide with the regime name" }] },
];

// ---- node ids in learner text
assert.deepEqual(findNodeIds("Pick up the lesson at D3, the matrix exponential?", lessons).map((h) => h.id), ["D3"]);
assert.deepEqual(findNodeIds("Relate it to D1, which you already own, then D2.", lessons).map((h) => h.id), ["D1", "D2"]);
assert.deepEqual(findNodeIds("Vitamin D3 is unrelated but still flagged", lessons).map((h) => h.id), ["D3"], "a bare D3 is always a leak in this vault");
assert.deepEqual(findNodeIds("$D_1$ and $v_1 Q = \\lambda_1 v_1$ and $$D1$$ are math", lessons), [], "math is skipped");
assert.deepEqual(findNodeIds("The G node and the R handle", lessons), [], "lone letters are never matched");
assert.deepEqual(findNodeIds("EX1 and EX2 regimes", lessons).map((h) => h.id), ["EX1"], "ids with digits match even when they collide; keep such ids out of plans");
assert.deepEqual(findNodeIds("D10, ABD1, D1x and \\D1 are not matches", lessons), [], "word boundaries");
assert.equal(nodeIdReason({ say: "Good.", prompt: "Explain superposition" }, lessons), undefined);
const reason = nodeIdReason({ question: "Pick up at D3?", options: "Ready, give me the D3 reading" }, lessons)!;
assert.match(reason, /^Refused: node ids are internal/);
assert.match(reason, /"D3" \(in question\) is the node "e\^\{Qt\}: definition, series"/);
assert.doesNotMatch(reason, /D3" \(in options\)/, "each id reported once");

// ---- learner-visible fields per tool
assert.deepEqual(learnerFields("ask_user_question", { question: "q", details: "d", options: [{ label: "a", description: "x" }, { label: "b" }] }), { question: "q", details: "d", options: "a — x\nb" });
assert.deepEqual(learnerFields("recall", { say: "s", prompt: "p", reference: "D3 is fine here" }), { say: "s", prompt: "p" });
assert.deepEqual(learnerFields("lesson_read", { title: "t", body: "b", slug: "mx", node: "D3" }), { title: "t", body: "b" });
assert.deepEqual(learnerFields("session_close", { note: "n" }), { note: "n" });
assert.deepEqual(learnerFields("lesson_status", { summary: "s", status: "paused" }), { summary: "s" });
assert.deepEqual(learnerFields("lesson_node", { id: "D3", note: "D3 shaky" }), {}, "bookkeeping tools are not checked");

// ---- the map without ids
assert.equal(mapWithoutIds('graph TD\n  R1["R1: rate = prob"] --> D1["D1: bookkeeping"]\n  D1 --> G["G: goal"]', ["R1", "D1", "G"]), 'graph TD\n  R1["rate = prob"] --> D1["bookkeeping"]\n  D1 --> G["goal"]');
assert.equal(mapWithoutIds("graph TD\n  R[Handles: dc/dt; v ≠ 0 (row)] --> D1[Along an eigenvector]", ["R", "D1"]), 'graph TD\n  R["Handles: dc/dt; v ≠ 0 (row)"] --> D1["Along an eigenvector"]', "labels without an id prefix are kept, and quoted so mermaid can parse them");
assert.equal(mapWithoutIds('graph TD\n  A["say \\"hi\\""] --> B[x "y"]', ["A", "B"]), 'graph TD\n  A["say \\"hi\\""] --> B["x #quot;y#quot;"]');

// ---- a vault on disk
const vault = fs.mkdtempSync(path.join(os.tmpdir(), "book-"));
fs.mkdirSync(path.join(vault, ".learn"));
fs.mkdirSync(path.join(vault, "lessons"));
const learner = {
	version: 3,
	lessons: [
		{ slug: "mx", title: "Matrix exponential for linear ODEs", file: "lessons/matrix-exponential-for-linear-odes.md", goal: "Solve ṗ = pQ exactly", plan: 'graph TD\n  R["R: Handles"] --> D1["D1: Along an eigenvector"]\n  D1 --> D2["D2: Superposition"]', status: "paused", created: "2026-10-15T00:00:00Z", updated: "2026-10-18T00:00:00Z",
			nodes: [{ id: "R", label: "Handles: scalar ODE and eigenvector", kind: "foundation", check: "predict", status: "confirmed", hints: 0 }, { id: "D1", label: "Along an eigenvector the ODE collapses", kind: "derived", check: "explain", status: "confirmed", hints: 0 }, { id: "D2", label: "Superposition", kind: "derived", check: "boundary", status: "shaky", hints: 2 }, { id: "D3", label: "The matrix exponential e^{Qt}", kind: "derived", check: "flaw", status: "pending", hints: 0 }] },
	],
	goals: [], fundamentals: [], misconceptions: [], calibration: [], sessions: [], interests: [],
};
fs.writeFileSync(path.join(vault, ".learn", "learner.json"), JSON.stringify(learner));
for (const n of ["matrix-exponential-for-linear-odes.md", "matrix-exponential-for-linear-odes-2026-10-18.md", "matrix-exponential-for-linear-odes-2026-10-18-2.md", "matrix-exponential-for-linear-odes-notes.md"]) fs.writeFileSync(path.join(vault, "lessons", n), "# x\n");
assert.deepEqual(lessonNoteFiles(vault, learner.lessons[0]).map((f) => path.basename(f)), ["matrix-exponential-for-linear-odes.md", "matrix-exponential-for-linear-odes-2026-10-18.md", "matrix-exponential-for-linear-odes-2026-10-18-2.md"]);
assert.deepEqual(lessonNoteFiles(vault, { slug: "nope" }), []);

assert.equal(writeBook(vault, "nothing"), undefined, "no lesson, no readings: no book");
const T = "2026-10-17T00:00:00.000Z";
assert.equal(recordReading(vault, { slug: "mx", node: "D1", title: "Along an eigenvector", body: "Body one $x$.", at: T }), true);
assert.equal(recordReading(vault, { slug: "mx", node: "D1", title: "Along an eigenvector", body: "Body one $x$.", at: T }), false, "same text twice is kept once");
assert.equal(recordReading(vault, { slug: "mx", node: "D2", title: "Superposition", body: "First attempt.", at: T }), true);
assert.equal(recordReading(vault, { slug: "mx", node: "D2", title: "Superposition", body: "Revised body.", figure: "viz/modes.svg", at: T }), true);
assert.equal(recordReading(vault, { slug: "mx", node: "D2", title: "When no coefficients exist", body: "Worked example.", at: T }), true);
assert.equal(recordReading(vault, { slug: "mx", node: "X9", title: "A stray reading", body: "Not in the plan.", at: "2026-10-18T01:00:00.000Z" }), true);
assert.equal(recordReading(vault, { slug: "other", node: "D1", title: "Other lesson", body: "No plan for this slug.", at: "2026-10-18T02:00:00.000Z" }), true);
assert.equal(loadReadings(vault).length, 6);
const rs = readingsFor(loadReadings(vault), "mx");
assert.deepEqual(rs.map((r) => `${r.node}/${r.title}`), ["D1/Along an eigenvector", "D2/Superposition", "D2/When no coefficients exist", "X9/A stray reading"]);
assert.equal(rs[1].body, "Revised body.", "a later reading with the same title replaces the earlier one");

const file = writeBook(vault, "mx")!;
assert.equal(file, path.join(vault, "book", "mx.md"));
const md = fs.readFileSync(file, "utf8");
assert.match(md, /^---\nslug: mx\ntitle: "Matrix exponential for linear ODEs"\nreadings: 4\n/);
assert.match(md, /# Matrix exponential for linear ODEs\n\n\*The book of this lesson/);
assert.match(md, /\*\*Goal\.\*\* Solve ṗ = pQ exactly/);
assert.match(md, /## Map\n\n```mermaid\ngraph TD\n  R\["Handles"\] --> D1\["Along an eigenvector"\]\n  D1 --> D2\["Superposition"\]\n```/);
assert.match(md, /## Contents\n\n1\. Handles: scalar ODE and eigenvector \*\(not written yet\)\*\n2\. Along an eigenvector the ODE collapses\n3\. Superposition\n4\. The matrix exponential e\^\{Qt\} \*\(not written yet\)\*/);
assert.match(md, /## 2\. Along an eigenvector the ODE collapses\n\n### Along an eigenvector\n\nBody one \$x\$\.\n\n## 3\. Superposition\n\n### Superposition\n\nRevised body\.\n\n!\[\[viz\/modes\.svg\|600\]\]\n\n### When no coefficients exist\n\nWorked example\./);
assert.match(md, /## Other readings\n\n### A stray reading\n\nNot in the plan\./);
assert.doesNotMatch(md, /## 1\. Handles/, "nodes without a reading get no section");
assert.doesNotMatch(md.replace(/^---[\s\S]*?---\n/, "").replace(/```mermaid[\s\S]*?```/, ""), /\bD[0-9]\b/, "no node ids in the book text");

const all = writeAllBooks(vault).map((f) => path.basename(f)).sort();
assert.deepEqual(all, ["mx.md", "other.md"]);
const other = fs.readFileSync(path.join(vault, "book", "other.md"), "utf8");
assert.match(other, /# other\n/);
assert.match(other, /## Readings\n\n### Other lesson\n\nNo plan for this slug\./);
const list = bookList(vault);
assert.deepEqual(list.map((b) => [b.slug, b.readings, b.file]), [["other", 1, "book/other.md"], ["mx", 4, "book/mx.md"]], "most recently touched first");
assert.equal(list[1].title, "Matrix exponential for linear ODEs");

// ---- backfill from transcripts
const sdir = path.join(vault, "sessions");
fs.mkdirSync(sdir);
const line = (o: any) => JSON.stringify(o) + "\n";
fs.writeFileSync(
	path.join(sdir, "a.jsonl"),
	line({ type: "session", version: 3 }) +
		line({ type: "message", timestamp: "2026-10-17T02:00:00Z", message: { role: "assistant", content: [{ type: "toolCall", id: "c1", name: "lesson_read", arguments: { slug: "mx", node: "D3", title: "The propagator", body: "Shown and read.", figure: "viz/p.svg" } }] } }) +
		line({ type: "message", message: { role: "toolResult", toolCallId: "c1", toolName: "lesson_read", content: [{ type: "text", text: 'He read "The propagator" and tapped "Read it, ask me".' }] } }) +
		line({ type: "message", timestamp: "2026-10-17T02:10:00Z", message: { role: "assistant", content: [{ type: "toolCall", id: "c2", name: "lesson_read", arguments: { slug: "mx", node: "D3", title: "Too short", body: "x" } }] } }) +
		line({ type: "message", message: { role: "toolResult", toolCallId: "c2", toolName: "lesson_read", content: [{ type: "text", text: "Refused: the reading is 1 characters; it needs at least 1200." }] } }) +
		line({ type: "message", timestamp: "2026-10-17T02:20:00Z", message: { role: "assistant", content: [{ type: "toolCall", id: "c3", name: "lesson_read", arguments: { slug: "mx", node: "D1", title: "Along an eigenvector", body: "Body one $x$." } }] } }) +
		line({ type: "message", message: { role: "toolResult", toolCallId: "c3", toolName: "lesson_read", content: [{ type: "text", text: "He closed the reading without marking it read (Esc)." }] } }) +
		"not json\n",
);
const imp = importSessionReadings(vault, sdir);
assert.deepEqual(imp, { files: 1, found: 2, added: 1 }, "the refused one is skipped, the duplicate of an existing reading is not added twice");
const d3 = loadReadings(vault).find((r) => r.node === "D3")!;
assert.equal(d3.at, "2026-10-17T02:00:00Z");
assert.equal(d3.figure, "viz/p.svg");
assert.deepEqual(importSessionReadings(vault, path.join(vault, "missing")), { files: 0, found: 0, added: 0 });
assert.equal(sessionsDirFor("/Users/alexanderpatapoff/learn", "/Users/alexanderpatapoff"), "/Users/alexanderpatapoff/.pi/agent/sessions/--Users-alexanderpatapoff-learn--");
writeBook(vault, "mx");
assert.match(fs.readFileSync(file, "utf8"), /## 4\. The matrix exponential e\^\{Qt\}\n\n### The propagator\n\nShown and read\.\n\n!\[\[viz\/p\.svg\|600\]\]/);


fs.rmSync(vault, { recursive: true, force: true });
console.log("book.test.mts: ok");
