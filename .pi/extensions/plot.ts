/**
 * plot — a textbook-style figure of one or more curves, rendered to SVG
 * in-process (no subagent, no browser) and saved into the vault's viz/
 * folder so it embeds inline in the lesson note (Obsidian + the web page).
 *
 * The teacher describes curves as expressions in x (e.g. "exp(-2*x)"),
 * optional marked points and dashed guide lines, and gets back the embed
 * line to paste into its reply. Deterministic: what the tool sampled is
 * what the learner sees, and the result lists sample values so the teacher
 * can check the picture says what it meant.
 *
 * Not loaded into subagents.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------- expression parser (numbers, x, + - * / ^, functions, constants) ----------

type Fn = (x: number) => number;

const FUNCS: Record<string, (...a: number[]) => number> = {
	exp: Math.exp,
	ln: Math.log,
	log: Math.log,
	log10: Math.log10,
	log2: Math.log2,
	sqrt: Math.sqrt,
	abs: Math.abs,
	sin: Math.sin,
	cos: Math.cos,
	tan: Math.tan,
	atan: Math.atan,
	sinh: Math.sinh,
	cosh: Math.cosh,
	tanh: Math.tanh,
	floor: Math.floor,
	ceil: Math.ceil,
	round: Math.round,
	min: Math.min,
	max: Math.max,
	pow: Math.pow,
	step: (v) => (v >= 0 ? 1 : 0),
};
const CONSTS: Record<string, number> = { e: Math.E, pi: Math.PI, E: Math.E, PI: Math.PI };

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
	const out: Tok[] = [];
	let i = 0;
	while (i < src.length) {
		const c = src[i];
		if (/\s/.test(c)) {
			i++;
			continue;
		}
		if (/[0-9.]/.test(c)) {
			const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
			if (!m) throw new Error(`bad number at ${i}`);
			out.push({ t: "num", v: Number(m[0]) });
			i += m[0].length;
			continue;
		}
		if (/[A-Za-z_]/.test(c)) {
			const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
			out.push({ t: "id", v: m[0] });
			i += m[0].length;
			continue;
		}
		if ("+-*/^(),".includes(c)) {
			out.push({ t: "op", v: c });
			i++;
			continue;
		}
		throw new Error(`unexpected character "${c}" in expression`);
	}
	return out;
}

/** Compile an expression in x into a function. Throws on unknown identifiers. */
export function compile(src: string): Fn {
	const toks = tokenize(src);
	let p = 0;
	const peek = () => toks[p];
	const take = () => toks[p++];
	const isOp = (t: Tok | undefined, v: string) => !!t && t.t === "op" && t.v === v;
	const expectOp = (v: string) => {
		const t = take();
		if (!isOp(t, v)) throw new Error(`expected "${v}" in expression "${src}"`);
	};
	type Node = (x: number) => number;
	function expr(): Node {
		let left = term();
		for (;;) {
			const t = peek();
			if (isOp(t, "+") || isOp(t, "-")) {
				take();
				const right = term();
				const l = left;
				left = (t as any).v === "+" ? (x) => l(x) + right(x) : (x) => l(x) - right(x);
			} else return left;
		}
	}
	function term(): Node {
		let left = unary();
		for (;;) {
			const t = peek();
			if (isOp(t, "*") || isOp(t, "/")) {
				take();
				const right = unary();
				const l = left;
				left = (t as any).v === "*" ? (x) => l(x) * right(x) : (x) => l(x) / right(x);
			} else if (t && (t.t === "num" || t.t === "id" || isOp(t, "("))) {
				// implicit multiplication: 2x, 3(x+1), x exp(-x)
				const right = unary();
				const l = left;
				left = (x) => l(x) * right(x);
			} else return left;
		}
	}
	function unary(): Node {
		const t = peek();
		if (isOp(t, "-")) {
			take();
			const inner = unary();
			return (x) => -inner(x);
		}
		if (isOp(t, "+")) {
			take();
			return unary();
		}
		return power();
	}
	function power(): Node {
		const base = primary();
		if (isOp(peek(), "^")) {
			take();
			const ex = unary(); // right-assoc, allows 2^-x
			return (x) => base(x) ** ex(x);
		}
		return base;
	}
	function primary(): Node {
		const t = take();
		if (!t) throw new Error(`unexpected end of expression "${src}"`);
		if (t.t === "num") return () => t.v;
		if (isOp(t, "(")) {
			const inner = expr();
			expectOp(")");
			return inner;
		}
		if (t.t === "id") {
			if (t.v === "x") return (x) => x;
			if (isOp(peek(), "(")) {
				const f = FUNCS[t.v];
				if (!f) throw new Error(`unknown function "${t.v}" (allowed: ${Object.keys(FUNCS).join(", ")})`);
				take();
				const args: Node[] = [];
				if (!isOp(peek(), ")")) {
					args.push(expr());
					while (isOp(peek(), ",")) {
						take();
						args.push(expr());
					}
				}
				expectOp(")");
				return (x) => f(...args.map((a) => a(x)));
			}
			if (t.v in CONSTS) return () => CONSTS[t.v];
			throw new Error(`unknown name "${t.v}" (use x, e, pi, or a function)`);
		}
		throw new Error(`unexpected "${(t as any).v}" in expression "${src}"`);
	}
	const node = expr();
	if (p < toks.length) throw new Error(`trailing input in expression "${src}"`);
	return (x) => {
		const v = node(x);
		return Number.isFinite(v) ? v : NaN;
	};
}

