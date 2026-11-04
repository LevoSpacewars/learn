import { countParts, gateReason, recallBlock } from "../extensions/recall.ts";
import { reviewPartsReason } from "../extensions/review/pedagogy.ts";
import assert from "node:assert/strict";

// lettered parts, as review cards were written on 2026-11-03
const twoPart = "A pool loses a fraction $r\\,dt$ per slice.\n\n(a) From this one-slice rule, derive the differential equation for $N(t)$.\n\n(b) Numerically: $N = 400$, $r = 3$. Compute $(N_{new} - N)/dt$.";
assert.equal(countParts(twoPart), 2);
assert.equal(countParts("Compute (a) the rate and (b) the limit."), 2, "inline lettered parts");
assert.equal(countParts("With $f(a) = 3$ and $g(b) = 1$, what is $f(a)g(b)$?"), 1, "function arguments are not parts");
assert.equal(countParts("What is $dN/dt$, and why is it fixed as $dt \\to 0$?"), 1);
assert.equal(reviewPartsReason("What is $dN/dt$?"), undefined);
assert.match(reviewPartsReason(twoPart) ?? "", /ONE thing/);
const calm = () => ({ missStreak: 0, sinceMissChars: 0, reviewMode: true } as any);
assert.match(recallBlock(calm(), { kind: "problem", prompt: twoPart, cardId: "c1" }) ?? "", /review card asks ONE thing/, "multi-part review card refused");
assert.equal(recallBlock(calm(), { kind: "recall", prompt: "What is $dN/dt$ for this pool?", cardId: "c1" }), undefined, "one ask passes");

// part counting
assert.equal(countParts("What does it mean?"), 1);
assert.equal(countParts("In your own words:\n1. What does k mean?\n2. Why not 2 x 0.5?"), 2);
assert.equal(countParts("Rate k = 10.\n1. P in next dt?\n2. Chain 1000 slices:\n   - per-slice chance = ?\n   - survive all = ?^1000 ≈ ?\n   - so P(exchanged) ≈ ?"), 5);
assert.equal(countParts("Same setup.\n\n1. How many exchange in slice 1?\n2. Slice 2?\n3. After 10 slices: 900, more, fewer?"), 3);

// gate
const fresh = () => ({ missStreak: 0, sinceMissChars: 0 } as any);
assert.equal(gateReason(fresh(), "1. a\n2. b\n3. c\n4. d"), undefined, "no miss: anything goes");

const oneMiss = { missStreak: 1, sinceMissChars: 0, lastMiss: { prompt: "x", firstError: "slice width off by ten", verdict: "incorrect" } };
assert.match(gateReason(oneMiss as any, "Narrow question?")!, /read nothing from you.*`say`/);
assert.equal(gateReason({ ...oneMiss, sinceMissChars: 120 } as any, "One step: dt = ?"), undefined);
assert.match(gateReason({ ...oneMiss, sinceMissChars: 120 } as any, "1. a?\n2. b?\n3. c?")!, /3 parts/);
assert.equal(gateReason({ ...oneMiss, sinceMissChars: 120 } as any, "1. a?\n2. b?"), undefined, "two parts allowed");

const twoMiss = { missStreak: 2, sinceMissChars: 120, lastMiss: { prompt: "x", firstError: "complement not taken", verdict: "incorrect" } };
assert.match(gateReason(twoMiss as any, "One step?")!, /WORKED EXAMPLE/);
assert.equal(gateReason({ ...twoMiss, sinceMissChars: 400 } as any, "Fill the blank: P = 1 - ___"), undefined, "taught enough");
assert.match(gateReason({ ...twoMiss, sinceMissChars: 400 } as any, "1. a?\n2. b?\n3. c?")!, /3 parts/, "still one step after teaching");
console.log("gate tests ok");
