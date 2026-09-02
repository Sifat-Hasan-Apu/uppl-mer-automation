import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = [
  { key: "backup", path: "C:/Users/Lony/Music/UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx" },
  { key: "main", path: "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx" },
  { key: "mer", path: "C:/Users/Lony/Music/UPPL Monthly Energy Reading August-2026.xlsx" },
];

const results = {};
for (const file of files) {
  const blob = await FileBlob.load(file.path);
  const wb = await SpreadsheetFile.importXlsx(blob);
  const sheetInfo = await wb.inspect({ kind: "sheet", include: "id,name", maxChars: 5000 });
  const overview = await wb.inspect({
    kind: "workbook,sheet,table,definedName,drawing",
    maxChars: 10000,
    tableMaxRows: 8,
    tableMaxCols: 12,
    tableMaxCellChars: 100,
  });
  const sheets = [];
  for (const sh of wb.worksheets.items) {
    const used = sh.getUsedRange();
    const address = used?.address ?? null;
    let sample = null;
    let formulas = null;
    if (used) {
      sample = (await wb.inspect({
        kind: "table",
        sheetId: sh.name,
        range: address,
        include: "values,formulas",
        tableMaxRows: 12,
        tableMaxCols: 20,
        tableMaxCellChars: 120,
        maxChars: 12000,
      })).ndjson;
      formulas = (await wb.inspect({
        kind: "formula",
        sheetId: sh.name,
        range: address,
        options: { maxResults: 200 },
        maxChars: 15000,
      })).ndjson;
    }
    sheets.push({ name: sh.name, address, sample, formulas });
  }
  results[file.key] = {
    path: file.path,
    sheetInfo: sheetInfo.ndjson,
    overview: overview.ndjson,
    sheets,
  };
}

await fs.writeFile("audit_inspection.json", JSON.stringify(results, null, 2), "utf8");
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k,v]) => [k, {path:v.path, sheets:v.sheets.map(s => ({name:s.name,address:s.address}))}])) , null, 2));
