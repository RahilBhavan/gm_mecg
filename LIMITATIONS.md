# Quarterly P&L pipeline — limitations and how to address them

**Current design:** 38 companies get Period + quarterly Revenue / SG&A / EBIT from SEC (US) or Yahoo Finance (Canada/Europe/Korea). The rest stay on annual `FINANCIALS` in `build_auto_excel.py`. `auto_suppliers.xlsx` is rebuilt from `latest_quarter_financials.json` when present, with fallback to annual.

---

## 1. Japan / many HK / Mexico — no usable quarterly on Yahoo

**Limitation:** Yahoo often has no usable quarterly P&L for these (only EPS, etc.), so they are not in `GLOBAL_QUARTERLY` in `fetch_quarterly_global_yf.py`.

**Ways to address:**

- **Quarterly overrides:** Add entries to `quarterly_overrides.json` (same schema as `latest_quarter_financials.json`: `period`, `revenue_usd`, `sga_usd`, `ebit_usd`, `source`). Keys must match company names in `build_auto_excel.py` `INCLUDE_DETAILS`. Run `fetch_all_quarterly.py`; overrides are merged only for names that have no SEC/Yahoo data.
- **Alternate symbols:** If a company has a US ADR or other Yahoo symbol with quarterly data, add it to `SYMBOL_ALIASES` in `fetch_quarterly_global_yf.py` (e.g. `"COMPANY": [("ADR_SYMBOL", "USD")]`). The script tries aliases when the primary symbol returns no revenue.
- **External feed:** Use a provider with better non-US quarterly (e.g. Financial Modeling Prep, Alpha Vantage, or paid data). Write a small script that outputs the same JSON schema and merge it in `fetch_all_quarterly.py` (e.g. same file or a second JSON that gets merged before overrides).

---

## 2. Valeo (FR.PA) — empty on Yahoo

**Limitation:** Yahoo often returns empty `quarterly_income_stmt` for FR.PA.

**Addressed in code:**

- Valeo is in `GLOBAL_QUARTERLY` with `FR.PA`; `SYMBOL_ALIASES` tries `VLEEY` (US ADR) when FR.PA fails. If both fail, use `quarterly_overrides.json` with figures from Valeo’s earnings release.

---

## 3. SEDAR+ not automated — TSX uses Yahoo as proxy

**Limitation:** Canadian (TSX) names use Yahoo for “latest quarter”; SEDAR+ is not wired in.

**Ways to address:**

- **SEDAR+ fetcher:** Add `fetch_quarterly_sedar.py` (or similar) that:
  - Maps Canadian companies from `ticker_source_map.json` (`data_source: "Canada"`) to SEDAR+ issuer/search.
  - Fetches latest interim/quarterly filings (e.g. from [sedarplus.ca](https://www.sedarplus.ca)).
  - Parses revenue / SG&A / operating income from the filing (PDF/HTML parser or LLM extraction).
  - Writes the same schema as SEC/Yahoo into a dict and merge it in `fetch_all_quarterly.py` (e.g. `merged = {**sedar, **gl, **us}` then overrides).
- Until SEDAR+ is reliable, keep using Yahoo for TSX; optionally add overrides for specific Canadian names if you have better figures.

---

## 4. Adding more names (quarterly from Yahoo)

**To add more companies that have usable quarterly P&L on Yahoo:**

1. Add a row to `GLOBAL_QUARTERLY` in `fetch_quarterly_global_yf.py`:
   - `(company_name, yahoo_symbol, currency)`
   - Company name must match `INCLUDE_DETAILS` in `build_auto_excel.py`.
2. Ensure the Yahoo symbol has `quarterly_income_stmt` with at least one of: “Total Revenue”, “Operating Revenue” (and ideally SG&A and Operating Income). Test with:
   - `yfinance.Ticker("SYMBOL").quarterly_income_stmt`
3. If the primary symbol often fails but an ADR/other symbol works, add `SYMBOL_ALIASES` for that company.

**Optional:** Drive `GLOBAL_QUARTERLY` (or a “candidates” list) from `ticker_source_map.json` by adding a `yahoo_symbol` (and reporting currency) for non-US names, so one file defines who to try.

---

## 5. Rest stay on annual FINANCIALS

**Current behavior:** Any company in `INCLUDE_DETAILS` that is not in `latest_quarter_financials.json` uses the annual row from `FINANCIALS` in `build_auto_excel.py` (Period = fiscal year, e.g. FY2024).

No code change required. To move more names to quarterly, add them via SEC (US in `ticker_source_map.json`), Yahoo (`GLOBAL_QUARTERLY` + aliases), SEDAR+ (when implemented), or `quarterly_overrides.json`.

---

## File roles

| File | Role |
|------|------|
| `fetch_quarterly_sec.py` | US companies from SEC Company Facts (10-Q). |
| `fetch_quarterly_global_yf.py` | Canada/Europe/Korea (and Valeo) from Yahoo; `GLOBAL_QUARTERLY` + `SYMBOL_ALIASES`. |
| `quarterly_overrides.json` | Manual/scraped quarterly for Japan, HK, Mexico, Valeo, or any gap. Merged last. |
| `fetch_all_quarterly.py` | Runs SEC + Yahoo, merges overrides, writes `latest_quarter_financials.json`, runs `build_auto_excel.py`. |
| `build_auto_excel.py` | Reads `latest_quarter_financials.json`; falls back to `FINANCIALS` for names not present. Output: `auto_suppliers.xlsx`. |
