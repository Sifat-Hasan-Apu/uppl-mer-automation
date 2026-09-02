"use client";

import React, { useState } from "react";
import { Lock, Unlock, ShieldCheck, Zap, Eye, EyeOff, AlertCircle } from "lucide-react";

interface AuthGateProps {
  onAuthenticated: () => void;
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();

    if (cleanPass === "150mw") {
      setError(null);
      if (rememberMe) {
        localStorage.setItem("uppl_auth_persistent", "true");
      }
      sessionStorage.setItem("uppl_auth", "true");
      onAuthenticated();
    } else {
      setError("Incorrect authorization passcode. Access denied.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-teal-600 selection:text-white">
      {/* Subtle modern background glow and grid */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-teal-100/50 via-emerald-50/30 to-transparent pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Lock Card (Crisp White Light Theme) */}
      <div
        className={`w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/60 relative z-10 transition-all duration-300 ${
          isShaking ? "ring-2 ring-rose-500 transform translate-x-1" : ""
        }`}
      >
        {/* Plant Badge & Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 shadow-md shadow-teal-700/20 mb-5 ring-4 ring-teal-50 p-2">
            <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300 stroke-yellow-400" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold tracking-wide uppercase mb-2.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>M/S United Payra Power Limited</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              UPPL MER System
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              150 MW HFO Fired Power Plant • Protected Access
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Security Passcode
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                placeholder="Enter passcode (150mw)..."
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15 rounded-xl pl-10 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition font-mono tracking-wider shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-700 font-medium bg-rose-50 border border-rose-200 rounded-lg p-2.5 shadow-2xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-800 select-none font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-teal-600 focus:ring-teal-500/30 accent-teal-600 cursor-pointer"
              />
              <span>Remember on this device</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 hover:from-teal-800 hover:via-teal-700 hover:to-emerald-700 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-md shadow-teal-700/20 transition transform active:scale-[0.98] cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock Dashboard</span>
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Automated Monthly Energy Reading & Strict Meter Audit Platform
          </p>
        </div>
      </div>
    </div>
  );
}
