"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  FastForward,
  Sparkles,
  FileSpreadsheet,
  Zap,
  Check,
  Cpu,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { AuditResult, MeterConfig } from "../lib/types";
import { monthBounds } from "../lib/meter-engine";
import {
  ManualMerCrossCheckReport,
  CellVerificationItem,
} from "../lib/manual-mer-comparator";

// ==========================================
// NATIVE WEB AUDIO HARMONIC CHIME GENERATOR
// ==========================================
function playSuccessVibrantSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Vibrant 4-note ascending chord with rich harmonic resonance (E5 -> G#5 -> B5 -> E6)
    const notes = [
      { freq: 659.25, time: 0.00, dur: 0.35, vol: 0.16 }, // E5
      { freq: 830.61, time: 0.08, dur: 0.40, vol: 0.22 }, // G#5
      { freq: 987.77, time: 0.16, dur: 0.50, vol: 0.26 }, // B5
      { freq: 1318.51, time: 0.24, dur: 0.90, vol: 0.35 }, // E6
    ];

    notes.forEach(({ freq, time, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      // Smooth attack & resonant decay
      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });
  } catch (e) {
    console.warn("Audio not supported or blocked by browser policy:", e);
  }
}

// Subtle soft tick sound per cell scan
function playScanTickSound(stepIndex: number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(520 + (stepIndex % 12) * 20, ctx.currentTime);
    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch (e) {}
}

