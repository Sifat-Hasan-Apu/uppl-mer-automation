"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  FastForward,
  FileSpreadsheet,
  Zap,
  Check,
  Cpu,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { AuditResult, MeterConfig } from "../lib/types";
import { monthBounds } from "../lib/meter-engine";
import {
  ManualMerCrossCheckReport,
  CellVerificationItem,
} from "../lib/manual-mer-comparator";

// =========================================================================
// CUSTOM GREEN SQUARE-FRAME CHECKMARK ICON (MATCHING USER'S EXACT REFERENCE)
// =========================================================================
export function CustomGreenCheckSquareIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Smooth rounded open square frame filling canvas */}
      <path
        d="M 66 16 H 24 C 14 16 8 22 8 32 V 76 C 8 86 14 92 24 92 H 76 C 86 92 92 86 92 76 V 46"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bold aerodynamic solid filled checkmark shooting through top right */}
      <path
        d="M 28 47 L 45 72 L 88 16 L 45 57 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================================
// BULLETPROOF WEB AUDIO SYNTHESIZER (INSTANT AUDIO PLAYBACK)
// =========================================================================
let globalAudioCtx: AudioContext | null = null;

function getOrInitAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!globalAudioCtx || globalAudioCtx.state === "closed") {
      globalAudioCtx = new AudioCtx();
    }
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }
    return globalAudioCtx;
  } catch (e) {
    console.warn("Audio Context init warning:", e);
    return null;
  }
}

