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
  Layers,
  FileSpreadsheet,
  Table as TableIcon,
  Search,
  Check,
  X,
  Zap,
  Info,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  ManualMerCrossCheckReport,
  CellVerificationItem,
} from "../lib/manual-mer-comparator";

interface MerCrossCheckModalProps {
  report: ManualMerCrossCheckReport;
  isOpen: boolean;
  onClose: () => void;
}

export function MerCrossCheckModal({ report, isOpen, onClose }: MerCrossCheckModalProps) {
  const [activeTab, setActiveTab] = useState<"scanner" | "dualsheet" | "analytics">("scanner");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scanSpeed, setScanSpeed] = useState<number>(120); // ms per cell
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedCell, setSelectedCell] = useState<CellVerificationItem | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger celebration on complete 100% match
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#10b981", "#059669", "#047857", "#34d399", "#fbbf24"],
    });
  };

  // Automated Sequential Scanner
  useEffect(() => {
    if (!isOpen) return;

    if (isScanning && currentIndex < report.items.length) {
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= report.items.length) {
            setIsScanning(false);
            if (report.status === "PERFECT_MATCH") {
              triggerConfetti();
            }
          }
          return next;
        });
      }, scanSpeed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, isScanning, currentIndex, scanSpeed, report.items.length, report.status]);

  if (!isOpen) return null;

  const currentItem = report.items[currentIndex] || report.items[report.items.length - 1];
  const scanProgress = report.items.length > 0 ? Math.min(100, Math.round((currentIndex / report.items.length) * 100)) : 100;
  const isScanComplete = currentIndex >= report.items.length;

  const handleRestartScan = () => {
    setCurrentIndex(0);
    setIsScanning(true);
  };

  const handleSkipToEnd = () => {
    setCurrentIndex(report.items.length);
    setIsScanning(false);
    if (report.status === "PERFECT_MATCH") {
      triggerConfetti();
    }
  };

  // Filtered items for Analytics
  const filteredItems = report.items.filter((item) => {
    const matchesSearch =
      item.cellRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.formattedManual.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.formattedCalculated.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "mismatch" && !item.isMatch) ||
      (categoryFilter === "main" && item.category === "Main Meter") ||
      (categoryFilter === "backup" && item.category === "Back-up Meter") ||
      (categoryFilter === "summary" && item.category === "Summary");

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-2 text-slate-950 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  Manual MER vs Ground-Truth Cross-Check
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    report.status === "PERFECT_MATCH"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  {report.status === "PERFECT_MATCH" ? "100% MATCH" : `${report.mismatchCount} DISCREPANCY`}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>File: <strong className="text-slate-200">{report.fileName}</strong></span>
                <span>•</span>
                <span>Checked: <strong className="text-teal-300">{report.totalChecked} Cells</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "scanner"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              Live Laser Scanner
            </button>
            <button
              onClick={() => setActiveTab("dualsheet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "dualsheet"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              Dual-Sheet Grid Inspection
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "analytics"
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-teal-600" />
              Discrepancy Analytics ({report.mismatchCount})
            </button>
          </div>

          {/* Overall Match Metrics Pill */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-emerald-800 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{report.matchCount} Matched</span>
            </div>
            {report.mismatchCount > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg text-rose-800 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{report.mismatchCount} Mismatch</span>
              </div>
            )}
            <div className="text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Parity: <span className={report.matchPercentage === 100 ? "text-emerald-700" : "text-amber-700"}>{report.matchPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: High-Tech Live Scanner */}
          {activeTab === "scanner" && (
            <div className="space-y-6">
              {/* Top Scanner Progress & Controls */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-cyan-500/10 pointer-events-none" />

                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
                      <Zap className={`w-5 h-5 ${isScanning ? "animate-bounce text-emerald-400" : "text-teal-400"}`} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                        {isScanComplete ? "Verification Scan Complete" : "Sequential Cell-by-Cell Laser Cross-Check"}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Extracting cell coordinates from manual Excel sheet and matching against ground-truth interval telemetry
                      </p>
                    </div>
                  </div>

                  {/* Scanner controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRestartScan}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-Scan
                    </button>
                    {!isScanComplete && (
                      <button
                        onClick={handleSkipToEnd}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition shadow"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                        Skip to End
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      Progress: {currentIndex} / {report.items.length} Cells
                    </span>
                    <span className="text-teal-400 font-bold">{scanProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-teal-500 via-emerald-400 to-emerald-300 h-full rounded-full transition-all duration-150"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>

                {/* Live Current Cell Ticker */}
                {currentItem && (
                  <div className="mt-5 p-4 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-4 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/40">
                        Cell {currentItem.cellRef}
                      </span>
                      <span className="text-xs text-slate-300 font-sans font-medium">
                        {currentItem.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase mr-1.5">Manual:</span>
                        <strong className="text-slate-100">{currentItem.formattedManual}</strong>
                      </div>
                      <div className="text-slate-500">↔</div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase mr-1.5">Computed:</span>
                        <strong className="text-teal-300">{currentItem.formattedCalculated}</strong>
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          currentItem.isMatch
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        }`}
                      >
                        {currentItem.isMatch ? "MATCH ✓" : "MISMATCH ✗"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Certificate Banner on 100% Match */}
              {isScanComplete && report.status === "PERFECT_MATCH" && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-2xl p-6 text-center shadow-lg animate-in zoom-in-95 duration-300">
                  <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-600/30">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-950 mb-1">
                    100% Match: Verified Ground-Truth Parity!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800 max-w-xl mx-auto">
                    Every single cell in your manual MER Excel workbook (<strong>{report.fileName}</strong>) perfectly matches the software's exact calculations from raw interval telemetry. Zero discrepancies detected.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">
                    <CheckCircle2 className="w-4 h-4" />
                    Official Verification Passed • Ready for Joint Committee Signing
                  </div>
                </div>
              )}

              {/* Mismatch Warning Alert if Discrepancy Found */}
              {isScanComplete && report.status !== "PERFECT_MATCH" && (
                <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-6 shadow-lg animate-in zoom-in-95 duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-rose-950 mb-1">
                        Discrepancy Detected in {report.mismatchCount} Cell(s)
                      </h4>
                      <p className="text-xs text-rose-800">
                        The values entered in your manual spreadsheet differ from the ground-truth calculations extracted from the meter telemetry files. See the <strong>Discrepancy Analytics</strong> tab for cell coordinates and root cause explanations.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("analytics")}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                      View Discrepancy Details →
                    </button>
                  </div>
                </div>
              )}

              {/* Cell Matrix Visual Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                  Excel Verification Grid (Cell-by-Cell Status)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {report.items.map((item, idx) => {
                    const isPassed = idx < currentIndex;
                    const isCurrent = idx === currentIndex && isScanning;

                    return (
                      <div
                        key={item.cellRef}
                        onClick={() => setSelectedCell(item)}
                        className={`cursor-pointer border rounded-xl p-2.5 transition text-left flex flex-col justify-between min-h-[70px] ${
                          isCurrent
                            ? "border-teal-500 bg-teal-50 shadow-md scale-105 ring-2 ring-teal-400 ring-offset-1"
                            : isPassed
                            ? item.isMatch
                              ? "border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/60"
                              : "border-rose-300 bg-rose-50/80 hover:bg-rose-100"
                            : "border-slate-200 bg-slate-50/50 opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <strong className={isPassed ? (item.isMatch ? "text-emerald-800" : "text-rose-800") : "text-slate-600"}>
                            {item.cellRef}
                          </strong>
                          {isPassed ? (
                            item.isMatch ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-rose-600 font-bold" />
                            )
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-600 truncate font-sans mt-1" title={item.label}>
                          {item.label}
                        </span>
                        <div className="text-[11px] font-mono font-bold mt-1 text-slate-800 truncate">
                          {item.formattedCalculated}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Side-by-Side Dual Sheet Inspection */}
          {activeTab === "dualsheet" && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>
                    Comparing your <strong>Manual MER Spreadsheet</strong> (Left) directly with the <strong>Software Ground-Truth Calculation</strong> (Right).
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Matched Ground Truth
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Discrepancy Found
                  </span>
                </div>
              </div>

              {/* Side-by-side Table Comparison */}
              <div className="border border-slate-300 rounded-2xl overflow-x-auto shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <th className="p-3 border-r border-slate-300 text-center w-16">Cell</th>
                      <th className="p-3 border-r border-slate-300 w-56">Field Description</th>
                      <th className="p-3 border-r border-slate-300 text-right w-44 bg-purple-50/60">
                        Manual File ({report.fileName})
                      </th>
                      <th className="p-3 border-r border-slate-300 text-right w-44 bg-teal-50/60">
                        Ground Truth (Calculated)
                      </th>
                      <th className="p-3 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.items.map((item, idx) => (
                      <tr
                        key={item.cellRef}
                        className={`border-b border-slate-200 transition ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        } ${!item.isMatch ? "bg-rose-50/70" : "hover:bg-slate-100/60"}`}
                      >
                        <td className="p-2.5 text-center font-mono font-bold border-r border-slate-200 text-slate-800">
                          {item.cellRef}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800">
                          <span className="block text-[10px] text-slate-400 uppercase">{item.category}</span>
                          {item.label}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold border-r border-slate-200 bg-purple-50/30 text-purple-950">
                          {item.formattedManual}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold border-r border-slate-200 bg-teal-50/30 text-teal-950">
                          {item.formattedCalculated}
                        </td>
                        <td className="p-2.5 text-center">
                          {item.isMatch ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full text-[11px] font-bold">
                              <Check className="w-3 h-3" /> MATCH
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                              <X className="w-3 h-3" /> MISMATCH
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Discrepancy Analytics */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Filter and search bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search cell (e.g. F10, G10)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-700">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`px-3 py-1 rounded-lg transition ${categoryFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
                  >
                    All ({report.items.length})
                  </button>
                  <button
                    onClick={() => setCategoryFilter("mismatch")}
                    className={`px-3 py-1 rounded-lg transition ${categoryFilter === "mismatch" ? "bg-rose-600 text-white shadow-sm" : "hover:text-slate-900 text-rose-700"}`}
                  >
                    Mismatched Only ({report.mismatchCount})
                  </button>
                  <button
                    onClick={() => setCategoryFilter("main")}
                    className={`px-3 py-1 rounded-lg transition ${categoryFilter === "main" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
                  >
                    Main Meter
                  </button>
                  <button
                    onClick={() => setCategoryFilter("backup")}
                    className={`px-3 py-1 rounded-lg transition ${categoryFilter === "backup" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
                  >
                    Back-up Meter
                  </button>
                </div>
              </div>

              {/* Analytics Table */}
              <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <th className="p-3 text-center w-16">Cell</th>
                      <th className="p-3 w-48">Parameter</th>
                      <th className="p-3 text-right w-36">Manual Value</th>
                      <th className="p-3 text-right w-36">Ground Truth</th>
                      <th className="p-3 text-right w-32">Delta (Difference)</th>
                      <th className="p-3">Root Cause &amp; Engineering Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr
                        key={item.cellRef}
                        className={`border-b border-slate-200 ${
                          !item.isMatch ? "bg-rose-50/80" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {item.cellRef}
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {item.label}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-purple-900">
                          {item.formattedManual}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-teal-900">
                          {item.formattedCalculated}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {item.isMatch ? (
                            <span className="text-emerald-700">0.00</span>
                          ) : (
                            <span className="text-rose-700 flex items-center justify-end gap-1">
                              {item.delta && item.delta > 0 ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                              )}
                              {item.delta && item.delta > 0 ? `+${item.delta.toFixed(2)}` : item.delta?.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">
                          {item.impactDescription}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Automated Cross-Check Engine • Built for BPDB &amp; UPPL Energy Auditing
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            Close Cross-Check
          </button>
        </div>
      </div>
    </div>
  );
}
