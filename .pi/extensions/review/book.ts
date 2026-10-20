/**
 * book — the textbook view of a lesson: its readings only, in teaching order,
 * with none of the questions, answers, grades or cards of the session log.
 *
 * Every reading the tutor shows (lesson_read) is appended to
 * <cwd>/.learn/readings.jsonl. The book for a lesson is regenerated from that
 * file plus the lesson record (title, goal, dependency map, node labels) into
 * <cwd>/book/<slug>.md, readable in Obsidian and served on the phone page
 * under "Book". Sections are headed by node LABELS, never ids: the ids (R1,
 * D2, G) are internal and the learner has never seen them.
 *
 * Not a pi extension (no default export).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type LessonRecord, loadLearner } from "./store.ts";

export interface Reading {
	at: string;
	slug: string;
	node: string;
	title: string;
	body: string;
	figure?: string;
}

export function readingsPath(cwd: string): string {
	return path.join(cwd, ".learn", "readings.jsonl");
}

export function bookDir(cwd: string): string {
	return path.join(cwd, "book");
}

export function bookPath(cwd: string, slug: string): string {
	return path.join(bookDir(cwd), `${slug}.md`);
}

export function loadReadings(cwd: string): Reading[] {
	const file = readingsPath(cwd);
	if (!fs.existsSync(file)) return [];
	return fs
		.readFileSync(file, "utf8")
		.split("\n")
		.filter((l) => l.trim())
		.map((l) => {
			try {
				return JSON.parse(l) as Reading;
			} catch {
				return undefined;
			}
		})
		.filter((r): r is Reading => !!r && typeof r.slug === "string" && typeof r.body === "string");
}

/** Append a reading the learner was shown (skipped if the same text is already on file). Returns false when skipped. */
export function recordReading(cwd: string, r: Omit<Reading, "at"> & { at?: string }): boolean {
	const rec: Reading = { at: r.at ?? new Date().toISOString(), slug: r.slug, node: r.node, title: r.title.trim(), body: r.body.trim(), ...(r.figure ? { figure: r.figure } : {}) };
	if (!rec.body) return false;
	const dup = loadReadings(cwd).some((x) => x.slug === rec.slug && x.node === rec.node && x.title === rec.title && x.body === rec.body);
	if (dup) return false;
	const file = readingsPath(cwd);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.appendFileSync(file, `${JSON.stringify(rec)}\n`, "utf8");
	return true;
}

/** Readings of one lesson, oldest first, with a later reading of the same title replacing an earlier one. */
export function readingsFor(all: Reading[], slug: string): Reading[] {
	const out: Reading[] = [];
	for (const r of all.filter((x) => x.slug === slug)) {
		const i = out.findIndex((x) => x.node === r.node && x.title === r.title);
		if (i >= 0) out[i] = r;
		else out.push(r);
	}
	return out;
}

/**
 * The plan's mermaid source with "ID: " prefixes stripped out of the labels,
 * so the drawn map shows names only. Unquoted labels are quoted: the tutor's
 * labels carry ";" "≠" "^" and parentheses, which break mermaid's parser bare.
 */
