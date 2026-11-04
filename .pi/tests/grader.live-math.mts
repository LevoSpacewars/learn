// Live grader (calls the model): an answer given as math, with no sentences, must grade correct;
// a bundled side ask he skipped is a note, not a lower verdict (the 2026-11-03 review).
const { grade } = await import("../extensions/review/grader.ts");
const { ratingFor } = await import("../extensions/recall.ts");
const cwd = new URL("./tmp/vault", import.meta.url).pathname;
(await import("node:fs")).mkdirSync(cwd + "/.learn", { recursive: true });

const ratioPrompt = "A pool of $N = 400$ molecules loses a fraction $r\\,dt$ of its current members in each thin slice $dt$, with $r = 3$ per second. The change in one slice, $N_{new} - N$, shrinks to zero as $dt \\to 0$. Why does the ratio $(N_{new} - N)/dt$ not shrink with it?";
const ratioRef = "N_new − N = −r·dt·N, so (N_new − N)/dt = −rN = −1200 per second for every dt: the change is proportional to dt, so dividing by dt cancels it. This fixed ratio is dN/dt = −rN.";
const mathOnly = "dN = -r dt N, so dN/dt = -rN, which is constant (-1200)";

const ratesPrompt = "An amide in a segment that opens and closes: $k_{op} = 2$, $k_{cl} = 40$, $k_{ch} = 10$ per second. Compute the observed exchange rate $k_{obs}$, and say which limit (EX1 or EX2) it is closer to.";
const ratesRef = "k_obs = k_op·k_ch/(k_cl + k_ch) = 20/50 = 0.4 per second. Closer to EX2 because k_cl > k_ch (closing outcompetes exchange); EX2 limit k_op·k_ch/k_cl = 0.5/s, EX1 limit k_op = 2/s.";
const ratesAns = "k_obs = (2)(10)/(40+10) = 0.4 /s. EX2 since k_cl >> k_ch";

const [a, b] = await Promise.all([
	grade({ cwd, kind: "recall", prompt: ratioPrompt, reference: ratioRef, answerText: mathOnly }),
	grade({ cwd, kind: "problem", prompt: ratesPrompt, reference: ratesRef, answerText: ratesAns }),
]);
let bad = 0;
for (const [name, g] of [["math-only why", a], ["core right, limits' numbers not given", b]] as const) {
	const rating = ratingFor(g);
	const ok = g.verdict === "correct" || rating === "good" || rating === "easy";
	if (!ok) bad++;
	console.log(`\n== ${name}: ${ok ? "OK" : "FAIL"} verdict=${g.verdict} score=${g.score} rating=${rating}${g.error ? " ERROR " + g.error : ""}`);
	console.log("feedback:", g.feedback);
}
process.exit(bad ? 1 : 0);
