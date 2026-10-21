const { grade } = await import("../extensions/review/grader.ts");
const cwd = new URL("./tmp/vault", import.meta.url).pathname;
(await import("node:fs")).mkdirSync(cwd + "/.learn", { recursive: true });
const c2 = "THIS IS DUMB!!!!! MY LAST QUESTION I HAD SHOWN ALL MY WORK SO I LITERALLY HAD THE STATE NUMBER ASSOCIATED. YOU ONLY SAID TERMS AND NOT NUMBERS/SUMS";
const q = "Same $P$ and same start ($600$ in $A$, $400$ in $B$). Give the two numbers whose sum is the new $A$ count, and the new $B$ count. Then state the one-line check that the two new counts must pass.";
const ref = "540 (A stayed) + 160 (B→A) = 700; new B = 60 + 240 = 300. Check: 700 + 300 = 1000, the original total, because each row of P sums to 1.";
// Two concurrent calls with different answers: the prompt files must not collide.
const [a, b] = await Promise.all([
	grade({ cwd, kind: "recall", prompt: q, reference: ref, answerText: c2, confidence: 100 }),
	grade({ cwd, kind: "recall", prompt: q, reference: ref, answerText: "540 + 160 = 700, new B = 300, and 700 + 300 = 1000 must hold.", confidence: 90 }),
]);
console.log(`\n== complaint 2: attempted=${a.attempted} verdict=${a.verdict} score=${a.score}`);
console.log("reading:", a.reading);
console.log(`\n== concurrent real: attempted=${b.attempted} verdict=${b.verdict} score=${b.score}`);
console.log("reading:", b.reading);
process.exit(0);
