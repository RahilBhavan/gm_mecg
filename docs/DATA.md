# Data Schemas and Sources

## ticker_source_map.json

Maps company name (exact key) to ticker and data source. Used by the SEC and Yahoo Finance fetchers.

| Field | Description |
|-------|-------------|
| `ticker` | Stock symbol (e.g. `LEA`, `LNR.TO`). |
| `exchange` | Exchange code (e.g. `NYSE`, `TSX`). |
| `data_source` | `"US"` = SEC EDGAR; `"Canada"` / `"Europe"` / `"Japan_Korea"` / `"China"` / `"Other"` = typically Yahoo Finance or manual. |

- **US** companies are fetched by `fetch_quarterly_sec.py` (SEC Company Facts).
- **Canada, Europe, Korea** (and others in `GLOBAL_QUARTERLY` in `fetch_quarterly_global_yf.py`) are fetched via Yahoo Finance.
- Keys must match `build_auto_excel.py` INCLUDE_DETAILS and FINANCIALS exactly.

Example:

```json
{
  "LEAR CORP": { "ticker": "LEA", "exchange": "NYSE", "data_source": "US" },
  "LINAMAR CORP": { "ticker": "LNR.TO", "exchange": "TSX", "data_source": "Canada" }
}
```

## latest_quarter_financials.json

Output of the fetch/merge step. One entry per company; used by `build_auto_excel.py`.

| Field | Description |
|-------|-------------|
| `period` | e.g. `"Q4 2025"`, `"Q1 2026"`. |
| `revenue_usd` | Revenue in USD (integer or null). |
| `sga_usd` | Selling, general & administrative in USD (integer or null). |
| `ebit_usd` | EBIT / operating income in USD (integer or null). |
| `source` | e.g. `"SEC 10-Q"`, `"Yahoo Finance (LNR.TO)"`. |

Example:

```json
{
  "LEAR CORP": {
    "period": "Q4 2025",
    "revenue_usd": 6000000000,
    "sga_usd": 250000000,
    "ebit_usd": 200000000,
    "source": "SEC 10-Q"
  }
}
```

## quarterly_overrides.json (optional)

Manual or scraped quarterly data for companies that have no SEC or Yahoo data. Same shape as one entry in `latest_quarter_financials.json`. Keys are company names. Only used to **fill gaps** (names not already in the merged result). See `fetch_all_quarterly.py`.
