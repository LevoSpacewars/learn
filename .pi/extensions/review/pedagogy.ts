/**
 * pedagogy — the teaching gates shared by recall, quiz and lesson_read.
 *
 * The teach skill says: discuss before the first question on new material,
 * READ before being tested on a new node, diagnose after a miss, teach after
 * two misses. The model ignores that under pressure, so the tools enforce it.
 *
 * State lives on globalThis (`__learnPedagogy`): pi loads each extension file
 * as its own module instance, so a module-level object would not be shared
 * between recall.ts and quiz.ts.
 *
 * Not a pi extension (no default export).
 */

export interface Pedagogy {
	floorNeeded?: boolean; // teach-session start: the learner gets to discuss before the first question
	/** A review session (cards, not new material): misses need a visible diagnosis, nothing more. The retry list does the relearning. */
	reviewMode?: boolean;
	missStreak: number; // consecutive misses (recall incorrect/dontKnow or partial below MISS_SCORE, quiz incorrect/dontKnow)
	sinceMissChars: number; // text the learner could read since the last miss (chat text, `say`, readings)
	lastMiss?: { prompt: string; firstError?: string; verdict: string };
	readSinceMiss?: boolean; // a lesson_read was read since the last miss (counts as teaching)
	/** The node whose reading must come before the next recall/quiz (set by lesson_plan / lesson_node). */
	readNeeded?: { slug: string; node: string; label?: string; shown?: boolean };
	/** "slug/node" keys that have been read (tapped) this pi session: never asked twice. */
	readNodes?: string[];
	/** He asked something; no new card or check until he has seen the answer (chat text he can read). */
	owedReply?: { question: string; chars: number; text: string };
	/** The visible answer to his last question, shown on the next ask_user_question card. */
	replyForCard?: string;
	/** The practice ladder of the node just read: next-move checks, a completion, the node's check, then the derivation on paper. */
	ladder?: Ladder;
}

export function pedagogy(): Pedagogy {
	const g = globalThis as any;
	if (!g.__learnPedagogy) g.__learnPedagogy = { missStreak: 0, sinceMissChars: 0 } satisfies Pedagogy;
	return g.__learnPedagogy as Pedagogy;
}

export function resetPedagogy(p: Pedagogy = pedagogy()): void {
	p.missStreak = 0;
	p.sinceMissChars = 0;
	p.lastMiss = undefined;
	p.readSinceMiss = false;
	p.floorNeeded = false;
	p.readNeeded = undefined;
	p.readNodes = [];
	p.reviewMode = false;
	p.owedReply = undefined;
	p.replyForCard = undefined;
	p.ladder = undefined;
}

/** The miss streak is cleared: the tutor overrode a grade upward, he chose to move on, or the last answer was not an attempt. */
export function clearMiss(p: Pedagogy = pedagogy()): void {
	p.missStreak = 0;
	p.sinceMissChars = 0;
	p.lastMiss = undefined;
	p.readSinceMiss = false;
}

/**
 * A partial verdict with the substance right is a note, not a miss. Only a
 * wrong or missing idea (incorrect, "I don't know", or a partial scored below
 * MISS_SCORE) counts toward the streak and the drill-down rules.
 */
export const MISS_SCORE = 0.6;
export function isMiss(verdict: string, score?: number): boolean {
	if (verdict === "correct") return false;
	if (verdict === "partial") return (score ?? 0.5) < MISS_SCORE;
	return true; // incorrect, dontKnow
}

/** Sub-questions in a prompt: numbered lines, plus bullet lines that ask something. */
export function countParts(prompt: string): number {
	const numbered = prompt.match(/^\s*\d+[.)]\s+/gm)?.length ?? 0;
	const bullets = prompt.match(/^\s*[-*•]\s+.*(\?|=\s*\?)\s*$/gm)?.length ?? 0;
	return Math.max(1, numbered + bullets);
}

/** The learner said they are ready for the first question. */
const READY = /^\s*(?:ok(?:ay)?[,!. ]*)?(?:go|ready|start|begin|i'?m ready|let'?s (?:go|start|begin|do it)|ask (?:me )?(?:the |a )?(?:first )?question|first question|no(?:pe)?,? (?:questions?|i'?m good)|read it,? ask me|ready[^a-z]*ask|ready)(?![a-z'])/i;
export function isReady(text: string): boolean {
	return READY.test(text.trim());
}