// ---------- SVG rendering ----------

const PALETTE = ["#2f6fde", "#c0392b", "#1f8a4c", "#b7791f", "#7b4fbf"];

function niceStep(range: number, target = 5): number {
	const raw = range / target;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const r = raw / mag;
	const s = r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10;
	return s * mag;
}
function fmtTick(v: number, step: number): string {
	const d = Math.max(0, -Math.floor(Math.log10(step)));
	const s = v.toFixed(Math.min(6, d));
	const trimmed = s.includes(".") ? s.replace(/\.?0+$/, "") : s;
	return trimmed === "-0" || trimmed === "" ? "0" : trimmed;
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface Curve {
	expr: string;
	label?: string;
	dashed?: boolean;
}
export interface Point {
	x: number;
	y?: number;
	label?: string;
}
export interface Guide {
	x?: number;
	y?: number;
	label?: string;
}
export interface PlotSpec {
	title?: string;
	xmin: number;
	xmax: number;
	ymin?: number;
	ymax?: number;
	xlabel?: string;
	ylabel?: string;
	curves: Curve[];
	points?: Point[];
	guides?: Guide[];
	width?: number;
	height?: number;
}

export interface PlotOut {
	svg: string;
	samples: Array<{ label: string; at: Array<[number, number]> }>;
	yRange: [number, number];
}

export function renderPlot(spec: PlotSpec): PlotOut {
	if (!(spec.xmax > spec.xmin)) throw new Error("xmax must be greater than xmin");
	if (!spec.curves?.length) throw new Error("at least one curve is required");
	const W = spec.width ?? 560;
	const H = spec.height ?? 340;
	const m = { l: 56, r: 24, t: spec.title ? 36 : 18, b: 46 };
	const pw = W - m.l - m.r;
	const ph = H - m.t - m.b;
	const N = 400;
	const fns = spec.curves.map((c, i) => {
		try {
			return compile(c.expr);
		} catch (e: any) {
			throw new Error(`curve ${i + 1} (${c.expr}): ${e.message}`);
		}
	});
	const xs = Array.from({ length: N + 1 }, (_, i) => spec.xmin + ((spec.xmax - spec.xmin) * i) / N);
	const ys = fns.map((f) => xs.map((x) => f(x)));
	// y-range from finite samples unless given
	let ymin = spec.ymin;
	let ymax = spec.ymax;
	if (ymin === undefined || ymax === undefined) {
		const all = ys.flat().filter((v) => Number.isFinite(v));
		for (const p of spec.points ?? []) if (p.y !== undefined && Number.isFinite(p.y)) all.push(p.y);
		for (const g of spec.guides ?? []) if (g.y !== undefined) all.push(g.y);
		if (!all.length) throw new Error("no finite values to plot in that x range");
		let lo = Math.min(...all);
		let hi = Math.max(...all);
		if (hi === lo) {
			hi = lo + 1;
			lo = lo - 1;
		}
		const pad = (hi - lo) * 0.08;
		if (ymin === undefined) ymin = lo >= 0 && lo - pad < 0 ? 0 : lo - pad;
		if (ymax === undefined) ymax = hi + pad;
	}
	const yl = ymin as number;
	const yh = ymax as number;
	if (!(yh > yl)) throw new Error("ymax must be greater than ymin");
	const X = (x: number) => m.l + ((x - spec.xmin) / (spec.xmax - spec.xmin)) * pw;
	const Y = (y: number) => m.t + ph - ((y - yl) / (yh - yl)) * ph;
	const xstep = niceStep(spec.xmax - spec.xmin);
	const ystep = niceStep(yh - yl);
	const parts: string[] = [];
	parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system, system-ui, Helvetica, Arial, sans-serif" font-size="13">`);
	parts.push(
		`<style>.ax{stroke:#555;stroke-width:1.2}.gr{stroke:#999;stroke-opacity:.22;stroke-width:1}.tx{fill:#333}.gd{stroke:#777;stroke-width:1.2;stroke-dasharray:5 4}.pt{fill:#1d1d1f;stroke:#fff;stroke-width:1.5}@media (prefers-color-scheme: dark){.ax{stroke:#bbb}.gr{stroke:#aaa}.tx{fill:#e6e6ea}.gd{stroke:#aaa}.pt{fill:#f2f2f4;stroke:#1f1f23}}</style>`,
	);
	parts.push(`<defs><clipPath id="c"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs>`);
	if (spec.title) parts.push(`<text class="tx" x="${W / 2}" y="22" text-anchor="middle" font-weight="600" font-size="15">${esc(spec.title)}</text>`);
	// grid + ticks
	const x0 = Math.ceil(spec.xmin / xstep - 1e-9) * xstep;
	for (let x = x0; x <= spec.xmax + 1e-9; x += xstep) {
		const px = X(x);
		parts.push(`<line class="gr" x1="${px.toFixed(1)}" y1="${m.t}" x2="${px.toFixed(1)}" y2="${m.t + ph}"/>`);
		parts.push(`<text class="tx" x="${px.toFixed(1)}" y="${m.t + ph + 18}" text-anchor="middle">${fmtTick(x, xstep)}</text>`);
	}
	const y0 = Math.ceil(yl / ystep - 1e-9) * ystep;
	for (let y = y0; y <= yh + 1e-9; y += ystep) {
		const py = Y(y);
		parts.push(`<line class="gr" x1="${m.l}" y1="${py.toFixed(1)}" x2="${m.l + pw}" y2="${py.toFixed(1)}"/>`);
		parts.push(`<text class="tx" x="${m.l - 8}" y="${(py + 4).toFixed(1)}" text-anchor="end">${fmtTick(y, ystep)}</text>`);
	}
	// axes: draw at y=0 / x=0 when inside the range, else at the frame edge
	const axY = yl <= 0 && yh >= 0 ? Y(0) : m.t + ph;
	const axX = spec.xmin <= 0 && spec.xmax >= 0 ? X(0) : m.l;
	parts.push(`<line class="ax" x1="${m.l}" y1="${axY.toFixed(1)}" x2="${m.l + pw}" y2="${axY.toFixed(1)}"/>`);
	parts.push(`<line class="ax" x1="${axX.toFixed(1)}" y1="${m.t}" x2="${axX.toFixed(1)}" y2="${m.t + ph}"/>`);
	if (spec.xlabel) parts.push(`<text class="tx" x="${m.l + pw / 2}" y="${H - 8}" text-anchor="middle">${esc(spec.xlabel)}</text>`);
	if (spec.ylabel) parts.push(`<text class="tx" transform="translate(14 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle">${esc(spec.ylabel)}</text>`);
	// guides
	for (const g of spec.guides ?? []) {
		if (g.x !== undefined) {
			const px = X(g.x);
			parts.push(`<line class="gd" x1="${px.toFixed(1)}" y1="${m.t}" x2="${px.toFixed(1)}" y2="${m.t + ph}"/>`);
			if (g.label) parts.push(`<text class="tx" x="${(px + 5).toFixed(1)}" y="${m.t + 14}" font-size="12">${esc(g.label)}</text>`);
		}
		if (g.y !== undefined) {
			const py = Y(g.y);
			parts.push(`<line class="gd" x1="${m.l}" y1="${py.toFixed(1)}" x2="${m.l + pw}" y2="${py.toFixed(1)}"/>`);
			if (g.label) parts.push(`<text class="tx" x="${m.l + pw - 4}" y="${(py - 5).toFixed(1)}" text-anchor="end" font-size="12">${esc(g.label)}</text>`);
		}
	}
	// curves
	const samples: PlotOut["samples"] = [];
	spec.curves.forEach((c, i) => {
		const color = PALETTE[i % PALETTE.length];
		let d = "";
		let pen = false;
		xs.forEach((x, k) => {
			const y = ys[i][k];
			if (!Number.isFinite(y)) {
				pen = false;
				return;
			}
			const yc = Math.max(yl - (yh - yl), Math.min(yh + (yh - yl), y));
			d += `${pen ? "L" : "M"}${X(x).toFixed(1)} ${Y(yc).toFixed(1)}`;
			pen = true;
		});
		parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" clip-path="url(#c)"${c.dashed ? ' stroke-dasharray="7 5"' : ""}/>`);
		// label at the last in-range sample
		if (c.label) {
			let k = xs.length - 1;
			while (k > 0 && !(Number.isFinite(ys[i][k]) && ys[i][k] >= yl && ys[i][k] <= yh)) k--;
			const lx = X(xs[k]);
			const ly = Y(ys[i][k]);
			const anchor = lx > m.l + pw - 90 ? "end" : "start";
			const dx = anchor === "end" ? -6 : 6;
			// A label pulled back along the curve ("end" anchor) sits ON a sloping line
			// unless it goes to the clear side: below a falling curve, above a rising one.
			const prev = ys[i][Math.max(0, k - 8)];
			const falling = Number.isFinite(prev) && prev > ys[i][k];
			const dy = anchor === "end" && falling ? 17 : -7;
			parts.push(`<text x="${(lx + dx).toFixed(1)}" y="${(ly + dy).toFixed(1)}" text-anchor="${anchor}" fill="${color}" font-weight="600">${esc(c.label)}</text>`);
		}
		const at: Array<[number, number]> = [0, 0.25, 0.5, 0.75, 1].map((f) => {
			const x = spec.xmin + f * (spec.xmax - spec.xmin);
			return [Number(x.toPrecision(4)), Number(fns[i](x).toPrecision(4))];
		});
		samples.push({ label: c.label ?? c.expr, at });
	});
	// points
	for (const p of spec.points ?? []) {
		const y = p.y ?? fns[0](p.x);
		if (!Number.isFinite(y)) continue;
		const px = X(p.x);
		const py = Y(y);
		parts.push(`<circle class="pt" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.5"/>`);
		if (p.label) parts.push(`<text class="tx" x="${(px + 8).toFixed(1)}" y="${(py - 8).toFixed(1)}" font-size="12">${esc(p.label)}</text>`);
	}
	parts.push("</svg>");
	return { svg: parts.join("\n"), samples, yRange: [Number(yl.toPrecision(4)), Number(yh.toPrecision(4))] };
}

// ---------- tool ----------

const CurveT = Type.Object({
	expr: Type.String({
		description: "Expression in x. Numbers, x, + - * / ^, parentheses, implicit products (2x), functions exp ln log sqrt abs sin cos tan min max pow step, constants e pi. Example: 'exp(-2*x)' or '1 - exp(-2x)'.",
	}),
	label: Type.Optional(Type.String({ description: "Short label drawn at the curve's right end, plain text (no LaTeX), e.g. 'U(t) = e^-kt'." })),
	dashed: Type.Optional(Type.Boolean()),
});
const PlotParams = Type.Object({
	name: Type.String({ description: "Short slug for the file name, e.g. 'survival-vs-naive'." }),
	title: Type.Optional(Type.String()),
	xmin: Type.Number(),
	xmax: Type.Number(),
	ymin: Type.Optional(Type.Number({ description: "Omit to fit the data (0 is included when all values are positive)." })),
	ymax: Type.Optional(Type.Number()),
	xlabel: Type.Optional(Type.String({ description: "Axis label, plain text with units, e.g. 't (s)'." })),
	ylabel: Type.Optional(Type.String()),
	curves: Type.Array(CurveT, { minItems: 1, maxItems: 5 }),
	points: Type.Optional(
		Type.Array(Type.Object({ x: Type.Number(), y: Type.Optional(Type.Number({ description: "Omit to place the point on the first curve." })), label: Type.Optional(Type.String()) }), { maxItems: 8 }),
	),
	guides: Type.Optional(
		Type.Array(Type.Object({ x: Type.Optional(Type.Number()), y: Type.Optional(Type.Number()), label: Type.Optional(Type.String()) }), {
			maxItems: 6,
			description: "Dashed reference lines, e.g. {y: 0.368, label: '1/e'} or {x: 0.5}.",
		}),
	),
});

export default function plot(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;
	pi.registerTool({
		name: "plot",
		label: "plot",
		description:
			"Draw a small textbook-style figure (curves of x, marked points, dashed guide lines) as an SVG saved in viz/, and get back the embed line to put in your reply. Use it when the SHAPE of a quantity is the point: decay vs linear, compounding, a crossing, a limit. Fast and deterministic (no subagent). Not for diagrams of structure (use the visualize skill for those).",
		promptSnippet: "Use plot for a quick function figure when the shape of a curve carries the idea; at most one per node, introduced by one sentence that says what to look at.",
		promptGuidelines: [
			"One figure per idea, few elements: 1-3 curves, at most a couple of guides or points. Label axes with units.",
			"Put the returned embed line in your reply on its own line, preceded by one sentence saying what to look at in it.",
			"Check the sample values in the result: if they are not what you meant to show, fix the expression and plot again before embedding.",
		],
		parameters: PlotParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const spec: PlotSpec = { ...params, curves: params.curves as Curve[] };
			let out: PlotOut;
			try {
				out = renderPlot(spec);
			} catch (e: any) {
				return { content: [{ type: "text" as const, text: `plot failed: ${e?.message ?? e}` }], details: { error: String(e?.message ?? e) } };
			}
			const dir = path.join(ctx.cwd, "viz");
			fs.mkdirSync(dir, { recursive: true });
			const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plot";
			const file = `plot-${slug}-${Date.now().toString(36)}.svg`;
			fs.writeFileSync(path.join(dir, file), out.svg, "utf8");
			const lines = [
				`Saved viz/${file}. Embed it in your reply on its own line:`,
				`![[${file}|560]]`,
				`y-range ${out.yRange[0]}..${out.yRange[1]}. Sample values (x, y):`,
				...out.samples.map((s) => `  ${s.label}: ${s.at.map(([x, y]) => `(${x}, ${Number.isNaN(y) ? "undefined" : y})`).join(" ")}`),
			];
			return { content: [{ type: "text" as const, text: lines.join("\n") }], details: { file: `viz/${file}`, samples: out.samples } };
		},
		renderCall(args: any, theme: any) {
			return new Text(theme.fg("dim", `plot · ${args?.name ?? ""} (${(args?.curves ?? []).map((c: any) => c.expr).join(", ")})`), 0, 0);
		},
		renderResult(res: any, _o: any, theme: any) {
			const d = res.details as any;
			return new Text(d?.error ? theme.fg("warning", d.error) : theme.fg("dim", d?.file ?? "plot"), 0, 0);
		},
	});
}
