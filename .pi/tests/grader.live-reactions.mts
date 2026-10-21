const { grade } = await import("../extensions/review/grader.ts");
const cwd = new URL("./tmp/vault", import.meta.url).pathname;
(await import("node:fs")).mkdirSync(cwd + "/.learn", { recursive: true });
const c1 = "IT\"S A PROBABILITY DENSITY. I shouldn't have to redescibe the actual definition of what that is every single time that's up for review!!!!!!!!! I'm exactly right ESPECIALLY when I said it also gives us the rate of change at any time!!!!";
const c2 = "THIS IS DUMB!!!!! MY LAST QUESTION I HAD SHOWN ALL MY WORK SO I LITERALLY HAD THE STATE NUMBER ASSOCIATED. YOU ONLY SAID TERMS AND NOT NUMBERS/SUMS";
const honest = "4 per second, units 1/s. Times 0.01 s gives 0.04, a probability.";
const [a, b, c] = await Promise.all([
	grade({ cwd, kind: "recall", prompt: "With $k = 4$ per second: what is the value and unit of $k e^{-kt}$ at $t = 0$, and what quantity do you get when you multiply it by a thin slice $dt = 0.01$ s?", reference: "f(0) = 4 per second (units 1/s). f(0)·dt = 0.04, the probability of exchanging in the slice from 0 to 0.01 s.", answerText: c1, confidence: 100 }),
	grade({ cwd, kind: "recall", prompt: "Same $P$ and same start ($600$ in $A$, $400$ in $B$). Give the two numbers whose sum is the new $A$ count, and the new $B$ count. Then state the one-line check that the two new counts must pass.", reference: "540 (A stayed) + 160 (B→A) = 700; new B = 60 + 240 = 300. Check: 700 + 300 = 1000, the original total, because each row of P sums to 1.", answerText: c2, confidence: 100 }),
	grade({ cwd, kind: "recall", prompt: "With $k = 4$ per second: what is the value and unit of $k e^{-kt}$ at $t = 0$, and what quantity do you get when you multiply it by a thin slice $dt = 0.01$ s?", reference: "f(0) = 4 per second (units 1/s). f(0)·dt = 0.04, the probability of exchanging in the slice from 0 to 0.01 s.", answerText: honest, confidence: 80 }),
]);
for (const [name, g] of [["complaint 1", a], ["complaint 2", b], ["honest short answer", c]] as const) {
	console.log(`\n== ${name}: attempted=${g.attempted} verdict=${g.verdict} score=${g.score}${g.error ? " ERROR " + g.error : ""}`);
	console.log("reading:", g.reading);
	console.log("feedback:", JSON.stringify(g.feedback));
}
process.exit(0);