// ---------- open floor (teach-session start) ----------
export const FLOOR_MESSAGE =
	"Blocked: this is new material, and he gets to discuss it before the first question. Introduce what we are about to learn in a few lines OF CHAT TEXT (what it is, why it matters for his goal, what it hangs off; your thinking is invisible to him), then call ask_user_question with the question \"Anything you want to discuss before the first question?\" and options \"Ready, ask the first question\" and \"I want to discuss first\" (he can also type his own question). If he discusses, answer him, then offer the same choice again with ask_user_question. Pose the first recall only after he picks ready.";
export function floorReason(p: Pedagogy): string | undefined {
	return p.floorNeeded ? FLOOR_MESSAGE : undefined;
}

// ---------- reading gate (each new node) ----------
export const READ_MIN_CHARS = 1200;
export function readKey(slug: string, node: string): string {
	return `${slug}/${node}`;
}
export function readingReason(p: Pedagogy): string | undefined {
	const r = p.readNeeded;
	if (!r) return undefined;
	if (p.readNodes?.includes(readKey(r.slug, r.node))) return undefined;
	const name = r.label ? `"${r.label}"` : `node ${r.node}`;
	if (r.shown) {
		return `Blocked: he has the reading on ${name} but asked about it instead of marking it read. Answer his question in chat text, then call ask_user_question with options "Ready, ask me" and "I have another question". Pose the check only after he picks ready (do NOT call lesson_read again for this node).`;
	}
	return `Blocked: ${name} (node ${r.node} of lesson ${r.slug}) is new and he has not read it yet. Call lesson_read with slug "${r.slug}", node "${r.node}", a title, and a body of at least ${READ_MIN_CHARS} characters (markdown + LaTeX): the motivated derivation or guided derivation, ONE worked instance with every move explained, and what it hangs off. He reads it and taps "Read it, ask me"; then pose the check. Your thinking is invisible to him: anything he must read goes in lesson_read, chat text, or a tool's \`say\`. When you talk to him, call it ${name}, never "${r.node}": he has never seen node ids.`;
}

/** Validate a lesson_read body. Returns the refusal text, or undefined if it is long enough. */
export function readBodyReason(body: string): string | undefined {
	const n = body.trim().length;
	if (n >= READ_MIN_CHARS) return undefined;
	return `Refused: the reading is ${n} characters; it needs at least ${READ_MIN_CHARS}. A reading section is a textbook page, not a paragraph: derivation, worked instance, connection. Write (1) why we need this node, (2) the derivation or guided derivation with every move motivated, in LaTeX, (3) ONE worked instance with concrete numbers, each step with its reason, (4) what it hangs off (the earlier node or handle he already owns). Then call lesson_read again.`;
}

/** He tapped "Read it, ask me" (or answered ready after discussing): the node is read. */
export function markRead(p: Pedagogy, slug: string, node: string, bodyChars: number): void {
	const key = readKey(slug, node);
	p.readNodes = [...(p.readNodes ?? []).filter((k) => k !== key), key];
	if (p.readNeeded && readKey(p.readNeeded.slug, p.readNeeded.node) === key) p.readNeeded = undefined;
	p.floorNeeded = false; // he has read and said go: no second "ready?" prompt
	creditReading(p, bodyChars);
}
/** A reading was shown to him: it counts as teaching for the miss gate. */
export function creditReading(p: Pedagogy, bodyChars: number): void {
	p.sinceMissChars += bodyChars;
	p.readSinceMiss = true;
}

/**
 * Arm the reading gate for the next node after lesson_plan / lesson_node.
 * Nodes already read this session are never asked for again.
 */
export function armReading(p: Pedagogy, slug: string, node: string | undefined, label?: string): void {
	if (!node) {
		if (p.readNeeded?.slug === slug) p.readNeeded = undefined;
		return;
	}
	if (p.readNodes?.includes(readKey(slug, node))) {
		p.readNeeded = undefined;
		return;
	}
	if (p.readNeeded && p.readNeeded.slug === slug && p.readNeeded.node === node) return; // keep `shown`
	p.readNeeded = { slug, node, label };
}

