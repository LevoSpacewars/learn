// Integration test: loads recall.ts (recall + lesson_read + the gate handlers)
// and quiz.ts with a fake pi, drives them through a teach session in a
// throwaway cwd, and checks the reading gate, the floor, the quiz streak, say,
// and predict rules.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const WT = new URL("../extensions", import.meta.url).pathname;
const recallMod = await import(WT + "/recall.ts");
const quizMod = await import(WT + "/quiz.ts");
const ped = await import(WT + "/review/pedagogy.ts");
const prompts = await import(WT + "/review/prompts.ts");

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "learn-flow-"));
fs.mkdirSync(path.join(cwd, ".learn"), { recursive: true });
const writeLesson = (statuses: string[]) =>
	fs.writeFileSync(
		path.join(cwd, ".learn", "learner.json"),
		JSON.stringify({ version: 1, lessons: [{ slug: "hdx", title: "HDX", status: "open", created: "", updated: "", nodes: statuses.map((s, i) => ({ id: `n${i + 1}`, label: `node ${i + 1}`, kind: "derived", check: "explain", status: s, hints: 0 })) }], misconceptions: [], calibration: [], sessions: [], goals: [], fundamentals: [], interests: [] }),
	);
writeLesson(["pending", "pending", "pending"]);

const handlers: Record<string, Function[]> = {};
const tools: Record<string, any> = {};
const fakePi: any = {
	on: (e: string, f: Function) => (handlers[e] ??= []).push(f),
	registerTool: (t: any) => (tools[t.name] = t),
	registerCommand: () => {},
	events: { on: () => {}, emit: () => {} },
	sendUserMessage: () => {},
	appendEntry: () => {},
};
recallMod.default(fakePi);
quizMod.default(fakePi);
assert.ok(tools.lesson_read, "lesson_read registered");
const fire = async (e: string, ev: any, ctx: any = { cwd }) => { for (const f of handlers[e] ?? []) await f(ev, ctx); };

// A UI that answers the pending prompt from the "pad" as soon as it opens.
const theme = new Proxy({}, { get: () => (a: any, b: any) => (b === undefined ? a : b) });
function uiCtx(answer: any, afterAnswer?: (comp: any) => void) {
	return {
		cwd,
		hasUI: true,
		ui: {
			notify() {}, setStatus() {}, theme,
			custom: (factory: any) => new Promise((resolve) => {
				const comp = factory({ requestRender() {}, terminal: { rows: 40, columns: 100 } }, theme, {}, resolve);
				setImmediate(() => {
					comp.render?.(100); // the terminal render must not throw
					assert.equal(prompts.answerPending({ source: "pad", ...answer }), true, "pending prompt accepts the answer");
					afterAnswer?.(comp);
				});
			}),
		},
	};
}
const noUi = { cwd, hasUI: false };
const text = (r: any) => r.content.map((c: any) => c.text).join("\n");
const P = () => ped.pedagogy();
const recallArgs = (o: any = {}) => ({ prompt: "Explain why the slice probability is $k\\,dt$.", reference: "k is a rate; small dt", kind: "explain", ...o });
const quizArgs = (o: any = {}) => ({ question: "B has exactly two exits: to A at 3/s and to C at 1/s. Which fraction leaves to A?", options: [{ label: "3/4", value: "a", description: "rate share" }, { label: "1/4", value: "b", description: "you took C's share of the total" }, { label: "3", value: "c" }], correctAnswer: "a", explanation: "3/(3+1)", shuffle: false, ...o });
const LONG = ("Why we need this: the pool shrinks. Derivation: $U(t+dt) = U(t)(1 - k\\,dt)$, so $dU/dt = -kU$. Worked instance: $k = 3$, $dt = 0.001$ gives $P = 0.003$. It hangs off the rate definition. ").repeat(8);

