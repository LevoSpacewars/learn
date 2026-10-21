// Type-checks the extension sources with tsc, outside pi.
// Writes tmp/tsconfig.json (pi's packages resolved from the managed install,
// the extensions' own node_modules for ts-fsrs and qrcode-terminal) and runs
// the typescript installed in this directory (`npm install` here once).
//   node typecheck.mjs            every extension entry point
//   node typecheck.mjs ../extensions/recall.ts   just those files
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { R } from "./hooks.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const ext = path.resolve(here, "..", "extensions");
const defaults = [
	"recall.ts", "quiz.ts", "md-log.ts", "start-menu.ts", "curriculum.ts", "plot.ts", "ask-user-question.ts",
	"review/index.ts", "review/pedagogy.ts", "review/book.ts", "review/sidechat.ts", "review/notebook.ts", "review/grader.ts", "review/store.ts",
	"phone-work/index.ts", "phone-work/qrcode-terminal.d.ts",
].map((f) => path.join(ext, f));
const files = process.argv.length > 2 ? process.argv.slice(2).map((f) => path.resolve(f)) : defaults;

const config = {
	compilerOptions: {
		strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true,
		module: "nodenext", moduleResolution: "nodenext", target: "es2022", types: ["node"],
		typeRoots: [path.join(here, "node_modules", "@types")],
		baseUrl: here,
		paths: {
			"@mariozechner/pi-coding-agent": [R + "/@earendil-works/pi-coding-agent/dist/index.d.ts"],
			"@mariozechner/pi-tui": [R + "/@earendil-works/pi-tui/dist/index.d.ts"],
			"@mariozechner/pi-ai": [R + "/@earendil-works/pi-ai/dist/index.d.ts"],
			"@sinclair/typebox": [R + "/typebox/build/index.d.mts"],
			"ts-fsrs": [path.join(ext, "review", "node_modules", "ts-fsrs")],
			"qrcode-terminal": [path.join(ext, "phone-work", "node_modules", "qrcode-terminal")],
		},
	},
	files,
};
fs.mkdirSync(path.join(here, "tmp"), { recursive: true });
const cfg = path.join(here, "tmp", "tsconfig.json");
fs.writeFileSync(cfg, JSON.stringify(config, null, 1));
const tsc = path.join(here, "node_modules", ".bin", "tsc");
if (!fs.existsSync(tsc)) { console.error("typescript is not installed here: run `npm install` in .pi/tests"); process.exit(2); }
const r = spawnSync(tsc, ["-p", cfg], { stdio: "inherit" });
process.exit(r.status ?? 1);
