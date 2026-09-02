# UPPL MER Automation & Audit System (React PWA)

United Payra Power Limited (150 MW HFO Fired Power Plant, Kholishakhali, Patuakhali)

This modern Progressive Web Application (PWA) validates Main and Back-up meter Excel exports, enforces strict billing-boundary selection, calculates exact energy generation with Overall Multiplier Factors (OMF), verifies formula integrity, and exports official verified Excel workbooks and print-ready PDFs.

## 🚀 How to Launch the Application

### Option 1: Double-click Launcher
Run **`Start-MER-Web-PWA.cmd`** from File Explorer. It starts the local server and automatically opens the application at `http://localhost:3300`.

### Option 2: Command Line
```bash
npm run web
```

### Option 3: PowerShell CLI Automation
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Run-August-2026.ps1
```

---

## ✨ Features

- **📱 Installable Progressive Web App (PWA)**: Works offline and can be installed directly on desktop and mobile devices.
- **🔒 100% Client-Side Privacy**: All Excel processing, SHA-256 cryptographic hashing, and arithmetic happen locally in your browser. No sensitive plant data leaves your device.
- **🛡️ Strict 8-Stage Audit Pipeline**:
  1. Meter Identity extraction from worksheet names (`LGZ56445019` / `LGZ56445020`).
  2. Mandatory OBIS register validation (`1-1:1.8.0`, `1-1:2.8.0`, `1-1:3.8.0`, `1-1:4.8.0`).
  3. Continuous 30-minute interval grid enforcement (1,489 readings for 31-day month).
  4. Duplicate timestamp detection (32 duplicates resolved by cross-checking all 4 registers).
  5. Monotonicity validation (cumulative counters never decrease).
  6. Exact boundary readings extraction (1st-of-month 00:00 to 1st-of-next-month 00:00).
  7. Exact BigInt math with OMF ($1,200,000$).
  8. Discrepancy gate enforcement ($\le 0.200\%$).
- **📑 BPDB MER Sheet Preview**: Formatted to match Bangladesh Power Development Board official specifications.
- **📊 Interactive Charts**: Daily net energy generation bar charts and 30-minute load profiles via Recharts.
- **📥 Multi-Format Downloads**:
  - Verified Excel Workbook (`.xlsx`) with live formulas (`=I9-I10`, `=G9*H9/1000`, etc.)
  - High-Resolution Print-Ready PDF (`.pdf`) with BPDB layout and signature blocks
  - Cryptographic Audit Trail (`.json`)
