"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  RotateCcw,
  Download,
  Printer,
  ShieldCheck,
  Zap,
  Activity,
  Sparkles,
  Search,
  Info,
  Sliders,
  Calendar,
  BarChart3,
  Table,
  Check,
  ArrowUpDown,
  Smartphone,
  FolderOpen,
  X,
  Play,
  Code2,
  Lock,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

import { DEFAULT_CONFIG } from "../lib/default-config";
import {
  AuditResult,
  DailyChartData,
  IntervalChartData,
  MeterConfig,
  ParsedReadingRow,
} from "../lib/types";
import {
  auditMeterFiles,
  detectMonthFromBuffer,
  generateDailyChartData,
  generateIntervalChartData,
  monthBounds,
} from "../lib/meter-engine";
import { generateMerWorkbookBytes } from "../lib/mer-generator";
import { downloadMerPdf } from "../lib/pdf-generator";
import { SAMPLE_AUDIT_AUGUST_2026, SAMPLE_DAILY_CHART_DATA } from "../lib/sample-data";
import {
  parseAndCrossCheckManualMer,
  ManualMerCrossCheckReport,
} from "../lib/manual-mer-comparator";
import { DualMerTables } from "../components/dual-mer-tables";
import { AuthGate } from "../components/auth-gate";

export default function UPPLMeterDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [config, setConfig] = useState<MeterConfig>(DEFAULT_CONFIG);
  const [month, setMonth] = useState<string>("");

  // File states (Clean initial state for user upload)
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [manualMerFile, setManualMerFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  // Processing, Cross-check & Audit state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [crossCheckReport, setCrossCheckReport] = useState<ManualMerCrossCheckReport | null>(null);
  const [activeTab, setActiveTab] = useState<"mer" | "charts" | "audit" | "raw">("mer");

  // Filter & Search states
  const [rawSearch, setRawSearch] = useState<string>("");
  const [rawMeterRole, setRawMeterRole] = useState<"main" | "backup">("main");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [dailyChartData, setDailyChartData] = useState<DailyChartData[]>([]);
  const [intervalChartData, setIntervalChartData] = useState<IntervalChartData[]>([]);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  useEffect(() => {
    try {
      const sess = sessionStorage.getItem("uppl_auth");
      const pers = localStorage.getItem("uppl_auth_persistent");
      if (sess === "true" || pers === "true") {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  const handleLock = () => {
    try {
      sessionStorage.removeItem("uppl_auth");
      localStorage.removeItem("uppl_auth_persistent");
    } catch (e) {}
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Run audit when files are selected or when user clicks Process
  const processFiles = async (
    fileA: File | null = mainFile,
    fileB: File | null = backupFile,
    selectedMonth: string = month,
    manualFile: File | null = manualMerFile
  ) => {
    if (!fileA || !fileB) {
      setErrorMessage("Please select both Main and Back-up meter Excel (.xlsx) files to run the audit.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const [bufA, bufB] = await Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()]);

      // Auto-detect billing month from uploaded files
      const detected = detectMonthFromBuffer(bufA) || detectMonthFromBuffer(bufB);
      let targetMonth = selectedMonth;
      if (detected) {
        targetMonth = detected;
        setMonth(detected);
      }

      const audit = await auditMeterFiles({
        firstBuffer: bufA,
        firstName: fileA.name,
        secondBuffer: bufB,
        secondName: fileB.name,
        month: targetMonth,
        config,
      });

      setAuditResult(audit);

      // Generate charts
      const daily = generateDailyChartData(
        audit.meters.main.allRows,
        audit.meters.backup.allRows,
        config.omf
      );
      if (daily.length > 0) setDailyChartData(daily);

      const intervals = generateIntervalChartData(
        audit.meters.main.allRows,
        audit.meters.backup.allRows,
        config.omf,
        8
      );
      setIntervalChartData(intervals);

      // If manual MER file is present, immediately execute cell-by-cell cross-check!
      const targetManual = manualFile || manualMerFile;
      if (targetManual) {
        const mBuf = await targetManual.arrayBuffer();
        const report = parseAndCrossCheckManualMer(mBuf, targetManual.name, audit, config);
        setCrossCheckReport(report);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Meter audit and verification failed.");
      setAuditResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualMerUpload = async (file: File) => {
    setManualMerFile(file);
    if (auditResult) {
      const mBuf = await file.arrayBuffer();
      const report = parseAndCrossCheckManualMer(mBuf, file.name, auditResult, config);
      setCrossCheckReport(report);
    }
  };

  // Drag and drop helper (Stores files; does NOT run calculation until user clicks Run Meter Audit)
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, target: "main" | "backup" | "manual" | "template" | "auto") => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );
    if (files.length === 0) return;

    if (target === "manual" || target === "template") {
      handleManualMerUpload(files[0]);
      return;
    }

    if (files.length >= 2) {
      setMainFile(files[0]);
      setBackupFile(files[1]);
      return;
    }

    if (target === "main") {
      setMainFile(files[0]);
    } else if (target === "backup") {
      setBackupFile(files[0]);
    } else {
      if (!mainFile) {
        setMainFile(files[0]);
      } else {
        setBackupFile(files[0]);
      }
    }
  };

  const loadSampleData = () => {
    setAuditResult(SAMPLE_AUDIT_AUGUST_2026);
    setDailyChartData(SAMPLE_DAILY_CHART_DATA);
    setMonth("2026-08");
    setErrorMessage(null);
  };

  const handleReset = () => {
    setAuditResult(null);
    setMainFile(null);
    setBackupFile(null);
    setManualMerFile(null);
    setCrossCheckReport(null);
    setTemplateFile(null);
    setDailyChartData([]);
    setIntervalChartData([]);
    setErrorMessage(null);
    setMonth("2026-08");
  };

  const handleRemoveMainFile = () => {
    setMainFile(null);
    setAuditResult(null);
    setCrossCheckReport(null);
    setDailyChartData([]);
    setIntervalChartData([]);
    if (!backupFile && !manualMerFile) {
      setMonth("2026-08");
    }
  };

  const handleRemoveBackupFile = () => {
    setBackupFile(null);
    setAuditResult(null);
    setCrossCheckReport(null);
    setDailyChartData([]);
    setIntervalChartData([]);
    if (!mainFile && !manualMerFile) {
      setMonth("2026-08");
    }
  };

  const handleRemoveManualFile = () => {
    setManualMerFile(null);
    setCrossCheckReport(null);
    if (!mainFile && !backupFile) {
      setMonth("2026-08");
    }
  };

  // Export handlers
  const handleDownloadXlsx = async () => {
    if (!auditResult) return;
    try {
      const tplBuf = templateFile ? await templateFile.arrayBuffer() : null;
      const bytes = generateMerWorkbookBytes(auditResult, config, tplBuf);
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `UPPL_MER_${auditResult.month.replace("-", "_")}_VERIFIED.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error exporting Excel: " + err.message);
    }
  };

  const handleDownloadPdf = () => {
    if (!auditResult) return;
    downloadMerPdf(auditResult, config);
  };

  const handleDownloadJson = () => {
    if (!auditResult) return;
    const blob = new Blob([JSON.stringify(auditResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `UPPL_MER_${auditResult.month.replace("-", "_")}_AUDIT.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMonthValue = auditResult?.month || month || "2026-08";
  const bounds = monthBounds(currentMonthValue);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(bounds.start);
  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startDay = String(bounds.start.getUTCDate()).padStart(2, "0");
  const endDay = String(bounds.displayEnd.getUTCDate()).padStart(2, "0");
  const monthAbbr = monthNamesShort[bounds.start.getUTCMonth()];
  const shortYear = String(bounds.year).slice(-2);

  // Full official date format: e.g. "31-Aug-26" or "30-Jun-26"
  const fullStartDate = `${startDay}-${monthAbbr}-${shortYear}`;
  const fullEndDate = `${endDay}-${monthAbbr}-${shortYear}`;

  // Period numeric format: e.g. "01-08-26" and "31-08-26"
  const periodStart = `${startDay}-${String(bounds.monthNumber).padStart(2, "0")}-${shortYear}`;
  const periodEnd = `${endDay}-${String(bounds.monthNumber).padStart(2, "0")}-${shortYear}`;

  // Pagination for raw readings table
  const rawRows: ParsedReadingRow[] =
    rawMeterRole === "main"
      ? auditResult?.meters.main.allRows || []
      : auditResult?.meters.backup.allRows || [];

  const filteredRawRows = rawRows.filter(
    (r) =>
      r.timestampStr.includes(rawSearch) ||
      r.status.toLowerCase().includes(rawSearch.toLowerCase()) ||
      String(r.row).includes(rawSearch)
  );

  const pageSize = 25;
  const totalPages = Math.ceil(filteredRawRows.length / pageSize) || 1;
  const paginatedRawRows = filteredRawRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20 animate-pulse">
          <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300" />
        </div>
        <span>Verifying Security Access...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 shadow-md shadow-teal-700/20 p-2 text-white">
            <Zap className="w-6 h-6 animate-pulse" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                UPPL MER Automation &amp; Audit System
              </h1>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-700">{config.plant.name}</span>
              <span className="text-slate-300">•</span>
              <span className="text-teal-700 font-medium">{config.plant.capacity}</span>
              <span className="text-slate-300">•</span>
              <span>{config.plant.location}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition shadow-xs cursor-pointer"
            title="Configure OMF, Discrepancy Limits, Meter IDs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            Settings
          </button>
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-lg border border-slate-300 hover:border-rose-300 transition shadow-xs cursor-pointer"
            title="Lock Session"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
            Lock
          </button>
        </div>
      </header>

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Alert if validation failed */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3.5 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <h4 className="font-semibold text-rose-800 mb-0.5">Strict Validation Blocked Output</h4>
              <p className="text-rose-700 font-mono text-xs">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-700 hover:text-rose-900 font-medium px-2.5 py-1 bg-white rounded border border-rose-300 shadow-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: Prominent File Input & Upload Zone */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-teal-700" />
                1. Upload Meter Excel Files &amp; Select Billing Period
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select or drop Main and Back-up meter <span className="text-teal-800 font-mono font-semibold">.xlsx</span> files. The system automatically verifies meter identity, OBIS registers, and timestamps.
              </p>
            </div>

            {/* Action buttons: Clear Data + Month selector */}
            <div className="flex items-center gap-3">
              {(mainFile || backupFile || manualMerFile || auditResult) && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl transition cursor-pointer shadow-2xs"
                  title="Clear all uploaded files and reset month"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Data</span>
                </button>
              )}

              {/* Month selector */}
              <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2 rounded-xl border border-slate-300 shadow-inner">
                <Calendar className="w-4 h-4 text-teal-700" />
                <label htmlFor="month-select" className="text-xs text-slate-700 font-semibold">
                  Billing Month:
                </label>
                <input
                  id="month-select"
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    if (mainFile && backupFile) {
                      processFiles(mainFile, backupFile, e.target.value);
                    }
                  }}
                  className="bg-transparent text-sm font-bold text-teal-800 focus:outline-none cursor-pointer"
                />
                {!month && (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 border border-teal-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                    Auto-Detect ⚡
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3 Large Upload Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Box 1: Main Meter */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "main")}
              className={`relative border-2 border-dashed rounded-2xl p-6 transition text-center flex flex-col items-center justify-center min-h-[170px] ${
                mainFile
                  ? "border-teal-600 bg-teal-50/50 shadow-sm"
                  : "border-slate-300 hover:border-teal-600 bg-slate-50/70 hover:bg-slate-50"
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                id="main-file-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const f = e.target.files[0];
                    setMainFile(f);
                    if (backupFile) processFiles(f, backupFile, month);
                  }
                }}
              />
              <FileSpreadsheet
                className={`w-10 h-10 mb-2.5 ${mainFile ? "text-teal-700" : "text-slate-400"}`}
              />
              <span className="font-bold text-sm text-slate-900 mb-1">
                Main Meter File (.xlsx)
              </span>
              <span className="text-[11px] text-slate-500 mb-3">
                Expected ID: <span className="font-mono text-teal-700 font-semibold">{config.meters.main}</span>
              </span>

              {mainFile ? (
                <div className="flex items-center gap-2 bg-teal-100 border border-teal-300 px-3 py-1 rounded-lg text-xs text-teal-900 font-medium">
                  <Check className="w-3.5 h-3.5 text-teal-700" />
                  <span className="truncate max-w-[180px]" title={mainFile.name}>{mainFile.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMainFile();
                    }}
                    className="text-teal-700 hover:text-teal-950 ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="main-file-input"
                  className="cursor-pointer font-semibold text-xs bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Browse Main Meter File
                </label>
              )}
            </div>

            {/* Box 2: Back-up Meter */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "backup")}
              className={`relative border-2 border-dashed rounded-2xl p-6 transition text-center flex flex-col items-center justify-center min-h-[170px] ${
                backupFile
                  ? "border-cyan-600 bg-cyan-50/50 shadow-sm"
                  : "border-slate-300 hover:border-cyan-600 bg-slate-50/70 hover:bg-slate-50"
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                id="backup-file-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const f = e.target.files[0];
                    setBackupFile(f);
                    if (mainFile) processFiles(mainFile, f, month);
                  }
                }}
              />
              <FileSpreadsheet
                className={`w-10 h-10 mb-2.5 ${backupFile ? "text-cyan-700" : "text-slate-400"}`}
              />
              <span className="font-bold text-sm text-slate-900 mb-1">
                Back-up Meter File (.xlsx)
              </span>
              <span className="text-[11px] text-slate-500 mb-3">
                Expected ID: <span className="font-mono text-cyan-700 font-semibold">{config.meters.backup}</span>
              </span>

              {backupFile ? (
                <div className="flex items-center gap-2 bg-cyan-100 border border-cyan-300 px-3 py-1 rounded-lg text-xs text-cyan-900 font-medium">
                  <Check className="w-3.5 h-3.5 text-cyan-700" />
                  <span className="truncate max-w-[180px]" title={backupFile.name}>{backupFile.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBackupFile();
                    }}
                    className="text-cyan-700 hover:text-cyan-950 ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="backup-file-input"
                  className="cursor-pointer font-semibold text-xs bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Browse Back-up Meter File
                </label>
              )}
            </div>

            {/* Box 3: Manual MER Cross-Check File */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "manual")}
              className={`relative border-2 border-dashed rounded-2xl p-6 transition text-center flex flex-col items-center justify-center min-h-[170px] ${
                manualMerFile
                  ? crossCheckReport?.status === "PERFECT_MATCH"
                    ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                    : "border-amber-600 bg-amber-50/50 shadow-sm"
                  : "border-slate-300 hover:border-purple-600 bg-slate-50/70 hover:bg-slate-50"
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                id="manual-file-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleManualMerUpload(e.target.files[0]);
                  }
                }}
              />
              <FileSpreadsheet
                className={`w-10 h-10 mb-2.5 ${
                  manualMerFile
                    ? crossCheckReport?.status === "PERFECT_MATCH"
                      ? "text-emerald-700"
                      : "text-amber-700"
                    : "text-purple-700"
                }`}
              />
              <span className="font-bold text-sm text-slate-900 mb-1">
                Manual MER File (.xlsx)
              </span>
              <span className="text-[11px] text-slate-500 mb-3">
                {manualMerFile ? (
                  crossCheckReport?.status === "PERFECT_MATCH" ? (
                    <span className="text-emerald-700 font-bold">100% Ground-Truth Parity Verified ✓</span>
                  ) : crossCheckReport?.status === "DISCREPANCY_DETECTED" ? (
                    <span className="text-amber-700 font-bold">{crossCheckReport.mismatchCount} Discrepancies Found ⚠️</span>
                  ) : (
                    manualMerFile.name
                  )
                ) : (
                  "Upload manual sheet to cross-check cell-by-cell"
                )}
              </span>

              {manualMerFile ? (
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                      crossCheckReport?.status === "PERFECT_MATCH"
                        ? "bg-emerald-100 border border-emerald-300 text-emerald-900"
                        : "bg-amber-100 border border-amber-300 text-amber-900"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px]" title={manualMerFile.name}>
                      {manualMerFile.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveManualFile();
                      }}
                      className="text-slate-600 hover:text-slate-950 ml-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="manual-file-input"
                  className="cursor-pointer font-semibold text-xs bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl shadow-sm transition"
                >
                  Browse Manual MER File
                </label>
              )}
            </div>
          </div>

        </section>





        {/* Section 3: Executive Metric Cards (Visible when audit is ready) */}
        {auditResult && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Main Meter Net Supply */}
            <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-teal-800 tracking-wider">
                  Main Meter Net Energy
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {config.meters.main}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {auditResult.calculations.main.activeNetSupply.toLocaleString()}
                <span className="text-xs font-normal text-slate-500 ml-1.5">kWh</span>
              </div>
              <div className="mt-2 text-xs text-teal-800 font-semibold flex items-center justify-between">
                <span>{(auditResult.calculations.main.activeNetSupply / 1000).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MWh</span>
                <span className="text-slate-500 text-[11px] font-normal">Advance: Export - Import</span>
              </div>
            </div>

            {/* Card 2: Back-up Meter Net Supply */}
            <div className="bg-white border border-cyan-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-cyan-800 tracking-wider">
                  Back-up Meter Net Energy
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {config.meters.backup}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {auditResult.calculations.backup.activeNetSupply.toLocaleString()}
                <span className="text-xs font-normal text-slate-500 ml-1.5">kWh</span>
              </div>
              <div className="mt-2 text-xs text-cyan-800 font-semibold flex items-center justify-between">
                <span>{(auditResult.calculations.backup.activeNetSupply / 1000).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MWh</span>
                <span className="text-slate-500 text-[11px] font-normal">Advance: Export - Import</span>
              </div>
            </div>

            {/* Card 3: Difference */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                  Main vs. Back-up Variance
                </span>
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 tracking-tight">
                {auditResult.comparison.differenceKwh.toLocaleString()}
                <span className="text-xs font-normal text-slate-500 ml-1.5">kWh</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Absolute energy difference between meters
              </p>
            </div>

            {/* Card 4: Discrepancy Percentage */}
            <div className="bg-white border border-emerald-300 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
                  Audit Discrepancy
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  PASS (&le;{config.allowedDiscrepancyPercent}%)
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
                {auditResult.comparison.discrepancyPercent.toFixed(6)}%
              </div>
              <p className="mt-2 text-xs text-emerald-800 font-medium">
                Within approved BPDB tolerance limit
              </p>
            </div>
          </section>
        )}

        {/* Section 4: Export Action Toolbar */}
        {auditResult && (
          <section className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>
                Generated <strong className="text-slate-900">{monthName} {bounds.year}</strong> Official Record
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleDownloadXlsx}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download Excel (.xlsx)
              </button>

              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-sm transition"
              >
                <FileText className="w-4 h-4" />
                Download Print PDF (.pdf)
              </button>

              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 transition"
              >
                <FileCode className="w-4 h-4 text-slate-600" />
                Audit Evidence (.json)
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-300 transition"
                title="Print current document"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                Print
              </button>
            </div>
          </section>
        )}

        {/* Section 5: Tabbed Deep-Dive Navigation */}
        {auditResult && (
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("mer")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeTab === "mer"
                    ? "border-teal-700 text-teal-800 bg-white rounded-t-lg shadow-sm"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Table className="w-4 h-4" />
                BPDB MER Sheet Form
              </button>

              <button
                onClick={() => setActiveTab("charts")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeTab === "charts"
                    ? "border-teal-700 text-teal-800 bg-white rounded-t-lg shadow-sm"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Energy Generation Profiles
              </button>

              <button
                onClick={() => setActiveTab("audit")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeTab === "audit"
                    ? "border-teal-700 text-teal-800 bg-white rounded-t-lg shadow-sm"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Audit Logs &amp; Duplicates ({auditResult.meters.main.duplicateTimestampCount})
              </button>

              <button
                onClick={() => setActiveTab("raw")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                  activeTab === "raw"
                    ? "border-teal-700 text-teal-800 bg-white rounded-t-lg shadow-sm"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Search className="w-4 h-4" />
                Raw Interval Explorer ({auditResult.meters.main.uniqueTimestampCount})
              </button>
            </div>

            {/* Tab 1: Authentic BPDB MER Sheet Preview (Dual Tables: Software & Manual) */}
            {activeTab === "mer" && (
              <div className="p-6 space-y-6 bg-white font-mono">
                <DualMerTables
                  auditResult={auditResult}
                  crossCheckReport={crossCheckReport}
                  config={config}
                  monthName={monthName}
                  fullStartDate={fullStartDate}
                  fullEndDate={fullEndDate}
                />
              </div>
            )}

            {/* Tab 2: Energy Generation Profiles / Charts */}
            {activeTab === "charts" && (
              <div className="p-6 space-y-8 bg-white">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-700" />
                    Daily Net Energy Generation (kWh) - {monthName} {bounds.year}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Daily generation curves comparing Main and Back-up meter net supplies.
                  </p>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" stroke="#64748b" label={{ value: "Day of Month", position: "insideBottom", offset: -10, fill: "#64748b" }} />
                        <YAxis stroke="#64748b" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "0.5rem", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                          formatter={(value: any) => [`${Number(value).toLocaleString()} kWh`, "Net Supply"]}
                        />
                        <Legend />
                        <Bar dataKey="mainNetKwh" name="Main Meter Net (kWh)" fill="#0f766e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="backupNetKwh" name="Backup Meter Net (kWh)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {intervalChartData.length > 0 && (
                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-700" />
                      30-Minute Interval Load Trend (Sample Intervals)
                    </h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={intervalChartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="formattedTime" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "0.5rem" }} />
                          <Legend />
                          <Line type="monotone" dataKey="mainNetGeneration" name="Main Net (kWh)" stroke="#0f766e" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="backupNetGeneration" name="Backup Net (kWh)" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Detailed Audit & Duplicate Inspection */}
            {activeTab === "audit" && (
              <div className="p-6 space-y-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Main Meter File Hash */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                      Main Meter File SHA-256
                    </span>
                    <p className="font-mono text-xs text-slate-700 break-all bg-white p-2.5 rounded border border-slate-300 shadow-sm">
                      {auditResult.meters.main.sha256}
                    </p>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Header Row: {auditResult.meters.main.headerRow}</span>
                      <span>Total Data Rows: {auditResult.meters.main.sourceDataRows}</span>
                    </div>
                  </div>

                  {/* Back-up Meter File Hash */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">
                      Back-up Meter File SHA-256
                    </span>
                    <p className="font-mono text-xs text-slate-700 break-all bg-white p-2.5 rounded border border-slate-300 shadow-sm">
                      {auditResult.meters.backup.sha256}
                    </p>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Header Row: {auditResult.meters.backup.headerRow}</span>
                      <span>Total Data Rows: {auditResult.meters.backup.sourceDataRows}</span>
                    </div>
                  </div>
                </div>

                {/* Duplicates Log Table */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600" />
                    Duplicate Timestamp Inspection Log ({auditResult.meters.main.duplicateDetails.length} Instances Resolved)
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    As per billing audit policy, duplicate timestamps are accepted ONLY when all 4 cumulative counter registers agree identically.
                  </p>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-xs text-left text-slate-700">
                      <thead className="bg-slate-100 sticky top-0 text-slate-900 font-semibold">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Timestamp (UTC)</th>
                          <th className="p-2.5">Main Row Indices</th>
                          <th className="p-2.5">Main Hex Statuses</th>
                          <th className="p-2.5">Verification Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {auditResult.meters.main.duplicateDetails.map((dup, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-400 font-mono">{i + 1}</td>
                            <td className="p-2.5 font-mono font-semibold text-slate-900">{dup.timestamp}</td>
                            <td className="p-2.5 font-mono text-teal-800">Rows {dup.rows.join(", ")}</td>
                            <td className="p-2.5 font-mono text-slate-600">{dup.statuses.join(" | ")}</td>
                            <td className="p-2.5 text-emerald-800 font-semibold">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px]">
                                Identical Registers - PASS
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Raw 30-Minute Readings Inspector */}
            {activeTab === "raw" && (
              <div className="p-6 space-y-4 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setRawMeterRole("main");
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                        rawMeterRole === "main"
                          ? "bg-teal-700 border-teal-800 text-white shadow-sm"
                          : "bg-slate-100 border-slate-300 text-slate-700"
                      }`}
                    >
                      Main Meter ({config.meters.main})
                    </button>
                    <button
                      onClick={() => {
                        setRawMeterRole("backup");
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                        rawMeterRole === "backup"
                          ? "bg-cyan-700 border-cyan-800 text-white shadow-sm"
                          : "bg-slate-100 border-slate-300 text-slate-700"
                      }`}
                    >
                      Back-up Meter ({config.meters.backup})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search timestamp / status..."
                      value={rawSearch}
                      onChange={(e) => {
                        setRawSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-100 text-slate-900 font-semibold">
                      <tr>
                        <th className="p-2.5 text-center">Row</th>
                        <th className="p-2.5">Timestamp</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Active Export (1.8.0)</th>
                        <th className="p-2.5 text-right">Active Import (2.8.0)</th>
                        <th className="p-2.5 text-right">Reactive Export (3.8.0)</th>
                        <th className="p-2.5 text-right">Reactive Import (4.8.0)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-mono">
                      {paginatedRawRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center text-slate-400">{r.row}</td>
                          <td className="p-2.5 text-slate-900 font-semibold">{r.timestampStr}</td>
                          <td className="p-2.5 text-slate-500">{r.status || "00000000"}</td>
                          <td className="p-2.5 text-right text-teal-800 font-bold">{r.registers[0].toFixed(2)}</td>
                          <td className="p-2.5 text-right text-slate-700">{r.registers[1].toFixed(2)}</td>
                          <td className="p-2.5 text-right text-cyan-800 font-bold">{r.registers[2].toFixed(2)}</td>
                          <td className="p-2.5 text-right text-slate-700">{r.registers[3].toFixed(2)}</td>
                        </tr>
                      ))}
                      {paginatedRawRows.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400">
                            No readings match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <span>
                    Showing {Math.min((currentPage - 1) * pageSize + 1, filteredRawRows.length)} to{" "}
                    {Math.min(currentPage * pageSize, filteredRawRows.length)} of {filteredRawRows.length} readings
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded border border-slate-300 text-slate-700 font-medium shadow-sm"
                    >
                      Prev
                    </button>
                    <span className="px-2 font-semibold text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded border border-slate-300 text-slate-700 font-medium shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Config Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-teal-700" />
                Audit Parameters &amp; Configuration
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2 py-1 bg-slate-100 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Overall Multiplication Factor (OMF)
                </label>
                <input
                  type="number"
                  value={config.omf}
                  onChange={(e) => setConfig({ ...config, omf: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Allowed Discrepancy Tolerance (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.allowedDiscrepancyPercent}
                  onChange={(e) => setConfig({ ...config, allowedDiscrepancyPercent: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Main Meter ID
                  </label>
                  <input
                    type="text"
                    value={config.meters.main}
                    onChange={(e) => setConfig({ ...config, meters: { ...config.meters, main: e.target.value } })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Back-up Meter ID
                  </label>
                  <input
                    type="text"
                    value={config.meters.backup}
                    onChange={(e) => setConfig({ ...config, meters: { ...config.meters, backup: e.target.value } })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setConfig(DEFAULT_CONFIG);
                  setShowConfigModal(false);
                }}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg font-medium"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500 mt-auto">
        <p>
          UPPL MER Automation &amp; Audit System • Built for M/S United Payra Power Limited (150 MW HFO Fired Power Plant)
        </p>
        <p className="text-xs mt-1.5 flex items-center justify-center gap-1.5 font-medium">
          <Code2 className="w-4 h-4 text-blue-600" />
          <strong className="text-blue-600 font-bold tracking-wide">Sifat Hasan Apu</strong>
        </p>
      </footer>
    </div>
  );
}
