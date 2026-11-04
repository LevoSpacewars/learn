// Runs every browser check (headless Chrome, fake servers, no pi), one process each.
//   node browser.mjs
import { spawnSync } from "node:child_process";
import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const checks = ["page.test.mjs", "idle.test.mjs", "skip.test.mjs", "pad.check.mjs", "nb.check.mjs"];
let failed = 0;
for (const t of checks) {
	const r = spawnSync(process.execPath, [t], { cwd: here, encoding: "utf8", timeout: 180_000 });
	const ok = r.status === 0;
	if (!ok) failed++;
	console.log(`${ok ? "ok  " : "FAIL"} ${t}`);
	if (!ok) console.log((r.stdout + r.stderr).split("\n").filter((l) => !l.startsWith("    at ")).map((l) => "     " + l).join("\n"));
}
console.log(`\n${checks.length - failed}/${checks.length} browser checks passed`);
process.exit(failed ? 1 : 0);
