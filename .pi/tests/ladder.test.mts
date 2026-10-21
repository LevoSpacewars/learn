// node --import ./register.mjs ladder.test.mts
import assert from "node:assert/strict";
const WT = new URL("../extensions", import.meta.url).pathname;
const ped = await import(`${WT}/review/pedagogy.ts`);
const { pedagogy, resetPedagogy, startLadder, endLadder, ladderReason, ladderOutcome, ladderNext, markRead, recordOutcome, gateReason, NEXTMOVE_RIGHT } = ped;
const { recallBlock } = await import(`${WT}/recall.ts`);

const p = pedagogy();
resetPedagogy(p);

// no ladder: ordinary checks pass, a stage is refused
assert.equal(ladderReason(p, { kind: "explain" }), undefined);
assert.match(ladderReason(p, { kind: "recall", stage: "nextmove" })!, /no node is on the ladder/);

// a reading is read: ladder starts at next-move
markRead(p, "mx", "D3", 2000);
const l = startLadder(p, "mx", "D3", "The matrix exponential e^{Qt}", "flaw");
assert.equal(l.stage, "nextmove");
assert.match(ladderReason(p, { kind: "explain", paper: true })!, /starts with next-move checks/);
assert.match(ladderReason(p, { kind: "recall", stage: "completion" })!, /next-move/);
assert.equal(ladderReason(p, { kind: "recall", stage: "nextmove" }), undefined);
assert.equal(ladderReason(p, { kind: "predict" }), undefined, "the pretest of the next node is never blocked");
assert.equal(ladderReason(p, { kind: "recall", cardId: "c1" }), undefined, "a review card mid-lesson is not a rung");

// through recallBlock (the real gate order): the reading gate is satisfied, the ladder speaks
assert.match(recallBlock(p, { kind: "boundary", prompt: "x" })!, /next-move/);
assert.equal(recallBlock(p, { kind: "recall", prompt: "What is the next move?", stage: "nextmove" }), undefined);

// two next-moves must land (or three asked)
assert.match(ladderOutcome(p, { kind: "recall", stage: "nextmove", correct: false })!, /1 asked|0\/2 landed|next-move/);
assert.equal(l.stage, "nextmove");
ladderOutcome(p, { kind: "recall", stage: "nextmove", correct: true });
assert.equal(l.stage, "nextmove", "one landed, one more needed");
const toCompletion = ladderOutcome(p, { kind: "recall", stage: "nextmove", correct: true })!;
assert.equal(l.stage, "completion");
assert.match(toCompletion, /completion problem/);
assert.equal(l.nextmove.asked, 3);
assert.equal(l.nextmove.right, 2);

// completion rung: one landed advances to the assigned check (flaw)
assert.match(ladderReason(p, { kind: "flaw" })!, /completion problem/);
assert.equal(ladderReason(p, { kind: "recall", stage: "nextmove" }), undefined, "one more next-move is allowed");
assert.equal(ladderReason(p, { kind: "recall", stage: "completion" }), undefined);
ladderOutcome(p, { kind: "recall", stage: "completion", correct: true });
assert.equal(l.stage, "check");
assert.match(ladderReason(p, { kind: "boundary" })!, /assigned check .* is "flaw"/);
assert.match(ladderReason(p, { kind: "recall", stage: "completion" })!, /rungs .* are done/);
assert.equal(ladderReason(p, { kind: "flaw" }), undefined);

// the check misses: stays on check (the usual drill-down applies); lands: explain is due
assert.match(ladderOutcome(p, { kind: "flaw", correct: false })!, /The check missed/);
assert.equal(l.stage, "check");
ladderOutcome(p, { kind: "flaw", correct: true });
assert.equal(l.stage, "explain");
assert.match(ladderReason(p, { kind: "explain" })!, /^Refused: the explain-back is a derivation on paper/);
assert.match(ladderReason(p, { kind: "recall" })!, /only check left .* explain-back/);
assert.equal(ladderReason(p, { kind: "explain", paper: true }), undefined);
assert.equal(ladderReason(p, { kind: "recall", stage: "completion" }), undefined, "one more completion before the derivation is fine");

// the derivation misses: restart at completion, no lecture (miss streak cleared)
recordOutcome(p, { correct: false, prompt: "derive", verdict: "incorrect" });
recordOutcome(p, { correct: false, prompt: "derive", verdict: "incorrect" });
assert.equal(p.missStreak, 2);
const restart = ladderOutcome(p, { kind: "explain", correct: false })!;
assert.match(restart, /^The derivation did not land \(restart 1\)/);
assert.equal(l.stage, "completion");
assert.equal(p.missStreak, 0, "no forced lecture after a derivation miss");
assert.equal(gateReason(p, "fill the blank"), undefined);
assert.equal(l.completion.asked, 0);

// back up: completion lands → check already done? No: the check rung repeats only if assigned; here it goes check again
ladderOutcome(p, { kind: "recall", stage: "completion", correct: true });
assert.equal(l.stage, "check", "after a restart the assigned check is run again");
ladderOutcome(p, { kind: "flaw", correct: true });
assert.equal(l.stage, "explain");
const done = ladderOutcome(p, { kind: "explain", correct: true })!;
assert.match(done, /ladder .* is complete/);
assert.equal(p.ladder, undefined);
assert.equal(ladderReason(p, { kind: "boundary" }), undefined, "no ladder: free again");

// a node whose check is explain or predict has no check rung
startLadder(p, "mx", "R", "Handles", "predict");
ladderOutcome(p, { kind: "recall", stage: "nextmove", correct: true });
ladderOutcome(p, { kind: "recall", stage: "nextmove", correct: true });
ladderOutcome(p, { kind: "recall", stage: "completion", correct: true });
assert.equal(p.ladder!.stage, "explain");
assert.match(ladderNext(p.ladder!), /ON PAPER/);

// lesson_node for that node ends it; for another node it does not; a plan change ends any
endLadder(p, "mx", "D1");
assert.ok(p.ladder);
endLadder(p, "mx", "R");
assert.equal(p.ladder, undefined);
startLadder(p, "mx", "D4", "Spectrum", "boundary");
endLadder(p, "other");
assert.ok(p.ladder, "another lesson's node does not end it");
endLadder(p, "mx");
assert.equal(p.ladder, undefined);

// re-reading the same node (a worked example after misses) keeps the ladder where it was
const l2 = startLadder(p, "mx", "D4", "Spectrum", "boundary");
ladderOutcome(p, { kind: "recall", stage: "nextmove", correct: true });
ladderOutcome(p, { kind: "recall", stage: "nextmove", correct: true });
assert.equal(l2.stage, "completion");
assert.equal(startLadder(p, "mx", "D4"), l2);
assert.equal(l2.stage, "completion");
assert.equal(NEXTMOVE_RIGHT, 2);

console.log("ladder.test.mts: ok");
