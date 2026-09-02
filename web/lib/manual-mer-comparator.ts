import * as XLSX from "xlsx";
import { AuditResult, MeterConfig } from "./types";

export interface CellVerificationItem {
  cellRef: string; // e.g., "F10"
  row: number; // 1-indexed
  col: string; // e.g., "F"
  label: string;
  category: "Main Meter" | "Back-up Meter" | "Summary" | "Plant Parameters";
  manualValue: number | string | null;
  calculatedValue: number | string;
  isMatch: boolean;
  delta: number | null;
  formattedManual: string;
  formattedCalculated: string;
  impactDescription?: string;
}

export interface ManualMerCrossCheckReport {
  fileName: string;
  sheetName: string;
  month: string;
  status: "PERFECT_MATCH" | "DISCREPANCY_DETECTED" | "PARSING_ERROR";
  matchCount: number;
  mismatchCount: number;
  totalChecked: number;
  matchPercentage: number; // 0 to 100
  items: CellVerificationItem[];
  mismatchedItems: CellVerificationItem[];
  summary: {
    mainNetSupplyMatch: boolean;
    backupNetSupplyMatch: boolean;
    omfMatch: boolean;
    readingsMatch: boolean;
    advancesMatch: boolean;
  };
  errorMessage?: string;
}

function normalizeNumber(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "-") return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim();
    const num = Number.parseFloat(cleaned);
    return Number.isNaN(num) ? null : num;
  }
  return null;
}

function formatValue(val: any, decimals: number = 2): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number") {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return String(val);
}

function isNumericClose(a: number | null, b: number | null, tolerance: number = 0.005): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tolerance;
}