/** The ask_user_question answer after a discussed reading: "ready" clears the node. */
export function readyAnswered(p: Pedagogy): void {
	p.floorNeeded = false;
	const r = p.readNeeded;
	if (r?.shown) {
		const key = readKey(r.slug, r.node);
		p.readNodes = [...(p.readNodes ?? []).filter((k) => k !== key), key];
		p.readNeeded = undefined;
	}
}

// ---------- miss gate ----------
export const DIAGNOSE_CHARS = 60; // "one to three lines" of diagnosis
export const TEACH_CHARS = 350; // a worked example, not a sentence
/** Why the next recall may not be posed yet, or undefined if it may. `extraChars` = the call's own `say`. */
export function gateReason(p: Pedagogy, prompt: string, extraChars = 0): string | undefined {
	if (p.missStreak === 0) return undefined;
	const chars = p.sinceMissChars + extraChars;
	if (p.reviewMode) {
		// Review: he must be able to read what went wrong, then the tutor decides
		// (one narrower follow-up, or the next card; the retry list brings a missed
		// card back anyway). No forced worked examples, no part counting.
		if (chars < DIAGNOSE_CHARS) {
			return `Blocked: the last answer was a miss and he has read nothing from you since (${chars} characters; your thinking is invisible to him). Put 1-3 lines in this recall's \`say\` field (what went wrong and why, and what the right move was) or in chat text, then pose the next card or one narrower follow-up.`;
		}
		return undefined;
	}
	if (p.missStreak >= 2 && chars < TEACH_CHARS && !p.readSinceMiss) {
		return `Blocked: that is ${p.missStreak} misses in a row and you have not taught since the last one (${chars} characters he could read; your thinking does not count, he cannot see it). Testing again now would be a third miss. Teach exactly the step that failed (${p.lastMiss?.firstError ?? "see the grader's first error"}): call lesson_read with a WORKED EXAMPLE (every move with its reason, concrete numbers), or write it as chat text (at least ${TEACH_CHARS} characters). Then pose a completion problem with recall: the same structure with ONE blank for him to fill, and nothing else to explain in the same prompt (a "say why" tacked on turns a filled blank into another miss; ask the why afterwards, on its own).`;
	}
	if (chars < DIAGNOSE_CHARS) {
		return `Blocked: the last answer was a miss and he has read nothing from you since (${chars} characters; your thinking is invisible to him). Put your diagnosis in this recall's \`say\` field (1-3 lines: what went wrong and why, in your words, and what the right move was), or write it as chat text, and pose a narrower question on that one step in the same call. Never ask it as plain text: he answers on the web page, which only has an answer box while a recall is open.`;
	}
	const parts = countParts(prompt);
	if (parts > 2) {
		return `Blocked: after a miss, drill down. This prompt has ${parts} parts; pose ONE step (at most two parts) on exactly what failed (${p.lastMiss?.firstError ?? "the first error"}). Multi-part questions after a miss hide which step is broken.`;
	}
	return undefined;
}

/** Record a graded outcome from recall or quiz. */
export function recordOutcome(p: Pedagogy, o: { correct: boolean; prompt: string; verdict: string; firstError?: string }): void {
	if (o.correct) {
		p.missStreak = 0;
		p.lastMiss = undefined;
		p.readSinceMiss = false;
		return;
	}
	p.missStreak += 1;
	p.sinceMissChars = 0;
	p.readSinceMiss = false;
	p.lastMiss = { prompt: o.prompt, firstError: o.firstError, verdict: o.verdict };
}

// ---------- predict ----------
export const PREDICT_MAX_CHARS = 400;
export const QUICK_GUESS = "Quick guess: one line, under two minutes, no derivation. Being wrong is fine; committing is the point.";
export function predictReason(prompt: string, paper: boolean | undefined): string | undefined {
	if (paper) return "Refused: a predict check is a quick guess from intuition, not paper work. Drop `paper: true`, keep it to one line he can answer in under two minutes, and pose again.";
	if (prompt.trim().length > PREDICT_MAX_CHARS) {
		return `Refused: this predict prompt is ${prompt.trim().length} characters (max ${PREDICT_MAX_CHARS}). Predict comes BEFORE teaching, so it must be answerable from intuition alone in one line: "What do you expect X to do when Y, and why (one line)?" No derivation, no multi-part setup. Shorten it and pose again.`;
	}
	return undefined;
}

