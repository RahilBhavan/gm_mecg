# Plan: Quarterly / latest financial data for all companies

**Goal:** Have Period + Revenue / SG&A / EBIT for every company in `auto_suppliers.xlsx`, preferably latest quarter (Q4 2025 / Q1 2026) where possible, else annual.

**Current state (as of last run):**
- **210 companies** in the workbook (66 Tier 1, 144 Tier 2), all with some financial data.
- **38** have **quarterly** data (29 from SEC, 9 from Yahoo).
- **172** use **annual** data from `FINANCIALS` in `build_auto_excel.py`.
- **76** companies are in `ticker_source_map.json` (ticker + exchange + data_source); **134** are not.

---

## Phase 1 — Maximize coverage for companies already in `ticker_source_map.json` (76 names)

### 1.1 US (SEC) — 52 in map, 29 currently get quarterly

**Gap:** 23 US companies in the map do not get SEC quarterly.

**Actions:**
1. **Run SEC fetch with verbose logging** to see why each of the 23 is skipped:
   - "ticker not in SEC list" → fix ticker (e.g. strip suffix, use CIK lookup) or add manual CIK in a small override map.
   - "No quarterly data" → Company Facts may use different revenue tag; extend `REVENUE_CONCEPTS` in `fetch_quarterly_sec.py` or accept annual.
   - "Skip (stale period)" → Relax or make configurable the 2025/2026 filter in `fetch_quarterly_sec.py` so older latest-quarter (e.g. Q3 2025) is accepted when 2026 not yet filed.
2. **Optional:** Add a `sec_cik_overrides.json` for names whose SEC ticker differs from `ticker_source_map` (e.g. multiple share classes).
3. **Deliverable:** Document which of the 52 US get quarterly and which remain annual; aim to add at least the low-hanging fixes (stale-period relax, 1–2 extra revenue concepts).

### 1.2 Canada — 4 in map (Linamar, Martinrea, EXCO, AirBoss)

**Status:** All 4 already get quarterly via Yahoo.

**Optional (Phase 3):** Add SEDAR+ fetcher for official interim filings and merge into pipeline so TSX data can be sourced from SEDAR+ instead of or in addition to Yahoo.

### 1.3 Europe — 9 in map

**Currently get quarterly:** Continental, ThyssenKrupp, AB SKF (3). **Skip:** Valeo (FR.PA empty; VLEEY tried).

**Missing from Yahoo pass:** BURELLE, MELROSE INDUSTRIES PLC, FAURECIA, COMPAGNIE GENERALE DES ETABLISSEMEN (Michelin), VITESCO TECHNOLOGIES GROUP AG (5).

**Actions:**
1. **Add to `GLOBAL_QUARTERLY`** in `fetch_quarterly_global_yf.py` with correct Yahoo symbol + currency:
   - BURELLE → e.g. `BUR.PA` (Euronext Paris), EUR  
   - MELROSE INDUSTRIES PLC → e.g. `MRO.L` (LSE), GBP  
   - FAURECIA → e.g. `FRVIA.PA`, EUR  
   - COMPAGNIE GENERALE DES ETABLISSEMEN → Michelin `ML.PA`, EUR  
   - VITESCO TECHNOLOGIES GROUP AG → `VTSC.DE` or `VTSC.F`, EUR  
   Verify each with `yfinance.Ticker("SYMBOL").quarterly_income_stmt` before committing.
2. **Valeo:** Keep FR.PA + VLEEY alias; if both fail, add Valeo to `quarterly_overrides.json` from latest earnings release until Yahoo or another source works.
3. **Deliverable:** All 9 Europe names either in Yahoo pass or in overrides.

### 1.4 Japan / Korea — 8 in map

**Currently get quarterly:** Hyundai Mobis, POSCO (2). **Missing:** NIDEC, DENSO, AISIN, NIPPON STEEL, SUMITOMO ELECTRIC, HITACHI (6 Japan).

**Actions:**
1. **Test Yahoo symbols** (local listing + ADR if any) for the 6 Japanese names:
   - e.g. NIDEC `6594.T`, DENSO `6902.T`, AISIN `7259.T`, NIPPON STEEL `5401.T`, SUMITOMO ELECTRIC `5802.T`, HITACHI `6501.T`.  
   If `quarterly_income_stmt` is empty or only EPS, try US ADR symbols (e.g. DENSO `DNZOY`, NIDEC `NJ`) and add to `SYMBOL_ALIASES`.
2. **Add to `GLOBAL_QUARTERLY`** any symbol that returns usable revenue (and ideally SG&A, operating income); add aliases for the rest.
3. **Remaining gaps:** Populate `quarterly_overrides.json` from earnings releases / IR (TDnet, company IR, or manual) for companies where Yahoo never has usable quarterly P&L.
4. **Deliverable:** All 8 Japan_Korea names have either Yahoo quarterly or overrides.

### 1.5 Other (HK, Mexico) — 2 in map

