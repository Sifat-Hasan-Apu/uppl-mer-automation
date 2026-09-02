import * as XLSX from "xlsx";
import { dateToExcelSerial, monthBounds } from "./meter-engine";
import { AuditResult, MeterConfig } from "./types";

export function createDefaultMerWorksheet(audit: AuditResult, config: MeterConfig): XLSX.WorkSheet {
  const bounds = monthBounds(audit.month);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(bounds.start);
  const shortStart = `${String(bounds.start.getUTCDate()).padStart(2, "0")}-${String(bounds.monthNumber).padStart(2, "0")}-${String(bounds.year).slice(-2)}`;
  const shortEnd = `${String(bounds.displayEnd.getUTCDate()).padStart(2, "0")}-${String(bounds.monthNumber).padStart(2, "0")}-${String(bounds.year).slice(-2)}`;

  const ws_data: any[][] = [];

  // Header rows
  ws_data[0] = ["", "BANGLADESH POWER DEVELOPMENT BOARD"];
  ws_data[1] = ["", "MONTHLY ENERGY READING (MER) SHEET"];
  ws_data[2] = ["", `Power Plant: ${config.plant.name} (${config.plant.capacity})`];
  ws_data[3] = ["", `Location: ${config.plant.location} | Interconnection: ${config.plant.interconnection}`];
  ws_data[4] = [];
  ws_data[5] = [`Month : ${monthName} ${bounds.year}`]; // A6
  ws_data[6] = [];
  ws_data[7] = [
    "Meter Type", "Meter Serial No.", "Date", "Time", "Reading Type",
    "Active Register (kWh)", "Active Diff", "Active OMF", "Active Total (kWh)",
    "Reactive Register (kVARh)", "Reactive Diff", "Reactive OMF", "Reactive Total (kVARh)"
  ];

  const main = audit.meters.main;
  const backup = audit.meters.backup;

  // Main meter rows (Rows 9-12 in 1-based, index 8-11 in 0-based)
  ws_data[8] = [
    "Main Meter", config.meters.main, dateToExcelSerial(bounds.displayEnd), 24, "End Export",
    main.readings.end.activeExport, null, config.omf, null,
    main.readings.end.reactiveExport, null, config.omf, null
  ];
  ws_data[9] = [
    "", "", dateToExcelSerial(bounds.displayEnd), 24, "End Import",
    main.readings.end.activeImport, null, config.omf, null,
    main.readings.end.reactiveImport, null, config.omf, null
  ];
  ws_data[10] = [
    "", "", dateToExcelSerial(bounds.start), 0, "Start Export",
    main.readings.start.activeExport, null, null, null,
    main.readings.start.reactiveExport, null, null, null
  ];
  ws_data[11] = [
    "", "", dateToExcelSerial(bounds.start), 0, "Start Import",
    main.readings.start.activeImport, null, null, null,
    main.readings.start.reactiveImport, null, null, null
  ];

  // Backup meter rows (Rows 13-16 in 1-based, index 12-15 in 0-based)
  ws_data[12] = [
    "Back-up Meter", config.meters.backup, dateToExcelSerial(bounds.displayEnd), 24, "End Export",
    backup.readings.end.activeExport, null, config.omf, null,
    backup.readings.end.reactiveExport, null, config.omf, null
  ];
  ws_data[13] = [
    "", "", dateToExcelSerial(bounds.displayEnd), 24, "End Import",
    backup.readings.end.activeImport, null, config.omf, null,
    backup.readings.end.reactiveImport, null, config.omf, null
  ];
  ws_data[14] = [
    "", "", dateToExcelSerial(bounds.start), 0, "Start Export",
    backup.readings.start.activeExport, null, null, null,
    backup.readings.start.reactiveExport, null, null, null
  ];
  ws_data[15] = [
    "", "", dateToExcelSerial(bounds.start), 0, "Start Import",
    backup.readings.start.activeImport, null, null, null,
    backup.readings.start.reactiveImport, null, null, null
  ];

  // Spacers
  for (let i = 16; i <= 20; i++) ws_data[i] = [];

  // Summary rows (Row 22, 23 in 1-based, index 21, 22 in 0-based)
  ws_data[21] = [
    "", `Net Energy Supplied to BPDB (as per Main Meter Reading) for the period (${shortStart}) to (${shortEnd}) `,
    "", "", "", "", "", "", null // I22
  ];
  ws_data[22] = [
    "", `Net Energy Supplied to BPDB (as per Back-up Meter Reading) for the period (${shortStart}) to (${shortEnd}) `,
    "", "", "", "", "", "", null // I23
  ];

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Set Formulas
  ws["G9"] = { f: "F9-F11", t: "n" };
  ws["G10"] = { f: "F10-F12", t: "n" };
  ws["I9"] = { f: "G9*H9/1000", t: "n", v: audit.calculations.main.activeExportAdvance };
  ws["I10"] = { f: "G10*H9/1000", t: "n", v: audit.calculations.main.activeImportAdvance };

  ws["L9"] = { f: "K9-K11", t: "n" };
  ws["L10"] = { f: "K10-K12", t: "n" };
  ws["N9"] = { f: "L9*M9/1000", t: "n", v: audit.calculations.main.reactiveExportAdvance };
  ws["N10"] = { f: "L10*M9/1000", t: "n", v: audit.calculations.main.reactiveImportAdvance };

  ws["G13"] = { f: "F13-F15", t: "n" };
  ws["G14"] = { f: "F14-F16", t: "n" };
  ws["I13"] = { f: "G13*H13/1000", t: "n", v: audit.calculations.backup.activeExportAdvance };
  ws["I14"] = { f: "G14*H13/1000", t: "n", v: audit.calculations.backup.activeImportAdvance };

  ws["L13"] = { f: "K13-K15", t: "n" };
  ws["L14"] = { f: "K14-K16", t: "n" };
  ws["N13"] = { f: "L13*M13/1000", t: "n", v: audit.calculations.backup.reactiveExportAdvance };
  ws["N14"] = { f: "L14*M13/1000", t: "n", v: audit.calculations.backup.reactiveImportAdvance };

  ws["I22"] = { f: "I9-I10", t: "n", v: audit.calculations.main.activeNetSupply };
  ws["I23"] = { f: "I13-I14", t: "n", v: audit.calculations.backup.activeNetSupply };

  return ws;
}

