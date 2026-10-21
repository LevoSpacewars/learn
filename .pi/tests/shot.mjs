// node shot.mjs <url> <out.png> <width> <height>
import { execFileSync } from "node:child_process";
const [url, out, w = "1400", h = "2400"] = process.argv.slice(2);
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=8000", `--window-size=${w},${h}`, `--screenshot=${out}`, url], { stdio: "ignore", timeout: 60000 });
console.log("wrote", out);
