/**
 * notebook — the learner's own notes, tagged and organized for him.
 *
 * He writes a note on the web page ("Notebook" button, or "Note this" on
 * selected lesson text), or `/note <text>` in the terminal. Nothing about the
 * lesson changes: no gate, no prompt, no tutor turn. A separate `pi -p`
 * process (like the side chat) then titles, tags and summarizes the note,
 * ties it to a lesson and its concepts, and links related notes. He can edit
 * any of that on the page; the tutor can too, through the `notebook` tool,
 * when he asks it to find or organize his notes.
 *
 * Storage: .learn/notes.jsonl, append-only ({op: add | update | delete}).
 * Readable copy, rebuilt after every change: notebook/<date>-<title>.md per
 * note (frontmatter tags, so Obsidian's tag pane works) and
 * notebook/Notebook.md, the index by tag, by lesson and by date.
 *
 * Model for tagging: PI_NOTEBOOK_MODEL, else the vault default.
 * Not a pi extension (no default export).
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { bridgeExtensionPath, defaultModel } from "./sidechat.ts";
import { loadLearner } from "./store.ts";

export interface Note {
	id: string;
	at: string; // created
	updated: string;
	text: string;
	title?: string;
	tags: string[];
	lesson?: string; // lesson slug
	concepts?: string[]; // node labels / fundamentals the note is about
	summary?: string; // one line, written by the tagger
	related?: string[]; // ids of related notes
	images?: string[]; // vault-relative paths (work/…)
	tagged: boolean; // the tagger has run (or he tagged it by hand)
	source: "web" | "terminal" | "tutor";
	file?: string; // vault-relative markdown copy
}

type Op = { op: "add"; note: Note } | { op: "update"; id: string; at: string; patch: Partial<Note> } | { op: "delete"; id: string; at: string };

const TIMEOUT_MS = 120_000;
const MAX_TAGS = 6;

export function notesPath(cwd: string): string {
	return path.join(cwd, ".learn", "notes.jsonl");
}
export function notebookDir(cwd: string): string {
	return path.join(cwd, "notebook");
}

export function newNoteId(): string {
	return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** A tag as stored and as Obsidian accepts it: lowercase, letters, digits and dashes. */
