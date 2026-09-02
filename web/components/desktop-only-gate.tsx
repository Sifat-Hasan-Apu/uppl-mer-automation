"use client";

import React from "react";
import { Monitor, Smartphone, Zap, ShieldAlert, Laptop } from "lucide-react";

export function DesktopOnlyGate() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-teal-600 selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-teal-100/60 via-emerald-50/40 to-transparent pointer-events-none" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Main Container Card */}
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/70 text-center relative z-10">
        
        {/* Plant Badge & Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 shadow-md shadow-teal-700/20 p-2 text-white">
            <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold tracking-wide uppercase mb-4 shadow-2xs">
          <span>M/S United Payra Power Limited</span>
        </div>

        {/* Visual Device Indicator */}
        <div className="my-6 flex items-center justify-center gap-4 py-4 px-6 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex flex-col items-center gap-1 text-slate-400 opacity-40">
            <Smartphone className="w-9 h-9 stroke-[1.5]" />
            <span className="text-[10px] font-bold uppercase line-through">Mobile</span>
          </div>

          <div className="h-10 w-[1px] bg-slate-200" />

          <div className="flex flex-col items-center gap-1 text-teal-700">
            <Monitor className="w-11 h-11 stroke-[2] animate-bounce" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900">Desktop</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          Open On Desktop
        </h1>

        {/* Description */}
        <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
          This industrial energy reading and automated meter audit system requires a full-screen workstation or laptop display with multi-column spreadsheet tables.
        </p>

        {/* Warning Callout Box */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 text-left flex items-start gap-3 shadow-2xs mb-6">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <p className="font-bold">Mobile Screen Detected</p>
            <p className="text-amber-800/90 mt-0.5">
              Access is restricted on mobile devices. Please open this link on your office computer or laptop to continue.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <Laptop className="w-3.5 h-3.5 text-slate-400" />
          <span>Recommended Resolution: 1280 × 720 or higher</span>
        </div>
      </div>
    </div>
  );
}