export function populateTemplateSheet(
  workbook: XLSX.WorkBook,
  audit: AuditResult,
  config: MeterConfig
): XLSX.WorkBook {
  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];

  const bounds = monthBounds(audit.month);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(bounds.start);
  const shortStart = `${String(bounds.start.getUTCDate()).padStart(2, "0")}-${String(bounds.monthNumber).padStart(2, "0")}-${String(bounds.year).slice(-2)}`;
  const shortEnd = `${String(bounds.displayEnd.getUTCDate()).padStart(2, "0")}-${String(bounds.monthNumber).padStart(2, "0")}-${String(bounds.year).slice(-2)}`;

  const setCell = (cellRef: string, value: any, formula?: string) => {
    if (!ws[cellRef]) ws[cellRef] = {};
    if (formula) {
      ws[cellRef].f = formula;
      ws[cellRef].t = "n";
      if (value !== undefined) ws[cellRef].v = value;
    } else {
      ws[cellRef].v = value;
      ws[cellRef].t = typeof value === "number" ? "n" : "s";
    }
  };

  setCell(config.templateCells?.monthTitle || "A6", `Month : ${monthName} ${bounds.year}`);

  // Main Meter
  const main = audit.meters.main;
  setCell("C9", dateToExcelSerial(bounds.displayEnd));
  setCell("D9", 24);
  setCell("C11", dateToExcelSerial(bounds.start));
  setCell("D11", 0);
  setCell("F9", main.readings.end.activeExport);
  setCell("F10", main.readings.end.activeImport);
  setCell("F11", main.readings.start.activeExport);
  setCell("F12", main.readings.start.activeImport);
  setCell("K9", main.readings.end.reactiveExport);
  setCell("K10", main.readings.end.reactiveImport);
  setCell("K11", main.readings.start.reactiveExport);
  setCell("K12", main.readings.start.reactiveImport);
  setCell("H9", config.omf);
  setCell("M9", config.omf);

  // Backup Meter
  const backup = audit.meters.backup;
  setCell("C13", dateToExcelSerial(bounds.displayEnd));
  setCell("D13", 24);
  setCell("C15", dateToExcelSerial(bounds.start));
  setCell("D15", 0);
  setCell("F13", backup.readings.end.activeExport);
  setCell("F14", backup.readings.end.activeImport);
  setCell("F15", backup.readings.start.activeExport);
  setCell("F16", backup.readings.start.activeImport);
  setCell("K13", backup.readings.end.reactiveExport);
  setCell("K14", backup.readings.end.reactiveImport);
  setCell("K15", backup.readings.start.reactiveExport);
  setCell("K16", backup.readings.start.reactiveImport);
  setCell("H13", config.omf);
  setCell("M13", config.omf);

  // Formulas
  setCell("G9", null, "F9-F11");
  setCell("G10", null, "F10-F12");
  setCell("I9", audit.calculations.main.activeExportAdvance, "G9*H9/1000");
  setCell("I10", audit.calculations.main.activeImportAdvance, "G10*H9/1000");
  setCell("L9", null, "K9-K11");
  setCell("L10", null, "K10-K12");
  setCell("N9", audit.calculations.main.reactiveExportAdvance, "L9*M9/1000");
  setCell("N10", audit.calculations.main.reactiveImportAdvance, "L10*M9/1000");

  setCell("G13", null, "F13-F15");
  setCell("G14", null, "F14-F16");
  setCell("I13", audit.calculations.backup.activeExportAdvance, "G13*H13/1000");
  setCell("I14", audit.calculations.backup.activeImportAdvance, "G14*H13/1000");
  setCell("L13", null, "K13-K15");
  setCell("L14", null, "K14-K16");
  setCell("N13", audit.calculations.backup.reactiveExportAdvance, "L13*M13/1000");
  setCell("N14", audit.calculations.backup.reactiveImportAdvance, "L14*M13/1000");

  setCell("I22", audit.calculations.main.activeNetSupply, "I9-I10");
  setCell("I23", audit.calculations.backup.activeNetSupply, "I13-I14");
  setCell("B22", `Net Energy Supplied to BPDB (as per Main Meter Reading) for the period (${shortStart}) to (${shortEnd}) `);
  setCell("B23", `Net Energy Supplied to BPDB (as per Back-up Meter Reading) for the period (${shortStart}) to (${shortEnd}) `);

  return workbook;
}

export function generateMerWorkbookBytes(
  audit: AuditResult,
  config: MeterConfig,
  templateBuffer?: ArrayBuffer | null
): Uint8Array {
  let wb: XLSX.WorkBook;
  const bounds = monthBounds(audit.month);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(bounds.start);
  const targetSheetName = `${monthName}-${bounds.year}`;

  if (templateBuffer && templateBuffer.byteLength > 0) {
    wb = XLSX.read(templateBuffer, { type: "array", cellDates: false });
    wb = populateTemplateSheet(wb, audit, config);
  } else {
    wb = XLSX.utils.book_new();
    const ws = createDefaultMerWorksheet(audit, config);
    XLSX.utils.book_append_sheet(wb, ws, targetSheetName);
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(out);
}
