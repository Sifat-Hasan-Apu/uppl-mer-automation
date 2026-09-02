import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { monthBounds } from "./meter-engine";
import { AuditResult, MeterConfig } from "./types";
import { IBM_PLEX_MONO_BOLD, IBM_PLEX_MONO_REGULAR } from "./ibm-plex-mono-font";

function formatMonthShort(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getUTCMonth()];
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatPeriodDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatNum(num: number, decimals: number = 2): string {
  return Number(num).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function generateMerPdfDocument(audit: AuditResult, config: MeterConfig): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Register IBM Plex Mono font for crystal-clear classic typography
  try {
    doc.addFileToVFS("IBMPlexMono-Regular.ttf", IBM_PLEX_MONO_REGULAR);
    doc.addFileToVFS("IBMPlexMono-Bold.ttf", IBM_PLEX_MONO_BOLD);
    doc.addFont("IBMPlexMono-Regular.ttf", "IBMPlexMono", "normal");
    doc.addFont("IBMPlexMono-Bold.ttf", "IBMPlexMono", "bold");
    doc.setFont("IBMPlexMono", "normal");
  } catch (err) {
    console.warn("Could not register custom font, falling back to courier", err);
    doc.setFont("courier", "normal");
  }

  const bounds = monthBounds(audit.month);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(bounds.start);
  const shortStartDate = formatMonthShort(bounds.start);
  const shortEndDate = formatMonthShort(bounds.displayEnd);
  const periodStart = formatPeriodDate(bounds.start);
  const periodEnd = formatPeriodDate(bounds.displayEnd);

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm

  // Centered Header Block (Classic BPDB Executive Layout)
  doc.setFont("IBMPlexMono", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("M/S.United Payra Power Limited", pageWidth / 2, 10.5, { align: "center" });

  doc.setFont("IBMPlexMono", "normal");
  doc.setFontSize(9);
  doc.text("150 MW HFO Fired Power Plant", pageWidth / 2, 15, { align: "center" });
  doc.text("Kholishakhali, Patuakhali", pageWidth / 2, 19, { align: "center" });
  doc.text("Energy Export to Grid at 132 KV", pageWidth / 2, 23, { align: "center" });

  doc.setFont("IBMPlexMono", "bold");
  doc.setFontSize(9.5);
  doc.text(`Month : ${monthName} ${bounds.year}`, pageWidth / 2, 27.5, { align: "center" });

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

  const omfFormatted = formatNum(config.omf, 2);

  // Soft tint styles matching authentic Excel look
  const lavenderBg = [246, 242, 254];
  const softGreenBg = [238, 249, 242];

  // Table Body data structured exactly like the approved spreadsheet
  const bodyRows: any[] = [
    // Plant Control Room sub-header
    [
      { content: "", styles: { halign: "center" } },
      { content: "Plant Control Room", colSpan: 14, styles: { fontStyle: "bold", halign: "left", cellPadding: 1.2 } },
    ],
    // Main Meter Rows
    [
      { content: "1", rowSpan: 4, styles: { valign: "middle", halign: "center", fontStyle: "bold" } },
      { content: `Main Meter\nMeter ID:\n${config.meters.main}`, rowSpan: 4, styles: { valign: "middle", halign: "left", fontStyle: "bold" } },
      { content: shortEndDate, rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      { content: "24.00", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      { content: "Exp.", styles: { halign: "center", fillColor: lavenderBg } },
      { content: formatNum(main.readings.end.activeExport), styles: { halign: "right", fillColor: lavenderBg } },
      { content: formatNum(mainExpDiff), styles: { halign: "right" } },
      { content: omfFormatted, rowSpan: 4, styles: { valign: "middle", halign: "center" } },
      { content: formatNum(calc.main.activeExportAdvance), styles: { halign: "right", fontStyle: "bold" } },
      { content: "Exp.", styles: { halign: "center" } },
      { content: formatNum(main.readings.end.reactiveExport), styles: { halign: "right" } },
      { content: formatNum(mainReacExpDiff), styles: { halign: "right" } },
      { content: omfFormatted, rowSpan: 4, styles: { valign: "middle", halign: "center" } },
      { content: formatNum(calc.main.reactiveExportAdvance), styles: { halign: "right", fontStyle: "bold" } },
      { content: "", rowSpan: 4, styles: { valign: "middle" } },
    ],
    [
      { content: "Imp.", styles: { halign: "center", fillColor: lavenderBg } },
      { content: formatNum(main.readings.end.activeImport), styles: { halign: "right", fillColor: lavenderBg } },
      { content: formatNum(mainImpDiff), styles: { halign: "right" } },
      { content: formatNum(calc.main.activeImportAdvance), styles: { halign: "right", fontStyle: "bold" } },
      { content: "Imp.", styles: { halign: "center" } },
      { content: formatNum(main.readings.end.reactiveImport), styles: { halign: "right" } },
      { content: formatNum(mainReacImpDiff), styles: { halign: "right" } },
      { content: formatNum(calc.main.reactiveImportAdvance), styles: { halign: "right", fontStyle: "bold" } },
    ],
    [
      { content: shortStartDate, rowSpan: 2, styles: { valign: "middle", halign: "center", fillColor: softGreenBg } },
      { content: "0:00", rowSpan: 2, styles: { valign: "middle", halign: "center", fillColor: softGreenBg } },
      { content: "Exp.", styles: { halign: "center", fillColor: softGreenBg } },
      { content: formatNum(main.readings.start.activeExport), styles: { halign: "right", fillColor: softGreenBg } },
      { content: "", styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "Exp.", styles: { halign: "center" } },
      { content: formatNum(main.readings.start.reactiveExport), styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
    ],
    [
      { content: "Imp.", styles: { halign: "center", fillColor: softGreenBg } },
      { content: formatNum(main.readings.start.activeImport), styles: { halign: "right", fillColor: softGreenBg } },
      { content: "", styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "Imp.", styles: { halign: "center" } },
      { content: formatNum(main.readings.start.reactiveImport), styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
    ],

    // Back-up Meter Rows
    [
      { content: "2", rowSpan: 4, styles: { valign: "middle", halign: "center", fontStyle: "bold" } },
      { content: `Back-up Meter\nMeter ID:\n${config.meters.backup}`, rowSpan: 4, styles: { valign: "middle", halign: "left", fontStyle: "bold" } },
      { content: shortEndDate, rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      { content: "24.00", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      { content: "Exp.", styles: { halign: "center" } },
      { content: formatNum(backup.readings.end.activeExport), styles: { halign: "right" } },
      { content: formatNum(backupExpDiff), styles: { halign: "right" } },
      { content: omfFormatted, rowSpan: 4, styles: { valign: "middle", halign: "center" } },
      { content: formatNum(calc.backup.activeExportAdvance), styles: { halign: "right", fontStyle: "bold" } },
      { content: "Exp.", styles: { halign: "center" } },
      { content: formatNum(backup.readings.end.reactiveExport), styles: { halign: "right" } },
      { content: formatNum(backupReacExpDiff), styles: { halign: "right" } },
      { content: omfFormatted, rowSpan: 4, styles: { valign: "middle", halign: "center" } },
      { content: formatNum(calc.backup.reactiveExportAdvance), styles: { halign: "right", fontStyle: "bold" } },
      { content: "", rowSpan: 4, styles: { valign: "middle" } },
    ],
    [
      { content: "Imp.", styles: { halign: "center" } },
      { content: formatNum(backup.readings.end.activeImport), styles: { halign: "right" } },
      { content: formatNum(backupImpDiff), styles: { halign: "right" } },
      { content: formatNum(calc.backup.activeImportAdvance), styles: { halign: "right", fontStyle: "bold" } },
      { content: "Imp.", styles: { halign: "center" } },
      { content: formatNum(backup.readings.end.reactiveImport), styles: { halign: "right" } },
      { content: formatNum(backupReacImpDiff), styles: { halign: "right" } },
      { content: formatNum(calc.backup.reactiveImportAdvance), styles: { halign: "right", fontStyle: "bold" } },
    ],
    [
      { content: shortStartDate, rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      { content: "0:00", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      { content: "Exp.", styles: { halign: "center" } },
      { content: formatNum(backup.readings.start.activeExport), styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "Exp.", styles: { halign: "center" } },
      { content: formatNum(backup.readings.start.reactiveExport), styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
    ],
    [
      { content: "Imp.", styles: { halign: "center" } },
      { content: formatNum(backup.readings.start.activeImport), styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "Imp.", styles: { halign: "center" } },
      { content: formatNum(backup.readings.start.reactiveImport), styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
      { content: "", styles: { halign: "right" } },
    ],
  ];

  autoTable(doc, {
    startY: 31.5,
    margin: { left: 8.5, right: 8.5 },
    theme: "plain",
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.25,
    head: [
      [
        { content: "Sl", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "Meter Location", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "Date", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "Time", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "KWH", colSpan: 5, styles: { halign: "center", fontStyle: "bold" } },
        { content: "KVARh", colSpan: 5, styles: { halign: "center", fontStyle: "bold" } },
        { content: "Remarks", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      ],
      [
        { content: "", styles: { halign: "center" } },
        { content: "Reading", styles: { halign: "center" } },
        { content: "Difference", styles: { halign: "center" } },
        { content: "OMF", styles: { halign: "center" } },
        { content: "Total Advance", styles: { halign: "center" } },
        { content: "", styles: { halign: "center" } },
        { content: "Reading (KVARh)", styles: { halign: "center" } },
        { content: "Difference", styles: { halign: "center" } },
        { content: "OMF", styles: { halign: "center" } },
        { content: "Total Advance (KVARh)", styles: { halign: "center" } },
      ],
    ],
    body: bodyRows,
    styles: {
      font: "IBMPlexMono",
      fontSize: 7.2,
      cellPadding: 1.1,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.25,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 26 },
      2: { cellWidth: 21, halign: "center" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 10, halign: "center" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 19, halign: "right" },
      7: { cellWidth: 23, halign: "center" },
      8: { cellWidth: 25, halign: "right" },
      9: { cellWidth: 10, halign: "center" },
      10: { cellWidth: 23, halign: "right" },
      11: { cellWidth: 19, halign: "right" },
      12: { cellWidth: 23, halign: "center" },
      13: { cellWidth: 25, halign: "right" },
      14: { cellWidth: 13, halign: "center" },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 7;

  // Summary Table (Exact replica of Net Energy Supplied to BPDB section)
  const summaryRows: any[] = [
    [
      { content: "1", styles: { halign: "center" } },
      { content: `Net Energy Supplied to BPDB (as per Main Meter Reading) for the period (${periodStart}) to (${periodEnd})`, styles: { halign: "left" } },
      { content: formatNum(calc.main.activeNetSupply), styles: { halign: "right", fontStyle: "bold" } },
      { content: "KWH", styles: { halign: "center", fontStyle: "bold" } },
    ],
    [
      { content: "2", styles: { halign: "center" } },
      { content: `Net Energy Supplied to BPDB (as per Back-up Meter Reading) for the period (${periodStart}) to (${periodEnd})`, styles: { halign: "left" } },
      { content: formatNum(calc.backup.activeNetSupply), styles: { halign: "right", fontStyle: "bold" } },
      { content: "KWH", styles: { halign: "center", fontStyle: "bold" } },
    ],
  ];

  autoTable(doc, {
    startY: finalY,
    margin: { left: 8.5, right: 8.5 },
    theme: "plain",
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.25,
    body: summaryRows,
    styles: {
      font: "IBMPlexMono",
      fontSize: 7.5,
      cellPadding: 1.4,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 200 },
      2: { cellWidth: 53, halign: "right" },
      3: { cellWidth: 20, halign: "center" },
    },
  });

  // Official Signatures Section (Clean 4-column balanced layout with zero text collision)
  const sigY = 173;
  const sigColWidth = 68;
  const marginX = 12;

  const signatures = [
    {
      title: "Acting Plant Manager",
      company: "M/S United Payra Power Ltd.",
      lines: ["Kholishakhali, Patuakhali"],
      committee: "Member, Reading committee",
    },
    {
      title: "Executive Engineer",
      company: "Grid Maintenance Division.",
      lines: ["PGCB, Barishal"],
      committee: "Member, Reading committee",
    },
    {
      title: "Executive Engineer",
      company: "Opn. & EMD",
      lines: ["Barishal Gas Turbine Power Plant", "Barishal"],
      committee: "Member, Reading committee",
    },
    {
      title: "Executive Engineer",
      company: "Energy Auditing Unit Division",
      lines: ["BPDB, Barishal"],
      committee: "Convenor, Reading committee",
    },
  ];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  signatures.forEach((sig, index) => {
    const x = marginX + index * sigColWidth;

    // Signature top line
    doc.line(x, sigY, x + 54, sigY);

    // Signature Designation
    doc.setFont("IBMPlexMono", "bold");
    doc.setFontSize(7.5);
    doc.text(sig.title, x, sigY + 4.5);

    // Organization & Plant
    doc.setFont("IBMPlexMono", "normal");
    doc.setFontSize(6.8);
    doc.text(sig.company, x, sigY + 8.5);

    let currentY = sigY + 12.2;
    sig.lines.forEach((line) => {
      doc.text(line, x, currentY);
      currentY += 3.7;
    });

    // Committee role
    doc.text(sig.committee, x, sigY + 20);
  });

  return doc;
}

export function downloadMerPdf(audit: AuditResult, config: MeterConfig, filename?: string) {
  const doc = generateMerPdfDocument(audit, config);
  const safeMonth = audit.month.replace("-", "_");
  doc.save(filename || `UPPL_MER_${safeMonth}_OFFICIAL.pdf`);
}
