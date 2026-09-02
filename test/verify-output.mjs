import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "F:/Energy Meter/output/xlsx/UPPL_MER_2026_08_VERIFIED.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const sheet = workbook.worksheets.getItemAt(0);
const keyRange = await workbook.inspect({
  kind: "table",
  sheetId: sheet.name,
  range: "A6:O23",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 15,
  maxChars: 12000,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
  maxChars: 4000,
});
console.log(keyRange.ndjson);
console.log(errors.ndjson);