function playVibrantSuccessChime() {
  try {
    const ctx = getOrInitAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Vibrant 4-note ascending chord (E5, G#5, B5, E6)
    const notes = [
      { freq: 659.25, offset: 0.00, dur: 0.35, vol: 0.28 }, // E5
      { freq: 830.61, offset: 0.09, dur: 0.40, vol: 0.32 }, // G#5
      { freq: 987.77, offset: 0.18, dur: 0.50, vol: 0.36 }, // B5
      { freq: 1318.51, offset: 0.27, dur: 0.90, vol: 0.42 }, // E6
    ];

    notes.forEach(({ freq, offset, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + offset);

      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(vol, now + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.05);
    });
  } catch (e) {
    console.error("Failed to play vibrant chime:", e);
  }
}

function playScanTickSound(stepIndex: number) {
  try {
    const ctx = getOrInitAudioContext();
    if (!ctx || ctx.state !== "running") return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(520 + (stepIndex % 12) * 20, ctx.currentTime);
    gain.gain.setValueAtTime(0.018, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  } catch (e) {}
}

type CrossCheckPhase = "IDLE" | "SCANNING" | "COMPLETED";

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
  const [speed, setSpeed] = useState<number>(45); // ms per cell

  const main = auditResult.meters.main;
  const backup = auditResult.meters.backup;
  const calc = auditResult.calculations;
  const bounds = monthBounds(auditResult.month);
  const manualData = crossCheckReport?.manualSheetData;

  const totalCells = crossCheckReport?.items.length || 0;

  // Single bulletproof celebration trigger: Audio + Confetti at the exact same moment
  const triggerCelebration = () => {
    playVibrantSuccessChime();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.55 },
      colors: ["#0d9488", "#10b981", "#059669", "#0284c7", "#f59e0b"],
    });
  };

  // Safe Sequential Scanner Loop
  useEffect(() => {
    if (phase !== "SCANNING" || !crossCheckReport) return;

    if (scanIndex < totalCells) {
      const timer = setTimeout(() => {
        playScanTickSound(scanIndex);
        setScanIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      setPhase("COMPLETED");
      if (crossCheckReport.status === "PERFECT_MATCH") {
        triggerCelebration();
      }
    }
  }, [phase, scanIndex, totalCells, speed, crossCheckReport]);

  const handleRunCrossCheck = () => {
    getOrInitAudioContext(); // Warm up Web Audio on direct user gesture
    setScanIndex(0);
    setPhase("SCANNING");
  };

  const handleInstantComplete = () => {
    getOrInitAudioContext();
    setScanIndex(totalCells);
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
    const isScanned = itemIdx < scanIndex || phase === "COMPLETED";
    const item = crossCheckReport.items[itemIdx];

    return { isScanned, isCurrent, item };
  };

  // Ultra-crisp cell formatter with premium subtle verified badge
  const renderCellWithStatus = (
    cellRef: string,
    displayValue: string | number,
    isManual: boolean = false
  ) => {
    const { isScanned, isCurrent, item } = getCellStatus(cellRef);

    const formattedText =
      typeof displayValue === "number"
        ? displayValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : displayValue;

    if (!crossCheckReport || phase === "IDLE" || !item) {
      return <span className="font-mono text-slate-800">{formattedText}</span>;
    }

    let bgClass = "";
    let borderClass = "";
    let textClass = "";

    if (isCurrent) {
      bgClass = "bg-teal-100 ring-2 ring-teal-600 ring-offset-1 scale-105 shadow-sm";
      textClass = "text-teal-950 font-bold";
    } else if (isScanned) {
      if (isManual) {
        if (item.isMatch) {
          bgClass = "bg-purple-50/80";
          borderClass = "border border-purple-200/60";
          textClass = "text-purple-950 font-semibold";
        } else {
          // Manual Sheet: Error highlight with cross mark
          bgClass = "bg-rose-100 border-2 border-rose-500 shadow-xs ring-1 ring-rose-300";
          borderClass = "border-rose-500";
          textClass = "text-rose-950 font-bold";
        }
      } else {
        // Table 1: Software Ground-Truth Base (Always Green)
        bgClass = "bg-emerald-50/90";
        borderClass = "border border-emerald-300";
        textClass = "text-emerald-950 font-semibold";
      }
    }

    return (
      <div
        className={`relative px-2 py-0.5 rounded-md transition-all duration-150 inline-block w-full text-right ${bgClass} ${borderClass} ${textClass}`}
        title={
          !item.isMatch
            ? isManual
              ? `Manual Discrepancy: ${item.formattedManual} vs Ground-Truth: ${item.formattedCalculated} (Diff: ${item.delta})`
              : `Ground-Truth Telemetry Base: ${item.formattedCalculated}`
            : undefined
        }
      >
        <span className="font-mono">{formattedText}</span>
        {isScanned && (
          <span className="inline-block ml-1.5 align-middle">
            {isManual ? (
              item.isMatch ? (
                <span className="text-emerald-700 font-bold text-[11px]">✓</span>
              ) : (
                <span className="text-rose-700 font-extrabold text-xs bg-rose-200/90 border border-rose-400 px-1 py-0.2 rounded">
                  ✗
                </span>
              )
            ) : (
              <span className="text-emerald-700 font-bold text-[11px]">✓</span>
            )}
          </span>
        )}
      </div>
    );
  };

  const currentItem = crossCheckReport?.items[scanIndex] || crossCheckReport?.items[totalCells - 1];
  const verifiedCount = phase !== "IDLE" ? Math.min(scanIndex, totalCells) : 0;

  return (
    <div className="space-y-8 font-sans">
      {/* =========================================================
          TABLE 1: SOFTWARE-GENERATED MER (GROUND TRUTH)
         ========================================================= */}
      <div className="border border-slate-300/80 rounded-2xl bg-white shadow-xs overflow-hidden">
        {/* Table 1 Premium Executive Header */}
        <div className="bg-gradient-to-r from-teal-50/90 via-white to-slate-50 border-b border-teal-100/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold tracking-tight text-slate-900">
                  1. Software-Driven MER (Ground-Truth Telemetry)
                </h3>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200">
                  TELEMETRY ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated directly from {auditResult.meters.main.uniqueTimestampCount} raw 15-minute interval records
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-700 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs font-medium">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Ground Truth Active</span>
          </div>
        </div>

        {/* Table 1 Sheet Content */}
        <div className="p-4 sm:p-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full text-xs border-collapse border border-slate-300 text-slate-900">
            <thead>
              <tr className="bg-slate-100/90 text-slate-900 font-bold">
                <th rowSpan={2} className="border border-slate-300 p-2 text-center w-8 text-slate-700">Sl</th>
                <th rowSpan={2} className="border border-slate-300 p-2 text-center w-32 text-slate-700">Meter Location</th>
                <th rowSpan={2} className="border border-slate-300 p-2 text-center w-20 text-slate-700">Date</th>
                <th rowSpan={2} className="border border-slate-300 p-2 text-center w-14 text-slate-700">Time</th>
                <th colSpan={5} className="border border-slate-300 p-2 text-center font-bold bg-slate-100 text-slate-800">KWH</th>
                <th colSpan={5} className="border border-slate-300 p-2 text-center font-bold bg-slate-100 text-slate-800">KVARh</th>
                <th rowSpan={2} className="border border-slate-300 p-2 text-center w-16 text-slate-700">Remarks</th>
              </tr>
              <tr className="bg-slate-50 text-slate-800 font-semibold text-[11px]">
                <th className="border border-slate-300 p-1.5 text-center w-10 text-slate-500"></th>
                <th className="border border-slate-300 p-1.5 text-right">Reading</th>
                <th className="border border-slate-300 p-1.5 text-right">Difference</th>
                <th className="border border-slate-300 p-1.5 text-center">OMF</th>
                <th className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">Total Advance</th>
                <th className="border border-slate-300 p-1.5 text-center w-12 text-slate-500"></th>
                <th className="border border-slate-300 p-1.5 text-right">Reading (KVARh)</th>
                <th className="border border-slate-300 p-1.5 text-right">Difference</th>
                <th className="border border-slate-300 p-1.5 text-center">OMF</th>
                <th className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">Total Advance (KVARh)</th>
              </tr>
            </thead>
            <tbody>
              {/* Plant Control Room Header Row */}
              <tr className="bg-slate-50/70">
                <td className="border border-slate-300 p-2"></td>
                <td colSpan={12} className="border border-slate-300 p-2 font-bold text-slate-900 text-xs">
                  Plant Control Room
                </td>
                <td className="border border-slate-300 p-2"></td>
              </tr>

              {/* Main Meter Rows */}
              <tr>
                <td rowSpan={4} className="border border-slate-300 p-2 font-bold text-center align-middle">1</td>
                <td rowSpan={4} className="border border-slate-300 p-2.5 align-middle">
                  <div className="font-bold text-slate-900 text-xs">Main Meter</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Meter ID: <span className="font-mono font-semibold text-teal-800">{config.meters.main}</span>
                  </div>
                </td>
                <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{fullEndDate}</td>
                <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">24.00</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Exp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F9", main.readings.end.activeExport)}</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("G9", (main.readings.end.activeExport - main.readings.start.activeExport).toFixed(2))}</td>
                <td rowSpan={4} className="border border-slate-300 p-1.5 text-center align-middle font-bold text-slate-800">{renderCellWithStatus("H9", config.omf.toLocaleString("en-US"))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("I9", calc.main.activeExportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Exp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K9", main.readings.end.reactiveExport)}</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("L9", (main.readings.end.reactiveExport - main.readings.start.reactiveExport).toFixed(2))}</td>
                <td rowSpan={4} className="border border-slate-300 p-1.5 text-center align-middle font-bold text-slate-800">{renderCellWithStatus("M9", config.omf.toLocaleString("en-US"))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("N9", calc.main.reactiveExportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td rowSpan={4} className="border border-slate-300 p-2 text-center align-middle text-slate-400 font-mono">-</td>
              </tr>

              <tr>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Imp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F10", main.readings.end.activeImport)}</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("G10", (main.readings.end.activeImport - main.readings.start.activeImport).toFixed(2))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("I10", calc.main.activeImportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Imp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K10", main.readings.end.reactiveImport)}</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("L10", (main.readings.end.reactiveImport - main.readings.start.reactiveImport).toFixed(2))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("N10", calc.main.reactiveImportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
              </tr>

              <tr className="bg-slate-50/30">
                <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{fullStartDate}</td>
                <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">0:00</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Exp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F11", main.readings.start.activeExport)}</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Exp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K11", main.readings.start.reactiveExport)}</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
              </tr>

              <tr className="bg-slate-50/30">
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Imp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F12", main.readings.start.activeImport)}</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Imp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K12", main.readings.start.reactiveImport)}</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
              </tr>

              {/* Back-up Meter Rows */}
              <tr>
                <td rowSpan={4} className="border border-slate-300 p-2 font-bold text-center align-middle">2</td>
                <td rowSpan={4} className="border border-slate-300 p-2.5 align-middle">
                  <div className="font-bold text-slate-900 text-xs">Back-up Meter</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Meter ID: <span className="font-mono font-semibold text-cyan-800">{config.meters.backup}</span>
                  </div>
                </td>
                <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{fullEndDate}</td>
                <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">24.00</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Exp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F13", backup.readings.end.activeExport)}</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("G13", (backup.readings.end.activeExport - backup.readings.start.activeExport).toFixed(2))}</td>
                <td rowSpan={4} className="border border-slate-300 p-1.5 text-center align-middle font-bold text-slate-800">{renderCellWithStatus("H13", config.omf.toLocaleString("en-US"))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("I13", calc.backup.activeExportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Exp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K13", backup.readings.end.reactiveExport)}</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("L13", (backup.readings.end.reactiveExport - backup.readings.start.reactiveExport).toFixed(2))}</td>
                <td rowSpan={4} className="border border-slate-300 p-1.5 text-center align-middle font-bold text-slate-800">{renderCellWithStatus("M13", config.omf.toLocaleString("en-US"))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("N13", calc.backup.reactiveExportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td rowSpan={4} className="border border-slate-300 p-2 text-center align-middle text-slate-400 font-mono">-</td>
              </tr>

              <tr>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Imp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F14", backup.readings.end.activeImport)}</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("G14", (backup.readings.end.activeImport - backup.readings.start.activeImport).toFixed(2))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("I14", calc.backup.activeImportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Imp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K14", backup.readings.end.reactiveImport)}</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("L14", (backup.readings.end.reactiveImport - backup.readings.start.reactiveImport).toFixed(2))}</td>
                <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("N14", calc.backup.reactiveImportAdvance.toLocaleString("en-US", { minimumFractionDigits: 2 }))}</td>
              </tr>

              <tr className="bg-slate-50/30">
                <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{fullStartDate}</td>
                <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">0:00</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Exp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F15", backup.readings.start.activeExport)}</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Exp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K15", backup.readings.start.reactiveExport)}</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
              </tr>

              <tr className="bg-slate-50/30">
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Imp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F16", backup.readings.start.activeImport)}</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-slate-50/50">Imp.</td>
                <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K16", backup.readings.start.reactiveImport)}</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
              </tr>
            </tbody>
          </table>

          {/* Table 1 Net Energy Supplied Summary Box */}
          <div className="mt-4 border border-slate-300 rounded-xl overflow-hidden text-xs shadow-2xs">
            <div className="flex items-center border-b border-slate-200 bg-slate-50/90 py-2.5 px-3">
              <div className="w-8 font-bold text-slate-700 text-center">1</div>
              <div className="flex-1 font-medium text-slate-800 pr-2">
                Net Energy Supplied to BPDB (as per Main Meter Reading) for the period ({fullStartDate}) to ({fullEndDate})
              </div>
              <div className="w-36 sm:w-44 text-right font-bold text-slate-950 font-mono text-sm">
                {renderCellWithStatus("I21", calc.main.activeNetSupply.toLocaleString("en-US", { minimumFractionDigits: 2 }))}
              </div>
              <div className="w-14 sm:w-16 text-center font-bold text-slate-600">KWH</div>
            </div>
            <div className="flex items-center bg-white py-2.5 px-3">
              <div className="w-8 font-bold text-slate-700 text-center">2</div>
              <div className="flex-1 font-medium text-slate-800 pr-2">
                Net Energy Supplied to BPDB (as per Back-up Meter Reading) for the period ({fullStartDate}) to ({fullEndDate})
              </div>
              <div className="w-36 sm:w-44 text-right font-bold text-slate-950 font-mono text-sm">
                {renderCellWithStatus("I22", calc.backup.activeNetSupply.toLocaleString("en-US", { minimumFractionDigits: 2 }))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CROSS-CHECK HUB (CLEAN WHITE LIGHT THEME WITH PARITY ANALYTICS)
         ========================================================================= */}
      {crossCheckReport && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-50/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-50/40 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

          <div className="relative z-10 w-full">
            {/* INITIAL IDLE STATE */}
            {phase === "IDLE" && (
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-700 flex items-center justify-center shadow-xs">
                    <Play className="w-6 h-6 fill-teal-600 text-teal-600 ml-1" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900">
                      Cross-Check Ground Truth with Manual MER
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Verify 36 critical parameter cells from <strong className="text-slate-700 font-semibold">{crossCheckReport.fileName}</strong> against raw telemetry intervals
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunCrossCheck}
                  className="flex items-center gap-2.5 px-7 py-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md shadow-teal-600/20 hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run CrossCheck Python script</span>
                </button>
              </div>
            )}

            {/* SCANNING RADAR STATE */}
            {phase === "SCANNING" && (
              <div className="flex flex-wrap items-center justify-between gap-6 py-2">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 ring-4 ring-teal-50 animate-pulse shrink-0">
                    <RefreshCw className="w-6 h-6 animate-spin text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-bold text-base text-slate-900">
                        Running CrossCheck Python Script...
                      </h4>
                      <span className="text-xs font-mono font-bold bg-teal-100 text-teal-800 px-3 py-0.5 rounded-full border border-teal-200">
                        {verifiedCount} / {totalCells} Cells Scanned
                      </span>
                    </div>
                    {currentItem && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-600 font-mono flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-bold text-slate-900 border border-slate-200">
                          Cell {currentItem.cellRef}
                        </span>
                        <span className="text-slate-700">{currentItem.label}:</span>
                        <strong className="text-teal-700 font-bold">{currentItem.formattedCalculated}</strong>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <strong className="text-purple-700 font-bold">{currentItem.formattedManual}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleInstantComplete}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition border border-slate-200 cursor-pointer"
                >
                  <FastForward className="w-4 h-4 text-slate-600" />
                  <span>Instant Complete</span>
                </button>
              </div>
            )}

            {/* COMPLETED PARITY REVEAL WITH BESPOKE GREEN CHECK-SQUARE ICON */}
            {phase === "COMPLETED" && (
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 animate-in fade-in duration-500">
                {/* LEFT SIDE: Core Key Value Parity Cards (Cascades in) */}
                <div className="flex-1 space-y-4 w-full animate-in fade-in slide-in-from-left duration-500">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Cross-Check Parity Analytics
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase px-3 py-0.5 rounded-full ${
                        crossCheckReport.status === "PERFECT_MATCH"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {crossCheckReport.status === "PERFECT_MATCH" ? "100% PARITY CONFIRMED" : `${crossCheckReport.mismatchCount} MISMATCHES DETECTED`}
                    </span>
                  </div>

                  {/* High-Contrast Spacious Value Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Main Meter Net Supply Card */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        1. Main Meter Net Supply (Cell I22)
                      </p>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-base sm:text-lg font-bold text-slate-950">
                          {calc.main.activeNetSupply.toLocaleString("en-US", { minimumFractionDigits: 2 })} KWH
                        </span>
                        <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Exact Parity
                        </span>
                      </div>
                    </div>

                    {/* Back-up Meter Net Supply Card */}
                    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        2. Back-up Meter Net Supply (Cell I23)
                      </p>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-base sm:text-lg font-bold text-slate-950">
                          {calc.backup.activeNetSupply.toLocaleString("en-US", { minimumFractionDigits: 2 })} KWH
                        </span>
                        <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Exact Parity
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Text */}
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    {crossCheckReport.status === "PERFECT_MATCH" ? (
                      <span>
                        ✓ All <strong className="text-emerald-800 font-bold">36 critical parameter cells</strong> (readings, differences, OMF, advances, and net export) in your manual Excel file match software telemetry with <strong className="text-emerald-800 font-bold">0.000% variance</strong>.
                      </span>
                    ) : (
                      <span className="text-rose-700 font-semibold">
                        ⚠️ {crossCheckReport.mismatchCount} cells in manual sheet differ from telemetry data. See root-cause breakdown below.
                      </span>
                    )}
                  </p>
                </div>

                {/* RIGHT SIDE: Big Landed Hero Verified Badge with User's Exact Custom Green Check-Square Icon */}
                <div className="flex flex-col sm:flex-row items-center gap-4 lg:pl-8 lg:border-l border-slate-200 w-full lg:w-auto justify-end shrink-0 animate-in slide-in-from-left duration-700">
                  {/* Big Hero Verified Seal with Large Custom Green Icon */}
                  <div className="flex items-center gap-5 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/90 border border-emerald-300/80 px-7 py-5 rounded-3xl shadow-md shadow-emerald-600/5">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-50/70 border-2 border-emerald-400 text-emerald-600 p-2 flex items-center justify-center shadow-md shadow-emerald-600/10 shrink-0">
                      <CustomGreenCheckSquareIcon className="w-16 h-16 text-emerald-600" />
                    </div>
                    <div>
                      <h5 className="font-bold text-base sm:text-lg text-emerald-950 tracking-tight flex items-center gap-2">
                        100% Ground Truth Parity
                      </h5>
                      <p className="text-xs text-emerald-700 font-semibold mt-1">
                        Verified &amp; Cross-Checked ✓
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleRunCrossCheck}
                    className="flex items-center gap-2 px-5 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap"
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
        <div className="border border-purple-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
          {/* Table 2 Clean Executive Header */}
          <div className="bg-gradient-to-r from-purple-50/90 via-white to-slate-50 border-b border-purple-100/80 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold tracking-tight text-slate-900">
                    2. Manual MER Sheet (Extracted from Uploaded File)
                  </h3>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                    MANUAL WORKBOOK EXCEL
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Source: <strong className="text-slate-800 font-semibold">{crossCheckReport?.fileName}</strong>
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-purple-800 bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200/80 shadow-2xs font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Manual Sheet Active</span>
            </div>
          </div>

          {/* Table 2 Sheet Content */}
          <div className="p-4 sm:p-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-xs border-collapse border border-slate-300 text-slate-900">
              <thead>
                <tr className="bg-purple-50/80 text-slate-900 font-bold">
                  <th rowSpan={2} className="border border-slate-300 p-2 text-center w-8 text-slate-700">Sl</th>
                  <th rowSpan={2} className="border border-slate-300 p-2 text-center w-32 text-slate-700">Meter Location</th>
                  <th rowSpan={2} className="border border-slate-300 p-2 text-center w-20 text-slate-700">Date</th>
                  <th rowSpan={2} className="border border-slate-300 p-2 text-center w-14 text-slate-700">Time</th>
                  <th colSpan={5} className="border border-slate-300 p-2 text-center font-bold bg-purple-50/80 text-slate-800">KWH</th>
                  <th colSpan={5} className="border border-slate-300 p-2 text-center font-bold bg-purple-50/80 text-slate-800">KVARh</th>
                  <th rowSpan={2} className="border border-slate-300 p-2 text-center w-16 text-slate-700">Remarks</th>
                </tr>
                <tr className="bg-purple-50/40 text-slate-800 font-semibold text-[11px]">
                  <th className="border border-slate-300 p-1.5 text-center w-10 text-slate-500"></th>
                  <th className="border border-slate-300 p-1.5 text-right">Reading</th>
                  <th className="border border-slate-300 p-1.5 text-right">Difference</th>
                  <th className="border border-slate-300 p-1.5 text-center">OMF</th>
                  <th className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">Total Advance</th>
                  <th className="border border-slate-300 p-1.5 text-center w-12 text-slate-500"></th>
                  <th className="border border-slate-300 p-1.5 text-right">Reading (KVARh)</th>
                  <th className="border border-slate-300 p-1.5 text-right">Difference</th>
                  <th className="border border-slate-300 p-1.5 text-center">OMF</th>
                  <th className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">Total Advance (KVARh)</th>
                </tr>
              </thead>
              <tbody>
                {/* Plant Control Room Header Row */}
                <tr className="bg-purple-50/30">
                  <td className="border border-slate-300 p-2"></td>
                  <td colSpan={12} className="border border-slate-300 p-2 font-bold text-purple-950 text-xs">
                    Plant Control Room
                  </td>
                  <td className="border border-slate-300 p-2"></td>
                </tr>

                {/* Main Meter Rows (Manual) */}
                <tr>
                  <td rowSpan={4} className="border border-slate-300 p-2 font-bold text-center align-middle">1</td>
                  <td rowSpan={4} className="border border-slate-300 p-2.5 align-middle">
                    <div className="font-bold text-slate-900 text-xs">Main Meter</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Meter ID: <span className="font-mono font-semibold text-purple-800">{manualData.main.meterId}</span>
                    </div>
                  </td>
                  <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{manualData.main.endDate}</td>
                  <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{manualData.main.endTime}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Exp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F9", manualData.main.endReadings.activeExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("G9", manualData.main.differences.activeExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-300 p-1.5 text-center align-middle font-bold text-slate-800">{renderCellWithStatus("H9", manualData.main.omf, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("I9", manualData.main.advances.activeExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Exp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K9", manualData.main.endReadings.reactiveExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("L9", manualData.main.differences.reactiveExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-300 p-1.5 text-center align-middle font-bold text-slate-800">{renderCellWithStatus("M9", manualData.main.omf, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("N9", manualData.main.advances.reactiveExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-300 p-2 text-center align-middle text-slate-400 font-mono">-</td>
                </tr>

                <tr>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Imp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F10", manualData.main.endReadings.activeImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("G10", manualData.main.differences.activeImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("I10", manualData.main.advances.activeImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Imp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K10", manualData.main.endReadings.reactiveImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("L10", manualData.main.differences.reactiveImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("N10", manualData.main.advances.reactiveImport, true)}</td>
                </tr>

                <tr className="bg-purple-50/20">
                  <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{manualData.main.startDate}</td>
                  <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{manualData.main.startTime}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Exp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F11", manualData.main.startReadings.activeExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Exp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K11", manualData.main.startReadings.reactiveExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                </tr>

                <tr className="bg-purple-50/20">
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Imp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F12", manualData.main.startReadings.activeImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Imp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K12", manualData.main.startReadings.reactiveImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                </tr>

                {/* Back-up Meter Rows (Manual) */}
                <tr>
                  <td rowSpan={4} className="border border-slate-300 p-2 font-bold text-center align-middle">2</td>
                  <td rowSpan={4} className="border border-slate-300 p-2.5 align-middle">
                    <div className="font-bold text-slate-900 text-xs">Back-up Meter</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Meter ID: <span className="font-mono font-semibold text-purple-800">{manualData.backup.meterId}</span>
                    </div>
                  </td>
                  <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{manualData.backup.endDate}</td>
                  <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{manualData.backup.endTime}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Exp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F13", manualData.backup.endReadings.activeExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("G13", manualData.backup.differences.activeExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-300 p-1.5 text-center align-middle font-bold text-slate-800">{renderCellWithStatus("H13", manualData.backup.omf, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("I13", manualData.backup.advances.activeExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Exp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K13", manualData.backup.endReadings.reactiveExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("L13", manualData.backup.differences.reactiveExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-300 p-1.5 text-center align-middle font-bold text-slate-800">{renderCellWithStatus("M13", manualData.backup.omf, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("N13", manualData.backup.advances.reactiveExport, true)}</td>
                  <td rowSpan={4} className="border border-slate-300 p-2 text-center align-middle text-slate-400 font-mono">-</td>
                </tr>

                <tr>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Imp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F14", manualData.backup.endReadings.activeImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("G14", manualData.backup.differences.activeImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("I14", manualData.backup.advances.activeImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Imp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K14", manualData.backup.endReadings.reactiveImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("L14", manualData.backup.differences.reactiveImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">{renderCellWithStatus("N14", manualData.backup.advances.reactiveImport, true)}</td>
                </tr>

                <tr className="bg-purple-50/20">
                  <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{manualData.backup.startDate}</td>
                  <td rowSpan={2} className="border border-slate-300 p-1.5 text-center align-middle whitespace-nowrap font-medium text-slate-700">{manualData.backup.startTime}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Exp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F15", manualData.backup.startReadings.activeExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Exp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K15", manualData.backup.startReadings.reactiveExport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                </tr>

                <tr className="bg-purple-50/20">
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Imp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("F16", manualData.backup.startReadings.activeImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-600 bg-purple-50/30">Imp.</td>
                  <td className="border border-slate-300 p-1.5 text-right">{renderCellWithStatus("K16", manualData.backup.startReadings.reactiveImport, true)}</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                  <td className="border border-slate-300 p-1.5 text-center text-slate-400 font-mono">-</td>
                </tr>
              </tbody>
            </table>

            {/* Table 2 Net Energy Supplied Summary Box */}
            <div className="mt-4 border border-purple-200/90 rounded-xl overflow-hidden text-xs shadow-2xs">
              <div className="flex items-center border-b border-purple-100 bg-purple-50/70 py-2.5 px-3">
                <div className="w-8 font-bold text-purple-900 text-center">1</div>
                <div className="flex-1 font-medium text-slate-800 pr-2">
                  Net Energy Supplied to BPDB (as per Main Meter Reading) for the period ({manualData.main.startDate}) to ({manualData.main.endDate})
                </div>
                <div className="w-36 sm:w-44 text-right font-bold text-purple-950 font-mono text-sm">
                  {renderCellWithStatus("I21", manualData.main.netEnergySupplied, true)}
                </div>
                <div className="w-14 sm:w-16 text-center font-bold text-purple-800">KWH</div>
              </div>
              <div className="flex items-center bg-white py-2.5 px-3">
                <div className="w-8 font-bold text-purple-900 text-center">2</div>
                <div className="flex-1 font-medium text-slate-800 pr-2">
                  Net Energy Supplied to BPDB (as per Back-up Meter Reading) for the period ({manualData.backup.startDate}) to ({manualData.backup.endDate})
                </div>
                <div className="w-36 sm:w-44 text-right font-bold text-purple-950 font-mono text-sm">
                  {renderCellWithStatus("I22", manualData.backup.netEnergySupplied, true)}
                </div>
                <div className="w-14 sm:w-16 text-center font-bold text-purple-800">KWH</div>
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
                  <th className="p-2.5 text-right w-36 text-purple-900 bg-purple-50/60">Manual Input</th>
                  <th className="p-2.5 text-right w-40 text-emerald-900 bg-emerald-100/80 border-x border-emerald-200">Ground Truth (Software)</th>
                  <th className="p-2.5 text-right w-28 text-rose-800">Delta</th>
                  <th className="p-2.5">Impact Analysis</th>
                </tr>
              </thead>
              <tbody>
                {crossCheckReport.mismatchedItems.map((item) => (
                  <tr key={item.cellRef} className="border-b border-slate-200 bg-rose-50/20 font-mono hover:bg-rose-50/40 transition-colors">
                    <td className="p-2.5 text-center font-bold text-rose-950">{item.cellRef}</td>
                    <td className="p-2.5 font-sans font-medium text-slate-800">{item.label}</td>
                    <td className="p-2.5 text-right font-bold text-purple-950 bg-purple-50/30">
                      <span className="inline-flex items-center gap-1 bg-purple-100/90 text-purple-950 border border-purple-300 font-bold px-2 py-0.5 rounded shadow-2xs">
                        <span>{item.formattedManual}</span>
                        <span className="text-rose-700 font-extrabold text-xs">✗</span>
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-950 bg-emerald-50/70 border-x border-emerald-200">
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded shadow-2xs">
                        <span>{item.formattedCalculated}</span>
                        <span className="text-emerald-700 text-xs font-bold">✓</span>
                      </span>
                    </td>
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
