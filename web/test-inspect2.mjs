import fs from "node:fs";
import * as XLSX from "xlsx";

const DAY_MS = 86_400_000;
const EXCEL_EPOCH_OFFSET = 25_569;

function excelSerialToMs(serial) {
  return Math.round((Number(serial) - EXCEL_EPOCH_OFFSET) * DAY_MS);
}

function isoMinute(ms) {
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

function monthBounds(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const displayEnd = new Date(end.getTime() - DAY_MS);
  return { year, monthNumber, start, end, displayEnd };
}

function numericRegister(value, rowNumber, obis) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Row ${rowNumber}: ${obis} is not numeric`);
  const scaled = number * 100;
  return Math.round(scaled) / 100;
}

const config = {
  plant: { name: "M/S United Payra Power Limited", capacity: "150 MW", location: "Kholishakhali, Patuakhali" },
  gridVoltageKv: 132,
  omf: 1200000,
  allowedDiscrepancyPercent: 0.2,
  intervalMinutes: 30,
  meters: { main: "LGZ56445019", backup: "LGZ56445020" },
  registers: {
    activeExportToGrid: "1-1:1.8.0",
    activeImportFromGrid: "1-1:2.8.0",
    reactiveExportToGrid: "1-1:3.8.0",
    reactiveImportFromGrid: "1-1:4.8.0"
  }
};

const fileA = "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx";
const buf = fs.readFileSync(fileA);
const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const workbook = XLSX.read(arrayBuf, { type: "array", cellDates: false });
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
const values = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });

const headerIndex = values.findIndex(
  (row) => String(row?.[0] ?? "").trim().toLowerCase() === "clock"
);
console.log("headerIndex:", headerIndex);
const obisRow = (values[headerIndex - 1] || []).map((v) => String(v ?? "").trim().split(/\s+/)[0]);
console.log("obisRow:", obisRow);

const required = [
  config.registers.activeExportToGrid,
  config.registers.activeImportFromGrid,
  config.registers.reactiveExportToGrid,
  config.registers.reactiveImportFromGrid,
];
const indices = required.map((obis) => obisRow.indexOf(obis));
console.log("indices:", indices);

const { start, end } = monthBounds("2026-08");
console.log("start:", start.toISOString(), "end:", end.toISOString());
const startMs = start.getTime();
const endMs = end.getTime();
const parsed = [];

for (let i = headerIndex + 1; i < values.length; i += 1) {
  const row = values[i];
  if (!row) continue;
  const rawClock = row[0];
  if (rawClock === null || rawClock === undefined || rawClock === "") continue;

  let timestampMs;
  if (typeof rawClock === "number") {
    timestampMs = excelSerialToMs(rawClock);
  } else if (rawClock instanceof Date) {
    timestampMs = rawClock.getTime();
  } else {
    const parsedDate = Date.parse(String(rawClock));
    if (!Number.isFinite(parsedDate)) {
      const str = String(rawClock).trim();
      const parts = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{1,2})/);
      if (parts) {
        const d = new Date(Date.UTC(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5]));
        timestampMs = d.getTime();
      }
    } else {
      timestampMs = parsedDate;
    }
  }

  timestampMs = Math.round(timestampMs / 60_000) * 60_000;
  parsed.push({
    row: i + 1,
    timestampMs,
    timestampStr: isoMinute(timestampMs),
  });
}

console.log("parsed total:", parsed.length);
const periodRows = parsed.filter((r) => r.timestampMs >= startMs && r.timestampMs <= endMs);
console.log("periodRows:", periodRows.length);
const groups = new Map();
for (const r of periodRows) {
  const g = groups.get(r.timestampMs) ?? [];
  g.push(r);
  groups.set(r.timestampMs, g);
}
console.log("groups.size:", groups.size);

const expected = [];
for (let ts = startMs; ts <= endMs; ts += 30 * 60_000) expected.push(ts);
console.log("expected length:", expected.length);

const missing = expected.filter((ts) => !groups.has(ts));
console.log("missing length:", missing.length);
