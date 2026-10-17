/**
 * sidechat — ask questions about lesson material on the side.
 *
 * A separate `pi -p` process (like the grader), so it never touches the
 * tutor's conversation or its gates. It sees the MATERIAL only: the tutor's
 * prose and readings from the lesson notes, with every question, answer and
 * verdict stripped out. It is told what question is open right now so it
 * explains the idea underneath instead of working the problem.
 *
 * History: .learn/sidechat.jsonl (append-only, one line per turn, grouped by
 * thread) and a readable copy in knowledge/_side-chat.md. The tutor's learner
 * slice lists recent side questions, since they show where the material
 * didn't land.
 *
 * Model: PI_SIDECHAT_MODEL, else the vault's default model from .pi/settings.json.
 * Not a pi extension (no default export).
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getPending } from "./prompts.ts";
import { loadLearner, type LessonRecord } from "./store.ts";

export interface ChatTurn {
	at: string;
	thread: string;
	lesson?: string;
	role: "you" | "tutor";
	text: string;
}

const TIMEOUT_MS = 180_000;
const MAX_FOCUS_CHARS = 90_000;
const MAX_OTHER_CHARS = 60_000;
const HISTORY_TURNS = 16;

function chatPath(cwd: string): string {
	return path.join(cwd, ".learn", "sidechat.jsonl");
}

export function loadChat(cwd: string): ChatTurn[] {
	try {
		return fs
			.readFileSync(chatPath(cwd), "utf8")
			.split("\n")
			.filter((l) => l.trim())
			.flatMap((l) => {
				try {
					return [JSON.parse(l) as ChatTurn];
				} catch {
					return [];
				}
			});
	} catch {
		return [];
	}
}

export function currentThread(cwd: string): string | undefined {
	const all = loadChat(cwd);
	return all[all.length - 1]?.thread;
}

export function newThreadId(): string {
	return `t${Date.now().toString(36)}`;
}

function appendTurn(cwd: string, t: ChatTurn): void {
	fs.mkdirSync(path.dirname(chatPath(cwd)), { recursive: true });
	fs.appendFileSync(chatPath(cwd), JSON.stringify(t) + "\n", "utf8");
	// Obsidian copy
	const md = path.join(cwd, "knowledge", "_side-chat.md");
	fs.mkdirSync(path.dirname(md), { recursive: true });
	if (!fs.existsSync(md)) fs.writeFileSync(md, "# Side chat\n\nQuestions asked about the material outside the lessons.\n", "utf8");
	const head = t.role === "you" ? `\n> [!quote] YOU · ${t.at.slice(0, 16).replace("T", " ")}${t.lesson ? ` · ${t.lesson}` : ""}\n\n` : "\n> [!abstract] TUTOR (side)\n\n";
	fs.appendFileSync(md, head + t.text.trim() + "\n", "utf8");
}

/** Teach lessons from learner.json, newest first. */
export function chatLessons(cwd: string): Array<{ slug: string; title: string; status: string }> {
	const store = loadLearner(cwd);
	return [...store.lessons].sort((a, b) => b.updated.localeCompare(a.updated)).map((l) => ({ slug: l.slug, title: l.title, status: l.status }));
}

/**
 * The taught material of a lesson note: the tutor's prose and readings only.
 * Every callout (questions, answers, verdicts, skill markers) and the
 * learner's own messages are dropped.
 */
