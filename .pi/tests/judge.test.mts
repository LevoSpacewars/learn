import assert from "node:assert/strict";
const W = new URL("../extensions", import.meta.url).pathname;
const { gateReason, isMiss, clearMiss, recordOutcome, resetPedagogy, pedagogy, MISS_SCORE } = await import(`${W}/review/pedagogy.ts`);
const { parseJson, buildGraderPrompt } = await import(`${W}/review/grader.ts`);
const { sizeBatch } = await import(`${W}/review/index.ts`);
const { ratingFor } = await import(`${W}/recall.ts`);

// ---- isMiss: partial with the substance right is not a miss
assert.equal(isMiss("correct", 1), false);
assert.equal(isMiss("partial", 0.6), false, "0.6 partial is a note");
assert.equal(isMiss("partial", 0.75), false);
assert.equal(isMiss("partial", 0.3), true, "0.3 partial is a miss");
assert.equal(isMiss("partial", undefined), true, "no score: assume miss");
assert.equal(isMiss("incorrect", 0.9), true);
assert.equal(isMiss("dontKnow"), true);
assert.equal(MISS_SCORE, 0.6);

// ---- review mode gate: diagnosis only, never a forced worked example, no part counting
const review = { missStreak: 2, sinceMissChars: 0, reviewMode: true, lastMiss: { prompt: "x", firstError: "no numbers", verdict: "incorrect" } } as any;
assert.match(gateReason(review, "Next card?")!, /read nothing from you/);
assert.doesNotMatch(gateReason(review, "Next card?")!, /WORKED EXAMPLE/);
assert.equal(gateReason({ ...review, sinceMissChars: 80 }, "1. a?\n2. b?\n3. c?"), undefined, "review: multi-part allowed after a diagnosis");
assert.equal(gateReason({ ...review, sinceMissChars: 0 }, "Next card?", 70), undefined, "say counts as the diagnosis");

// teach mode unchanged
const teach = { ...review, reviewMode: false };
assert.match(gateReason(teach, "One step?")!, /WORKED EXAMPLE/);
assert.match(gateReason({ ...teach, sinceMissChars: 400 }, "1. a?\n2. b?\n3. c?")!, /3 parts/);

// ---- clearMiss / recordOutcome with the threshold
resetPedagogy();
const p = pedagogy();
recordOutcome(p, { correct: !isMiss("partial", 0.3), prompt: "q", verdict: "partial", firstError: "e" });
assert.equal(p.missStreak, 1);
recordOutcome(p, { correct: !isMiss("partial", 0.7), prompt: "q", verdict: "partial" });
assert.equal(p.missStreak, 0, "a minor partial resets the streak like a correct answer");
recordOutcome(p, { correct: false, prompt: "q", verdict: "incorrect" });
recordOutcome(p, { correct: false, prompt: "q", verdict: "incorrect" });
assert.equal(p.missStreak, 2);
clearMiss(p);
assert.equal(p.missStreak, 0);
assert.equal(p.lastMiss, undefined);
assert.equal(gateReason(p, "anything"), undefined, "override cleared the gate");
resetPedagogy();
assert.equal(pedagogy().reviewMode, false, "reset clears review mode");

// ---- grader: prompt wording and the attempted flag
const prompt = buildGraderPrompt({ kind: "recall", prompt: "Q", reference: "R", cwd: "/tmp" });
assert.match(prompt, /Grade the SUBSTANCE/);
assert.match(prompt, /Secondary omissions are NOTES/);
assert.match(prompt, /"attempted": true \| false/);
assert.doesNotMatch(prompt, /audited on false positives/);
assert.doesNotMatch(prompt, /strict/i);
const j = parseJson('{"reading":"complaint","reasoning":"","attempted":false,"verdict":"incorrect","score":0,"first_error":"","feedback":""}');
assert.equal(j.attempted, false);

// ---- ratingFor: by score
assert.equal(ratingFor({ verdict: "partial", score: 0.6 }, 60000), "hard");
assert.equal(ratingFor({ verdict: "partial", score: 0.75 }, 60000), "good", "method right with a slip schedules as good");
assert.equal(ratingFor({ verdict: "partial", score: 0.3 }, 60000), "again");
assert.equal(ratingFor({ verdict: "incorrect", score: 0.9 }, 60000), "again");
assert.equal(ratingFor({ verdict: "correct", score: 1 }, 5000), "easy");
assert.equal(ratingFor({ verdict: "correct", score: 0.9 }, 5000), "good");


console.log("judge tests ok");
