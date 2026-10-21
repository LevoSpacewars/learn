import { isReady, floorReason, gateReason } from "../extensions/recall.ts";
import assert from "node:assert/strict";

for (const t of ["go", "Go!", "ready", "Ready, ask the first question", "ok go", "okay, let's go", "let's start", "I'm ready", "ask me the first question", "no questions", "nope, I'm good"])
  assert.equal(isReady(t), true, "ready: " + t);
for (const t of ["I want to discuss first", "why is k a rate and not a probability?", "what does dS/dt mean here", "goal question: how does this connect to HDX?", "not ready"])
  assert.equal(isReady(t), false, "not ready: " + t);

assert.match(floorReason({ floorNeeded: true, missStreak: 0, sinceMissChars: 0 } as any)!, /discuss/);
assert.equal(floorReason({ floorNeeded: false, missStreak: 0, sinceMissChars: 0 } as any), undefined);
assert.equal(gateReason({ missStreak: 0, sinceMissChars: 0 } as any, "q?"), undefined);
console.log("floor tests ok");
