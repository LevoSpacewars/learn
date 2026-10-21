// Runs every *.test.mts in this directory, one process each, against the
// extension sources in ../extensions. Pass names to run a subset:
//   node run.mjs            all unit tests
//   node run.mjs gate judge  only gate.test.mts and judge.test.mts
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const only = new Set(process.argv.slice(2));
const tests = fs
	.readdirSync(here)
	.filter((f) => f.endsWith(".test.mts"))
	.filter((f) => only.size === 0 || only.has(f) || only.has(f.replace(/\.test\.mts$/, "")))
	.sort();
fs.mkdirSync(path.join(here, "tmp"), { recursive: true });

let failed = 0;
for (const t of tests) {
	const r = spawnSync(process.execPath, ["--import", "./register.mjs", t], { cwd: here, encoding: "utf8", env: { ...process.env, PI_LEARN_NO_OPEN: "1" } });
	const ok = r.status === 0;
	if (!ok) failed++;
	console.log(`${ok ? "ok  " : "FAIL"} ${t}`);
	if (!ok) console.log((r.stdout + r.stderr).split("\n").map((l) => "     " + l).join("\n"));
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
