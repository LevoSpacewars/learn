import assert from "node:assert/strict";
const WT = new URL("../extensions", import.meta.url).pathname;
const { lastSessionNote, nextLine, preferredOption, orderOptions, namesLesson } = await import(WT + "/start-menu.ts");
const { readBodyReason, READ_MIN_CHARS, predictReason, isReady } = await import(WT + "/review/pedagogy.ts");

// last night's real closing note (shape): "Next:" names new material and EX1/EX2
const note = "Review 2026-10-12, 5 cards, all Markov/HDX kinetics. vP computed cleanly.\nHarness note: the recall gate only registers short text.\nNext: lead with new material (EX1/EX2 from the master equation) and fold these checks in briefly; re-test Q diagonal/trap row and flow balance once each, not as drills.";
const store = { sessions: [{ note: "old. Next: review cards" }, { note }, { note: "" }] } as any;
assert.equal(lastSessionNote(store), note, "most recent session WITH a note");
assert.match(nextLine(note)!, /^Next: lead with new material \(EX1\/EX2/);
assert.equal(nextLine("no next line here"), undefined);
assert.equal(nextLine(undefined), undefined);

const REVIEW = "Review (5 due)";
const C1 = "Continue: EX1/EX2 from the master equation (1/7)";
const NEXT = "Next on the path: attempt EX1 (HDX)";
const base = [REVIEW, C1, NEXT, "Bring something (paper, idea, question)", "Learn something new", "Get oriented (summary + knowledge map)"];
const continues = [{ label: C1, slug: "m-hdx-ex1-ex2", title: "EX1/EX2 from the master equation" }];
const next = { label: NEXT, titles: ["", "EX1 two-state exchange", ""] };

// names the open lesson -> Continue first, Review second
let pref = preferredOption(nextLine(note), { continues, next });
assert.equal(pref, C1);
assert.deepEqual(orderOptions(base, pref, REVIEW), [C1, REVIEW, NEXT, ...base.slice(3)]);
assert.ok(namesLesson("Next: EX1/EX2 from the master equation", continues[0]));
assert.ok(!namesLesson("Next: re-test the Q diagonal", continues[0]));

// generic "new material", no lesson named -> first Continue
pref = preferredOption("Next: new material, keep checks brief", { continues: [{ label: "Continue: Something (0/3)", slug: "something-else", title: "Something" }], next });
assert.equal(pref, "Continue: Something (0/3)");
// no open lessons -> Next on the path
pref = preferredOption("Next: lead with new material", { continues: [], next });
assert.equal(pref, NEXT);
assert.deepEqual(orderOptions([REVIEW, NEXT, "Learn something new"], pref, REVIEW), [NEXT, REVIEW, "Learn something new"]);
// path title named
assert.equal(preferredOption("Next: EX1 two-state exchange, then G", { continues: [], next }), NEXT);
// review-ish or no note -> keep the current order
assert.equal(preferredOption("Next: review the Q-matrix cards once more", { continues, next }), undefined);
assert.equal(preferredOption(undefined, { continues, next }), undefined);
assert.deepEqual(orderOptions(base, undefined, REVIEW), base);
// no cards due: no Review option, preferred still first
assert.deepEqual(orderOptions(base.slice(1), C1, undefined), base.slice(1));

// lesson_read body minimum
assert.match(readBodyReason("short")!, /textbook page, not a paragraph: derivation, worked instance, connection/);
assert.match(readBodyReason("x".repeat(READ_MIN_CHARS - 1))!, /1199 characters/);
assert.equal(readBodyReason("x".repeat(READ_MIN_CHARS)), undefined);
// predict
assert.match(predictReason("Guess?", true)!, /paper/);
assert.match(predictReason("y".repeat(401), false)!, /401 characters/);
assert.equal(predictReason("If k doubles, the half-life? One line.", false), undefined);
// ready labels used by the reading flow
for (const t of ["Read it, ask me", "Ready, ask me", "ready"]) assert.ok(isReady(t), t);
for (const t of ["I have another question", "read it again please, what is dt"]) assert.ok(!isReady(t), t);
console.log("menu + rules tests ok");