- **NEXTEER AUTOMOTIVE GROUP LTD** (HKEx 1316): Add Yahoo symbol (e.g. `1316.HK`, HKD) to `GLOBAL_QUARTERLY`; if no quarterly on Yahoo, add to overrides.
- **ALFA SAB DE CV** (Nemak; BMV): Add Yahoo symbol (e.g. `ALFAA.MX`, MXN) to `GLOBAL_QUARTERLY`; if no quarterly, add to overrides.

**Deliverable:** Both have quarterly or overrides.

---

## Phase 2 — Add the remaining 134 companies to the data pipeline

**Constraint:** These 134 are in `INCLUDE_DETAILS` and `FINANCIALS` but not in `ticker_source_map.json`, so they are never attempted by SEC or Yahoo.

**Actions:**
1. **List the 134** — Script or one-off: from `build_auto_excel.py` `INCLUDE_DETAILS`, list names not in `ticker_source_map.json`. Optionally output a CSV: `name, tier, suggested_ticker, exchange, data_source`.
2. **Research and fill `ticker_source_map.json`** — For each of the 134, determine:
   - Primary exchange and ticker (and, if useful, `yahoo_symbol` and reporting currency for non-US).
   - `data_source`: US, Canada, Europe, Japan_Korea, China, Other.
   This can be done in batches (e.g. by tier or region) and validated with a small script that checks SEC ticker list (US) and Yahoo `quarterly_income_stmt` (non-US).
3. **Extend SEC and Yahoo passes:**
   - US names: already driven by `ticker_source_map`; once added, next `fetch_all_quarterly.py` will attempt them.
   - Non-US names: add to `GLOBAL_QUARTERLY` (and `SYMBOL_ALIASES` where needed) using the same naming as `INCLUDE_DETAILS`.
4. **Overrides for hard cases:** Companies with no usable SEC/Yahoo quarterly (e.g. many Japan, HK, Mexico) go into `quarterly_overrides.json`; source data from IR or a paid provider and update overrides periodically.
5. **Deliverable:** All 210 companies have an explicit data path (SEC, Yahoo, SEDAR+, or overrides), and the pipeline produces quarterly for as many as possible and annual fallback for the rest.

---

## Phase 3 — Automation and optional data sources

### 3.1 SEDAR+ (Canada)

- Implement `fetch_quarterly_sedar.py`: map `data_source: "Canada"` from ticker map to SEDAR+ issuer, fetch latest interim/quarterly filing, parse revenue / SG&A / operating income (PDF/HTML or LLM), output same JSON schema.
- Merge SEDAR+ results in `fetch_all_quarterly.py` (e.g. before Yahoo so SEDAR+ overrides Yahoo for Canadian names if desired).

### 3.2 Yahoo driven by ticker map

- Add optional fields to `ticker_source_map.json`: `yahoo_symbol`, `reporting_currency`.
- Generate `GLOBAL_QUARTERLY` (or a “candidates” list) from the map for non-US names so adding a company in one place auto-includes it in the Yahoo fetch. Reduces duplicate maintenance between map and `fetch_quarterly_global_yf.py`.

### 3.3 Paid or alternative API (Japan / HK / Mexico)

- For names where Yahoo and overrides are insufficient, integrate one provider (e.g. Financial Modeling Prep, Alpha Vantage, Refinitiv, or Bloomberg) that offers quarterly P&L for these regions.
- New script outputs the same `latest_quarter_financials.json` schema; merge in `fetch_all_quarterly.py` (e.g. after SEC/Yahoo, before overrides).

### 3.4 Overrides refresh process

- Define a cadence (e.g. quarterly post–earnings) to update `quarterly_overrides.json` from IR/earnings for Japan, HK, Mexico, Valeo, and any other gap names.
- Optionally add a small script that validates override keys against `INCLUDE_DETAILS` and schema (period, revenue_usd, sga_usd, ebit_usd, source).

---

## Summary checklist

| Phase | Scope | Outcome |
|-------|--------|--------|
| **1.1** | US (52 in map) | Fix SEC skips (stale period, concepts, CIK); document and increase quarterly count. |
| **1.2** | Canada (4) | Already 4/4; optional SEDAR+ later. |
| **1.3** | Europe (9) | Add 5 to GLOBAL_QUARTERLY; Valeo via alias or overrides. |
| **1.4** | Japan_Korea (8) | Add 6 to Yahoo/aliases where usable; rest overrides. |
| **1.5** | Other (2) | Nexteer, Alfa in GLOBAL_QUARTERLY or overrides. |
| **2** | 134 not in map | Add all to ticker_source_map + GLOBAL_QUARTERLY (non-US); run pipeline; fill gaps with overrides. |
| **3** | Automation | SEDAR+ fetcher; optional Yahoo-from-map; optional paid API; overrides refresh. |

**Success metric:** Every one of the 210 companies has a defined source (SEC, Yahoo, SEDAR+, overrides, or annual FINANCIALS), and the number with latest-quarter data is maximized given current and Phase 3 data sources.