export function mapWithoutIds(plan: string, ids: string[]): string {
	let src = plan.trim();
	for (const id of ids) {
		const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		src = src.replace(new RegExp(`([\\[\\(\\{]+"?)\\s*${esc}\\s*[:.\\-–—]\\s*`, "g"), "$1");
	}
	return src.replace(/([A-Za-z0-9_]+)\[(?!")([^\]\n]*)\]/g, (_m, id: string, label: string) => `${id}["${label.replace(/"/g, "#quot;")}"]`);
}

function nodeNumber(i: number): string {
	return `${i + 1}`;
}

/**
 * A reading's own headings ("## Why this node now") sit under the book's
 * "## 3. Section" / "### Reading title", so they move down two levels.
 * Fenced code is left alone.
 */
export function demoteHeadings(text: string): string {
	let fenced = false;
	return text
		.split("\n")
		.map((line) => {
			if (/^\s*```/.test(line)) fenced = !fenced;
			if (fenced) return line;
			return line.replace(/^(#{1,6})(\s)/, (_m, h: string, s: string) => `${"#".repeat(Math.min(6, h.length + 2))}${s}`);
		})
		.join("\n");
}

/** Ids the tutor may have used in prose before the rule existed (R1, D2, EX3); a lone letter is left alone. */
const PROSE_ID = /^[A-Z]{1,2}\d{1,2}$/;

/**
 * Older readings refer to other nodes by id ("D2 gives you a recipe", "hangs
 * off D1"). In the book those become section references, "§3 (Superposition)",
 * so the text still reads weeks later. Math ($...$) is left untouched.
 */
export function nameNodeIds(text: string, nodes: Array<{ id: string; label: string }>): string {
	const ids = nodes.filter((n) => PROSE_ID.test(n.id));
	if (!ids.length) return text;
	const ref = new Map(ids.map((n) => [n.id, `§${nodes.indexOf(n) + 1} (${n.label})`]));
	const pattern = new RegExp(`(?<![A-Za-z0-9_$\\\\])(${ids.map((n) => n.id).join("|")})(?![A-Za-z0-9_])`, "g");
	return text
		.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*\$)/)
		.map((part, i) => (i % 2 === 1 ? part : part.replace(pattern, (_m, id: string) => ref.get(id) ?? id)))
		.join("");
}

/** The book as markdown. `lesson` may be missing (readings for a slug that has no plan yet). */
export function bookMarkdown(lesson: LessonRecord | undefined, slug: string, readings: Reading[], now = new Date()): string {
	const title = lesson?.title ?? slug;
	const nodes = lesson?.nodes ?? [];
	const byNode = new Map<string, Reading[]>();
	for (const r of readings) {
		const list = byNode.get(r.node) ?? [];
		list.push(r);
		byNode.set(r.node, list);
	}
	const known = new Set(nodes.map((n) => n.id));
	const stray = readings.filter((r) => !known.has(r.node));

	const lines: string[] = [
		"---",
		`slug: ${slug}`,
		`title: "${title.replace(/"/g, "'")}"`,
		`readings: ${readings.length}`,
		`updated: ${now.toISOString()}`,
		"---",
		`# ${title}`,
		"",
		"*The book of this lesson: only what the tutor wrote for you to read, in teaching order. Questions, answers and grades stay in the lesson log.*",
	];
	if (lesson?.goal) lines.push("", `**Goal.** ${lesson.goal}`);
	if (lesson?.plan?.trim()) lines.push("", "## Map", "", "```mermaid", mapWithoutIds(lesson.plan, nodes.map((n) => n.id)), "```");
	if (nodes.length) {
		lines.push("", "## Contents", "");
		nodes.forEach((n, i) => {
			const rs = byNode.get(n.id) ?? [];
			lines.push(`${nodeNumber(i)}. ${n.label}${rs.length ? "" : " *(not written yet)*"}`);
		});
	}
	const named = (t: string) => demoteHeadings(nameNodeIds(t.trim(), nodes));
	nodes.forEach((n, i) => {
		const rs = byNode.get(n.id) ?? [];
		if (!rs.length) return;
		lines.push("", `## ${nodeNumber(i)}. ${n.label}`);
		for (const r of rs) {
			lines.push("", `### ${named(r.title)}`, "", named(r.body));
			if (r.figure) lines.push("", `![[${r.figure}|600]]`);
		}
	});
	if (stray.length) {
		lines.push("", nodes.length ? "## Other readings" : "## Readings");
		for (const r of stray) {
			lines.push("", `### ${named(r.title)}`, "", named(r.body));
			if (r.figure) lines.push("", `![[${r.figure}|600]]`);
		}
	}
	return `${lines.join("\n")}\n`;
}

/** (Re)write book/<slug>.md. Returns the path, or undefined when there is nothing to write. */
export function writeBook(cwd: string, slug: string): string | undefined {
	const store = loadLearner(cwd);
	const lesson = store.lessons.find((l) => l.slug === slug);
	const readings = readingsFor(loadReadings(cwd), slug);
	if (!lesson && !readings.length) return undefined;
	const file = bookPath(cwd, slug);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, bookMarkdown(lesson, slug, readings), "utf8");
	return file;
}

/** Every lesson with a plan or a reading gets a book. */
export function writeAllBooks(cwd: string): string[] {
	const store = loadLearner(cwd);
	const slugs = new Set<string>(store.lessons.map((l) => l.slug));
	for (const r of loadReadings(cwd)) slugs.add(r.slug);
	const out: string[] = [];
	for (const slug of slugs) {
		const f = writeBook(cwd, slug);
		if (f) out.push(f);
	}
	return out;
}

export interface BookEntry {
	slug: string;
	title: string;
	status?: string;
	readings: number;
	file: string;
	updated: string;
}

/** The books on disk, most recently touched first (for the page's picker). */
export function bookList(cwd: string): BookEntry[] {
	const store = loadLearner(cwd);
	const all = loadReadings(cwd);
	const out: BookEntry[] = [];
	const slugs = new Set<string>(store.lessons.map((l) => l.slug));
	for (const r of all) slugs.add(r.slug);
	for (const slug of slugs) {
		const lesson = store.lessons.find((l) => l.slug === slug);
		const rs = readingsFor(all, slug);
		if (!rs.length) continue;
		out.push({
			slug,
			title: lesson?.title ?? slug,
			status: lesson?.status,
			readings: rs.length,
			file: path.relative(cwd, bookPath(cwd, slug)),
			updated: rs.reduce((m, r) => (r.at > m ? r.at : m), lesson?.updated ?? ""),
		});
	}
	return out.sort((a, b) => b.updated.localeCompare(a.updated));
}

// ---------- backfill from pi session transcripts ----------

/** pi's session folder for a vault: ~/.pi/agent/sessions/-<cwd with / as ->-- (e.g. --Users-me-learn--). */
export function sessionsDirFor(cwd: string, home = process.env.HOME ?? ""): string {
	return path.join(home, ".pi", "agent", "sessions", `-${cwd.replace(/\//g, "-")}--`);
}

/**
 * Readings shown in past sessions, recovered from the transcripts (lesson_read
 * tool calls whose result was not a refusal). Used once to build the books for
 * lessons taught before readings were kept on file.
 */
export function importSessionReadings(cwd: string, dir = sessionsDirFor(cwd)): { files: number; found: number; added: number } {
	if (!fs.existsSync(dir)) return { files: 0, found: 0, added: 0 };
	const files = fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".jsonl"))
		.sort();
	let found = 0;
	let added = 0;
	for (const f of files) {
		const calls = new Map<string, { at: string; args: any }>();
		const results = new Map<string, string>();
		for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
			if (!line.trim()) continue;
			let e: any;
			try {
				e = JSON.parse(line);
			} catch {
				continue;
			}
			if (e?.type !== "message") continue;
			const m = e.message ?? {};
			const content = Array.isArray(m.content) ? m.content : [];
			for (const p of content) {
				if (p?.type === "toolCall" && p.name === "lesson_read" && p.id) calls.set(String(p.id), { at: String(e.timestamp ?? m.timestamp ?? ""), args: p.arguments ?? {} });
			}
			if (m.role === "toolResult" && m.toolCallId && m.toolName === "lesson_read") {
				const text = (Array.isArray(m.content) ? m.content : []).map((c: any) => (c?.type === "text" ? String(c.text ?? "") : "")).join("\n");
				results.set(String(m.toolCallId), text);
			}
		}
		for (const [id, c] of calls) {
			const res = results.get(id) ?? "";
			if (/^(Refused|lesson_read requires)/.test(res.trim())) continue;
			const a = c.args;
			if (!a?.slug || !a?.node || !a?.body) continue;
			found++;
			if (recordReading(cwd, { at: c.at || new Date().toISOString(), slug: String(a.slug), node: String(a.node), title: String(a.title ?? a.node), body: String(a.body), figure: a.figure ? String(a.figure) : undefined })) added++;
		}
	}
	return { files: files.length, found, added };
}
