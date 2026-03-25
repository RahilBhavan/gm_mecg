# Excel Workbook Reference

The main output is `auto_suppliers.xlsx`, produced by `build_auto_excel.py`. It contains five sheets.

## Sheets

| Sheet | Description |
|-------|--------------|
| **Supplier Data** | All included suppliers (INCLUDE_DETAILS) with DUNS, name, tier, period, revenue, SG&A, EBIT, ratio columns, OEMs, parts, fiscal year, source. |
| **Filtered Publics** | Same columns as Supplier Data but only rows that have revenue data. |
| **Tier 1 Summary** | Aggregated metrics for Tier 1: company count, total/avg/median revenue, average SG&A %, EBIT %, and SG&A+EBIT %. |
| **Tier 2 Summary** | Same metrics for Tier 2. |
| **Methodology** | Report generated date, latest quarter end note, inclusion/exclusion criteria, data sources. Followed by a table of excluded companies and reasons (EXCLUDE_REASONS). |

## Supplier Data / Filtered Publics columns

| Column | Description |
|--------|-------------|
| DUNS Number | From INCLUDE_DETAILS. |
| Company Name | Exact key from INCLUDE_DETAILS. |
| Tier | 1 or 2. |
| Period | e.g. Q4 2025, or fiscal year from fallback. |
| Revenue (USD) | From quarterly JSON or FINANCIALS. |
| SG&A (USD) | From quarterly JSON or FINANCIALS. |
| EBIT (USD) | From quarterly JSON or FINANCIALS. |
| SG&A % | Formula: SG&A / Revenue (blank if missing). |
| EBIT % | Formula: EBIT / Revenue (blank if missing). |
| SG&A+EBIT % | Formula: SG&A% + EBIT%. |
| OEM Customers | From INCLUDE_DETAILS. |
| Automotive Parts / Products | From INCLUDE_DETAILS. |
| Fiscal Year | Period or fiscal year label. |
| Source | e.g. SEC 10-Q, Yahoo Finance (symbol). |

## Formulas

- **SG&A %:** `=IF(OR(Revenue="", SG&A=""), "", SG&A/Revenue)` with currency columns by row.
- **EBIT %:** `=IF(OR(Revenue="", EBIT=""), "", EBIT/Revenue)`.
- **SG&A+EBIT %:** `=IF(OR(SG&A%="", EBIT%=""), "", SG&A%+EBIT%)`.

All ratio columns use the percentage number format. Recalculation of formulas can be done with LibreOffice via `recalc.py` (see README).

## Styling

- Header row: dark navy background, white font.
- Tier 1 rows: light blue; Tier 2: light green; alternating rows use a light gray for readability.
- Excluded companies are not in the data sheets; they appear only in the Methodology sheet table.