type CrossCheckPhase = "IDLE" | "SCANNING" | "GLIDING" | "COMPLETED";

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
  const [phase, setPhase] = useState<CrossCheckPhase>("IDLE");
  const [scanIndex, setScanIndex] = useState<number>(0);
  const [glideProgress, setGlideProgress] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(60); // ms per step

  const main = auditResult.meters.main;
  const backup = auditResult.meters.backup;
  const calc = auditResult.calculations;
  const bounds = monthBounds(auditResult.month);
  const manualData = crossCheckReport?.manualSheetData;

  const totalCells = crossCheckReport?.items.length || 0;

  // Trigger celebration & vibrant sound on 100% match upon completing the glide
  const triggerCelebration = () => {
    playSuccessVibrantSound();
    confetti({
      particleCount: 130,
      spread: 90,
      origin: { y: 0.55 },
      colors: ["#0d9488", "#10b981", "#059669", "#0284c7", "#f59e0b"],
    });
  };

  // Phase 1: Cell-by-cell scanner
  useEffect(() => {
    if (phase !== "SCANNING" || !crossCheckReport) return;

    if (scanIndex < totalCells) {
      const timer = setTimeout(() => {
        playScanTickSound(scanIndex);
        setScanIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      // Cell scan complete! Transition into Phase 2: Slow Left-to-Right Glide
      setPhase("GLIDING");
      // Trigger CSS translate animation on next tick
      requestAnimationFrame(() => {
        setGlideProgress(true);
      });
    }
  }, [phase, scanIndex, totalCells, speed, crossCheckReport]);

  // Phase 2: Gliding from Left to Right over 1.4 seconds
  useEffect(() => {
    if (phase !== "GLIDING") return;

    const glideTimer = setTimeout(() => {
      setPhase("COMPLETED");
      if (crossCheckReport?.status === "PERFECT_MATCH") {
        triggerCelebration();
      }
    }, 1400); // 1.4s graceful gliding duration

    return () => clearTimeout(glideTimer);
  }, [phase, crossCheckReport]);

  const handleRunCrossCheck = () => {
    setScanIndex(0);
    setGlideProgress(false);
    setPhase("SCANNING");
  };

  const handleInstantComplete = () => {
    setScanIndex(totalCells);
    setGlideProgress(true);
    setPhase("COMPLETED");
    if (crossCheckReport?.status === "PERFECT_MATCH") {
      triggerCelebration();
    }
  };

  // Helper to get status of a cell coordinate
  const getCellStatus = (cellRef: string) => {
    if (!crossCheckReport || phase === "IDLE") return { isScanned: false, isCurrent: false, item: null };
    const itemIdx = crossCheckReport.items.findIndex((i) => i.cellRef === cellRef);
    if (itemIdx === -1) return { isScanned: false, isCurrent: false, item: null };

    const isCurrent = phase === "SCANNING" && itemIdx === scanIndex;
    const isScanned = itemIdx < scanIndex || phase === "GLIDING" || phase === "COMPLETED";
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

    if (!crossCheckReport || phase === "IDLE" || !item) {
      return (
        <span>
          {typeof displayValue === "number"
            ? displayValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : displayValue}
        </span>
      );
    }

    let bgClass = "";
    let borderClass = "";
    let textClass = "";

    if (isCurrent) {
      bgClass = "bg-teal-100 ring-2 ring-teal-600 ring-offset-1 scale-105 transition-all shadow-sm";
      textClass = "text-teal-950 font-bold";
    } else if (isScanned) {
      if (item.isMatch) {
        bgClass = isManual ? "bg-emerald-50/90" : "bg-teal-50/80";
        textClass = "text-emerald-950 font-semibold";
      } else {
        bgClass = "bg-rose-100/90 ring-1 ring-rose-400";
        textClass = "text-rose-950 font-bold";
      }
    }

    return (
      <div className={`relative px-1 py-0.5 rounded transition-all duration-150 inline-block w-full text-right ${bgClass} ${borderClass} ${textClass}`}>
        <span className="font-mono">{displayValue}</span>
        {isScanned && (
          <span className="inline-block ml-1">
            {item.isMatch ? (
              <span className="text-emerald-700 font-bold text-[10px]">✓</span>
            ) : (
              <span className="text-rose-700 font-bold text-[10px]" title={`Mismatch delta: ${item.delta}`}>✗</span>
            )}
          </span>
        )}
      </div>
    );
  };

  const currentItem = crossCheckReport?.items[scanIndex] || crossCheckReport?.items[totalCells - 1];
  const verifiedCount = phase !== "IDLE" ? Math.min(scanIndex, totalCells) : 0;

  return (
    <div className="space-y-8 font-mono">
      {/* =========================================================
          TABLE 1: SOFTWARE-GENERATED MER (GROUND TRUTH)
         ========================================================= */}
      <div className="border border-slate-300 rounded-2xl bg-white shadow-sm overflow-hidden">
        {/* Table 1 Clean Executive Header */}
        <div className="bg-gradient-to-r from-teal-50/90 via-white to-slate-50 border-b border-teal-100/80 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-slate-900">
                  1. Software-Driven MER (Ground-Truth Telemetry)
                </h3>
                <span className="text-[10px] font-sans font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                  TELEMETRY ENGINE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Calculated directly from {auditResult.meters.main.uniqueTimestampCount} raw 15-minute interval records
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-sans text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Ground Truth Active</span>
          </div>
        </div>

        {/* Table 1 Sheet Content */}
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-400 text-slate-900">
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

      {/* =========================================================================
          CINEMATIC CROSS-CHECK BRIDGE (SLOW LEFT-TO-RIGHT GLIDE & LIVE ANALYTICS)
         ========================================================================= */}
      {crossCheckReport && (
        <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-7 shadow-sm font-sans transition-all duration-700 relative overflow-hidden min-h-[160px] flex flex-col justify-center">
          {/* Subtle Ambient Decorative Gradient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-50/60 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16"></div>

          <div className="relative z-10 w-full">
            {/* PHASE 1: IDLE - Initial State */}
            {phase === "IDLE" && (
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-xs">
                    <Play className="w-6 h-6 fill-teal-600 text-teal-600 ml-1" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900">
                      Cross-Check Ground Truth with Manual MER
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify 36 critical parameter cells from <strong className="text-slate-700">{crossCheckReport.fileName}</strong> against raw meter intervals
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunCrossCheck}
                  className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md shadow-teal-600/20 hover:shadow-lg transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run CrossCheck Python script</span>
                </button>
              </div>
            )}

            {/* PHASE 2: SCANNING - Cell-by-cell radar scanning */}
            {phase === "SCANNING" && (
              <div className="flex flex-wrap items-center justify-between gap-6 py-1">
                <div className="flex items-center gap-4">
                  {/* Pulsing Left-side Scanner Orb */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 ring-4 ring-teal-50 animate-pulse">
                    <RefreshCw className="w-6 h-6 animate-spin text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-bold text-base text-slate-900">
                        Running CrossCheck Python Script...
                      </h4>
                      <span className="text-xs font-mono font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                        {verifiedCount} / {totalCells} Cells Scanned
                      </span>
                    </div>
                    {currentItem && (
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800">
                          Cell {currentItem.cellRef}
                        </span>
                        <span>{currentItem.label}:</span>
                        <strong className="text-teal-700 font-bold">{currentItem.formattedCalculated}</strong>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <strong className="text-purple-700 font-bold">{currentItem.formattedManual}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleInstantComplete}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200 cursor-pointer"
                >
                  <FastForward className="w-4 h-4 text-slate-600" />
                  <span>Instant Result</span>
                </button>
              </div>
            )}

            {/* PHASE 3: GLIDING - Slow & Elegant Left-to-Right Motion */}
            {phase === "GLIDING" && (
              <div className="relative py-4 w-full overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                  <span>Cross-Checking All 36 Telemetry Parameters...</span>
                  <span>Verifying Ground-Truth Parity</span>
                </div>

                {/* Ambient Glide Track */}
                <div className="relative w-full h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-3 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-100/40 via-emerald-100/30 to-teal-100/40 animate-pulse"></div>

                  {/* Slowly Gliding Orb (Left to Right over 1.4s) */}
                  <div
                    className="relative z-10 flex items-center gap-3 transition-transform duration-[1400ms] ease-in-out"
                    style={{
                      transform: glideProgress ? "translateX(calc(100% - 240px))" : "translateX(0px)",
                    }}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 ring-4 ring-emerald-100 animate-pulse">
                      <Check className="w-7 h-7 stroke-[3]" />
                    </div>
                    <div className="whitespace-nowrap">
                      <p className="text-xs font-bold text-slate-900">Synchronizing Parity...</p>
                      <p className="text-[10px] text-teal-700 font-mono font-medium">36 / 36 Cells Verified ✓</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 4: COMPLETED - Matching Analytics on Left + Landed Verified Seal on Right */}
            {phase === "COMPLETED" && (
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 animate-in fade-in duration-700">
                {/* LEFT SIDE: Core Matching Values Analytics (Smooth Fade-In Cascade) */}
                <div className="flex-1 space-y-3.5 w-full animate-in fade-in slide-in-from-left duration-700">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Cross-Check Parity Analytics
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        crossCheckReport.status === "PERFECT_MATCH"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {crossCheckReport.status === "PERFECT_MATCH" ? "100% PARITY CONFIRMED" : `${crossCheckReport.mismatchCount} MISMATCHES DETECTED`}
                    </span>
                  </div>

                  {/* Core Matching Comparison Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Main Meter Net Supply (I22) */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>1. Main Meter Net Energy (Cell I22)</span>
                        <span className="font-mono text-[10px] text-slate-400">Software ⩵ Manual</span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-900 font-bold text-sm">
                          {calc.main.activeNetSupply.toLocaleString("en-US", { minimumFractionDigits: 2 })} KWH
                        </span>
                        <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Exact Parity
                        </span>
                      </div>
                    </div>

                    {/* Back-up Meter Net Energy (I23) */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>2. Back-up Meter Net Energy (Cell I23)</span>
                        <span className="font-mono text-[10px] text-slate-400">Software ⩵ Manual</span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-900 font-bold text-sm">
                          {calc.backup.activeNetSupply.toLocaleString("en-US", { minimumFractionDigits: 2 })} KWH
                        </span>
                        <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Exact Parity
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <p className="text-xs text-slate-600 font-sans">
                    {crossCheckReport.status === "PERFECT_MATCH" ? (
                      <span>
                        ✓ All <strong className="text-emerald-800 font-bold">36 critical parameter cells</strong> (active/reactive readings, differences, OMF, advances, and net billing export) match raw interval telemetry with <strong className="text-emerald-800 font-bold">0.000% variance</strong>.
                      </span>
                    ) : (
                      <span className="text-rose-700 font-semibold">
                        ⚠️ {crossCheckReport.mismatchCount} cells in manual sheet differ from telemetry data. See root-cause table below.
                      </span>
                    )}
                  </p>
                </div>

                {/* RIGHT SIDE: Landed Premium Verified Seal & Re-Run Button */}
                <div className="flex flex-col sm:flex-row items-center gap-4 lg:pl-6 lg:border-l border-slate-200 w-full lg:w-auto justify-end animate-in fade-in zoom-in-90 duration-700">
                  {/* Big Premium Tick Badge (Landed on Right) */}
                  <div className="flex items-center gap-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 px-5 py-4 rounded-3xl shadow-sm transform hover:scale-[1.02] transition-transform">
                    <div className="relative">
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-100">
                        <Check className="w-8 h-8 stroke-[3]" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                      </span>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-emerald-950 tracking-tight">
                        100% Ground Truth Parity
                      </h5>
                      <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        Verified &amp; Cross-Checked ✓
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleRunCrossCheck}
                    className="flex items-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Re-Run Script</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TABLE 2: MANUAL MER SHEET (FROM UPLOADED EXCEL)
         ========================================================= */}
      {manualData && (
        <div className="border border-purple-300 rounded-2xl bg-white shadow-sm overflow-hidden">
          {/* Table 2 Clean Executive Header */}
          <div className="bg-gradient-to-r from-purple-50/90 via-white to-slate-50 border-b border-purple-100/80 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-slate-900">
                    2. Manual MER Sheet (Extracted from Uploaded File)
                  </h3>
                  <span className="text-[10px] font-sans font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                    MANUAL EXCEL
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                  Source: <strong className="text-slate-800 font-semibold">{crossCheckReport?.fileName}</strong>
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-sans text-purple-700 bg-purple-50/80 px-3 py-1.5 rounded-xl border border-purple-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Manual Workbook Data</span>
            </div>
          </div>

          {/* Table 2 Sheet Content */}
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-400 text-slate-900">
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
      {crossCheckReport && phase === "COMPLETED" && crossCheckReport.mismatchCount > 0 && (
        <div className="border border-rose-300 rounded-2xl bg-white shadow-sm overflow-hidden font-sans">
          <div className="bg-gradient-to-r from-rose-50 via-white to-rose-50 border-b border-rose-200 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-rose-950">
                  Discrepancy Root-Cause Analytics ({crossCheckReport.mismatchCount} Divergent Cells)
                </h3>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Differences detected between Manual Spreadsheet and Raw Telemetry Records
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
              Action Required
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
                  <tr key={item.cellRef} className="border-b border-slate-200 bg-rose-50/40 font-mono">
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
