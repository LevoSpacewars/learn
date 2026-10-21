import { countParts, gateReason } from "../extensions/recall.ts";
import assert from "node:assert/strict";

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
