const { grade } = await import("../extensions/review/grader.ts");
const cwd = new URL("./tmp/vault", import.meta.url).pathname;
(await import("node:fs")).mkdirSync(cwd + "/.learn", { recursive: true });
const prompt = "A single site exchanges at rate $k = 4$ per second. Three expressions: $1 - e^{-kt}$, $k e^{-kt}$, and $1/k$.\n\nFor each, say what it is (name, units) and then: which of the three can be larger than 1, and why is that not a contradiction?";
const reference = "1 − e^{−kt}: cumulative probability of having exchanged by t, dimensionless, ≤ 1. k e^{−kt}: probability density, probability per second of exchanging around t, units 1/s; it can exceed 1 (here it is 4/s at t = 0) because it is a rate, not a probability; only f(t)·dt is a probability. 1/k: mean lifetime (0.25 s), not the half-life (that is ln2/k ≈ 0.17 s).";
const real = "1. 1-e^-kt is the fraction of exchanged population\n2. ke^-kt is the probability density of exchanged population, which really also is also a function that returns the rate of population change at any time\n3. it is the mean exchange time\n\n2 and 3 can be greater than 1. This is not a contradiction since 1/k is just a time from the rate, and the probability denisity, when integrated from 0->inf will be 1.";
const complaint = "IT\"S A PROBABILITY DENSITY. I shouldn't have to redescibe the actual definition of what that is every single time that's up for review!!!!!!!!! I'm exactly right ESPECIALLY when I said it also gives us the rate of change at any time!!!!";

const [a, b] = await Promise.all([
	grade({ cwd, kind: "recall", prompt, reference, answerText: real, confidence: 100 }),
	grade({ cwd, kind: "recall", prompt: "With $k = 4$ per second: what is the value and unit of $k e^{-kt}$ at $t = 0$, and what quantity do you get when you multiply it by a thin slice $dt = 0.01$ s?", reference: "f(0) = 4 per second (units 1/s). f(0)·dt = 0.04, the probability of exchanging in the slice from 0 to 0.01 s.", answerText: complaint, confidence: 100 }),
]);
for (const [name, g] of [["real answer", a], ["complaint", b]] as const) {
	console.log(`\n== ${name}: attempted=${g.attempted} verdict=${g.verdict} score=${g.score}${g.error ? " ERROR " + g.error : ""}`);
	console.log("reading:", g.reading);
	console.log("first_error:", g.firstError);
	console.log("feedback:", g.feedback);
}
process.exit(0);
