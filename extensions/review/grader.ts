/**
 * grader — a context-free grading call.
 *
 * The teacher must never grade its own teaching (self-preference bias is
 * measured and worst on math). So grading runs in a separate `pi -p` process
 * that sees ONLY: the question, the reference answer written before the
 * learner answered, the rubric for the check kind, the learner's answer
 * (typed text and/or photos), and the stated confidence. No lesson context.
 * It must write its reading of the work and its reasoning before the verdict.
 *
 * Model: PI_GRADER_MODEL (default claude-bridge/claude-opus-5-5).
 * Not a pi extension (no default export).
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export type Verdict = "correct" | "partial" | "incorrect";

export interface GradeInput {
	kind: string;
	prompt: string;
	reference: string;
	rubric?: string;
	answerText?: string;
	photoFiles?: string[];
	confidence?: number;
	cwd: string;
}

export interface GradeResult {
	reading: string; // what the grader read off the page / understood the answer to be
	reasoning: string;
	verdict: Verdict;
	score: number; // 0..1
	firstError?: string;
	feedback: string; // 1-3 sentences for the learner
	raw?: string;
	error?: string;
}

const DEFAULT_MODEL = "claude-bridge/claude-opus-5-5";
const TIMEOUT_MS = 120_000;

const KIND_RUBRIC: Record<string, string> = {
	recall: "Grade whether the learner's answer captures the idea in the reference, including the WHY when the reference gives one. Wording may differ freely. Missing the reason when the reference states it is at most 'partial'.",
	explain:
		"This is an explain-back in the learner's own words. Grade the reasoning chain: are the steps correct, are the dependencies stated, does it hang off the right foundations? A fluent restatement without the mechanism is 'partial'.",
	predict:
		"The learner predicted an outcome before seeing it. Grade the prediction against the reference AND the stated reason. A right prediction for a wrong reason is 'partial'.",
	boundary:
		"The learner was asked which assumption a step uses / what breaks without it / what happens at a limit. Grade against the reference; credit correct identification of the regime of validity. Vague hedging without naming the assumption is 'incorrect'.",
	flaw: "The learner was shown an argument with ONE planted error (described in the reference) and asked whether it is right and what is wrong. 'correct' = they rejected it and located the actual error. 'partial' = rejected it but pointed at the wrong place or gave no location. 'incorrect' = accepted it as right.",
	transfer:
		"The same idea was posed in an unfamiliar cover story or notation. Grade whether the learner recognised the structure and applied it correctly; do not penalise notation differences.",
	problem:
		"A worked problem, usually on paper. Grade the METHOD and the result. Name the first line that goes wrong if any. Arithmetic slips with a correct method are 'partial' with a high score (0.7-0.8).",
};

function bridgeExtensionPath(): string | undefined {
	const p = path.join(os.homedir(), ".pi", "agent", "npm", "node_modules", "pi-claude-bridge", "src", "index.ts");
	return fs.existsSync(p) ? p : undefined;
}

export function buildGraderPrompt(input: GradeInput): string {
	const lines = [
		"You are a strict, independent grader for a one-on-one tutoring system. You have NO context beyond this message. You will be audited on false positives: marking wrong or vague work as correct is the worst failure. Do not be swayed by confident tone, length, or notation density.",
		"",
		`## Check kind: ${input.kind}`,
		KIND_RUBRIC[input.kind] ?? KIND_RUBRIC.recall,
		input.rubric ? `\nAdditional rubric from the teacher: ${input.rubric}` : "",
		"",
		"## Question posed to the learner",
		input.prompt,
		"",
		"## Reference (written before the learner answered; the learner has not seen it)",
		input.reference,
		"",
		"## Learner's answer",
		input.answerText ? input.answerText : "(no typed text)",
		input.photoFiles?.length ? `\n${input.photoFiles.length} photo(s) of handwritten work are attached. Read them carefully; if the handwriting is ambiguous, say so in 'reading' rather than guessing.` : "",
		input.confidence !== undefined ? `\nLearner's stated confidence: ${input.confidence}/100.` : "",
		"",
		"## Output",
		"Reply with ONLY a JSON object, no prose, no code fence:",
		'{"reading": "<what you read/understood the learner to have answered, one or two sentences; for photos, transcribe the key lines>",',
		' "reasoning": "<compare against the reference step by step, briefly>",',
		' "verdict": "correct" | "partial" | "incorrect",',
		' "score": <number 0 to 1>,',
		' "first_error": "<the first place it goes wrong, or empty string>",',
		' "feedback": "<1-3 sentences to the learner: what was right specifically, what was wrong, without giving a full solution>"}',
	];
	return lines.filter((l) => l !== undefined).join("\n");
}

function parseJson(text: string): any | undefined {
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	const candidates = [fenced?.[1], text, text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)];
	for (const c of candidates) {
		if (!c) continue;
		try {
			return JSON.parse(c.trim());
		} catch {
			// try next
		}
	}
	return undefined;
}

export async function grade(input: GradeInput): Promise<GradeResult> {
	const model = process.env.PI_GRADER_MODEL || DEFAULT_MODEL;
	const tmpDir = path.join(input.cwd, ".learn", "tmp");
	fs.mkdirSync(tmpDir, { recursive: true });
	const promptFile = path.join(tmpDir, `grader-${Date.now().toString(36)}.md`);
	fs.writeFileSync(promptFile, buildGraderPrompt(input), "utf8");

	const args = ["-p", "--no-extensions", "--no-skills", "--no-tools", "--no-session", "--no-context-files", "--no-prompt-templates", "--no-themes", "--thinking", "medium", "--model", model];
	const bridge = model.startsWith("claude-bridge/") ? bridgeExtensionPath() : undefined;
	if (bridge) args.push("-e", bridge);
	for (const f of input.photoFiles ?? []) args.push(`@${f}`);
	args.push(`@${promptFile}`);
	args.push("Grade the attached work as instructed. Output only the JSON object.");

	const raw = await new Promise<string>((resolve, reject) => {
		// stdin must be closed: `pi -p` waits for piped input otherwise.
		const child = execFile("pi", args, { cwd: tmpDir, timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, PI_SUBAGENT_AGENT: "grader" } }, (err, stdout, stderr) => {
			if (err) reject(new Error(`grader failed: ${err.message}\n${stderr}`));
			else resolve(stdout);
		});
		child.stdin?.end();
	}).finally(() => {
		try {
			fs.unlinkSync(promptFile);
		} catch {
			// ignore
		}
	});

	const j = parseJson(raw);
	if (!j || !["correct", "partial", "incorrect"].includes(j.verdict)) {
		return { reading: "", reasoning: "", verdict: "partial", score: 0.5, feedback: "The grader returned an unreadable result; the teacher should grade this one by hand.", raw, error: "unparseable" };
	}
	const score = Math.max(0, Math.min(1, Number(j.score)));
	return {
		reading: String(j.reading ?? ""),
		reasoning: String(j.reasoning ?? ""),
		verdict: j.verdict,
		score: Number.isFinite(score) ? score : j.verdict === "correct" ? 1 : j.verdict === "partial" ? 0.5 : 0,
		firstError: j.first_error ? String(j.first_error) : undefined,
		feedback: String(j.feedback ?? ""),
		raw,
	};
}
