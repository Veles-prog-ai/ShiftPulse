# ShiftPulse Ledger Pro — Commercial API, Billing & Unit Economics Plan (v1.0 RS)

## 1. Launch Market Scope & Regulatory Jurisdiction
- **Initial Commercial Release (v1.0)**: **Republic of Serbia (`RS`)** only.
  - Pre-configured statutory rules: **Serbian Labor Law** (Art. 108 — +26% night & overtime differentials, +110% holiday pay), **PURS PPP-PD XML**, **SEF eFaktura UBL 2.1**, **NBS IPS QR** payment orders, **PIB Modulo-11** validation, **Class 5 / Class 6** chart of accounts, and **PDV (20% / 10%)** + **15% Corporate Profit Tax**.
  - **Gateway Broadcast**: `GET /api/gateway/status` announces `launchMarket: "RS"` and `supportedJurisdictions: ["RS"]`.
- **Expansion Roadmap (v1.1+)**: Country selector in the workspace Start Menu pre-lists **Croatia (`HR`)**, **Bosnia & Herzegovina (`BA`)**, **Montenegro (`ME`)**, **Slovenia (`SI`)**, and **EU Directives (`EU`)** as locked upcoming localization modules funded via add-on statutory packs.

---

## 2. Commercial Gateway API Specification

The server (`server.js`) operates exclusively as a **Zero-Knowledge License, Billing & Regulatory Gateway** — storing zero client ledgers, employee salaries, invoices, or tax filings.

| Method | Endpoint | Purpose | Auth / Security |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/billing/checkout` | Creates commercial subscription session (Stripe/Paddle card OR NBS IPS QR proforma invoice for Serbian d.o.o./PR) | Signed agency PIB + workstation fingerprint |
| `POST` | `/api/v1/billing/webhook` | Receives payment settlement confirmation and triggers automated license issuance | HMAC-SHA256 webhook signature |
| `POST` | `/api/v1/licenses/issue` | Issues RSA-2048 signed offline lease token (`licenseId`, `pibAgencije`, `tier`, `expiresAt`, `maksimalnoRadnika`) | Admin / automated billing worker |
| `POST` | `/api/v1/licenses/verify` | Verifies RSA-2048 or AES-256-CBC license signature & checks `sys_metadata.json` anti-clock rollback | Public gateway validation |
| `GET` | `/api/v1/credits/ai-balance` | Returns prepaid AI token quota per licensed agency without inspecting prompts or files | License key header (`x-license-key`) |
| `GET` | `/api/v1/legal-monitor/feed` | Serves signed statutory rate baselines (`RS` minimum wage, tax-free threshold, PDV rates) & law change alerts | Conditional HTTP `ETag` / `If-Modified-Since` |
| `POST` | `/api/hitl/log-approval` | Stores Zero-Knowledge HITL approval attestation (`accountUsername`, `module`, `decision`, `totalTokens`) | Local operator PIN session |

---

## 3. Hybrid Billing & Payment Collection Strategy

### A. Domestic Serbian B2B Invoicing (Primary for v1.0 RS)
1. **SEF eFaktura UBL 2.1 + NBS IPS QR**: Accounting agencies and Serbian companies (`d.o.o.` / `PR`) purchase annual or monthly seats via proforma invoice (`predračun`) carrying an instant **NBS IPS QR code**.
2. **Reconciliation**: Incoming bank statement (`XML/CSV`) matches reference number (`poziv na broj`) -> automatically marks agency paid -> gateway generates offline RSA-2048 license lease.

### B. International Cards & SaaS Subscriptions (Stripe / Paddle / LemonSqueezy)
- Used for automated monthly recurring billing (`EUR` / `RSD` equivalent) and self-serve credit top-ups for AI Copilot packs.

### C. Offline Cryptographic Lease & Anti-Tamper Design
- **Offline Tolerance**: Workstations operate offline cleanly using an **RSA-2048 public-key verifiable payload** signed server-side and renewed every **30 days** (or annual prepaid lease).
- **Clock Rollback Guard**: `sys_metadata.json` (and optional PostgreSQL `sys_metadata`) enforces monotonic `last_run_time` checks on every startup and protected API call.

---

## 4. Pricing Tiers & AI Token Unit Economics

### Commercial Tiers (Target Serbia B2B Market)
1. **Unlicensed Trial (Free)**: Local `ShiftPulse_Workspace`, deterministic 0-token P&L/VAT scanner, up to 3 employees per payroll batch; ePorezi PPP-PD XML export locked.
2. **Solo / PR Bookkeeper — 29 EUR / mo (or 290 EUR / yr)**:
   - Up to 10 client companies, unlimited deterministic 0-token invoice/slip scanning, full PPP-PD XML + NBS IPS batch export, encrypted cloud backup export, 150,000 `gemini-4-hydrogen` tokens/mo included.
3. **Agency Pro — 79 EUR / mo (or 790 EUR / yr)**:
   - Unlimited client companies & employees, multi-operator local HITL role hierarchy, 500,000 `gemini-4-hydrogen` tokens/mo included, priority regulatory baseline pushes.
4. **Enterprise Workstation / Multi-Branch — 199 EUR / mo**:
   - Multi-workstation license pool, dedicated gateway proxy quota (2M tokens/mo), SLA support.

### AI Cost Optimization & Unit Economics (`gemini-4-hydrogen`)
- **0-Token First Architecture**: ~85–90% of daily accounting documents (SEF UBL XML, bank CSVs, structured invoices, delivery notes, POS receipts) are handled by `documentAnalyzerEngine.js` with **0 LLM API cost**.
- **Server-Side & Client-Side Cost Controls**:
  - Model: `gemini-4-hydrogen` with `thinkingLevel: ThinkingLevel.LOW` and strict `responseSchema` JSON outputs.
  - Client-side **local pre-filter** resolves simple schedule conflicts locally before touching `/api/schedule/detect-conflicts`.
  - **SHA-256 response cache** prevents duplicate API spend on identical text snippets.
  - Input truncation (`8,000` chars max per document, `1,200` chars per schedule message, compact <=15-shift summaries).
- **Projected Margin**: Average Agency Pro seat consumes ~120K–300K tokens/month (~$0.05–$0.20 API COGS on Flash-tier pricing vs. €79 revenue = **>98% gross software margin**).

---

## 5. Multi-Platform Distribution Roadmap (Windows -> Linux -> ChromeOS)
1. **Windows 10 / 11 / Server (Primary Target)**: Distributed via signed `.zip` bundle (`install-windows.bat`, `run-windows.ps1`, Desktop `.lnk` shortcut) setting `SHIFTPULSE_LOCAL_DESKTOP=1` and provisioning `%USERPROFILE%\Documents\ShiftPulse_Workspace`. Phase 2 wraps into an NSIS / MSIX signed installer with embedded Node.js runtime (`pkg` / `Electron` / `Tauri` shell).
2. **Linux Desktop (Ubuntu / Debian / Fedora / Arch)**: Distributed as `.tar.gz` (`install-linux.sh`, FreeDesktop `.desktop` launcher) provisioning `~/ShiftPulse_Workspace`. Phase 2 adds `.deb` and `.AppImage` builds.
3. **ChromeOS & Chromebook**: Supported both via **1-click PWA Shelf Install** (`/install` with full Service Worker offline caching) and **Crostini Linux container bundle** (`install-chromeos.sh`).
