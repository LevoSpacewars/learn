/**
 * prompts — the one pending learner prompt, shared between surfaces.
 *
 * When the `recall` tool (or later, `quiz`) is waiting for an answer it
 * registers itself here. Any surface can then answer it: the terminal UI,
 * a photo upload from the phone page, or the answer pad. First answer wins;
 * the tool unregisters on completion.
 *
 * Not a pi extension (no default export).
 */

export interface PendingPrompt {
	id: string;
	kind: string;
	prompt: string;
	startedAt: number;
	/** Deliver an answer from any surface. Returns false if already answered. */
	answer(a: PromptAnswer): boolean;
}

export interface PromptAnswer {
	source: "tui" | "phone" | "pad";
	text?: string;
	photos?: Array<{ file: string; data: string; mimeType: string }>;
	audio?: { file: string; transcript: string };
	confidence?: number;
	dontKnow?: boolean;
	hint?: boolean;
}

let pending: PendingPrompt | undefined;
const listeners = new Set<(p: PendingPrompt | undefined) => void>();

export function setPending(p: PendingPrompt | undefined): void {
	pending = p;
	for (const l of listeners) l(p);
}

export function getPending(): PendingPrompt | undefined {
	return pending;
}

/** Subscribe to prompt changes (the answer pad uses this to push updates). */
export function onPendingChange(l: (p: PendingPrompt | undefined) => void): () => void {
	listeners.add(l);
	return () => listeners.delete(l);
}

/** Try to answer the pending prompt from an external surface. */
export function answerPending(a: PromptAnswer): boolean {
	if (!pending) return false;
	return pending.answer(a);
}