export function normalizeTag(t: string): string {
	return String(t ?? "")
		.toLowerCase()
		.replace(/^#/, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 32);
}
export function normalizeTags(tags: unknown): string[] {
	const list = Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(/[,\s]+/) : [];
	const out: string[] = [];
	for (const t of list.map(normalizeTag)) if (t && !out.includes(t)) out.push(t);
	return out.slice(0, MAX_TAGS);
}

function readOps(cwd: string): Op[] {
	try {
		return fs
			.readFileSync(notesPath(cwd), "utf8")
			.split("\n")
			.flatMap((l) => {
				try {
					return l.trim() ? [JSON.parse(l) as Op] : [];
				} catch {
					return [];
				}
			});
	} catch {
		return [];
	}
}

/** Every live note, oldest first. */
export function loadNotes(cwd: string): Note[] {
	const notes = new Map<string, Note>();
	for (const op of readOps(cwd)) {
		if (op.op === "add") notes.set(op.note.id, { ...op.note, tags: op.note.tags ?? [], tagged: op.note.tagged ?? false, source: op.note.source ?? "web" });
		else if (op.op === "update") {
			const n = notes.get(op.id);
			if (n) {
				const keys = Object.keys(op.patch);
				const bookkeeping = keys.length === 1 && keys[0] === "file"; // a rename is not an edit
				notes.set(op.id, { ...n, ...op.patch, id: n.id, at: n.at, updated: bookkeeping ? n.updated : op.at });
			}
		} else if (op.op === "delete") notes.delete(op.id);
	}
	return [...notes.values()];
}

function appendOp(cwd: string, op: Op): void {
	fs.mkdirSync(path.dirname(notesPath(cwd)), { recursive: true });
	fs.appendFileSync(notesPath(cwd), JSON.stringify(op) + "\n", "utf8");
}

export function addNote(cwd: string, input: { text: string; title?: string; lesson?: string; tags?: string[]; images?: string[]; source?: Note["source"] }): Note {
	const text = input.text.trim();
	if (!text && !(input.images?.length)) throw new Error("Empty note");
	const now = new Date().toISOString();
	const tags = normalizeTags(input.tags);
	const note: Note = {
		id: newNoteId(),
		at: now,
		updated: now,
		text,
		title: input.title?.trim() || undefined,
		tags,
		lesson: input.lesson?.trim() || undefined,
		images: input.images?.length ? input.images : undefined,
		tagged: tags.length > 0,
		source: input.source ?? "web",
	};
	appendOp(cwd, { op: "add", note });
	writeNotebook(cwd);
	return note;
}

export function updateNote(cwd: string, id: string, patch: Partial<Omit<Note, "id" | "at">>): Note | undefined {
	const n = loadNotes(cwd).find((x) => x.id === id);
	if (!n) return undefined;
	const clean: Partial<Note> = {};
	if (patch.text !== undefined) clean.text = String(patch.text).trim();
	if (patch.title !== undefined) clean.title = String(patch.title).trim() || undefined;
	if (patch.tags !== undefined) clean.tags = normalizeTags(patch.tags);
	if (patch.lesson !== undefined) clean.lesson = patch.lesson ? String(patch.lesson).trim() : undefined;
	if (patch.concepts !== undefined) clean.concepts = Array.isArray(patch.concepts) ? patch.concepts.map(String).filter(Boolean).slice(0, 8) : undefined;
	if (patch.summary !== undefined) clean.summary = patch.summary ? String(patch.summary).trim() : undefined;
	if (patch.related !== undefined) clean.related = Array.isArray(patch.related) ? patch.related.map(String).filter((r) => r !== id) : undefined;
	if (patch.tagged !== undefined) clean.tagged = !!patch.tagged;
	if (patch.images !== undefined) clean.images = patch.images;
	if (clean.tags && clean.tags.length) clean.tagged = true;
	appendOp(cwd, { op: "update", id, at: new Date().toISOString(), patch: clean });
	writeNotebook(cwd);
	return loadNotes(cwd).find((x) => x.id === id);
}

export function deleteNote(cwd: string, id: string): boolean {
	const n = loadNotes(cwd).find((x) => x.id === id);
	if (!n) return false;
	appendOp(cwd, { op: "delete", id, at: new Date().toISOString() });
	if (n.file) {
		try {
			fs.unlinkSync(path.join(cwd, n.file));
		} catch {
			// already gone
		}
	}
	writeNotebook(cwd);
	return true;
}

/** Full-text search over title, text, tags, summary and concepts. */
export function searchNotes(notes: Note[], query: string): Note[] {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (!terms.length) return notes;
	return notes.filter((n) => {
		const hay = [n.title, n.text, n.summary, ...(n.tags ?? []), ...(n.concepts ?? [])].filter(Boolean).join("\n").toLowerCase();
		return terms.every((t) => hay.includes(t));
	});
}

export function tagCounts(notes: Note[]): Array<{ tag: string; count: number }> {
	const m = new Map<string, number>();
	for (const n of notes) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
	return [...m.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// ── Markdown copy ──────────────────────────────────────────────────────────

export function noteTitle(n: Note): string {
	if (n.title) return n.title;
	const first = n.text.split("\n").map((l) => l.trim()).find(Boolean) ?? "Note";
	const t = first
		.replace(/^#+\s*/, "")
		.replace(/\$[^$]*\$/g, (m) => m.slice(1, -1))
		.replace(/\\[,;!: ]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return t.length > 60 ? t.slice(0, 57).replace(/\s+\S*$/, "") + "…" : t;
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48) || "note";
}

/** Where a note's markdown copy goes: notebook/<date>-<title>.md, unique per note. */
export function noteFile(cwd: string, n: Note, taken: Set<string>): string {
	const base = `${n.at.slice(0, 10)}-${slugify(noteTitle(n))}`;
	let rel = `notebook/${base}.md`;
	if (taken.has(rel)) rel = `notebook/${base}-${n.id.slice(-4)}.md`;
	taken.add(rel);
	return rel;
}

function yamlList(items: string[]): string {
	return `[${items.map((s) => JSON.stringify(s)).join(", ")}]`;
}

export function noteMarkdown(n: Note, all: Note[], lessonTitle?: string): string {
	const out: string[] = ["---", `id: ${n.id}`, `created: ${n.at}`, `updated: ${n.updated}`];
	if (n.tags.length) out.push(`tags: ${yamlList(n.tags)}`);
	if (n.lesson) out.push(`lesson: ${n.lesson}`);
	if (n.concepts?.length) out.push(`concepts: ${yamlList(n.concepts)}`);
	out.push("---", "", `# ${noteTitle(n)}`, "");
	const meta: string[] = [n.at.slice(0, 10)];
	if (lessonTitle) meta.push(`lesson: [[${lessonTitle}]]`);
	if (n.tags.length) meta.push(n.tags.map((t) => `#${t}`).join(" "));
	out.push(`*${meta.join(" · ")}*`, "");
	if (n.summary) out.push(`> [!abstract] In short`, `> ${n.summary}`, "");
	if (n.concepts?.length) out.push(`**About:** ${n.concepts.join(", ")}`, "");
	out.push(n.text.trim(), "");
	for (const img of n.images ?? []) out.push(`![[${img}]]`, "");
	const related = (n.related ?? []).map((id) => all.find((x) => x.id === id)).filter((x): x is Note => !!x && !!x.file);
	if (related.length) out.push("**Related:** " + related.map((r) => `[[${path.basename(r.file!, ".md")}]]`).join(", "), "");
	return out.join("\n");
}

export function indexMarkdown(notes: Note[], lessonTitles: Record<string, string>): string {
	const link = (n: Note) => (n.file ? `[[${path.basename(n.file, ".md")}|${noteTitle(n)}]]` : noteTitle(n));
	const line = (n: Note) => `- ${n.at.slice(0, 10)} ${link(n)}${n.summary ? ` — ${n.summary}` : ""}`;
	const out = ["# Notebook", "", `${notes.length} note${notes.length === 1 ? "" : "s"}. Written by you; titled, tagged and linked for you. Edit anything on the page or in Obsidian.`, ""];
	const byTag = tagCounts(notes);
	if (byTag.length) {
		out.push("## By tag", "");
		for (const { tag, count } of byTag) {
			out.push(`### #${tag} (${count})`, "");
			for (const n of [...notes].reverse().filter((n) => n.tags.includes(tag))) out.push(line(n));
			out.push("");
		}
	}
	const lessons = [...new Set(notes.map((n) => n.lesson).filter((s): s is string => !!s))];
	if (lessons.length) {
		out.push("## By lesson", "");
		for (const slug of lessons) {
			out.push(`### ${lessonTitles[slug] ?? slug}`, "");
			for (const n of [...notes].reverse().filter((n) => n.lesson === slug)) out.push(line(n));
			out.push("");
		}
	}
	const untagged = notes.filter((n) => !n.tags.length);
	if (untagged.length) {
		out.push("## Not tagged yet", "");
		for (const n of [...untagged].reverse()) out.push(line(n));
		out.push("");
	}
	out.push("## All, newest first", "");
	for (const n of [...notes].reverse()) out.push(`- ${n.at.slice(0, 10)} ${link(n)}${n.tags.length ? ` ${n.tags.map((t) => `#${t}`).join(" ")}` : ""}`);
	out.push("");
	return out.join("\n");
}

function lessonTitles(cwd: string): Record<string, string> {
	try {
		return Object.fromEntries(loadLearner(cwd).lessons.map((l) => [l.slug, l.title]));
	} catch {
		return {};
	}
}

/** Rewrites notebook/*.md from the log. Returns the files written. */
export function writeNotebook(cwd: string): string[] {
	const notes = loadNotes(cwd);
	const dir = notebookDir(cwd);
	fs.mkdirSync(dir, { recursive: true });
	const titles = lessonTitles(cwd);
	const taken = new Set<string>();
	const files: string[] = [];
	const renamed: Array<{ id: string; file: string }> = [];
	for (const n of notes) {
		const rel = noteFile(cwd, n, taken);
		if (n.file !== rel) {
			if (n.file) {
				try {
					fs.unlinkSync(path.join(cwd, n.file));
				} catch {
					// never written
				}
			}
			n.file = rel;
			renamed.push({ id: n.id, file: rel });
		}
	}
	for (const n of notes) {
		const abs = path.join(cwd, n.file!);
		fs.writeFileSync(abs, noteMarkdown(n, notes, n.lesson ? titles[n.lesson] : undefined), "utf8");
		files.push(abs);
	}
	// stray files from deleted notes
	for (const f of fs.readdirSync(dir)) {
		if (f === "Notebook.md" || !f.endsWith(".md")) continue;
		if (!taken.has(`notebook/${f}`)) {
			try {
				fs.unlinkSync(path.join(dir, f));
			} catch {
				// ignore
			}
		}
	}
	const index = path.join(dir, "Notebook.md");
	fs.writeFileSync(index, indexMarkdown(notes, titles), "utf8");
	files.push(index);
	// remember file names without triggering another rewrite
	for (const r of renamed) appendOp(cwd, { op: "update", id: r.id, at: new Date().toISOString(), patch: { file: r.file } });
	return files;
}

// ── Tagging (separate process) ─────────────────────────────────────────────

export interface Tagging {
	title: string;
	tags: string[];
	lesson?: string;
	concepts: string[];
	summary: string;
	related: string[];
}

export function buildTagPrompt(cwd: string, note: Note, all: Note[]): string {
	const store = loadLearner(cwd);
	const lines: string[] = [
		"You organize a learner's personal notebook. Below is one note he just wrote while studying, plus his existing tags, lessons and other notes. Title it, tag it, tie it to the lesson and concepts it is about, summarize it in one line, and point at related notes.",
		"",
		"Rules:",
		"- title: at most 60 characters, his idea in his words, no quotes around it. If the note already starts with a heading, keep that.",
		"- tags: 2 to 5, lowercase, words joined by dashes. REUSE his existing tags whenever one fits; invent a new one only for a genuinely new topic. One tag names the subject area (e.g. hdx, markov, linear-algebra), the others the kind of note (question, insight, mistake, todo, definition, derivation, example, connection) or the specific concept.",
		"- lesson: the slug of the lesson it belongs to, or null.",
		"- concepts: the lesson concepts it is about, by their labels exactly as listed (never ids), or an empty list.",
		"- summary: one plain sentence, at most 140 characters, what the note says (not what it is about).",
		"- related: ids of up to 3 existing notes on the same idea, else an empty list.",
		"Reply with ONLY a JSON object: {\"title\": string, \"tags\": string[], \"lesson\": string | null, \"concepts\": string[], \"summary\": string, \"related\": string[]}. No prose, no code fence.",
		"",
	];
	const counts = tagCounts(all.filter((n) => n.id !== note.id));
	lines.push("## His existing tags (count)", counts.length ? counts.map((c) => `${c.tag} (${c.count})`).join(", ") : "(none yet)", "");
	const lessons = [...store.lessons].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 12);
	if (lessons.length) {
		lines.push("## His lessons (slug · title · concepts)");
		for (const l of lessons) lines.push(`- ${l.slug} · ${l.title}${l.nodes.length ? ` · ${l.nodes.map((n) => n.label).join("; ")}` : ""}`);
		lines.push("");
	}
	const goals = (store as any).goals as Array<{ id?: string; title?: string; label?: string }> | undefined;
	if (goals?.length) lines.push("## His long-term goals", goals.map((g) => `- ${g.title ?? g.label ?? g.id}`).join("\n"), "");
	const others = all.filter((n) => n.id !== note.id).slice(-30);
	if (others.length) {
		lines.push("## His other notes (id · date · title · tags)");
		for (const n of others) lines.push(`- ${n.id} · ${n.at.slice(0, 10)} · ${noteTitle(n)}${n.tags.length ? ` · ${n.tags.join(", ")}` : ""}`);
		lines.push("");
	}
	lines.push(`## The note (written ${note.at.slice(0, 16).replace("T", " ")}${note.lesson ? `, while in lesson "${store.lessons.find((l) => l.slug === note.lesson)?.title ?? note.lesson}"` : ""})`);
	if (note.title) lines.push(`Title he gave: ${note.title}`);
	lines.push(note.text.slice(0, 12_000));
	if (note.images?.length) lines.push("", `(${note.images.length} photo(s) attached; not shown)`);
	return lines.join("\n");
}

export function parseTagging(raw: string, all: Note[], lessons: string[]): Tagging {
	const start = raw.indexOf("{");
	const end = raw.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("tagger returned no JSON");
	const j = JSON.parse(raw.slice(start, end + 1));
	const ids = new Set(all.map((n) => n.id));
	const title = String(j.title ?? "").trim().replace(/^["“]|["”]$/g, "").slice(0, 80);
	const lesson = typeof j.lesson === "string" && lessons.includes(j.lesson) ? j.lesson : undefined;
	return {
		title,
		tags: normalizeTags(j.tags),
		lesson,
		concepts: Array.isArray(j.concepts) ? j.concepts.map(String).map((s: string) => s.trim()).filter(Boolean).slice(0, 8) : [],
		summary: String(j.summary ?? "").trim().slice(0, 200),
		related: Array.isArray(j.related) ? j.related.map(String).filter((id: string) => ids.has(id)).slice(0, 3) : [],
	};
}

export type Runner = (prompt: string, cwd: string) => Promise<string>;

export const runPi: Runner = (prompt, cwd) => {
	const tmpDir = path.join(cwd, ".learn", "tmp");
	fs.mkdirSync(tmpDir, { recursive: true });
	const promptFile = path.join(tmpDir, `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.md`);
	fs.writeFileSync(promptFile, prompt, "utf8");
	const model = process.env.PI_NOTEBOOK_MODEL || defaultModel(cwd);
	const args = ["-p", "--no-extensions", "--no-skills", "--no-tools", "--no-session", "--no-context-files", "--no-prompt-templates", "--no-themes", "--thinking", "low", "--model", model];
	const bridge = model.startsWith("claude-bridge/") ? bridgeExtensionPath() : undefined;
	if (bridge) args.push("-e", bridge);
	args.push(`@${promptFile}`, "Organize the note as instructed. JSON only.");
	return new Promise<string>((resolve, reject) => {
		const child = execFile("pi", args, { cwd: tmpDir, timeout: TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, PI_SUBAGENT_AGENT: "notebook" } }, (err, stdout, stderr) => {
			if (err) reject(new Error(`tagger failed: ${err.message.split("\n")[0]}${stderr ? `\n${stderr.slice(0, 300)}` : ""}`));
			else resolve(stdout);
		});
		child.stdin?.end(); // `pi -p` waits on an open stdin
	}).finally(() => {
		try {
			fs.unlinkSync(promptFile);
		} catch {
			// ignore
		}
	});
};

const inFlight = new Set<string>();
export function isTagging(id: string): boolean {
	return inFlight.has(id);
}

/**
 * Title, tag, summarize and link one note (his own title and tags win: the
 * tagger fills what is empty and adds tags, it never removes his).
 */
export async function tagNote(cwd: string, id: string, run: Runner = runPi): Promise<Note | undefined> {
	if (inFlight.has(id)) return loadNotes(cwd).find((n) => n.id === id);
	inFlight.add(id);
	try {
		const all = loadNotes(cwd);
		const note = all.find((n) => n.id === id);
		if (!note) return undefined;
		const raw = await run(buildTagPrompt(cwd, note, all), cwd);
		const t = parseTagging(raw, all, loadLearner(cwd).lessons.map((l) => l.slug));
		const tags = normalizeTags([...note.tags, ...t.tags]);
		return updateNote(cwd, id, {
			title: note.title || t.title || undefined,
			tags,
			lesson: note.lesson ?? t.lesson,
			concepts: t.concepts,
			summary: t.summary || undefined,
			related: t.related,
			tagged: true,
		});
	} finally {
		inFlight.delete(id);
	}
}

/** Runs the tagger on every untagged note, one at a time. Returns how many were tagged. */
export async function tagPending(cwd: string, run: Runner = runPi): Promise<number> {
	let n = 0;
	for (const note of loadNotes(cwd).filter((x) => !x.tagged)) {
		try {
			await tagNote(cwd, note.id, run);
			n++;
		} catch {
			// leave it untagged; the page shows it under "Not tagged yet"
		}
	}
	return n;
}

// ── Views ──────────────────────────────────────────────────────────────────

export interface NotebookView {
	notes: Array<Note & { lessonTitle?: string; tagging: boolean }>;
	tags: Array<{ tag: string; count: number }>;
	lessons: Array<{ slug: string; title: string }>;
	mtime: number;
}

/** What the page shows: every note newest first, the tag cloud, the lesson list. */
export function notebookView(cwd: string): NotebookView {
	const notes = loadNotes(cwd);
	const titles = lessonTitles(cwd);
	let mtime = 0;
	try {
		mtime = fs.statSync(notesPath(cwd)).mtimeMs;
	} catch {
		// no notes yet
	}
	return {
		notes: [...notes].reverse().map((n) => ({ ...n, lessonTitle: n.lesson ? titles[n.lesson] : undefined, tagging: inFlight.has(n.id) })),
		tags: tagCounts(notes),
		lessons: Object.entries(titles).map(([slug, title]) => ({ slug, title })),
		mtime,
	};
}

/** Compact lines for the tutor (tool results and the learner slice). */
export function noteLines(notes: Note[], opts: { withText?: boolean } = {}): string[] {
	return notes.map((n) => {
		const head = `- ${n.id} · ${n.at.slice(0, 10)} · "${noteTitle(n)}"${n.tags.length ? ` · ${n.tags.map((t) => `#${t}`).join(" ")}` : " · (untagged)"}${n.lesson ? ` · lesson ${n.lesson}` : ""}`;
		if (!opts.withText) return n.summary ? `${head}\n  ${n.summary}` : head;
		return `${head}\n${n.text
			.split("\n")
			.map((l) => `  ${l}`)
			.join("\n")}`;
	});
}
