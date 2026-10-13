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
	missStreak: number; // consecutive misses (recall partial/incorrect/dontKnow, quiz incorrect/dontKnow)
	sinceMissChars: number; // text the learner could read since the last miss (chat text, `say`, readings)
	lastMiss?: { prompt: string; firstError?: string; verdict: string };
	readSinceMiss?: boolean; // a lesson_read was read since the last miss (counts as teaching)
	/** The node whose reading must come before the next recall/quiz (set by lesson_plan / lesson_node). */
	readNeeded?: { slug: string; node: string; shown?: boolean };
	/** "slug/node" keys that have been read (tapped) this pi session: never asked twice. */
	readNodes?: string[];
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
	if (r.shown) {
		return `Blocked: he has the reading for ${r.slug}/${r.node} but asked about it instead of marking it read. Answer his question in chat text, then call ask_user_question with options "Ready, ask me" and "I have another question". Pose the check only after he picks ready (do NOT call lesson_read again for this node).`;
	}
	return `Blocked: node ${r.node} of lesson ${r.slug} is new and he has not read it yet. Call lesson_read with slug "${r.slug}", node "${r.node}", a title, and a body of at least ${READ_MIN_CHARS} characters (markdown + LaTeX): the motivated derivation or guided derivation, ONE worked instance with every move explained, and what it hangs off. He reads it and taps "Read it, ask me"; then pose the check. Your thinking is invisible to him: anything he must read goes in lesson_read, chat text, or a tool's \`say\`.`;
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
export function armReading(p: Pedagogy, slug: string, node: string | undefined): void {
	if (!node) {
		if (p.readNeeded?.slug === slug) p.readNeeded = undefined;
		return;
	}
	if (p.readNodes?.includes(readKey(slug, node))) {
		p.readNeeded = undefined;
		return;
	}
	if (p.readNeeded && p.readNeeded.slug === slug && p.readNeeded.node === node) return; // keep `shown`
	p.readNeeded = { slug, node };
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
	if (p.missStreak >= 2 && chars < TEACH_CHARS && !p.readSinceMiss) {
		return `Blocked: that is ${p.missStreak} misses in a row and you have not taught since the last one (${chars} characters he could read; your thinking does not count, he cannot see it). Testing again now would be a third miss. Teach exactly the step that failed (${p.lastMiss?.firstError ?? "see the grader's first error"}): call lesson_read with a WORKED EXAMPLE (every move with its reason, concrete numbers), or write it as chat text (at least ${TEACH_CHARS} characters). Then pose a completion problem with recall: the same structure with one blank for him to fill.`;
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
