// node --import ./register.mjs backfill.mjs <vault> [sessionsDir]
// Recovers every reading shown in past pi sessions into <vault>/.learn/readings.jsonl
// and writes <vault>/book/<slug>.md for every lesson. Touches nothing else.
const WT = process.env.WT || new URL("../extensions", import.meta.url).pathname;
const [vault, sessions] = process.argv.slice(2);
if (!vault) { console.error("usage: backfill.mjs <vault> [sessionsDir]"); process.exit(2); }
const { importSessionReadings, writeAllBooks, bookList, sessionsDirFor } = await import(`${WT}/review/book.ts`);
const dir = sessions || sessionsDirFor(vault);
const r = importSessionReadings(vault, dir);
console.log(`sessions: ${dir}\nfiles ${r.files}, readings found ${r.found}, added ${r.added}`);
const files = writeAllBooks(vault);
for (const f of files) console.log("wrote", f);
for (const b of bookList(vault)) console.log(`${b.slug}: ${b.readings} reading(s), ${b.title}`);
