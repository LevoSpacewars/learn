/**
 * plainmath — make LaTeX readable in the terminal.
 *
 * Prompts and quiz options are written in LaTeX (Obsidian renders them), but
 * the terminal and the TUI show them raw. This turns the common constructs
 * into plain Unicode so a prompt reads naturally on screen. Lossy by design;
 * the Obsidian log keeps the original.
 *
 * Not a pi extension (no default export).
 */

const GREEK: Record<string, string> = {
	alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", iota: "ι", kappa: "κ",
	lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
	Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

const SYMBOLS: Record<string, string> = {
	times: "×", cdot: "·", pm: "±", mp: "∓", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", sim: "~", simeq: "≃", equiv: "≡",
	to: "→", rightarrow: "→", leftarrow: "←", Rightarrow: "⇒", Leftarrow: "⇐", Leftrightarrow: "⇔", leftrightarrow: "↔", rightleftharpoons: "⇌", mapsto: "↦",
	infty: "∞", partial: "∂", nabla: "∇", sum: "Σ", prod: "Π", int: "∫", sqrt: "√", propto: "∝", in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆", cup: "∪", cap: "∩",
	forall: "∀", exists: "∃", neg: "¬", land: "∧", lor: "∨", ldots: "…", cdots: "⋯", dots: "…", vdots: "⋮", ddots: "⋱", langle: "⟨", rangle: "⟩",
	hbar: "ℏ", ell: "ℓ", degree: "°", circ: "∘", star: "⋆", ast: "∗", prime: "′", lfloor: "⌊", rfloor: "⌋", lceil: "⌈", rceil: "⌉", mid: "|", quad: "  ", qquad: "    ",
};

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "+": "⁺", n: "ⁿ", i: "ⁱ", "(": "⁽", ")": "⁾" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "-": "₋", "+": "₊", "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ" };

function mapChars(s: string, table: Record<string, string>): string | undefined {
	let out = "";
	for (const ch of s) {
		const m = table[ch];
		if (!m) return undefined;
		out += m;
	}
	return out;
}

/** Match a balanced {...} group starting at index i (s[i] === "{"); returns [inner, endIndexExclusive]. */
function group(s: string, i: number): [string, number] | undefined {
	if (s[i] !== "{") return undefined;
	let depth = 0;
	for (let j = i; j < s.length; j++) {
		if (s[j] === "{") depth++;
		else if (s[j] === "}") {
			depth--;
			if (depth === 0) return [s.slice(i + 1, j), j + 1];
		}
	}
	return undefined;
}

function convertMath(m: string): string {
	let s = m;
	// matrices: rows separated by ";", entries by spaces
	s = s.replace(/\\begin\{[bpv]?matrix\}([\s\S]*?)\\end\{[bpv]?matrix\}/g, (_x, body: string) => {
		const rows = body.split("\\\\").map((r) => r.split("&").map((c) => c.trim()).join("  ").trim()).filter(Boolean);
		return `[${rows.join(" ; ")}]`;
	});
	// \frac{a}{b}, \tfrac, \dfrac
	for (let guard = 0; guard < 20; guard++) {
		const idx = s.search(/\\[td]?frac\s*\{/);
		if (idx < 0) break;
		const start = s.indexOf("{", idx);
		const a = group(s, start);
		if (!a) break;
		const b = group(s, a[1]);
		if (!b) break;
		const num = convertMath(a[0]);
		const den = convertMath(b[0]);
		const wrap = (t: string) => (/^[\w.]+$/.test(t) ? t : `(${t})`);
		s = s.slice(0, idx) + `${wrap(num)}/${wrap(den)}` + s.slice(b[1]);
	}
	// \sqrt{x}
	s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
	// \overset{a}{X} → X^(a), \underset{a}{X} → X_(a) (rates on reaction arrows)
	for (let guard = 0; guard < 10; guard++) {
		const idx = s.search(/\\(?:overset|underset)\s*\{/);
		if (idx < 0) break;
		const which = s.startsWith("\\overset", idx) ? "^" : "_";
		const start = s.indexOf("{", idx);
		const a = group(s, start);
		if (!a) break;
		const b = group(s, a[1]);
		if (!b) break;
		s = s.slice(0, idx) + `${convertMath(b[0])}${which}(${convertMath(a[0])})` + s.slice(b[1]);
	}
	// function names
	s = s.replace(/\\(ln|log|exp|sin|cos|tan|sinh|cosh|tanh|det|max|min|lim|arg|sup|inf|Pr|tr)\b/g, "$1");
	// accents without braces: \bar X → X
	s = s.replace(/\\(?:hat|bar|vec|tilde|dot|ddot)\s+([A-Za-z])/g, "$1");
	// \text{...}, \mathrm, \mathbf, \mathbb, \operatorname, \boldsymbol, \hat, \bar, \vec, \tilde, \overline
	s = s.replace(/\\(?:text|textrm|textbf|textit|mathrm|mathbf|mathbb|mathcal|mathit|operatorname|boldsymbol|bm)\s*\{([^{}]*)\}/g, "$1");
	s = s.replace(/\\(?:hat|bar|vec|tilde|overline|underline|dot|ddot)\s*\{([^{}]*)\}/g, "$1");
	s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b\s*/g, "");
	// spacing
	s = s.replace(/\\[,;:!]/g, " ").replace(/\\ /g, " ").replace(/~/g, " ");
	// superscripts / subscripts with braces or single char
	s = s.replace(/\^\{([^{}]*)\}/g, (_x, inner: string) => mapChars(inner, SUP) ?? `^(${inner})`);
	s = s.replace(/\^([A-Za-z0-9+-])/g, (_x, ch: string) => SUP[ch] ?? `^${ch}`);
	s = s.replace(/_\{([^{}]*)\}/g, (_x, inner: string) => mapChars(inner, SUB) ?? `_${inner}`);
	s = s.replace(/_([A-Za-z0-9+-])/g, (_x, ch: string) => SUB[ch] ?? `_${ch}`);
	// greek + symbols
	s = s.replace(/\\([A-Za-z]+)/g, (whole, name: string) => GREEK[name] ?? SYMBOLS[name] ?? (name === "langle" ? "⟨" : whole));
	// leftover braces
	s = s.replace(/[{}]/g, "");
	return s.replace(/\s+/g, " ").trim();
}

/** Convert all $...$ and $$...$$ spans in a text to plain Unicode math. */
export function plainMath(text: string): string {
	if (!text.includes("$") && !text.includes("\\")) return text;
	let out = text.replace(/\$\$([\s\S]*?)\$\$/g, (_x, m: string) => ` ${convertMath(m)} `);
	out = out.replace(/\$([^$\n]+?)\$/g, (_x, m: string) => convertMath(m));
	// Bare LaTeX outside dollar signs (models slip) — only the safe bits.
	out = out.replace(/\\[,;:!]/g, " ");
	return out.replace(/[ \t]{2,}/g, " ");
}
