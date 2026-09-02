import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditInputs, calculateTotals, loadConfig } from "../src/mer-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = await loadConfig(path.join(root, "config", "meter-config.json"));

const exact = calculateTotals({
  start: { activeExport: 515297.46, activeImport: 6641.56, reactiveExport: 290595.32, reactiveImport: 2889.32 },
  end: { activeExport: 526869.88, activeImport: 6646.40, reactiveExport: 298675.95, reactiveImport: 2891.89 },
}, config.omf);
assert.equal(exact.activeExportAdvance, 13886904);
assert.equal(exact.activeImportAdvance, 5808);
assert.equal(exact.activeNetSupply, 13881096);

const audit = await auditInputs({
  firstPath: "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx",
  secondPath: "C:/Users/Lony/Music/UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx",
  month: "2026-08",
  config,
});
assert.equal(audit.status, "VERIFIED");
assert.equal(audit.meters.main.uniqueTimestampCount, 1489);
assert.equal(audit.meters.backup.uniqueTimestampCount, 1489);
assert.equal(audit.meters.main.duplicateTimestampCount, 32);
assert.equal(audit.meters.backup.duplicateTimestampCount, 32);
assert.equal(audit.calculations.main.activeNetSupply, 13881096);
assert.equal(audit.calculations.backup.activeNetSupply, 13879620);
assert.equal(audit.comparison.differenceKwh, 1476);
assert.ok(Math.abs(audit.comparison.discrepancyPercent - 0.010633166141924) < 1e-12);

const swapped = await auditInputs({
  firstPath: "C:/Users/Lony/Music/UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx",
  secondPath: "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx",
  month: "2026-08",
  config,
});
assert.equal(swapped.inputsWereSwapped, true);
assert.equal(swapped.calculations.main.activeNetSupply, 13881096);

await assert.rejects(
  auditInputs({
    firstPath: "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx",
    secondPath: "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx",
    month: "2026-08",
    config,
  }),
  /Both files resolve to the main meter/,
);

await assert.rejects(
  auditInputs({
    firstPath: "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx",
    secondPath: "C:/Users/Lony/Music/UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx",
    month: "2026-07",
    config,
  }),
  /Missing .* interval/,
);

await assert.rejects(
  auditInputs({
    firstPath: "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx",
    secondPath: "C:/Users/Lony/Music/UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx",
    month: "2026-08",
    config: { ...config, allowedDiscrepancyPercent: 0.001 },
  }),
  /exceeds 0.001%/,
);

console.log("PASS: exact arithmetic, golden audit, timestamps, duplicates, calculations, swapped-file detection, duplicate-role blocking, wrong-month blocking, and tolerance blocking.");