// 1. teach session start: floor
await fire("session_start", {});
await fire("before_agent_start", { prompt: "/skill:teach Teach me: HDX" });
assert.match(text(await tools.recall.execute("1", recallArgs(), undefined, undefined, noUi)), /discuss before the first question/);
// He says ready via ask_user_question
await fire("tool_result", { toolName: "ask_user_question", details: { answers: [{ label: "Ready, ask the first question" }] } });
assert.equal(P().floorNeeded, false);

// 2. lesson_plan arms the reading gate for n1 (no floor re-arm)
await fire("tool_result", { toolName: "lesson_plan", input: { slug: "hdx" }, details: { slug: "hdx" } });
assert.equal(P().floorNeeded, false, "lesson_plan does not re-arm the floor");
assert.deepEqual({ slug: P().readNeeded?.slug, node: P().readNeeded?.node }, { slug: "hdx", node: "n1" });
let r = await tools.recall.execute("2", recallArgs(), undefined, undefined, noUi);
assert.equal(r.details.status, "blocked"); assert.match(text(r), /lesson_read with slug "hdx", node "n1"/);
r = await tools.quiz.execute("3", quizArgs(), undefined, undefined, noUi);
assert.match(text(r), /lesson_read with slug "hdx", node "n1"/, "quiz refused before the reading too");
// predict is a pretest: allowed before the reading (reaches the UI check)
r = await tools.recall.execute("4", recallArgs({ kind: "predict", prompt: "If $k$ doubles, what happens to the half-life? One line." }), undefined, undefined, noUi);
assert.match(text(r), /requires interactive mode UI/); assert.equal(r.details.banner, ped.QUICK_GUESS);

