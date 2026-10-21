// Resolve hook: lets the extension sources import pi's packages outside pi.
// The extensions import "@mariozechner/*" and "@sinclair/typebox"; pi's managed
// install ships them under ~/.pi/agent/install/releases/<version>/node_modules
// (the @mariozechner scope is published there as @earendil-works).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const install = path.join(os.homedir(), ".pi", "agent", "install");
const version = process.env.PI_RELEASE || fs.readFileSync(path.join(install, "current-version"), "utf8").trim();
export const R = path.join(install, "releases", version, "node_modules");
const map = {
	"@sinclair/typebox": R + "/typebox/build/index.mjs",
	"@mariozechner/pi-coding-agent": R + "/@earendil-works/pi-coding-agent/dist/index.js",
	"@mariozechner/pi-tui": R + "/@earendil-works/pi-tui/dist/index.js",
	"@mariozechner/pi-ai": R + "/@earendil-works/pi-ai/dist/index.js",
};
export async function resolve(specifier, context, next) {
	if (map[specifier]) return { url: "file://" + map[specifier], shortCircuit: true };
	return next(specifier, context);
}
