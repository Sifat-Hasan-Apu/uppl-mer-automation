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

const path = "C:/Users/Lony/Music/UPPL Energy MAIN METER readings for the month of August-2026.xlsx";
const buffer = fs.readFileSync(path);
const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const values = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });

console.log("SheetName:", workbook.SheetNames[0]);
console.log("Total rows:", values.length);

const headerIndex = values.findIndex(
  (row) => String(row?.[0] ?? "").trim().toLowerCase() === "clock"
);
console.log("headerIndex:", headerIndex);

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
    timestampMs = Date.parse(String(rawClock));
  }

  timestampMs = Math.round(timestampMs / 60_000) * 60_000;
  parsed.push({ row: i + 1, timestampMs, str: isoMinute(timestampMs), rawClock });
}

console.log("Parsed rows count:", parsed.length);
console.log("First parsed row:", parsed[0]);
console.log("Last parsed row:", parsed[parsed.length - 1]);

const { start, end } = monthBounds("2026-08");
console.log("Start bound:", start.toISOString(), "End bound:", end.toISOString());

const periodRows = parsed.filter(
  (r) => r.timestampMs >= start.getTime() && r.timestampMs <= end.getTime()
);
console.log("Period rows count:", periodRows.length);