export function lessonMaterial(text: string): string {
	const lines = text.split("\n");
	const out: string[] = [];
	let speaker: "pi" | "you" = "pi";
	let i = 0;
	while (i < lines.length) {
		const m = lines[i].match(/^> \[!(\w+)\]/);
		if (!m) {
			if (speaker === "pi") out.push(lines[i]);
			i++;
			continue;
		}
		const type = m[1].toLowerCase();
		i++;
		while (i < lines.length && lines[i].startsWith(">")) i++;
		if (type === "quote") speaker = "you";
		else if (type === "abstract") speaker = "pi";
		// any other callout is an event: skipped, speaker unchanged
	}
	return out
		.join("\n")
		.replace(/!\[\[[^\]]+\]\]/g, "")
		.replace(/<learner>[\s\S]*?<\/learner>/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function readMaterial(cwd: string, l: LessonRecord | { slug: string; file?: string }): string {
	const file = path.join(cwd, l.file ?? `lessons/${l.slug}.md`);
	try {
		return lessonMaterial(fs.readFileSync(file, "utf8"));
	} catch {
		return "";
	}
}

/** Only the "## Reading — …" sections of a lesson's material (used for the other lessons). */
function readingsOnly(material: string): string {
	const parts = material.split(/(?=^## Reading — )/m).filter((p) => p.startsWith("## Reading — "));
	return parts.join("\n\n").trim();
}

function defaultModel(cwd: string): string {
	if (process.env.PI_SIDECHAT_MODEL) return process.env.PI_SIDECHAT_MODEL;
	try {
		const s = JSON.parse(fs.readFileSync(path.join(cwd, ".pi", "settings.json"), "utf8"));
		if (s.defaultProvider && s.defaultModel) return `${s.defaultProvider}/${s.defaultModel}`;
	} catch {
		// fall through
	}
	return "claude-bridge/claude-opus-5-5";
}

function bridgeExtensionPath(): string | undefined {
	const p = path.join(os.homedir(), ".pi", "agent", "npm", "node_modules", "pi-claude-bridge", "src", "index.ts");
	return fs.existsSync(p) ? p : undefined;
}

const GRADED_KINDS = new Set(["recall", "explain", "predict", "boundary", "flaw", "transfer", "problem", "quiz"]);

export function buildSideChatPrompt(input: { cwd: string; lesson?: string; history: ChatTurn[]; question: string }): string {
	const store = loadLearner(input.cwd);
	const lessons = [...store.lessons].sort((a, b) => b.updated.localeCompare(a.updated));
	const focus = lessons.find((l) => l.slug === input.lesson) ?? lessons[0];

	const lines: string[] = [
		"You are the side-chat explainer of a one-on-one tutoring system. The learner is asking about lesson MATERIAL they have been taught and don't fully understand yet. You are not the tutor running the lesson: you do not quiz, grade, or set problems, and nothing you say is graded.",
		"",
		"How to answer:",
		"- Answer the question they asked, directly, first. Then the why. Keep it as short as the question allows; go longer only if they ask for depth.",
		"- Build on what the lesson material below already gave them: its notation, its examples, its words. If their question exposes a missing foundation, teach that piece plainly instead of pointing back at the reading.",
		"- Concrete before abstract: a small number example or a picture-in-words, then the general form.",
		"- If they state something wrong, say so plainly and show where it breaks.",
		"- Do not end with a question to test them, and do not offer exercises. At most, one line saying what to ask next if they want to go further.",
		"- Do not work or hint at the problems and review questions themselves. If they paste one or asks for its answer, explain the concept it rests on in general terms, with a different example, and say that the problem itself goes to the tutor.",
		"- Write every mathematical expression in LaTeX between dollar signs ($k\\,dt$, $$\\frac{dS}{dt} = -kS$$). It is rendered. Markdown is rendered too.",
	];

	const p = getPending();
	if (p && GRADED_KINDS.has(p.kind)) {
		lines.push("", "## The question open in the lesson right now (do NOT answer, work, or hint at it)", p.prompt.slice(0, 2000));
	}

	if (focus) {
		const mat = readMaterial(input.cwd, focus);
		lines.push("", `## Lesson they are asking about: "${focus.title}" (${focus.status})`);
		if (focus.nodes.length) {
			lines.push("Concepts in this lesson (id · concept · how well they have it):");
			for (const n of focus.nodes) lines.push(`- ${n.id} · ${n.label} · ${n.status}`);
		}
		if (mat) lines.push("", "### What the tutor taught (prose and readings, questions removed)", mat.length > MAX_FOCUS_CHARS ? mat.slice(-MAX_FOCUS_CHARS) : mat);
	}

	const others = lessons.filter((l) => l !== focus);
	if (others.length) {
		lines.push("", "## Their other lessons (readings only, for cross-references)");
		let budget = MAX_OTHER_CHARS;
		for (const l of others) {
			const r = readingsOnly(readMaterial(input.cwd, l));
			lines.push(`### "${l.title}"`);
			if (r && budget > 0) {
				const cut = r.slice(0, budget);
				lines.push(cut);
				budget -= cut.length;
			} else lines.push(l.nodes.map((n) => `- ${n.label}`).join("\n") || "(no readings)");
		}
	}

	if (input.history.length) {
		lines.push("", "## This side conversation so far");
		for (const t of input.history.slice(-HISTORY_TURNS)) lines.push(`**${t.role === "you" ? "Learner" : "You"}:** ${t.text}`, "");
	}
	lines.push("", "## Their question now", input.question, "", "Reply to the learner directly (no preamble, no JSON).");
	return lines.join("\n");
}

let inFlight = false;

/** Ask one side question; records both turns. Throws on failure (nothing is recorded for the answer). */
export async function askSide(input: { cwd: string; question: string; lesson?: string; thread?: string }): Promise<ChatTurn> {
	if (inFlight) throw new Error("Still answering the previous question");
	inFlight = true;
	try {
		const thread = input.thread || currentThread(input.cwd) || newThreadId();
		const history = loadChat(input.cwd).filter((t) => t.thread === thread);
		const lesson = input.lesson || [...history].reverse().find((t) => t.lesson)?.lesson;
		const prompt = buildSideChatPrompt({ cwd: input.cwd, lesson, history, question: input.question });
		appendTurn(input.cwd, { at: new Date().toISOString(), thread, lesson, role: "you", text: input.question });

		const tmpDir = path.join(input.cwd, ".learn", "tmp");
		fs.mkdirSync(tmpDir, { recursive: true });
		const promptFile = path.join(tmpDir, `side-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.md`);
		fs.writeFileSync(promptFile, prompt, "utf8");
		const model = defaultModel(input.cwd);
		const args = ["-p", "--no-extensions", "--no-skills", "--no-tools", "--no-session", "--no-context-files", "--no-prompt-templates", "--no-themes", "--thinking", "medium", "--model", model];
		const bridge = model.startsWith("claude-bridge/") ? bridgeExtensionPath() : undefined;
		if (bridge) args.push("-e", bridge);
		args.push(`@${promptFile}`, "Answer the learner's question as instructed.");

		const raw = await new Promise<string>((resolve, reject) => {
			// stdin must be closed: `pi -p` waits for piped input otherwise.
			const child = execFile("pi", args, { cwd: tmpDir, timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, PI_SUBAGENT_AGENT: "sidechat" } }, (err, stdout, stderr) => {
				if (err) reject(new Error(`side chat failed: ${err.message.split("\n")[0]}${stderr ? `\n${stderr.slice(0, 400)}` : ""}`));
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
		const text = raw.trim();
		if (!text) throw new Error("side chat returned nothing");
		const turn: ChatTurn = { at: new Date().toISOString(), thread, lesson, role: "tutor", text };
		appendTurn(input.cwd, turn);
		return turn;
	} finally {
		inFlight = false;
	}
}

