import { endsWaitingOnLearner } from "../extensions/recall.ts";
import assert from "node:assert/strict";

const stalled = [
  `Right computation, wrong label. $0.1$ is the per-slice chance for each site that is still unexchanged at the start of that slice.\n\nNext I'll pose one narrow question on exactly that point: in slice 2, which pool does the 10% act on, and how many exchange. Say "go" when you're ready.`,
  `Your part 3 says $342.95$ sites remain. Look at the step from $(1-0.05)\\times 400$ to $400 - 20\\times10^{-2}$. Tell me where it goes wrong and what $U(0.01)$ should be, and I'll pose it formally for grading.`,
  "Which pool does the 10% act on in slice 2?",
  "Does that make sense?**",
  "Your turn.",
  "Let me know when you want to continue.",
];
for (const t of stalled) assert.equal(endsWaitingOnLearner(t), true, "should nudge: " + t.slice(-60));

const fine = [
  "We're stopping here for today. Next time we start with the R1 explain-back.",
  "Saved for review.",
  "That clears the way for D1 in the HDX goal.",
  "Here is the worked example.\n\n$$U(n\\,dt) = 1000 \\times 0.98^n$$",
  "",
];
for (const t of fine) assert.equal(endsWaitingOnLearner(t), false, "should not nudge: " + t.slice(-60));
console.log("guard tests ok");
