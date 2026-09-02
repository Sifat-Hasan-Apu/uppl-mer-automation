export interface PlantConfig {
  name: string;
  capacity: string;
  location: string;
  interconnection: string;
}

export interface MeterConfig {
  schemaVersion: number;
  plant: PlantConfig;
  intervalMinutes: number;
  omf: number;
  allowedDiscrepancyPercent: number;
  meters: {
    main: string;
    backup: string;
  };
  registers: {
    activeExportToGrid: string;
    activeImportFromGrid: string;
    reactiveExportToGrid: string;
    reactiveImportFromGrid: string;
  };
  templateCells?: Record<string, any>;
}

export interface MeterReadingValues {
  activeExport: number;
  activeImport: number;
  reactiveExport: number;
  reactiveImport: number;
}

export interface MeterBoundaryReadings {
  start: MeterReadingValues;
  end: MeterReadingValues;
}

export interface DuplicateDetail {
  timestamp: string;
  rows: number[];
  statuses: string[];
}

export interface ParsedReadingRow {
  row: number;
  timestampMs: number;
  timestampStr: string;
  status: string;
  registers: [number, number, number, number]; // [activeExport, activeImport, reactiveExport, reactiveImport]
}

export interface InspectedMeter {
  fileName: string;
  sha256: string;
  sheetName: string;
  meterId: string;
  headerRow: number;
  sourceDataRows: number;
  periodRows: number;
  uniqueTimestampCount: number;
  expectedTimestampCount: number;
  missingTimestampCount: number;
  duplicateTimestampCount: number;
  duplicateDetails: DuplicateDetail[];
  startSourceRows: number[];
  endSourceRows: number[];
  readings: MeterBoundaryReadings;
  allRows?: ParsedReadingRow[];
}

export interface MeterTotals {
  activeExportAdvance: number;
  activeImportAdvance: number;
  activeNetSupply: number;
  reactiveExportAdvance: number;
  reactiveImportAdvance: number;
}

export interface AuditComparison {
  differenceKwh: number;
  discrepancyPercent: number;
  allowedDiscrepancyPercent: number;
  withinTolerance: boolean;
}

export interface AuditResult {
  status: "VERIFIED" | "FAILED";
  month: string;
  generatedAt: string;
  inputsWereSwapped: boolean;
  meters: {
    main: InspectedMeter;
    backup: InspectedMeter;
  };
  calculations: {
    main: MeterTotals;
    backup: MeterTotals;
  };
  comparison: AuditComparison;
  outputs?: {
    xlsx?: string;
    pdf?: string;
    audit?: string;
    preview?: string;
    pdfBytes?: number | null;
  };
  verification?: {
    sourceValidation: "PASS" | "FAIL";
    formulaRecalculation: "PASS" | "FAIL";
    generatedWorkbookReopen?: "PASS" | "FAIL";
    pdfCreated?: "PASS" | "FAIL" | "PENDING";
  };
  error?: string;
}

export interface IntervalChartData {
  timestamp: string;
  formattedTime: string;
  mainActiveExport: number;
  mainActiveImport: number;
  mainNetGeneration: number;
  backupNetGeneration: number;
  deltaNet: number;
}

export interface DailyChartData {
  date: string;
  day: number;
  mainNetKwh: number;
  backupNetKwh: number;
  exportKwh: number;
  importKwh: number;
}