// ---------- owed reply ----------
// He asked a question (about a reading, in a card's "Other" box, or as a
// message). The model has answered in its thinking, which he never sees, and
// gone straight to "Ready?". So no card or check opens until the answer is
// somewhere he can read: chat text, the card's details, a `say`, a reading.
export const REPLY_CHARS = 150;
export function oweReply(p: Pedagogy, question: string): void {
	p.owedReply = { question: question.replace(/\s+/g, " ").trim().slice(0, 300), chars: 0, text: "" };
	p.replyForCard = undefined;
}
/** Chat text from the tutor (message_end). */
export function creditReply(p: Pedagogy, text: string): void {
	const t = text.trim();
	if (!p.owedReply || !t) return;
	p.owedReply.chars += t.length;
	p.owedReply.text = p.owedReply.text ? `${p.owedReply.text}\n\n${t}` : t;
}
/** Why `tool` may not open yet, or undefined (and the debt is paid). `ownChars` = text the call itself shows him. */
export function replyReason(p: Pedagogy, tool: string, ownChars = 0): string | undefined {
	const o = p.owedReply;
	if (!o) return undefined;
	if (o.chars + ownChars >= REPLY_CHARS) {
		p.replyForCard = o.chars >= REPLY_CHARS ? o.text : undefined;
		p.owedReply = undefined;
		return undefined;
	}
	return `Blocked: he asked "${o.question}" and has not seen a reply yet (${o.chars} characters of chat text since he asked; only chat text reaches his screen). Reply to him first: answer his question in chat text, fully, the way you would explain it out loud. Then call ${tool} again.`;
}
/** Not a question: a ready, a menu pick, or a session-start prompt. */
export function isQuestionText(text: string): boolean {
	const t = text.trim();
	if (!t || isReady(t) || t.startsWith("<skill") || t.startsWith("/")) return false;
	if (/^(Continue the lesson|Teach me|Review:|Next on the path)/i.test(t)) return false;
	return t.includes("?") || t.length >= 25;
}

// ---------- node ids ----------
// Lesson nodes have short ids (R1, D2, G) for the map and the tools. He has
// never seen them: "pick up at D3" means nothing to him. Anything he reads
// must name the idea by its label instead. The tools refuse text that leaks an id.
export interface NodeRef {
	slug: string;
	id: string;
	label: string;
}
export type NodeLessons = Array<{ slug: string; nodes: Array<{ id: string; label: string }> }>;
/** Ids that can be matched safely in prose: a letter or two followed by digits (R1, D2, EX3); a lone letter is too common. */
const PROSE_ID = /^[A-Z]{1,2}\d{1,2}$/;
/** Bare node ids found in learner-visible text (not inside $...$ math). */
export function findNodeIds(text: string, lessons: NodeLessons): NodeRef[] {
	if (!text) return [];
	const prose = text.replace(/\$\$[\s\S]*?\$\$/g, " ").replace(/\$[^$\n]*\$/g, " ");
	const out: NodeRef[] = [];
	const seen = new Set<string>();
	for (const l of lessons) {
		for (const n of l.nodes) {
			if (!PROSE_ID.test(n.id) || seen.has(n.id)) continue;
			if (new RegExp(`(?<![A-Za-z0-9_$\\\\])${n.id}(?![A-Za-z0-9_])`).test(prose)) {
				seen.add(n.id);
				out.push({ slug: l.slug, id: n.id, label: n.label });
			}
		}
	}
	return out;
}
/** Why a call must be rewritten, or undefined. `fields` = every learner-visible string of the call. */
export function nodeIdReason(fields: Record<string, string | undefined>, lessons: NodeLessons): string | undefined {
	const hits: Array<NodeRef & { field: string }> = [];
	for (const [field, text] of Object.entries(fields)) {
		for (const h of findNodeIds(text ?? "", lessons)) if (!hits.some((x) => x.id === h.id)) hits.push({ ...h, field });
	}
	if (!hits.length) return undefined;
	const list = hits.map((h) => `"${h.id}" (in ${h.field}) is the node "${h.label}"`).join("; ");
	return `Refused: node ids are internal and he has never seen them, so ${list}. Name the idea instead (e.g. "the matrix exponential", "the superposition step", "the reading on e^{Qt}"), never the id, and call again.`;
}

