import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/Lony/Music/UPPL Monthly Energy Reading August-2026.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sheet = workbook.worksheets.getItemAt(0);
const rendered = await workbook.render({
  sheetName: sheet.name,
  range: "A1:O36",
  scale: 1.5,
  format: "png",
});
await fs.writeFile(
  "tmp/renders/source-template.png",
  new Uint8Array(await rendered.arrayBuffer()),
);
console.log(`Rendered ${sheet.name} A1:O36`);
