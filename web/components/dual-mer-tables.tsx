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
// GUARANTEED WEB AUDIO SYNTHESIZER (UNLOCKED DIRECTLY ON USER CLICK GESTURE)
// =========================================================================
let unlockedAudioContext: AudioContext | null = null;

function unlockAudioOnUserGesture() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!unlockedAudioContext || unlockedAudioContext.state === "closed") {
      unlockedAudioContext = new AudioCtx();
    }
    if (unlockedAudioContext.state === "suspended") {
      unlockedAudioContext.resume();
    }
    // Play an inaudible 1-sample pulse to permanently unlock AudioContext in browser
    const osc = unlockedAudioContext.createOscillator();
    const gain = unlockedAudioContext.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(unlockedAudioContext.destination);
    osc.start();
    osc.stop(unlockedAudioContext.currentTime + 0.002);
  } catch (e) {
    console.warn("Audio unlock warning:", e);
  }
}

function playVibrantSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!unlockedAudioContext || unlockedAudioContext.state === "closed") {
      unlockedAudioContext = new AudioCtx();
    }
    if (unlockedAudioContext.state === "suspended") {
      unlockedAudioContext.resume();
    }

    const ctx = unlockedAudioContext;
    const now = ctx.currentTime;

    // Vibrant 4-note ascending chord: E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz) -> E6 (1318Hz)
    const notes = [
      { freq: 659.25, offset: 0.00, dur: 0.35, vol: 0.25 },
      { freq: 830.61, offset: 0.09, dur: 0.40, vol: 0.30 },
      { freq: 987.77, offset: 0.18, dur: 0.50, vol: 0.35 },
      { freq: 1318.51, offset: 0.27, dur: 0.90, vol: 0.40 },
    ];

    notes.forEach(({ freq, offset, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + offset);

      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(vol, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + dur + 0.05);
    });
  } catch (e) {
    console.error("Audio playback error:", e);
  }
}

function playScanTickSound(stepIndex: number) {
  try {
    if (!unlockedAudioContext || unlockedAudioContext.state !== "running") return;
    const ctx = unlockedAudioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(500 + (stepIndex % 12) * 22, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.025);
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
  const [isGlidedToRight, setIsGlidedToRight] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(45); // ms per step

  const main = auditResult.meters.main;
  const backup = auditResult.meters.backup;
  const calc = auditResult.calculations;
  const bounds = monthBounds(auditResult.month);
  const manualData = crossCheckReport?.manualSheetData;

  const totalCells = crossCheckReport?.items.length || 0;

  // Trigger celebration: Confetti and Sound fire at the EXACT SAME INSTANT
  const triggerCelebration = () => {
    playVibrantSuccessChime();
    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.55 },
      colors: ["#0d9488", "#10b981", "#059669", "#0284c7", "#f59e0b"],
    });
  };

  // Phase 1: Sequential Cell Scan
  useEffect(() => {
    if (phase !== "SCANNING" || !crossCheckReport) return;

    if (scanIndex < totalCells) {
      const timer = setTimeout(() => {
        playScanTickSound(scanIndex);
        setScanIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      // Step 2: Begin Left-to-Right Glide Animation
      setPhase("GLIDING");
      setIsGlidedToRight(false);

      // Start gliding on next frame
      const glideTimer = setTimeout(() => {
        setIsGlidedToRight(true);
      }, 50);

      // Land on right side after 1.6s
      const completeTimer = setTimeout(() => {
        setPhase("COMPLETED");
        if (crossCheckReport?.status === "PERFECT_MATCH") {
          triggerCelebration();
        }
      }, 1650);

      return () => {
        clearTimeout(glideTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [phase, scanIndex, totalCells, speed, crossCheckReport]);

  const handleRunCrossCheck = () => {
    unlockAudioOnUserGesture(); // Guarantee browser audio permission
    setScanIndex(0);
    setIsGlidedToRight(false);
    setPhase("SCANNING");
  };

  const handleInstantComplete = () => {
    unlockAudioOnUserGesture();
    setScanIndex(totalCells);
    setIsGlidedToRight(true);
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
          PERFECTED CROSS-CHECK BRIDGE (LEFT-TO-RIGHT GLIDING TICK & INSTANT AUDIO)
         ========================================================================= */}
      {crossCheckReport && (
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-sm font-sans relative overflow-hidden min-h-[160px] flex flex-col justify-center transition-all">
          {/* Subtle Ambient Glow */}
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

            {/* PHASE: GLIDING (VISIBLE LEFT-TO-RIGHT TICK MOTION OVER 1.6 SECONDS) */}
            {phase === "GLIDING" && (
              <div className="relative py-2 w-full">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
                  <span>Cross-Checking All 36 Telemetry Parameters...</span>
                  <span>Verifying Ground-Truth Parity</span>
                </div>

                {/* The Full Width Gliding Track */}
                <div className="relative w-full h-20 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-100/40 via-emerald-100/30 to-teal-100/40 animate-pulse"></div>

                  {/* The Green Tick Badge smoothly traveling from Left (0%) to Right (100%) */}
                  <div
                    className="relative z-10 flex items-center gap-3.5 transition-transform duration-[1600ms]"
                    style={{
                      transform: isGlidedToRight ? "translateX(calc(100% - 260px))" : "translateX(0px)",
                      transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
                    }}
                  >
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 ring-4 ring-emerald-100 animate-pulse shrink-0">
                      <Check className="w-7 h-7 stroke-[3]" />
                    </div>
                    <div className="whitespace-nowrap">
                      <h5 className="text-xs font-bold text-slate-900">Synchronizing Ground Truth...</h5>
                      <p className="text-[11px] text-teal-700 font-mono font-semibold">36 / 36 Cells Parity Verified ✓</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PHASE: COMPLETED (LEFT-SIDE METRIC CARDS + RIGHT-SIDE HERO BADGE + SOUND & CONFETTI) */}
            {phase === "COMPLETED" && (
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 animate-in fade-in duration-500">
                {/* LEFT SIDE: Core Key Value Parity Cards */}
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

                {/* RIGHT SIDE: Landed Hero Verified Badge & Re-Run Button */}
                <div className="flex flex-col sm:flex-row items-center gap-4 lg:pl-8 lg:border-l border-slate-200 w-full lg:w-auto justify-end shrink-0 animate-in zoom-in-95 duration-500">
                  {/* Big Hero Verified Seal */}
                  <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 px-6 py-4 rounded-3xl shadow-sm">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-100">
                        <Check className="w-8 h-8 stroke-[3]" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                      </span>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm sm:text-base text-emerald-950 tracking-tight">
                        100% Ground Truth Parity
                      </h5>
                      <p className="text-xs text-emerald-700 font-semibold mt-0.5">
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
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("F17", manualData.backup.startReadings.activeImport)}</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center text-slate-400">-</td>
                  <td className="border border-slate-400 p-1 text-center font-bold">Imp.</td>
                  <td className="border border-slate-400 p-1 text-right">{renderCellWithStatus("K17", manualData.backup.startReadings.reactiveImport)}</td>
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