// ---------- practice ladder ----------
// Reading a derivation once does not make it reproducible, and reproducing it
// from memory is not understanding it. After each reading the node is practised
// in rungs, in this order, and the tools refuse checks out of order:
//   1. next-move checks: the derivation is shown up to a decision point and he
//      says what the next move is and why that one (meaning before mechanics);
//   2. a completion problem: the derivation with one step blank;
//   3. the node's assigned critical-thinking check (boundary / flaw / transfer);
//   4. the explain-back: the whole derivation on paper from a handle he owns.
// A miss on the explain-back restarts at the completion rung, not a lecture.
export type LadderStage = "nextmove" | "completion" | "check" | "explain";
export type LadderRung = "nextmove" | "completion";
export interface Ladder {
	slug: string;
	node: string;
	label?: string;
	check?: string; // the node's assigned check; predict/explain mean the rung is skipped
	stage: LadderStage;
	nextmove: { asked: number; right: number };
	completion: { asked: number; right: number };
	restarts: number;
}
export const NEXTMOVE_RIGHT = 2; // next-move checks that must land before the completion rung
export const NEXTMOVE_MAX = 3; // ... or this many asked
export const NEXTMOVE_BANNER = "Next move only: say what the next step is and why that one, not the whole derivation.";
export const COMPLETION_BANNER = "Fill the one blank.";

function name(l: Ladder): string {
	return l.label ? `"${l.label}"` : `node ${l.node}`;
}
function hasCheckRung(l: Ladder): boolean {
	return !!l.check && l.check !== "predict" && l.check !== "explain";
}
function advance(l: Ladder, from: LadderStage): void {
	if (from === "nextmove") l.stage = "completion";
	else if (from === "completion") l.stage = hasCheckRung(l) ? "check" : "explain";
	else if (from === "check") l.stage = "explain";
}

/** A reading was read: its node's ladder starts (an existing ladder for the same node is kept). */
export function startLadder(p: Pedagogy, slug: string, node: string, label?: string, check?: string): Ladder {
	if (p.ladder && p.ladder.slug === slug && p.ladder.node === node) {
		if (label) p.ladder.label = label;
		if (check) p.ladder.check = check;
		return p.ladder;
	}
	p.ladder = { slug, node, label, check, stage: "nextmove", nextmove: { asked: 0, right: 0 }, completion: { asked: 0, right: 0 }, restarts: 0 };
	return p.ladder;
}
/** The node was recorded (confirmed / shaky), the plan changed, or he moved on: no ladder. */
export function endLadder(p: Pedagogy, slug?: string, node?: string): void {
	if (!p.ladder) return;
	if (slug && p.ladder.slug !== slug) return;
	if (node && p.ladder.node !== node) return;
	p.ladder = undefined;
}

/** What the next rung is, for the tutor. */
export function ladderNext(l: Ladder): string {
	switch (l.stage) {
		case "nextmove":
			return `NEXT RUNG for ${name(l)}: a next-move check (${l.nextmove.right}/${NEXTMOVE_RIGHT} landed so far). Quote the derivation from the reading up to a decision point, in LaTeX, and ask "What is the next move, and why that one?" (reference = the move and its reason). Call recall with stage "nextmove". Pick a different decision point each time.`;
		case "completion":
			return `NEXT RUNG for ${name(l)}: a completion problem. The derivation with ONE step blank (a decision or a computation), fresh numbers, nothing else to explain in the same prompt. Call recall with stage "completion".`;
		case "check":
			return `NEXT RUNG for ${name(l)}: the node's assigned check, kind "${l.check}" (no stage).`;
		case "explain":
			return `NEXT RUNG for ${name(l)}: the explain-back as a derivation ON PAPER. Name the handle he already owns and ask him to get from it to the result with fresh numbers, saying at each move why it is the move (kind "explain", paper: true, no stage). Lands → lesson_node confirmed. Misses → the ladder restarts at a completion problem on the step that failed; no lecture.`;
	}
}

