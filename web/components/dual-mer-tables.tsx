"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  FastForward,
  Sparkles,
  FileSpreadsheet,
  Zap,
  Check,
  X,
  Cpu,
  ArrowDown,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import confetti from "canvas-confetti";
import { AuditResult, MeterConfig } from "../lib/types";
import { monthBounds } from "../lib/meter-engine";
import {
  ManualMerCrossCheckReport,
  CellVerificationItem,
} from "../lib/manual-mer-comparator";

interface DualMerTablesProps {
  auditResult: AuditResult;
  crossCheckReport: ManualMerCrossCheckReport | null;
  config: MeterConfig;
  monthName: string;
  fullStartDate: string;
  fullEndDate: string;
}

export function DualMerTables({
  auditResult,
  crossCheckReport,
  config,
  monthName,
  fullStartDate,
  fullEndDate,
}: DualMerTablesProps) {
  const [scanIndex, setScanIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(100); // ms per step
  const [hasCompletedOnce, setHasCompletedOnce] = useState<boolean>(false);

  const main = auditResult.meters.main;
  const backup = auditResult.meters.backup;
  const calc = auditResult.calculations;
  const bounds = monthBounds(auditResult.month);
  const manualData = crossCheckReport?.manualSheetData;

  const totalCells = crossCheckReport?.items.length || 0;

  // Trigger celebration on complete 100% match
  const triggerCelebration = () => {
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#10b981", "#059669", "#047857", "#34d399", "#fbbf24"],
    });
  };

  // Start auto-animation when report is loaded
  useEffect(() => {
    if (crossCheckReport && !hasCompletedOnce) {
      setScanIndex(0);
      setIsAnimating(true);
    }
  }, [crossCheckReport]);

  useEffect(() => {
    if (!isAnimating || !crossCheckReport) return;

    if (scanIndex < totalCells) {
      const timer = setTimeout(() => {
        setScanIndex((prev) => {
          const next = prev + 1;
          if (next >= totalCells) {
            setIsAnimating(false);
            setHasCompletedOnce(true);
            if (crossCheckReport.status === "PERFECT_MATCH") {
              triggerCelebration();
            }
          }
          return next;
        });
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, scanIndex, totalCells, speed, crossCheckReport]);

  const handleReplay = () => {
    setScanIndex(0);
    setIsAnimating(true);
  };

  const handleSkip = () => {
    setScanIndex(totalCells);
    setIsAnimating(false);
    setHasCompletedOnce(true);
    if (crossCheckReport?.status === "PERFECT_MATCH") {
      triggerCelebration();
    }
  };

  // Helper to get status of a cell coordinate
  const getCellStatus = (cellRef: string) => {
    if (!crossCheckReport) return { isScanned: false, isCurrent: false, item: null };
    const itemIdx = crossCheckReport.items.findIndex((i) => i.cellRef === cellRef);
    if (itemIdx === -1) return { isScanned: false, isCurrent: false, item: null };

    const isCurrent = isAnimating && itemIdx === scanIndex;
    const isScanned = itemIdx < scanIndex || scanIndex >= totalCells;
    const item = crossCheckReport.items[itemIdx];

    return { isScanned, isCurrent, item };
  };

  // Helper cell formatter
  const renderCellWithStatus = (
    cellRef: string,
    displayValue: string | number,
    isManual: boolean = false
  ) => {
    const { isScanned, isCurrent, item } = getCellStatus(cellRef);

    if (!crossCheckReport || !item) {
      return <span>{typeof displayValue === "number" ? displayValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : displayValue}</span>;
    }

    let bgClass = "";
    let borderClass = "";
    let textClass = "";

    if (isCurrent) {
      bgClass = "bg-teal-100 ring-2 ring-teal-500 ring-offset-1 scale-105 transition-all";
      textClass = "text-teal-950 font-bold";
    } else if (isScanned) {
      if (item.isMatch) {
        bgClass = "bg-emerald-50/80";
        textClass = "text-emerald-950 font-semibold";
      } else {
        bgClass = "bg-rose-100 ring-1 ring-rose-400";
        textClass = "text-rose-950 font-bold";
      }
    }

    return (
      <div className={`relative px-1 py-0.5 rounded transition-colors duration-150 inline-block w-full text-right ${bgClass} ${borderClass} ${textClass}`}>
        <span className="font-mono">{displayValue}</span>
        {isScanned && (
          <span className="inline-block ml-1">
            {item.isMatch ? (
              <span className="text-emerald-700 font-bold text-[10px]">✓</span>
            ) : (
              <span className="text-rose-700 font-bold text-[10px]" title={`Mismatch: ${item.delta}`}>✗</span>
            )}
          </span>
        )}
      </div>
    );
  };

  const currentItem = crossCheckReport?.items[scanIndex] || crossCheckReport?.items[totalCells - 1];

  return (
    <div className="space-y-8 font-mono">
      {/* =========================================================
          TABLE 1: SOFTWARE-GENERATED MER (GROUND TRUTH)
         ========================================================= */}
      <div className="border border-slate-300 rounded-2xl bg-white shadow-sm overflow-hidden">
        {/* Table 1 Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                1. Software-Driven MER (Ground-Truth Telemetry)
                <span className="text-[10px] font-sans font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/40">
                  RAW INTERVAL AUDIT
                </span>
              </h3>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-sans">
            Calculated from {auditResult.meters.main.uniqueTimestampCount} 15-min Intervals
          </span>
        </div>

        {/* Table 1 Sheet Content */}
        <div className="p-5 overflow-x-auto">
          <div className="text-center space-y-1 pb-4 border-b border-slate-200">
            <h3 className="text-base font-bold tracking-wide text-slate-900">
              M/S.United Payra Power Limited
            </h3>
            <p className="text-xs text-slate-700">150 MW HFO Fired Power Plant</p>
            <p className="text-xs text-slate-700">Kholishakhali, Patuakhali</p>
            <p className="text-xs text-slate-700">Energy Export to Grid at 132 KV</p>
            <h4 className="text-xs font-bold text-slate-900 pt-1">
              Month : {monthName} {bounds.year}
            </h4>
          </div>

          <table className="w-full text-xs border-collapse border border-slate-400 text-slate-900 mt-4">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold">
                <th rowSpan={2} className="border border-slate-400 p-2 text-center w-8">Sl</th>
                <th rowSpan={2} className="border border-slate-400 p-2 text-center w-36">Meter Location</th>
                <th rowSpan={2} className="border border-slate-400 p-2 text-center w-24">Date</th>
                <th rowSpan={2} className="border border-slate-400 p-2 text-center w-16">Time</th>
                <th colSpan={5} className="border border-slate-400 p-1.5 text-center font-bold bg-slate-100">KWH</th>
                <th colSpan={5} className="border border-slate-400 p-1.5 text-center font-bold bg-slate-100">KVARh</th>
                <th rowSpan={2} className="border border-slate-400 p-2 text-center w-20">Remarks</th>
              </tr>
              <tr className="bg-slate-50 text-slate-800 font-semibold text-[11px]">
                <th className="border border-slate-400 p-1 text-center w-10"></th>
                <th className="border border-slate-400 p-1 text-right">Reading</th>
                <th className="border border-slate-400 p-1 text-right">Difference</th>
                <th className="border border-slate-400 p-1 text-center">OMF</th>
                <th className="border border-slate-400 p-1 text-right font-bold">Total Advance</th>
                <th className="border border-slate-400 p-1 text-center w-10"></th>
                <th className="border border-slate-400 p-1 text-right">Reading (KVARh)</th>
                <th className="border border-slate-400 p-1 text-right">Difference</th>
                <th className="border border-slate-400 p-1 text-center">OMF</th>
                <th className="border border-slate-400 p-1 text-right font-bold">Total Advance (KVARh)</th>
              </tr>
            </thead>
            <tbody>
              {/* Plant Control Room Header */}
              <tr className="bg-slate-50/70">
                <td className="border border-slate-400 p-1.5"></td>
                <td colSpan={12} className="border border-slate-400 p-1.5 font-bold text-slate-900">
                  Plant Control Room
                </td>
                <td className="border border-slate-400 p-1.5"></td>
              </tr>

              {/* Main Meter Rows */}
              <tr>
                <td rowSpan={4} className="border border-slate-400 p-2 font-bold text-center align-middle">1</td>
                <td rowSpan={4} className="border border-slate-400 p-2 font-bold align-middle">
                  Main Meter<br />
                  Meter ID:<br />
                  <span className="font-semibold">{config.meters.main}</span>
                </td>
                <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{fullEndDate}</td>
                <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">24.00</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F10", main.readings.end.activeExport)}</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("G10", (main.readings.end.activeExport - main.readings.start.activeExport).toFixed(2))}</td>
                <td rowSpan={4} className="border border-slate-400 p-1 text-center align-middle font-bold">{renderCellWithStatus("H10", config.omf.toLocaleString("en-US"))}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("I10", calc.main.activeExportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K10", main.readings.end.reactiveExport)}</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("L10", (main.readings.end.reactiveExport - main.readings.start.reactiveExport).toFixed(2))}</td>
                <td rowSpan={4} className="border border-slate-400 p-1 text-center align-middle font-bold">{renderCellWithStatus("M10", config.omf.toLocaleString("en-US"))}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("N10", calc.main.reactiveExportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td rowSpan={4} className="border border-slate-400 p-2 text-center align-middle text-slate-400">-</td>
              </tr>

              <tr>
                <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F11", main.readings.end.activeImport)}</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("G11", (main.readings.end.activeImport - main.readings.start.activeImport).toFixed(2))}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("I11", calc.main.activeImportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K11", main.readings.end.reactiveImport)}</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("L11", (main.readings.end.reactiveImport - main.readings.start.reactiveImport).toFixed(2))}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("N11", calc.main.reactiveImportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
              </tr>

              <tr className="bg-emerald-50/40">
                <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{fullStartDate}</td>
                <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">0:00</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F12", main.readings.start.activeExport)}</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K12", main.readings.start.reactiveExport)}</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
              </tr>

              <tr className="bg-emerald-50/40">
                <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F13", main.readings.start.activeImport)}</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K13", main.readings.start.reactiveImport)}</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
              </tr>

              {/* Back-up Meter Rows */}
              <tr>
                <td rowSpan={4} className="border border-slate-400 p-2 font-bold text-center align-middle">2</td>
                <td rowSpan={4} className="border border-slate-400 p-2 font-bold align-middle">
                  Back-up Meter<br />
                  Meter ID:<br />
                  <span className="font-semibold">{config.meters.backup}</span>
                </td>
                <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{fullEndDate}</td>
                <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">24.00</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F14", backup.readings.end.activeExport)}</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("G14", (backup.readings.end.activeExport - backup.readings.start.activeExport).toFixed(2))}</td>
                <td rowSpan={4} className="border border-slate-400 p-1 text-center align-middle font-bold">{renderCellWithStatus("H14", config.omf.toLocaleString("en-US"))}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("I14", calc.backup.activeExportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K14", backup.readings.end.reactiveExport)}</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("L14", (backup.readings.end.reactiveExport - backup.readings.start.reactiveExport).toFixed(2))}</td>
                <td rowSpan={4} className="border border-slate-400 p-1 text-center align-middle font-bold">{renderCellWithStatus("M14", config.omf.toLocaleString("en-US"))}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("N14", calc.backup.reactiveExportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td rowSpan={4} className="border border-slate-400 p-2 text-center align-middle text-slate-400">-</td>
              </tr>

              <tr>
                <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F15", backup.readings.end.activeImport)}</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("G15", (backup.readings.end.activeImport - backup.readings.start.activeImport).toFixed(2))}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("I15", calc.backup.activeImportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K15", backup.readings.end.reactiveImport)}</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("L15", (backup.readings.end.reactiveImport - backup.readings.start.reactiveImport).toFixed(2))}</td>
                <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("N15", calc.backup.reactiveImportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
              </tr>

              <tr className="bg-emerald-50/40">
                <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{fullStartDate}</td>
                <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">0:00</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F16", backup.readings.start.activeExport)}</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K16", backup.readings.start.reactiveExport)}</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
              </tr>

              <tr className="bg-emerald-50/40">
                <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F17", backup.readings.start.activeImport)}</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K17", backup.readings.start.reactiveImport)}</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
              </tr>
            </tbody>
          </table>

          {/* Table 1 Net Energy Supplied Summary */}
          <div className="mt-4 border border-slate-400 text-xs">
            <div className="flex border-b border-slate-400 bg-slate-50 font-semibold">
              <div className="w-8 p-1.5 border-r border-slate-400 text-center font-bold">1</div>
              <div className="flex-1 p-1.5 border-r border-slate-400 font-sans">
                Net Energy Supplied to BPDB (as per Main Meter Reading) for the period ({fullStartDate}) to ({fullEndDate})
              </div>
              <div className="w-44 p-1.5 border-r border-slate-400 text-right font-bold">
                {renderCellWithStatus("I22", calc.main.activeNetSupply.toLocaleString("en-US", { minimumFractionDigits: 2 }))}
              </div>
              <div className="w-16 p-1.5 text-center font-bold">KWH</div>
            </div>
            <div className="flex bg-white font-semibold">
              <div className="w-8 p-1.5 border-r border-slate-400 text-center font-bold">2</div>
              <div className="flex-1 p-1.5 border-r border-slate-400 font-sans">
                Net Energy Supplied to BPDB (as per Back-up Meter Reading) for the period ({fullStartDate}) to ({fullEndDate})
              </div>
              <div className="w-44 p-1.5 border-r border-slate-400 text-right font-bold">
                {renderCellWithStatus("I23", calc.backup.activeNetSupply.toLocaleString("en-US", { minimumFractionDigits: 2 }))}
              </div>
              <div className="w-16 p-1.5 text-center font-bold">KWH</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          CROSS-CHECK ANIMATION CONTROLLER (BETWEEN TABLES)
         ========================================================= */}
      {crossCheckReport && (
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-slate-800 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">
                <Zap className={`w-5 h-5 ${isAnimating ? "animate-bounce text-slate-950" : ""}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">
                    Live Cell-by-Cell Cross-Check &amp; Parity Engine
                  </h4>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      crossCheckReport.status === "PERFECT_MATCH"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {crossCheckReport.status === "PERFECT_MATCH" ? "100% PARITY MATCH" : `${crossCheckReport.mismatchCount} DISCREPANCY`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connecting Table 1 (Software) ➔ Table 2 (Manual Excel: <strong className="text-slate-200">{crossCheckReport.fileName}</strong>)
                </p>
              </div>
            </div>

            {/* Animation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReplay}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-Play Cross-Check
              </button>
              {isAnimating && (
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition shadow"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Instant Complete
                </button>
              )}
            </div>
          </div>

          {/* Current Cell Status Bar */}
          {currentItem && (
            <div className="mt-4 p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                  Cell {currentItem.cellRef}
                </span>
                <span className="text-slate-300 font-sans">{currentItem.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">Software: <strong className="text-teal-300">{currentItem.formattedCalculated}</strong></span>
                <span className="text-slate-500">↔</span>
                <span className="text-slate-400">Manual: <strong className="text-purple-300">{currentItem.formattedManual}</strong></span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    currentItem.isMatch ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {currentItem.isMatch ? "MATCH ✓" : "MISMATCH ✗"}
                </span>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-teal-500 via-emerald-400 to-emerald-300 h-full rounded-full transition-all duration-100"
                style={{ width: `${totalCells > 0 ? (scanIndex / totalCells) * 100 : 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TABLE 2: MANUAL MER SHEET (FROM UPLOADED EXCEL)
         ========================================================= */}
      {manualData && (
        <div className="border border-purple-300 rounded-2xl bg-white shadow-sm overflow-hidden">
          {/* Table 2 Header Bar */}
          <div className="bg-purple-950 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  2. Manual MER Sheet (Extracted from Uploaded File)
                  <span className="text-[10px] font-sans font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40">
                    MANUAL EXCEL
                  </span>
                </h3>
              </div>
            </div>
            <span className="text-xs text-purple-200 font-sans">
              Source File: <strong className="text-white">{crossCheckReport?.fileName}</strong>
            </span>
          </div>

          {/* Table 2 Sheet Content */}
          <div className="p-5 overflow-x-auto">
            <div className="text-center space-y-1 pb-4 border-b border-purple-200">
              <h3 className="text-base font-bold tracking-wide text-purple-950">
                {manualData.plantName}
              </h3>
              <p className="text-xs text-slate-700">150 MW HFO Fired Power Plant</p>
              <p className="text-xs text-slate-700">Kholishakhali, Patuakhali</p>
              <p className="text-xs text-slate-700">Energy Export to Grid at 132 KV</p>
              <h4 className="text-xs font-bold text-slate-900 pt-1">
                {manualData.monthTitle}
              </h4>
            </div>

            <table className="w-full text-xs border-collapse border border-slate-400 text-slate-900 mt-4">
              <thead>
                <tr className="bg-purple-50 text-slate-900 font-bold">
                  <th rowSpan={2} className="border border-slate-400 p-2 text-center w-8">Sl</th>
                  <th rowSpan={2} className="border border-slate-400 p-2 text-center w-36">Meter Location</th>
                  <th rowSpan={2} className="border border-slate-400 p-2 text-center w-24">Date</th>
                  <th rowSpan={2} className="border border-slate-400 p-2 text-center w-16">Time</th>
                  <th colSpan={5} className="border border-slate-400 p-1.5 text-center font-bold bg-purple-50">KWH</th>
                  <th colSpan={5} className="border border-slate-400 p-1.5 text-center font-bold bg-purple-50">KVARh</th>
                  <th rowSpan={2} className="border border-slate-400 p-2 text-center w-20">Remarks</th>
                </tr>
                <tr className="bg-purple-50/60 text-slate-800 font-semibold text-[11px]">
                  <th className="border border-slate-400 p-1 text-center w-10"></th>
                  <th className="border border-slate-400 p-1 text-right">Reading</th>
                  <th className="border border-slate-400 p-1 text-right">Difference</th>
                  <th className="border border-slate-400 p-1 text-center">OMF</th>
                  <th className="border border-slate-400 p-1 text-right font-bold">Total Advance</th>
                  <th className="border border-slate-400 p-1 text-center w-10"></th>
                  <th className="border border-slate-400 p-1 text-right">Reading (KVARh)</th>
                  <th className="border border-slate-400 p-1 text-right">Difference</th>
                  <th className="border border-slate-400 p-1 text-center">OMF</th>
                  <th className="border border-slate-400 p-1 text-right font-bold">Total Advance (KVARh)</th>
                </tr>
              </thead>
              <tbody>
                {/* Plant Control Room Header */}
                <tr className="bg-purple-50/30">
                  <td className="border border-slate-400 p-1.5"></td>
                  <td colSpan={12} className="border border-slate-400 p-1.5 font-bold text-purple-950">
                    Plant Control Room
                  </td>
                  <td className="border border-slate-400 p-1.5"></td>
                </tr>

                {/* Main Meter Rows (Manual) */}
                <tr>
                  <td rowSpan={4} className="border border-slate-400 p-2 font-bold text-center align-middle">1</td>
                  <td rowSpan={4} className="border border-slate-400 p-2 font-bold align-middle">
                    Main Meter<br />
                    Meter ID:<br />
                    <span className="font-semibold">{manualData.main.meterId}</span>
                  </td>
                  <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{manualData.main.endDate}</td>
                  <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{manualData.main.endTime}</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F10", manualData.main.endReadings.activeExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("G10", manualData.main.differences.activeExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-400 p-1 text-center align-middle font-bold">{renderCellWithStatus("H10", manualData.main.omf, true)}</td>
                  <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("I10", manualData.main.advances.activeExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K10", manualData.main.endReadings.reactiveExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("L10", manualData.main.differences.reactiveExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-400 p-1 text-center align-middle font-bold">{renderCellWithStatus("M10", manualData.main.omf, true)}</td>
                  <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("N10", manualData.main.advances.reactiveExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-400 p-2 text-center align-middle text-slate-400">-</td>
                </tr>

                <tr>
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F11", manualData.main.endReadings.activeImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("G11", manualData.main.differences.activeImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("I11", manualData.main.advances.activeImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K11", manualData.main.endReadings.reactiveImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("L11", manualData.main.differences.reactiveImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("N11", manualData.main.advances.reactiveImport, true)}</td>
                </tr>

                <tr className="bg-purple-50/30">
                  <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{manualData.main.startDate}</td>
                  <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{manualData.main.startTime}</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F12", manualData.main.startReadings.activeExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K12", manualData.main.startReadings.reactiveExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                </tr>

                <tr className="bg-purple-50/30">
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F13", manualData.main.startReadings.activeImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K13", manualData.main.startReadings.reactiveImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                </tr>

                {/* Back-up Meter Rows (Manual) */}
                <tr>
                  <td rowSpan={4} className="border border-slate-400 p-2 font-bold text-center align-middle">2</td>
                  <td rowSpan={4} className="border border-slate-400 p-2 font-bold align-middle">
                    Back-up Meter<br />
                    Meter ID:<br />
                    <span className="font-semibold">{manualData.backup.meterId}</span>
                  </td>
                  <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{manualData.backup.endDate}</td>
                  <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{manualData.backup.endTime}</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F14", manualData.backup.endReadings.activeExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("G14", manualData.backup.differences.activeExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-400 p-1 text-center align-middle font-bold">{renderCellWithStatus("H14", manualData.backup.omf, true)}</td>
                  <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("I14", manualData.backup.advances.activeExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K14", manualData.backup.endReadings.reactiveExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("L14", manualData.backup.differences.reactiveExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-400 p-1 text-center align-middle font-bold">{renderCellWithStatus("M14", manualData.backup.omf, true)}</td>
                  <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("N14", manualData.backup.advances.reactiveExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-400 p-2 text-center align-middle text-slate-400">-</td>
                </tr>

                <tr>
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F15", manualData.backup.endReadings.activeImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("G15", manualData.backup.differences.activeImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("I15", manualData.backup.advances.activeImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K15", manualData.backup.endReadings.reactiveImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("L15", manualData.backup.differences.reactiveImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-right font-bold">{renderCellWithStatus("N15", manualData.backup.advances.reactiveImport, true)}</td>
                </tr>

                <tr className="bg-purple-50/30">
                  <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{manualData.backup.startDate}</td>
                  <td rowSpan={2} className="border border-slate-400 p-1 text-center align-middle whitespace-nowrap">{manualData.backup.startTime}</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F16", manualData.backup.startReadings.activeExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Exp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K16", manualData.backup.startReadings.reactiveExport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                </tr>

                <tr className="bg-purple-50/30">
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F17", manualData.backup.startReadings.activeImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K17", manualData.backup.startReadings.reactiveImport, true)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                </tr>
              </tbody>
            </table>

            {/* Table 2 Net Energy Supplied Summary */}
            <div className="mt-4 border border-slate-400 text-xs">
              <div className="flex border-b border-slate-400 bg-purple-50/60 font-semibold">
                <div className="w-8 p-1.5 border-r border-slate-400 text-center font-bold">1</div>
                <div className="flex-1 p-1.5 border-r border-slate-400 font-sans">
                  Net Energy Supplied to BPDB (as per Main Meter Reading) for the period ({manualData.main.startDate}) to ({manualData.main.endDate})
                </div>
                <div className="w-44 p-1.5 border-r border-slate-400 text-right font-bold">
                  {renderCellWithStatus("I22", manualData.main.netEnergySupplied, true)}
                </div>
                <div className="w-16 p-1.5 text-center font-bold">KWH</div>
              </div>
              <div className="flex bg-white font-semibold">
                <div className="w-8 p-1.5 border-r border-slate-400 text-center font-bold">2</div>
                <div className="flex-1 p-1.5 border-r border-slate-400 font-sans">
                  Net Energy Supplied to BPDB (as per Back-up Meter Reading) for the period ({manualData.backup.startDate}) to ({manualData.backup.endDate})
                </div>
                <div className="w-44 p-1.5 border-r border-slate-400 text-right font-bold">
                  {renderCellWithStatus("I23", manualData.backup.netEnergySupplied, true)}
                </div>
                <div className="w-16 p-1.5 text-center font-bold">KWH</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          DISCREPANCY ANALYTICS TABLE (IF MISMATCH FOUND)
         ========================================================= */}
      {crossCheckReport && crossCheckReport.mismatchCount > 0 && (
        <div className="border border-rose-300 rounded-2xl bg-white shadow-sm overflow-hidden font-sans">
          <div className="bg-rose-900 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold tracking-tight">
                Discrepancy Root-Cause Analytics ({crossCheckReport.mismatchCount} Cells Failed)
              </h3>
            </div>
            <span className="text-xs text-rose-200">
              Discrepancies found between Manual Excel and Raw Meter Interval Telemetry
            </span>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                  <th className="p-2.5 text-center w-16">Cell</th>
                  <th className="p-2.5 w-48">Parameter</th>
                  <th className="p-2.5 text-right w-36">Manual Input</th>
                  <th className="p-2.5 text-right w-36">Ground Truth</th>
                  <th className="p-2.5 text-right w-32">Delta</th>
                  <th className="p-2.5">Impact Analysis</th>
                </tr>
              </thead>
              <tbody>
                {crossCheckReport.mismatchedItems.map((item) => (
                  <tr key={item.cellRef} className="border-b border-slate-200 bg-rose-50/60 font-mono">
                    <td className="p-2.5 text-center font-bold text-rose-950">{item.cellRef}</td>
                    <td className="p-2.5 font-sans font-medium text-slate-800">{item.label}</td>
                    <td className="p-2.5 text-right font-bold text-purple-900">{item.formattedManual}</td>
                    <td className="p-2.5 text-right font-bold text-teal-900">{item.formattedCalculated}</td>
                    <td className="p-2.5 text-right font-bold text-rose-700">
                      {item.delta && item.delta > 0 ? `+${item.delta.toFixed(2)}` : item.delta?.toFixed(2)}
                    </td>
                    <td className="p-2.5 font-sans text-slate-600 text-[11px]">{item.impactDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
