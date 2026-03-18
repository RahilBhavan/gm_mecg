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
- Dependencies: `openpyxl`, `yfinance` (see `requirements.txt`)
- **Optional:** LibreOffice (`soffice`) for `recalc.py`

## Setup

```bash
pip install -r requirements.txt
```

SEC requests require a descriptive User-Agent. The default is set in `fetch_quarterly_sec.py`; update `USER_AGENT` there if you run into rate limits or compliance needs.

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
└── scripts/
    └── office/
        └── soffice.py       # Helper for running soffice (e.g. sandboxed envs)
```

## Further reading

- [docs/OVERVIEW.md](docs/OVERVIEW.md) — Data flow and merge rules.
- [docs/DATA.md](docs/DATA.md) — JSON schemas and data sources.
- [docs/EXCEL.md](docs/EXCEL.md) — Sheet descriptions and column definitions.
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines.