export function parseAndCrossCheckManualMer(
  merBuffer: ArrayBuffer,
  fileName: string,
  audit: AuditResult,
  config: MeterConfig
): ManualMerCrossCheckReport {
  try {
    const workbook = XLSX.read(merBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in uploaded file.`);
    }

    const getCellValue = (cellAddress: string): any => {
      const cell = sheet[cellAddress];
      return cell ? cell.v : null;
    };

    // Auto-detect base row offset (in case headers shift by a row or two)
    // In standard BPDB MER: Row 10 is Main Meter End, Row 14 is Back-up Meter End, Row 22 is Main Net Supply
    let baseOffset = 0;
    // Look for "Plant Control Room"
    for (let r = 5; r <= 15; r++) {
      for (const c of ["A", "B", "C"]) {
        const val = String(getCellValue(`${c}${r}`) || "").toLowerCase();
        if (val.includes("plant control") || val.includes("main meter")) {
          // If "Plant Control Room" is on row 9, offset is 0.
          if (val.includes("plant control")) {
            baseOffset = r - 9;
          } else if (val.includes("main meter")) {
            baseOffset = r - 10;
          }
          break;
        }
      }
      if (baseOffset !== 0) break;
    }

    const cellAt = (col: string, baseRow: number) => `${col}${baseRow + baseOffset}`;

    const main = audit.meters.main;
    const backup = audit.meters.backup;
    const calc = audit.calculations;

    const mainExpDiff = main.readings.end.activeExport - main.readings.start.activeExport;
    const mainImpDiff = main.readings.end.activeImport - main.readings.start.activeImport;
    const mainReacExpDiff = main.readings.end.reactiveExport - main.readings.start.reactiveExport;
    const mainReacImpDiff = main.readings.end.reactiveImport - main.readings.start.reactiveImport;

    const backupExpDiff = backup.readings.end.activeExport - backup.readings.start.activeExport;
    const backupImpDiff = backup.readings.end.activeImport - backup.readings.start.activeImport;
    const backupReacExpDiff = backup.readings.end.reactiveExport - backup.readings.start.reactiveExport;
    const backupReacImpDiff = backup.readings.end.reactiveImport - backup.readings.start.reactiveImport;

    const items: CellVerificationItem[] = [];

    // Helper to add numeric cell check
    const checkCell = (
      col: string,
      row: number,
      label: string,
      category: "Main Meter" | "Back-up Meter" | "Summary" | "Plant Parameters",
      computedValue: number,
      impactInfo?: string
    ) => {
      const cellRef = cellAt(col, row);
      const rawManual = getCellValue(cellRef);
      const manualNum = normalizeNumber(rawManual);
      const isMatch = isNumericClose(manualNum, computedValue);
      const delta = manualNum !== null ? manualNum - computedValue : null;

      items.push({
        cellRef,
        row: row + baseOffset,
        col,
        label,
        category,
        manualValue: manualNum,
        calculatedValue: computedValue,
        isMatch,
        delta,
        formattedManual: formatValue(manualNum),
        formattedCalculated: formatValue(computedValue),
        impactDescription: isMatch
          ? "Exact parity with ground-truth raw meter telemetry."
          : impactInfo || `Discrepancy of ${delta && delta > 0 ? "+" : ""}${formatValue(delta)} between manual sheet and meter records.`,
      });
    };

    // 1. Overall Multiplication Factor (OMF)
    checkCell("H", 10, "Main Active OMF", "Plant Parameters", config.omf, "OMF mismatch will scale all active advances incorrectly!");
    checkCell("M", 10, "Main Reactive OMF", "Plant Parameters", config.omf, "OMF mismatch will scale all reactive advances incorrectly!");

    // 2. Main Meter Readings
    checkCell("F", 10, "Main Active Export End Reading", "Main Meter", main.readings.end.activeExport);
    checkCell("F", 11, "Main Active Import End Reading", "Main Meter", main.readings.end.activeImport);
    checkCell("F", 12, "Main Active Export Start Reading", "Main Meter", main.readings.start.activeExport);
    checkCell("F", 13, "Main Active Import Start Reading", "Main Meter", main.readings.start.activeImport);

    checkCell("K", 10, "Main Reactive Export End Reading", "Main Meter", main.readings.end.reactiveExport);
    checkCell("K", 11, "Main Reactive Import End Reading", "Main Meter", main.readings.end.reactiveImport);
    checkCell("K", 12, "Main Reactive Export Start Reading", "Main Meter", main.readings.start.reactiveExport);
    checkCell("K", 13, "Main Reactive Import Start Reading", "Main Meter", main.readings.start.reactiveImport);

    // 3. Main Meter Differences & Advances
    checkCell("G", 10, "Main Active Export Difference", "Main Meter", mainExpDiff);
    checkCell("G", 11, "Main Active Import Difference", "Main Meter", mainImpDiff);
    checkCell("I", 10, "Main Active Export Advance (kWh)", "Main Meter", calc.main.activeExportAdvance);
    checkCell("I", 11, "Main Active Import Advance (kWh)", "Main Meter", calc.main.activeImportAdvance);

    checkCell("L", 10, "Main Reactive Export Difference", "Main Meter", mainReacExpDiff);
    checkCell("L", 11, "Main Reactive Import Difference", "Main Meter", mainReacImpDiff);
    checkCell("N", 10, "Main Reactive Export Advance (kVARh)", "Main Meter", calc.main.reactiveExportAdvance);
    checkCell("N", 11, "Main Reactive Import Advance (kVARh)", "Main Meter", calc.main.reactiveImportAdvance);

    // 4. Back-up Meter Readings
    checkCell("F", 14, "Back-up Active Export End Reading", "Back-up Meter", backup.readings.end.activeExport);
    checkCell("F", 15, "Back-up Active Import End Reading", "Back-up Meter", backup.readings.end.activeImport);
    checkCell("F", 16, "Back-up Active Export Start Reading", "Back-up Meter", backup.readings.start.activeExport);
    checkCell("F", 17, "Back-up Active Import Start Reading", "Back-up Meter", backup.readings.start.activeImport);

    checkCell("K", 14, "Back-up Reactive Export End Reading", "Back-up Meter", backup.readings.end.reactiveExport);
    checkCell("K", 15, "Back-up Reactive Import End Reading", "Back-up Meter", backup.readings.end.reactiveImport);
    checkCell("K", 16, "Back-up Reactive Export Start Reading", "Back-up Meter", backup.readings.start.reactiveExport);
    checkCell("K", 17, "Back-up Reactive Import Start Reading", "Back-up Meter", backup.readings.start.reactiveImport);

    // 5. Back-up Meter Differences & Advances
    checkCell("G", 14, "Back-up Active Export Difference", "Back-up Meter", backupExpDiff);
    checkCell("G", 15, "Back-up Active Import Difference", "Back-up Meter", backupImpDiff);
    checkCell("I", 14, "Back-up Active Export Advance (kWh)", "Back-up Meter", calc.backup.activeExportAdvance);
    checkCell("I", 15, "Back-up Active Import Advance (kWh)", "Back-up Meter", calc.backup.activeImportAdvance);

    checkCell("L", 14, "Back-up Reactive Export Difference", "Back-up Meter", backupReacExpDiff);
    checkCell("L", 15, "Back-up Reactive Import Difference", "Back-up Meter", backupReacImpDiff);
    checkCell("N", 14, "Back-up Reactive Export Advance (kVARh)", "Back-up Meter", calc.backup.reactiveExportAdvance);
    checkCell("N", 15, "Back-up Reactive Import Advance (kVARh)", "Back-up Meter", calc.backup.reactiveImportAdvance);

    // 6. Summary Net Energy Supplied Rows (Rows 22 & 23 in standard BPDB MER)
    // Some manual templates put summary on row 21, 22, or 23; let's locate "Net Energy Supplied to BPDB"
    let mainNetSupplyRow = 22;
    let backupNetSupplyRow = 23;
    for (let r = 18; r <= 28; r++) {
      const v = String(getCellValue(`B${r}`) || "").toLowerCase();
      if (v.includes("net energy supplied") || v.includes("main meter")) {
        mainNetSupplyRow = r - baseOffset;
        backupNetSupplyRow = mainNetSupplyRow + 1;
        break;
      }
    }

    checkCell("I", mainNetSupplyRow, "Main Meter Net Energy Supplied (KWH)", "Summary", calc.main.activeNetSupply, "CRITICAL: Final Main Net Energy supplied to BPDB differs!");
    checkCell("I", backupNetSupplyRow, "Back-up Meter Net Energy Supplied (KWH)", "Summary", calc.backup.activeNetSupply, "CRITICAL: Final Back-up Net Energy supplied to BPDB differs!");

    const matchCount = items.filter((i) => i.isMatch).length;
    const mismatchCount = items.length - matchCount;
    const matchPercentage = Number(((matchCount / items.length) * 100).toFixed(2));
    const mismatchedItems = items.filter((i) => !i.isMatch);

    const mainNetMatch = items.find((i) => i.label.includes("Main Meter Net Energy"))?.isMatch ?? false;
    const backupNetMatch = items.find((i) => i.label.includes("Back-up Meter Net Energy"))?.isMatch ?? false;
    const omfMatch = items.filter((i) => i.category === "Plant Parameters").every((i) => i.isMatch);
    const readingsMatch = items.filter((i) => i.label.includes("Reading")).every((i) => i.isMatch);
    const advancesMatch = items.filter((i) => i.label.includes("Advance")).every((i) => i.isMatch);

    return {
      fileName,
      sheetName,
      month: audit.month,
      status: mismatchCount === 0 ? "PERFECT_MATCH" : "DISCREPANCY_DETECTED",
      matchCount,
      mismatchCount,
      totalChecked: items.length,
      matchPercentage,
      items,
      mismatchedItems,
      summary: {
        mainNetSupplyMatch: mainNetMatch,
        backupNetSupplyMatch: backupNetMatch,
        omfMatch,
        readingsMatch,
        advancesMatch,
      },
    };
  } catch (err: any) {
    console.error("Failed to parse manual MER Excel file:", err);
    return {
      fileName,
      sheetName: "Unknown",
      month: audit.month,
      status: "PARSING_ERROR",
      matchCount: 0,
      mismatchCount: 0,
      totalChecked: 0,
      matchPercentage: 0,
      items: [],
      mismatchedItems: [],
      summary: {
        mainNetSupplyMatch: false,
        backupNetSupplyMatch: false,
        omfMatch: false,
        readingsMatch: false,
        advancesMatch: false,
      },
      errorMessage: err.message || "Failed to parse manual MER workbook.",
    };
  }
}
