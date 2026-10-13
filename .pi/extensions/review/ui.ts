/**
 * ui — terminal dialogs that are also answerable from the web surface.
 *
 * pi's built-in ctx.ui.select / ctx.ui.input can't be answered externally, so
 * the start menu uses these instead: the same look in the terminal, plus a
 * pending prompt (kind "menu" or "input") the answer pad shows as buttons or
 * a text box. First answer wins; the other surface dismisses.
 *
 * Not a pi extension (no default export).
 */

import { Editor, type EditorTheme, Key, matchesKey, truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import { isReady } from "./pedagogy.ts";
import { plainMath } from "./plainmath.ts";
import { type PromptAnswer, setPending } from "./prompts.ts";

function editorTheme(theme: any): EditorTheme {
	return {
		borderColor: (s) => theme.fg("accent", s),
		selectList: {
			selectedPrefix: (t) => theme.fg("accent", t),
			selectedText: (t) => theme.fg("accent", t),
			description: (t) => theme.fg("muted", t),
			scrollInfo: (t) => theme.fg("dim", t),
			noMatch: (t) => theme.fg("warning", t),
		},
	};
}

function wrap(lines: string[], text: string, width: number, indent = " ") {
	for (const l of wrapTextWithAnsi(text, Math.max(1, width - indent.length))) lines.push(truncateToWidth(`${indent}${l}`, width));
}

/** A menu: returns the chosen label, or undefined on Esc. */
export function webSelect(ctx: any, title: string, options: string[]): Promise<string | undefined> {
	const id = `menu${Date.now().toString(36)}`;
	return ctx.ui.custom((tui: any, theme: any, _kb: any, done: (r: string | undefined) => void) => {
		let index = 0;
		let finished = false;
		const finish = (r: string | undefined) => {
			if (finished) return;
			finished = true;
			setPending(undefined);
			done(r);
		};
		setPending({
			id,
			kind: "menu",
			prompt: title,
			startedAt: Date.now(),
			options: options.map((label, i) => ({ index: i + 1, label })),
			answer: (a: PromptAnswer) => {
				const i = a.choices?.[0];
				if (!i || !options[i - 1]) return false;
				finish(options[i - 1]);
				return true;
			},
		});
		return {
			render(width: number) {
				const lines: string[] = [];
				lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));
				title.split("\n").forEach((t, i) => (t.trim() ? wrap(lines, theme.fg(i === 0 ? "text" : "muted", t), width) : lines.push("")));
				lines.push("");
				options.forEach((o, i) => lines.push(truncateToWidth(i === index ? theme.fg("accent", ` → ${o}`) : theme.fg("text", `   ${o}`), width)));
				lines.push("");
				lines.push(truncateToWidth(theme.fg("dim", " ↑↓ navigate · Enter select · Esc cancel · or tap it on the pad"), width));
				lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));
				return lines;
			},
			invalidate() {},
			handleInput(data: string) {
				if (matchesKey(data, Key.up)) index = Math.max(0, index - 1);
				else if (matchesKey(data, Key.down)) index = Math.min(options.length - 1, index + 1);
				else if (matchesKey(data, Key.enter)) return finish(options[index]);
				else if (matchesKey(data, Key.escape)) return finish(undefined);
				else if (/^[1-9]$/.test(data) && options[Number(data) - 1]) return finish(options[Number(data) - 1]);
				tui.requestRender();
			},
		};
	});
}

