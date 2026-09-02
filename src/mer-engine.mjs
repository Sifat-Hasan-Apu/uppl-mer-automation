import fs from "node:fs/promises";
import crypto from "node:crypto";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const DAY_MS = 86_400_000;
const EXCEL_EPOCH_OFFSET = 25_569;

function normalizeObis(value) {
  return String(value ?? "").trim().split(/\s+/)[0];
}

function excelSerialToMs(serial) {
  return Math.round((Number(serial) - EXCEL_EPOCH_OFFSET) * DAY_MS);
}

function dateToExcelSerial(date) {
  return date.getTime() / DAY_MS + EXCEL_EPOCH_OFFSET;
}

function isoMinute(ms) {
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

function monthBounds(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error(`Invalid month '${month}'. Expected YYYY-MM.`);
  }
  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error(`Invalid month '${month}'.`);
  }
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const displayEnd = new Date(end.getTime() - DAY_MS);
  return { year, monthNumber, start, end, displayEnd };
}

function numericRegister(value, rowNumber, obis) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Row ${rowNumber}: ${obis} is not numeric.`);
  }
  const scaled = number * 100;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-6) {
    throw new Error(`Row ${rowNumber}: ${obis} has more than 2 decimal places.`);
  }
  return Math.round(scaled) / 100;
}

function sameRegisters(a, b) {
  return a.every((value, index) => Math.round(value * 100) === Math.round(b[index] * 100));
}

function exactAdvance(start, end, omf) {
  const startCenti = BigInt(Math.round(start * 100));
  const endCenti = BigInt(Math.round(end * 100));
  const numerator = (endCenti - startCenti) * BigInt(omf);
  const denominator = 100_000n;
  const whole = numerator / denominator;
  const remainder = numerator % denominator;
  return Number(whole) + Number(remainder) / Number(denominator);
}

export function calculateTotals(readings, omf) {
  const activeExportAdvance = exactAdvance(readings.start.activeExport, readings.end.activeExport, omf);
  const activeImportAdvance = exactAdvance(readings.start.activeImport, readings.end.activeImport, omf);
  const reactiveExportAdvance = exactAdvance(readings.start.reactiveExport, readings.end.reactiveExport, omf);
  const reactiveImportAdvance = exactAdvance(readings.start.reactiveImport, readings.end.reactiveImport, omf);
  return {
    activeExportAdvance,
    activeImportAdvance,
    activeNetSupply: activeExportAdvance - activeImportAdvance,
    reactiveExportAdvance,
    reactiveImportAdvance,
  };
}

export async function loadConfig(path) {
  return JSON.parse(await fs.readFile(path, "utf8"));
}

export async function inspectMeterFile(path, month, config) {
  const bytes = await fs.readFile(path);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
  if (workbook.worksheets.items.length !== 1) {
    throw new Error(`${path}: expected exactly one worksheet.`);
  }

  const sheet = workbook.worksheets.getItemAt(0);
  const meterMatch = sheet.name.match(/LGZ\d+/i);
  if (!meterMatch) {
    throw new Error(`${path}: meter ID not found in worksheet name '${sheet.name}'.`);
  }
  const meterId = meterMatch[0].toUpperCase();
  const used = sheet.getUsedRange();
  if (!used) throw new Error(`${path}: worksheet is empty.`);
  const values = used.values;
  const headerIndex = values.findIndex((row) => String(row[0] ?? "").trim().toLowerCase() === "clock");
  if (headerIndex < 1) {
    throw new Error(`${path}: Clock/header row not found.`);
  }

  const obisRow = values[headerIndex - 1].map(normalizeObis);
  const required = [
    config.registers.activeExportToGrid,
    config.registers.activeImportFromGrid,
    config.registers.reactiveExportToGrid,
    config.registers.reactiveImportFromGrid,
  ];
  const indices = required.map((obis) => obisRow.indexOf(obis));
  const missingColumns = required.filter((_, index) => indices[index] < 0);
  if (missingColumns.length) {
    throw new Error(`${path}: required OBIS columns missing: ${missingColumns.join(", ")}.`);
  }

  const intervalMs = config.intervalMinutes * 60_000;
  const { start, end } = monthBounds(month);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const parsed = [];

  for (let i = headerIndex + 1; i < values.length; i += 1) {
    const rawClock = values[i][0];
    if (rawClock === null || rawClock === undefined || rawClock === "") continue;
    let timestampMs;
    if (typeof rawClock === "number") timestampMs = excelSerialToMs(rawClock);
    else if (rawClock instanceof Date) timestampMs = rawClock.getTime();
    else timestampMs = Date.parse(String(rawClock));
    if (!Number.isFinite(timestampMs)) {
      throw new Error(`Row ${i + 1}: invalid Clock value.`);
    }
    timestampMs = Math.round(timestampMs / 60_000) * 60_000;
    if (timestampMs % intervalMs !== 0) {
      throw new Error(`Row ${i + 1}: timestamp ${isoMinute(timestampMs)} is off the ${config.intervalMinutes}-minute grid.`);
    }
    parsed.push({
      row: i + 1,
      timestampMs,
      status: String(values[i][1] ?? ""),
      registers: indices.map((column, registerIndex) => numericRegister(values[i][column], i + 1, required[registerIndex])),
    });
  }

  const periodRows = parsed.filter((row) => row.timestampMs >= startMs && row.timestampMs <= endMs);
  const groups = new Map();
  for (const row of periodRows) {
    const group = groups.get(row.timestampMs) ?? [];
    group.push(row);
    groups.set(row.timestampMs, group);
  }

  const duplicateDetails = [];
  for (const [timestampMs, rows] of groups) {
    if (rows.length > 1) {
      const first = rows[0].registers;
      if (!rows.every((row) => sameRegisters(first, row.registers))) {
        throw new Error(`Conflicting duplicate readings at ${isoMinute(timestampMs)}.`);
      }
      duplicateDetails.push({
        timestamp: isoMinute(timestampMs),
        rows: rows.map((row) => row.row),
        statuses: rows.map((row) => row.status),
      });
    }
  }

  const expected = [];
  for (let timestampMs = startMs; timestampMs <= endMs; timestampMs += intervalMs) expected.push(timestampMs);
  const missing = expected.filter((timestampMs) => !groups.has(timestampMs));
  if (missing.length) {
    throw new Error(`Missing ${missing.length} interval(s), starting ${isoMinute(missing[0])}.`);
  }
  if (groups.size !== expected.length) {
    throw new Error(`Unique timestamp count ${groups.size}; expected ${expected.length}.`);
  }

  const uniqueRows = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, rows]) => rows[0]);
  for (let column = 0; column < 4; column += 1) {
    for (let i = 1; i < uniqueRows.length; i += 1) {
      if (uniqueRows[i].registers[column] < uniqueRows[i - 1].registers[column]) {
        throw new Error(`Register ${required[column]} decreased between rows ${uniqueRows[i - 1].row} and ${uniqueRows[i].row}.`);
      }
    }
  }

  const startRows = groups.get(startMs);
  const endRows = groups.get(endMs);
  if (!startRows || !endRows) throw new Error("Exact billing boundary reading is absent.");
  const toReading = (registers) => ({
    activeExport: registers[0],
    activeImport: registers[1],
    reactiveExport: registers[2],
    reactiveImport: registers[3],
  });

  return {
    path,
    fileName: path.replaceAll("\\", "/").split("/").at(-1),
    sha256,
    sheetName: sheet.name,
    meterId,
    headerRow: headerIndex + 1,
    sourceDataRows: parsed.length,
    periodRows: periodRows.length,
    uniqueTimestampCount: groups.size,
    expectedTimestampCount: expected.length,
    missingTimestampCount: 0,
    duplicateTimestampCount: duplicateDetails.length,
    duplicateDetails,
    startSourceRows: startRows.map((row) => row.row),
    endSourceRows: endRows.map((row) => row.row),
    readings: {
      start: toReading(startRows[0].registers),
      end: toReading(endRows[0].registers),
    },
  };
}

function roleForMeter(meterId, config) {
  if (meterId === config.meters.main.toUpperCase()) return "main";
  if (meterId === config.meters.backup.toUpperCase()) return "backup";
  throw new Error(`Unapproved meter ID ${meterId}.`);
}

export async function auditInputs({ firstPath, secondPath, month, config }) {
  const first = await inspectMeterFile(firstPath, month, config);
  const second = await inspectMeterFile(secondPath, month, config);
  const firstRole = roleForMeter(first.meterId, config);
  const secondRole = roleForMeter(second.meterId, config);
  if (firstRole === secondRole) throw new Error(`Both files resolve to the ${firstRole} meter.`);
  const meters = { [firstRole]: first, [secondRole]: second };
  const calculations = {
    main: calculateTotals(meters.main.readings, config.omf),
    backup: calculateTotals(meters.backup.readings, config.omf),
  };
  const differenceKwh = calculations.main.activeNetSupply - calculations.backup.activeNetSupply;
  const discrepancyPercent = Math.abs(differenceKwh / calculations.main.activeNetSupply) * 100;
  if (discrepancyPercent > config.allowedDiscrepancyPercent) {
    throw new Error(`Main/back-up discrepancy ${discrepancyPercent.toFixed(6)}% exceeds ${config.allowedDiscrepancyPercent}%.`);
  }
  return {
    status: "VERIFIED",
    month,
    generatedAt: new Date().toISOString(),
    inputsWereSwapped: firstRole !== "main",
    meters,
    calculations,
    comparison: {
      differenceKwh,
      discrepancyPercent,
      allowedDiscrepancyPercent: config.allowedDiscrepancyPercent,
      withinTolerance: true,
    },
  };
}

function writeValue(sheet, cell, value) {
  sheet.getRange(cell).values = [[value]];
}

function writeFormula(sheet, cell, formula) {
  sheet.getRange(cell).formulas = [[formula]];
}

function populateMeter(sheet, cells, data, omf) {
  writeValue(sheet, cells.activeEndExport, data.readings.end.activeExport);
  writeValue(sheet, cells.activeEndImport, data.readings.end.activeImport);
  writeValue(sheet, cells.activeStartExport, data.readings.start.activeExport);
  writeValue(sheet, cells.activeStartImport, data.readings.start.activeImport);
  writeValue(sheet, cells.reactiveEndExport, data.readings.end.reactiveExport);
  writeValue(sheet, cells.reactiveEndImport, data.readings.end.reactiveImport);
  writeValue(sheet, cells.reactiveStartExport, data.readings.start.reactiveExport);
  writeValue(sheet, cells.reactiveStartImport, data.readings.start.reactiveImport);
  writeValue(sheet, cells.activeOmg, omf);
  writeValue(sheet, cells.reactiveOmg, omf);
}

export async function generateMerWorkbook({ templatePath, outputPath, audit, config }) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
  if (workbook.worksheets.items.length !== 1) throw new Error("MER template must contain exactly one worksheet.");
  const sheet = workbook.worksheets.getItemAt(0);
  const bounds = monthBounds(audit.month);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(bounds.start);
  const shortStart = `${String(bounds.start.getUTCDate()).padStart(2, "0")}-${String(bounds.monthNumber).padStart(2, "0")}-${String(bounds.year).slice(-2)}`;
  const shortEnd = `${String(bounds.displayEnd.getUTCDate()).padStart(2, "0")}-${String(bounds.monthNumber).padStart(2, "0")}-${String(bounds.year).slice(-2)}`;

  writeValue(sheet, config.templateCells.monthTitle, `Month : ${monthName} ${bounds.year}`);
  for (const role of ["main", "backup"]) {
    const cells = config.templateCells[role];
    writeValue(sheet, cells.endDate, dateToExcelSerial(bounds.displayEnd));
    writeValue(sheet, cells.endTime, 24);
    writeValue(sheet, cells.startDate, dateToExcelSerial(bounds.start));
    writeValue(sheet, cells.startTime, 0);
    populateMeter(sheet, cells, audit.meters[role], config.omf);
  }

  writeFormula(sheet, "G9", "=F9-F11");
  writeFormula(sheet, "G10", "=F10-F12");
  writeFormula(sheet, "I9", "=G9*H9/1000");
  writeFormula(sheet, "I10", "=G10*H9/1000");
  writeFormula(sheet, "L9", "=K9-K11");
  writeFormula(sheet, "L10", "=K10-K12");
  writeFormula(sheet, "N9", "=L9*M9/1000");
  writeFormula(sheet, "N10", "=L10*M9/1000");
  writeFormula(sheet, "G13", "=F13-F15");
  writeFormula(sheet, "G14", "=F14-F16");
  writeFormula(sheet, "I13", "=G13*H13/1000");
  writeFormula(sheet, "I14", "=G14*H13/1000");
  writeFormula(sheet, "L13", "=K13-K15");
  writeFormula(sheet, "L14", "=K14-K16");
  writeFormula(sheet, "N13", "=L13*M13/1000");
  writeFormula(sheet, "N14", "=L14*M13/1000");
  writeFormula(sheet, "I22", "=I9-I10");
  writeFormula(sheet, "I23", "=I13-I14");
  writeValue(sheet, "B22", `Net Energy Supplied to BPDB (as per Main Meter Reading) for the period (${shortStart}) to (${shortEnd}) `);
  writeValue(sheet, "B23", `Net Energy Supplied to BPDB (as per Back-up Meter Reading) for the period (${shortStart}) to (${shortEnd}) `);

  const expectedSheetName = `${monthName}-${bounds.year}`;
  try { sheet.name = expectedSheetName; } catch { /* Template name is harmless if the API does not expose rename. */ }

  const file = await SpreadsheetFile.exportXlsx(workbook);
  await file.save(outputPath);

  const reopened = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
  const generatedSheet = reopened.worksheets.getItemAt(0);
  const check = generatedSheet.getRange("A6:O23");
  const values = check.values;
  const formulas = check.formulas;
  const actualMainNet = Number(values[16][8]);
  const actualBackupNet = Number(values[17][8]);
  if (Math.abs(actualMainNet - audit.calculations.main.activeNetSupply) > 0.001) {
    throw new Error(`Generated Main net mismatch: ${actualMainNet}.`);
  }
  if (Math.abs(actualBackupNet - audit.calculations.backup.activeNetSupply) > 0.001) {
    throw new Error(`Generated Back-up net mismatch: ${actualBackupNet}.`);
  }
  const formulaText = formulas.flat().join("|");
  if (!formulaText.includes("=I9-I10") || !formulaText.includes("=I13-I14")) {
    throw new Error("Generated MER net formulas are missing.");
  }
  return { workbook: reopened, sheetName: generatedSheet.name };
}

export async function renderWorkbook(workbook, sheetName, outputPath) {
  const preview = await workbook.render({ sheetName, range: "A1:O36", scale: 1.5, format: "png" });
  await fs.writeFile(outputPath, new Uint8Array(await preview.arrayBuffer()));
}

export { monthBounds };