/** Why this recall is out of order on the ladder, or undefined. */
export function ladderReason(p: Pedagogy, o: { kind: string; stage?: LadderRung; paper?: boolean; cardId?: string }): string | undefined {
	const l = p.ladder;
	if (!l) {
		if (o.stage) return `Refused: stage "${o.stage}" is a practice-ladder rung, and no node is on the ladder (a ladder starts when he reads a lesson_read). Drop the stage, or give the reading first.`;
		return undefined;
	}
	if (o.cardId) return undefined; // a review card mid-lesson is not part of the ladder
	if (o.kind === "predict") return undefined; // the pretest of the next node may come at any time
	const next = ladderNext(l);
	switch (l.stage) {
		case "nextmove":
			if (o.stage === "nextmove") return undefined;
			return `Blocked: ${name(l)} was just read and its ladder starts with next-move checks, not ${o.stage ? `a ${o.stage}` : `a "${o.kind}" check`}. Reading once does not make a derivation reproducible; first he shows he can see what comes next and why. ${next}`;
		case "completion":
			if (o.stage === "completion") return undefined;
			if (o.stage === "nextmove") return undefined; // one more next-move is always allowed
			return `Blocked: the next rung for ${name(l)} is a completion problem, not ${`a "${o.kind}" check`}. ${next}`;
		case "check":
			if (o.stage) return `Blocked: the ladder rungs for ${name(l)} are done; what is due now is the node's assigned check. ${next}`;
			if (o.kind !== l.check) return `Blocked: the node's assigned check for ${name(l)} is "${l.check}", not "${o.kind}". ${next}`;
			return undefined;
		case "explain":
			if (o.stage === "completion") return undefined; // one more completion before the derivation is fine
			if (o.stage) return `Blocked: ${name(l)} is past its next-move rung; what is due is the explain-back. ${next}`;
			if (o.kind !== "explain") return `Blocked: the only check left for ${name(l)} is the explain-back (kind "explain"), not "${o.kind}". ${next}`;
			if (!o.paper) return `Refused: the explain-back is a derivation on paper, not prose. Set paper: true, name the handle he owns, ask for the derivation with fresh numbers and the reason for each move. ${next}`;
			return undefined;
	}
}

/**
 * A graded outcome on the ladder. Returns the line to append to the tool
 * result (what rung comes next), or undefined when the ladder is not involved.
 */
export function ladderOutcome(p: Pedagogy, o: { kind: string; stage?: LadderRung; correct: boolean; cardId?: string }): string | undefined {
	const l = p.ladder;
	if (!l || o.cardId) return undefined;
	if (o.stage === "nextmove") {
		l.nextmove.asked++;
		if (o.correct) l.nextmove.right++;
		if (l.stage === "nextmove" && (l.nextmove.right >= NEXTMOVE_RIGHT || l.nextmove.asked >= NEXTMOVE_MAX)) advance(l, "nextmove");
		return ladderNext(l);
	}
	if (o.stage === "completion") {
		l.completion.asked++;
		if (o.correct) l.completion.right++;
		if (l.stage === "completion" && (o.correct || l.completion.asked >= 2)) advance(l, "completion");
		return ladderNext(l);
	}
	if (l.stage === "check" && o.kind === l.check) {
		if (o.correct) advance(l, "check");
		return o.correct ? ladderNext(l) : `The check missed: diagnose and drill down as usual; the explain-back waits until this lands. ${ladderNext(l)}`;
	}
	if (l.stage === "explain" && o.kind === "explain") {
		if (o.correct) {
			p.ladder = undefined;
			return `The derivation landed: the ladder for ${name(l)} is complete. Record the node with lesson_node (confirmed) and save its cards.`;
		}
		l.stage = "completion";
		l.completion = { asked: 0, right: 0 };
		l.restarts++;
		clearMiss(p);
		return `The derivation did not land (restart ${l.restarts}). No lecture: put 1-3 lines of diagnosis in the next \`say\`, then the ladder restarts at a completion problem on exactly the step that failed, then the derivation again. ${ladderNext(l)}`;
	}
	return undefined;
}