/** A one-line text prompt: returns the text, or undefined on Esc. */
export function webInput(ctx: any, title: string, placeholder?: string): Promise<string | undefined> {
	const id = `input${Date.now().toString(36)}`;
	return ctx.ui.custom((tui: any, theme: any, _kb: any, done: (r: string | undefined) => void) => {
		const editor = new Editor(tui, editorTheme(theme));
		editor.focused = true;
		editor.disableSubmit = true;
		let finished = false;
		const finish = (r: string | undefined) => {
			if (finished) return;
			finished = true;
			setPending(undefined);
			done(r);
		};
		setPending({
			id,
			kind: "input",
			prompt: title,
			context: placeholder,
			startedAt: Date.now(),
			answer: (a: PromptAnswer) => {
				const t = (a.text ?? "").trim();
				if (!t) return false;
				finish(t);
				return true;
			},
		});
		return {
			render(width: number) {
				const lines: string[] = [];
				lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));
				wrap(lines, theme.fg("text", title), width);
				if (placeholder) wrap(lines, theme.fg("dim", placeholder), width);
				lines.push("");
				for (const l of editor.render(Math.max(1, width - 2))) lines.push(l);
				lines.push("");
				lines.push(truncateToWidth(theme.fg("dim", " Enter submit · Esc cancel · or type it on the pad"), width));
				lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));
				return lines;
			},
			invalidate() {
				editor.invalidate();
			},
			handleInput(data: string) {
				if (matchesKey(data, Key.enter)) return finish(editor.getText().trim() || undefined);
				if (matchesKey(data, Key.escape)) return finish(undefined);
				editor.handleInput(data);
				tui.requestRender();
			},
		};
	});
}

export const READ_BUTTON = "Read it, ask me";

/**
 * A reading (lesson_read): the text, one button "Read it, ask me", and a box
 * for a question. Resolves { read: true } on the button / Enter / a typed
 * "ready", { question } when he types anything else, undefined on Esc.
 */
export function webRead(ctx: any, r: { title: string; body: string; figure?: string }): Promise<{ read: true } | { read: false; question: string } | undefined> {
	const id = `read${Date.now().toString(36)}`;
	type Out = { read: true } | { read: false; question: string } | undefined;
	return ctx.ui.custom((tui: any, theme: any, _kb: any, done: (o: Out) => void) => {
		const editor = new Editor(tui, editorTheme(theme));
		editor.focused = true;
		editor.disableSubmit = true;
		let finished = false;
		const finish = (o: Out) => {
			if (finished) return;
			finished = true;
			setPending(undefined);
			done(o);
		};
		const fromText = (t: string): Out => (!t || isReady(t) || /^read( it)?$/i.test(t) ? { read: true } : { read: false, question: t });
		setPending({
			id,
			kind: "read",
			prompt: `## ${r.title}\n\n${r.body}`,
			figure: r.figure,
			startedAt: Date.now(),
			options: [{ index: 1, label: READ_BUTTON }],
			answer: (a: PromptAnswer) => {
				if (a.choices?.[0] === 1) {
					finish({ read: true });
					return true;
				}
				const t = (a.text ?? "").trim();
				if (!t) return false;
				finish(fromText(t));
				return true;
			},
		});
		return {
			render(width: number) {
				const lines: string[] = [];
				lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));
				lines.push(truncateToWidth(theme.fg("accent", ` Reading — ${r.title}`), width));
				lines.push("");
				for (const para of plainMath(r.body).split("\n")) {
					if (!para.trim()) lines.push("");
					else wrap(lines, theme.fg("text", para), width);
				}
				if (r.figure) {
					lines.push("");
					wrap(lines, theme.fg("dim", `Figure: ${r.figure} (on the page and in the note)`), width);
				}
				lines.push("");
				for (const l of editor.render(Math.max(1, width - 2))) lines.push(l);
				lines.push("");
				lines.push(truncateToWidth(theme.fg("dim", ` Enter (empty) or "ready" = ${READ_BUTTON} · type a question + Enter to discuss · Esc cancel · or tap it on the pad`), width));
				lines.push(truncateToWidth(theme.fg("accent", "─".repeat(width)), width));
				return lines;
			},
			invalidate() {
				editor.invalidate();
			},
			handleInput(data: string) {
				if (matchesKey(data, Key.enter)) return finish(fromText(editor.getText().trim()));
				if (matchesKey(data, Key.escape)) return finish(undefined);
				editor.handleInput(data);
				tui.requestRender();
			},
		};
	});
}
