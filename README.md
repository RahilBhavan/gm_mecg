# Automotive Supply Chain Quarterly Financials Pipeline

Automotive supply chain quarterly financials pipeline — SEC + Yahoo Finance to Excel.

## What it does

This pipeline:

1. **Fetches** quarterly financials (Revenue, SG&A, EBIT) from **SEC EDGAR** (US) and **Yahoo Finance** (Canada, Europe, Korea).
2. **Merges** results into `latest_quarter_financials.json`.
3. **Builds** a 5-sheet Excel report (`auto_suppliers.xlsx`): Supplier Data, Filtered Publics, Tier 1 Summary, Tier 2 Summary, Methodology.
4. **Optionally** recalculates Excel formulas using LibreOffice.

## Requirements

- **Python 3.10+**
- Dependencies: `openpyxl`, `yfinance`, `pytest` (see `requirements.txt`). Pinned to minor ranges for reproducibility.
- **Optional:** LibreOffice (`soffice`) for `recalc.py`

## Setup

```bash
pip install -r requirements.txt
```

### Environment variables

| Variable | Description |
|---------|-------------|
| `SEC_USER_AGENT` | User-Agent string for SEC EDGAR requests (required to identify your organization and contact). Set for production/GM use. |
| `ACCEPT_ANY_LATEST_QUARTER` | Set to `1` to include the latest available quarter even if not 2025/2026 (e.g. Q3 2025 when 2026 not yet filed). Default: only 2025/2026. |

SEC requests require a descriptive User-Agent identifying your organization and contact. Set the `SEC_USER_AGENT` environment variable (e.g. `SEC_USER_AGENT="MyOrg/1.0 (your@email.com)"`). If unset, a default is used; for production or GM use, set it to a real contact per SEC guidance.

## Quick start

**Primary workflow** — fetch all data and rebuild Excel:

```bash
python fetch_all_quarterly.py
```

This will:

1. Fetch US quarterly data from SEC (2025/2026).
2. Fetch Canada / Europe / Korea data from Yahoo Finance.
3. Merge into `latest_quarter_financials.json` (US overwrites global when the same company exists in both).
4. Run `build_auto_excel.py` to produce `auto_suppliers.xlsx`.

## Inputs

| File | Description |
|------|-------------|
| `ticker_source_map.json` | Company name → `ticker`, `exchange`, `data_source` (US / Canada / Europe / Japan_Korea / China / Other). Keys must match `build_auto_excel.py` INCLUDE_DETAILS / FINANCIALS. |

## Outputs

| File | Description |
|------|-------------|
| `latest_quarter_financials.json` | Company name → `period`, `revenue_usd`, `sga_usd`, `ebit_usd`, `source`. |
| `auto_suppliers.xlsx` | 5-sheet workbook (Supplier Data, Filtered Publics, Tier 1 Summary, Tier 2 Summary, Methodology). |
| `fetch_skip_report.json` | Report of companies skipped by SEC or Yahoo (reason and detail). Generated when running `fetch_all_quarterly.py`. |

## Running individual scripts

| Command | Description |
|---------|-------------|
| `python fetch_quarterly_sec.py` | US only — fetch from SEC, write/merge to `latest_quarter_financials.json`. |
| `python fetch_quarterly_global_yf.py` | Global only — Canada/Europe/Korea via Yahoo Finance. |
| `python build_auto_excel.py` | Build Excel from existing `latest_quarter_financials.json` (or embedded FINANCIALS fallback). |
| `python build_excel.py` | Alternate builder using CATEGORIZED data and different sheet logic. |

## Recalculating formulas

`recalc.py` recalculates all formulas in an Excel file using LibreOffice and a small Basic macro. It requires:

- **LibreOffice** installed (`soffice` on PATH).
- The `office.soffice` helper (in `scripts/office/`). From the **project root**, run:

```bash
PYTHONPATH=scripts python recalc.py path/to/file.xlsx [timeout_seconds]
```

Example:

```bash
PYTHONPATH=scripts python recalc.py auto_suppliers.xlsx 60
```

The script installs a `RecalculateAndSave` macro into your LibreOffice user profile (Standard/Module1) if missing. Output is JSON: `status`, `total_errors`, `total_formulas`, `error_summary` (by error type with sample cell locations).

## GM Supplier Intelligence Dashboard (React)

An optional frontend in **`gm-supplier-dashboard/`** reads `auto_suppliers.xlsx` at build time and produces a static PPCO-style dashboard (KPIs, scatter plot, Tahoe zone map, supplier drill-down). Uses **Bun** + Vite.

```bash
cd gm-supplier-dashboard
bun install
bun run data:build   # requires ../auto_suppliers.xlsx
bun run dev
```

Details: [gm-supplier-dashboard/README.md](gm-supplier-dashboard/README.md).

## Project layout

```
.
├── fetch_all_quarterly.py   # Orchestrator: SEC + YF → JSON → build_auto_excel
├── fetch_quarterly_sec.py   # US quarterly from SEC EDGAR Company Facts
├── fetch_quarterly_global_yf.py  # Canada/Europe/Korea via Yahoo Finance
├── build_auto_excel.py      # 5-sheet Excel from JSON + FINANCIALS fallback
├── build_excel.py           # Alternate Excel builder (CATEGORIZED)
├── recalc.py                # LibreOffice formula recalc + error scan
├── requirements.txt
├── ticker_source_map.json   # Input: company → ticker, data_source
├── latest_quarter_financials.json  # Output: merged quarterly data
├── auto_suppliers.xlsx      # Output: main workbook
├── gm-supplier-dashboard/   # React SPA (build-time JSON from Excel)
└── scripts/
    └── office/
        └── soffice.py       # Helper for running soffice (e.g. sandboxed envs)
```

## Refresh runbook (GM / analysts)

Use this workflow to keep `auto_suppliers.xlsx` and `latest_quarter_financials.json` up to date.

1. **How often to run**  
   Run the full pipeline after each quarter’s filings (e.g. monthly or after earnings season).  
   From project root:
   ```bash
   python fetch_all_quarterly.py
   ```
   This fetches SEC + Yahoo, merges overrides, validates the JSON, writes `fetch_skip_report.json`, and builds the Excel.

2. **Check the skip report**  
   After each run, open `fetch_skip_report.json` to see companies skipped by SEC or Yahoo (`sec.skipped`, `yahoo.skipped`) and the reason/detail. Use it to add CIK overrides (`sec_cik_overrides.json`), fix tickers, or add entries to `quarterly_overrides.json` for gaps.

3. **Add or fix overrides**  
   For companies with no SEC/Yahoo quarterly data (e.g. Japan, HK, Mexico, or Valeo), add an entry to `quarterly_overrides.json` with keys: `period`, `revenue_usd` (required), and optionally `sga_usd`, `ebit_usd`, `source`. Company name must match `INCLUDE_DETAILS` exactly. Then run:
   ```bash
   python validate_quarterly_overrides.py
   python fetch_all_quarterly.py
   ```

4. **Validation before build**  
   The pipeline runs `validate_latest_quarter_financials.py` after merging; if it fails, the Excel build is skipped. Fix invalid records (wrong keys or company names not in `INCLUDE_DETAILS`) and re-run.

5. **Ticker map coverage**  
   To see how many companies in `INCLUDE_DETAILS` are missing from the ticker map (and never attempted by SEC/Yahoo), run:
   ```bash
   python list_companies_not_in_ticker_map.py
   python validate_ticker_map_coverage.py
   ```
   Use `validate_ticker_map_coverage.py --strict` in CI to fail when coverage is incomplete.

## Further reading

- [docs/OVERVIEW.md](docs/OVERVIEW.md) — Data flow and merge rules.
- [docs/DATA.md](docs/DATA.md) — JSON schemas and data sources.
- [docs/EXCEL.md](docs/EXCEL.md) — Sheet descriptions and column definitions.
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines.