// 3. lesson_read: too short is refused
r = await tools.lesson_read.execute("5", { slug: "hdx", node: "n1", title: "Slices", body: "k dt is the chance per slice." }, undefined, undefined, noUi);
assert.equal(r.details.status, "refused"); assert.match(text(r), /textbook page, not a paragraph: derivation, worked instance, connection/);
// figure must live under viz/
r = await tools.lesson_read.execute("5b", { slug: "hdx", node: "n1", title: "Slices", body: LONG, figure: "work/x.png" }, undefined, undefined, noUi);
assert.equal(r.details.status, "refused"); assert.match(text(r), /under viz\//);

// 4. lesson_read shown, he taps "Read it, ask me"
const pend: any[] = [];
const unsub = prompts.onPendingChange((p: any) => p && pend.push(p));
const updates: any[] = [];
r = await tools.lesson_read.execute("6", { slug: "hdx", node: "n1", title: "Slices", body: LONG }, undefined, (u: any) => updates.push(u), uiCtx({ choices: [1] }));
unsub();
assert.equal(r.details.status, "read"); assert.match(text(r), /Do not ask whether he is ready/);
assert.equal(updates[0].details.phase, "shown", "md-log gets the reading before he answers");
assert.equal(pend[0].kind, "read"); assert.match(pend[0].prompt, /^## Slices/); assert.deepEqual(pend[0].options, [{ index: 1, label: "Read it, ask me" }]);
assert.equal(P().readNeeded, undefined); assert.equal(P().floorNeeded, false);
// the reading starts the practice ladder: a plain check is refused, a next-move check goes through
r = await tools.recall.execute("7", recallArgs(), undefined, undefined, noUi);
assert.equal(r.details.status, "blocked"); assert.match(text(r), /next-move/, "after a reading the ladder asks for a next-move check first");
r = await tools.recall.execute("7b", recallArgs({ stage: "nextmove" }), undefined, undefined, noUi);
assert.match(text(r), /requires interactive mode UI/, "next-move recall allowed after the reading, no second ready prompt");
ped.endLadder(P()); // the ladder itself is covered by ladder.test.mts
// re-calling lesson_plan does not ask for n1 again
await fire("tool_result", { toolName: "lesson_plan", input: { slug: "hdx" }, details: { slug: "hdx" } });
assert.equal(P().readNeeded, undefined, "a read node is never asked for twice");

// 5. n1 confirmed -> n2 needs a reading; he asks a question instead of tapping
writeLesson(["confirmed", "pending", "pending"]);
await fire("tool_result", { toolName: "lesson_node", input: { slug: "hdx", id: "n1", status: "confirmed" }, details: {} });
assert.equal(P().readNeeded?.node, "n2"); assert.equal(P().floorNeeded, false, "lesson_node does not re-arm the floor");
r = await tools.lesson_read.execute("8", { slug: "hdx", node: "n2", title: "Survival", body: LONG }, undefined, undefined, uiCtx({ text: "why is it 1 - k dt and not k dt?" }));
assert.equal(r.details.status, "question"); assert.match(text(r), /why is it 1 - k dt/); assert.match(text(r), /ask_user_question/);
r = await tools.recall.execute("9", recallArgs(), undefined, undefined, noUi);
assert.match(text(r), /asked about it/); assert.doesNotMatch(text(r), /Call lesson_read with/, "never asks for the reading again");
await fire("tool_result", { toolName: "ask_user_question", details: { answers: [{ label: "Ready, ask me" }] } });
assert.equal(P().readNeeded, undefined);
ped.endLadder(P());
r = await tools.recall.execute("10", recallArgs(), undefined, undefined, noUi);
assert.match(text(r), /requires interactive mode UI/);
// typed "ready" (no tool) also clears a discussed reading
writeLesson(["confirmed", "confirmed", "pending"]);
await fire("tool_result", { toolName: "lesson_node", input: { slug: "hdx", id: "n2", status: "confirmed" }, details: {} });
await tools.lesson_read.execute("11", { slug: "hdx", node: "n3", title: "Goal", body: LONG }, undefined, undefined, uiCtx({ text: "what about dt = 1?" }));
await fire("before_agent_start", { prompt: "ok go" });
assert.equal(P().readNeeded, undefined, "typed ready clears it");
// last node confirmed -> nothing pending -> no gate
writeLesson(["confirmed", "confirmed", "confirmed"]);
await fire("tool_result", { toolName: "lesson_node", input: { slug: "hdx", id: "n3", status: "confirmed" }, details: {} });
assert.equal(P().readNeeded, undefined);

// 6. quiz feeds the streak
Object.assign(P(), { missStreak: 2, sinceMissChars: 0, lastMiss: { prompt: "x", verdict: "incorrect", firstError: "e" }, readSinceMiss: false });
r = await tools.quiz.execute("12", quizArgs(), undefined, undefined, uiCtx({ choices: [1], confidence: 80 }, (c) => c.handleInput("\r")));
assert.equal(r.details.correct, true);
assert.equal(P().missStreak, 0, "correct quiz resets the streak"); assert.equal(P().lastMiss, undefined);
assert.equal(ped.gateReason(P(), "1. a?\n2. b?\n3. c?"), undefined, "no worked-example demand after a correct quiz");
r = await tools.quiz.execute("13", quizArgs({ say: "Exits split by rate share." }), undefined, undefined, uiCtx({ choices: [2], confidence: 60 }, (c) => c.handleInput("\r")));
assert.equal(r.details.correct, false);
assert.equal(P().missStreak, 1); assert.equal(P().lastMiss.verdict, "incorrect"); assert.equal(P().lastMiss.firstError, "you took C's share of the total");
r = await tools.quiz.execute("14", quizArgs(), undefined, undefined, uiCtx({ dontKnow: true }, (c) => c.handleInput("\r")));
assert.equal(P().missStreak, 2, "quiz I-don't-know counts as a miss");

// 7. after two misses: say alone (short) is not enough; a reading is
r = await tools.recall.execute("15", recallArgs({ say: "You dropped the complement." }), undefined, undefined, noUi);
assert.match(text(r), /lesson_read/, "2 misses: refusal points at lesson_read");
await tools.lesson_read.execute("16", { slug: "hdx", node: "n3", title: "Worked example", body: LONG }, undefined, undefined, uiCtx({ choices: [1] }));
ped.endLadder(P());
r = await tools.recall.execute("17", recallArgs({ prompt: "Fill the blank: $P = 1 - $ ___" }), undefined, undefined, noUi);
assert.match(text(r), /requires interactive mode UI/, "a reading since the miss lifts the teach gate");

// 8. one miss: the diagnosis can travel in `say`
Object.assign(P(), { missStreak: 1, sinceMissChars: 0, readSinceMiss: false });
r = await tools.recall.execute("18", recallArgs(), undefined, undefined, noUi);
assert.match(text(r), /`say`/);
r = await tools.recall.execute("19", recallArgs({ say: "You multiplied the rates; the chance per slice is the rate times the slice width." }), undefined, undefined, noUi);
assert.match(text(r), /requires interactive mode UI/, "say satisfies the diagnose gate");

// 9. predict rules
Object.assign(P(), { missStreak: 0 });
r = await tools.recall.execute("20", recallArgs({ kind: "predict", prompt: "Guess the half-life.", paper: true }), undefined, undefined, noUi);
assert.equal(r.details.status, "blocked"); assert.match(text(r), /quick guess/);
r = await tools.recall.execute("21", recallArgs({ kind: "predict", prompt: "x".repeat(401) }), undefined, undefined, noUi);
assert.equal(r.details.status, "blocked"); assert.match(text(r), /intuition alone/);
// predict banner reaches the pending prompt
const seen: any[] = [];
const un2 = prompts.onPendingChange((p: any) => p && seen.push(p));
const ctxP: any = uiCtx({ skip: true });
await tools.recall.execute("22", recallArgs({ kind: "predict", prompt: "If $k$ doubles, the half-life?", say: "Quick one before the reading." }), undefined, undefined, ctxP);
un2();
assert.equal(seen[0].banner, ped.QUICK_GUESS); assert.equal(seen[0].say, "Quick one before the reading.");

// 10. review session drops any reading requirement
P().readNeeded = { slug: "hdx", node: "n9" };
await fire("before_agent_start", { prompt: "/skill:review 3 card(s) are due." });
assert.equal(P().readNeeded, undefined);

// 11. "Continue lesson" at session start arms the reading gate for the first pending node
ped.resetPedagogy();
writeLesson(["confirmed", "pending", "pending"]);
await fire("before_agent_start", { prompt: '/skill:teach Continue the lesson "HDX" (slug: hdx). No fixed time budget.' });
assert.equal(P().floorNeeded, true, "floor at session start");
assert.deepEqual({ slug: P().readNeeded?.slug, node: P().readNeeded?.node, label: P().readNeeded?.label }, { slug: "hdx", node: "n2", label: "node 2" }, "continue arms the reading for the first pending node, with its label");
await fire("tool_result", { toolName: "ask_user_question", details: { answers: [{ label: "Ready, ask the first question" }] } });
assert.match(text(await tools.recall.execute("30", recallArgs(), undefined, undefined, noUi)), /not read it yet/, "recall refused until n2 is read");
assert.match(text(await tools.quiz.execute("31", quizArgs(), undefined, undefined, noUi)), /not read it yet/, "quiz refused until n2 is read");
// a finished lesson arms nothing; a lesson with no nodes arms nothing
ped.resetPedagogy();
writeLesson(["confirmed", "confirmed", "confirmed"]);
await fire("before_agent_start", { prompt: '/skill:teach Continue the lesson "HDX" (slug: hdx).' });
assert.equal(P().readNeeded, undefined, "finished lesson: no reading gate");
ped.resetPedagogy();
await fire("before_agent_start", { prompt: '/skill:teach Teach me: new thing. Use lesson slug "brand-new" and note "lessons/brand-new.md".' });
assert.equal(P().readNeeded, undefined, "unknown lesson: no reading gate");
console.log("flow tests ok");
process.exit(0);
