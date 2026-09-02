import fs from "node:fs";
import { auditMeterFiles } from "./lib/meter-engine.ts";
import { DEFAULT_CONFIG } from "./lib/default-config.ts";

const pathA = "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx";
const pathB = "C:/Users/Lony/Music/UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx";

const bufA = fs.readFileSync(pathA);
const bufB = fs.readFileSync(pathB);

const arrayA = bufA.buffer.slice(bufA.byteOffset, bufA.byteOffset + bufA.byteLength);
const arrayB = bufB.buffer.slice(bufB.byteOffset, bufB.byteOffset + bufB.byteLength);

try {
  const result = await auditMeterFiles({
    firstBuffer: arrayA,
    firstName: "UPPL Energy MAIN METER readings for the month of August-2026.xlsx",
    secondBuffer: arrayB,
    secondName: "UPPL Energy  BACK-UP METER readings for the month of August-2026.xlsx",
    month: "2026-08",
    config: DEFAULT_CONFIG,
  });

  console.log("SUCCESS! Audit status:", result.status);
  console.log("Main Net Supply:", result.calculations.main.activeNetSupply);
  console.log("Backup Net Supply:", result.calculations.backup.activeNetSupply);
  console.log("Difference (kWh):", result.comparison.differenceKwh);
  console.log("Discrepancy (%):", result.comparison.discrepancyPercent.toFixed(6) + "%");
  console.log("Unique intervals:", result.meters.main.uniqueTimestampCount);
  console.log("Duplicates resolved:", result.meters.main.duplicateTimestampCount);
} catch (err) {
  console.error("FAIL:", err);
}
