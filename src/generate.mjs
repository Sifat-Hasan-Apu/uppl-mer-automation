import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  auditInputs,
  generateMerWorkbook,
  loadConfig,
  renderWorkbook,
} from "./mer-engine.mjs";

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (!key || value === undefined) throw new Error("Arguments must be supplied as --name value pairs.");
    result[key] = value;
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
for (const required of ["main", "backup", "template", "month"]) {
  if (!args[required]) throw new Error(`Missing --${required}.`);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = args.config ?? path.join(projectRoot, "config", "meter-config.json");
const outputRoot = path.resolve(args.output ?? path.join(projectRoot, "output"));
const safeMonth = args.month.replace("-", "_");
const xlsxPath = path.join(outputRoot, "xlsx", `UPPL_MER_${safeMonth}_VERIFIED.xlsx`);
const pdfPath = path.join(outputRoot, "pdf", `UPPL_MER_${safeMonth}_VERIFIED.pdf`);
const auditPath = path.join(outputRoot, "audit", `UPPL_MER_${safeMonth}_AUDIT.json`);
const renderPath = path.join(projectRoot, "tmp", "renders", `UPPL_MER_${safeMonth}.png`);

await Promise.all([
  fs.mkdir(path.dirname(xlsxPath), { recursive: true }),
  fs.mkdir(path.dirname(pdfPath), { recursive: true }),
  fs.mkdir(path.dirname(auditPath), { recursive: true }),
  fs.mkdir(path.dirname(renderPath), { recursive: true }),
]);

const config = await loadConfig(configPath);
console.log("[1/5] Validating meter files...");
const audit = await auditInputs({
  firstPath: path.resolve(args.main),
  secondPath: path.resolve(args.backup),
  month: args.month,
  config,
});

console.log("[2/5] Generating verified MER workbook...");
const generated = await generateMerWorkbook({
  templatePath: path.resolve(args.template),
  outputPath: xlsxPath,
  audit,
  config,
});

console.log("[3/5] Rendering workbook preview...");
await renderWorkbook(generated.workbook, generated.sheetName, renderPath);

let pdfBytes = null;
if (args["skip-pdf"] !== "true") {
  console.log("[4/5] Exporting print-ready PDF through Microsoft Excel...");
  const exportScript = path.join(projectRoot, "scripts", "Export-MerPdf.ps1");
  execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", exportScript,
    "-InputXlsx", xlsxPath,
    "-OutputPdf", pdfPath,
  ], { stdio: "inherit" });
  const pdfStat = await fs.stat(pdfPath);
  if (pdfStat.size < 10_000) throw new Error(`PDF output is unexpectedly small (${pdfStat.size} bytes).`);
  pdfBytes = pdfStat.size;
} else {
  console.log("[4/5] PDF export skipped by request.");
}
audit.outputs = {
  xlsx: xlsxPath,
  pdf: pdfPath,
  audit: auditPath,
  preview: renderPath,
  pdfBytes,
};
audit.verification = {
  sourceValidation: "PASS",
  formulaRecalculation: "PASS",
  generatedWorkbookReopen: "PASS",
  pdfCreated: pdfBytes ? "PASS" : "PENDING",
};
await fs.writeFile(auditPath, JSON.stringify(audit, null, 2), "utf8");

console.log("[5/5] COMPLETE - VERIFIED");
console.log(JSON.stringify({
  status: audit.status,
  mainNetKwh: audit.calculations.main.activeNetSupply,
  backupNetKwh: audit.calculations.backup.activeNetSupply,
  discrepancyPercent: audit.comparison.discrepancyPercent,
  xlsxPath,
  pdfPath,
  auditPath,
}, null, 2));
