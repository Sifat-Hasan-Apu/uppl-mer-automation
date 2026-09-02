import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sources = [
  { role: "MAIN", meterId: "LGZ56445019", path: "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx" },
  { role: "BACKUP", meterId: "LGZ56445020", path: "C:/Users/Lony/Music/UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx" },
];

const serialToIso = (serial) => new Date(Math.round((serial - 25569) * 86400000)).toISOString().replace(".000Z", "Z");
const round = (n, d=6) => Math.round(n * 10**d) / 10**d;
const targetStart = Date.parse("2026-08-01T00:00:00Z");
const targetEnd = Date.parse("2026-09-01T00:00:00Z");
const expected = [];
for (let t=targetStart; t<=targetEnd; t+=30*60*1000) expected.push(t);

for (const src of sources) {
  const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(src.path));
  const sh = wb.worksheets.getItemAt(0);
  const values = sh.getRange("A1:M1523").values;
  const headers = values.slice(0,2);
  const rows = values.slice(2).filter(r => typeof r[0] === "number");
  const parsed = rows.map((r, i) => ({ row: i+3, ms: Date.parse(serialToIso(r[0])), iso: serialToIso(r[0]), status:r[1], regs:r.slice(2,6) }));
  const byTime = new Map();
  for (const r of parsed) {
    if (!byTime.has(r.ms)) byTime.set(r.ms, []);
    byTime.get(r.ms).push(r);
  }
  const missing = expected.filter(t => !byTime.has(t));
  const duplicates = [...byTime.entries()].filter(([, rs]) => rs.length > 1);
  const periodRows = parsed.filter(r => r.ms >= targetStart && r.ms <= targetEnd);
  const periodUnique = new Set(periodRows.map(r => r.ms));
  const startRows = byTime.get(targetStart) ?? [];
  const endRows = byTime.get(targetEnd) ?? [];
  const afterEnd = parsed.filter(r => r.ms > targetEnd);
  const monotonicProblems = [];
  for (const col of [0,1,2,3]) {
    for (let i=1; i<periodRows.length; i++) {
      if (periodRows[i].regs[col] < periodRows[i-1].regs[col]) monotonicProblems.push({col:col+3, prevRow:periodRows[i-1].row,row:periodRows[i].row});
    }
  }
  console.log(JSON.stringify({
    role: src.role,
    meterId: src.meterId,
    headers,
    dataRows: parsed.length,
    first: parsed[0],
    last: parsed.at(-1),
    periodRowCount: periodRows.length,
    periodUniqueCount: periodUnique.size,
    expectedTimestampCount: expected.length,
    missingCount: missing.length,
    missing: missing.slice(0,10).map(t => new Date(t).toISOString()),
    duplicateTimestampCount: duplicates.length,
    duplicates: duplicates.slice(0,10).map(([t, rs]) => ({iso:new Date(t).toISOString(),rows:rs})),
    startRows,
    endRows,
    afterEndCount: afterEnd.length,
    afterEndFirst: afterEnd[0] ?? null,
    afterEndLast: afterEnd.at(-1) ?? null,
    monotonicProblemCount: monotonicProblems.length,
    monotonicProblems: monotonicProblems.slice(0,20),
  }, null, 2));
}

const merPath = "C:/Users/Lony/Music/UPPL Monthly Energy Reading August-2026.xlsx";
const mer = await SpreadsheetFile.importXlsx(await FileBlob.load(merPath));
const msh = mer.worksheets.getItemAt(0);
const range = msh.getRange("A7:O23");
console.log(JSON.stringify({ mer: { values: range.values, formulas: range.formulas } }, null, 2));
