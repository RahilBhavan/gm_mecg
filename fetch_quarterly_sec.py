"""Fetch latest quarter (Q1 2026 or Q4 2025) financials for US companies from SEC EDGAR Company Facts API.

Requires network. SEC requires a descriptive User-Agent (see USER_AGENT).
When run as __main__, fetches all US companies from ticker_source_map and writes
OUTPUT_PATH (latest_quarter_financials.json); can be used standalone or via fetch_all_quarterly.py.
"""
from __future__ import annotations

import json
import os
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# SEC requires a descriptive User-Agent (company name and contact)
USER_AGENT = "AutoSuppliersResearch/1.0 (contact@example.com)"
TICKER_MAP_PATH = "ticker_source_map.json"
OUTPUT_PATH = "latest_quarter_financials.json"
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_FACTS_BASE = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"

# XBRL concepts we need (us-gaap); order matters (first match wins)
REVENUE_CONCEPTS = [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "SalesRevenueNet",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueGoodsNet",
    "NetSales",
]
SGA_CONCEPT = "SellingGeneralAndAdministrativeExpense"
OPINC_CONCEPT = "OperatingIncomeLoss"

# When True or env ACCEPT_ANY_LATEST_QUARTER=1, include latest available quarter even if not 2025/2026
ACCEPT_ANY_LATEST_QUARTER = os.environ.get("ACCEPT_ANY_LATEST_QUARTER", "").strip() == "1"
SEC_CIK_OVERRIDES_PATH = "sec_cik_overrides.json"


def load_ticker_map() -> dict[str, dict]:
    """Load companies that have data_source US and a non-empty ticker.

    Returns:
        Dict mapping company name -> {ticker, exchange, data_source, ...}. Path from TICKER_MAP_PATH.
    """
    with open(TICKER_MAP_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {k: v for k, v in data.items() if isinstance(v, dict) and v.get("data_source") == "US" and v.get("ticker")}


def load_cik_overrides() -> dict[str, str]:
    """Load optional name -> CIK overrides (10-digit zero-padded). Used when ticker not in SEC list."""
    if not os.path.isfile(SEC_CIK_OVERRIDES_PATH):
        return {}
    try:
        with open(SEC_CIK_OVERRIDES_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return {
            k: str(v).zfill(10)
            for k, v in data.items()
            if not k.startswith("_") and isinstance(v, (str, int))
        }
    except (json.JSONDecodeError, OSError):
        return {}


def fetch_json(url: str) -> dict:
    """GET url with USER_AGENT; return parsed JSON. Raises on HTTP or connection errors."""
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def build_ticker_to_cik() -> dict[str, str]:
    """Fetch SEC company tickers and return mapping ticker_upper -> 10-digit zero-padded CIK string."""
    data = fetch_json(SEC_TICKERS_URL)
    out = {}
    for entry in data.values():
        if isinstance(entry, dict):
            ticker = entry.get("ticker")
            cik = entry.get("cik_str")
            if ticker and cik is not None:
                out[ticker.upper()] = str(cik).zfill(10)
    return out


def _get_quarters_for_concept(facts: dict, concept: str) -> list[dict]:
    """Return list of USD quarterly facts (fp in Q1–Q4) for a us-gaap concept. Internal helper."""
    us_gaap = facts.get("facts", {}).get("us-gaap", {})
    concept_data = us_gaap.get(concept)
    if not concept_data:
        return []
    units = concept_data.get("units", {}).get("USD", [])
    return [x for x in units if x.get("fp") in ("Q1", "Q2", "Q3", "Q4") and isinstance(x.get("val"), (int, float))]


def get_latest_quarter_values(facts: dict) -> tuple[str, int | float | None, int | float | None, int | float | None]:
    """Get Revenue, SG&A, EBIT for the same latest quarter.

    Prefers 2025+ quarters; tries REVENUE_CONCEPTS in order; aligns SG&A and operating income
    to the same fiscal year and period as revenue.

    Returns:
        Tuple of (period_str, revenue, sga, op_income). period_str e.g. "Q4 2025".
    """
    order = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}
    rev_q: list[dict] = []
    for concept in REVENUE_CONCEPTS:
        rev_q = _get_quarters_for_concept(facts, concept)
        if rev_q:
            break
    if not rev_q:
        return "", None, None, None
    # Prefer recent quarters (2025+)
    recent = [x for x in rev_q if x.get("fy", 0) >= 2025]
    if not recent:
        recent = rev_q
    recent.sort(key=lambda x: (x.get("fy", 0), order.get(x.get("fp", ""), 0)), reverse=True)
    best = recent[0]
    fy, fp = best.get("fy"), best.get("fp", "")
    period = f"{fp} {fy}" if fp and fy else ""
    rev_val = best.get("val")
    sga_val = None
    op_val = None
    sga_q = _get_quarters_for_concept(facts, SGA_CONCEPT)
    for x in sga_q:
        if x.get("fy") == fy and x.get("fp") == fp:
            sga_val = x.get("val")
            break
    op_q = _get_quarters_for_concept(facts, OPINC_CONCEPT)
    for x in op_q:
        if x.get("fy") == fy and x.get("fp") == fp:
            op_val = x.get("val")
            break
    return period, rev_val, sga_val, op_val


def main() -> None:
    """Load ticker map, build ticker->CIK, fetch Company Facts per US company, write OUTPUT_PATH."""
    ticker_map = load_ticker_map()
    if not ticker_map:
        print("No US companies with tickers in ticker_source_map.json")
        return
    print(f"US companies to fetch: {len(ticker_map)}")
    ticker_to_cik = build_ticker_to_cik()
    cik_overrides = load_cik_overrides()
    if cik_overrides:
        print(f"CIK overrides loaded: {len(cik_overrides)} companies")
    skip_reasons = {"ticker_not_in_sec": 0, "no_quarterly": 0, "stale_period": 0, "error": 0}
    results = {}
    for name, info in ticker_map.items():
        ticker = (info.get("ticker") or "").upper()
        cik = cik_overrides.get(name) or ticker_to_cik.get(ticker)
        if not cik:
            skip_reasons["ticker_not_in_sec"] += 1
            print(f"  Skip {name}: ticker {ticker} not in SEC list (add to sec_cik_overrides.json if CIK known)")
            continue
        url = SEC_FACTS_BASE.format(cik=cik)
        try:
            time.sleep(0.2)
            data = fetch_json(url)
        except (HTTPError, URLError) as e:
            skip_reasons["error"] += 1
            print(f"  Error {name} ({ticker}): {e}")
            continue
        period, rev_val, sga_val, op_val = get_latest_quarter_values(data)
        if not period and rev_val is None:
            skip_reasons["no_quarterly"] += 1
            print(f"  No quarterly data: {name} ({ticker})")
            continue
        if not ACCEPT_ANY_LATEST_QUARTER and period and "2025" not in period and "2026" not in period:
            skip_reasons["stale_period"] += 1
            print(f"  Skip (stale period): {name}: {period} (set ACCEPT_ANY_LATEST_QUARTER=1 to include)")
            continue
        def _int_or_float(v):
            if v is None:
                return None
            return int(v) if isinstance(v, (int, float)) and v == int(v) else v
        results[name] = {
            "period": period or "Q4 2025",
            "revenue_usd": _int_or_float(rev_val),
            "sga_usd": _int_or_float(sga_val),
            "ebit_usd": _int_or_float(op_val),
            "source": "SEC 10-Q",
        }
        print(f"  OK {name}: {period} rev={rev_val}")
    out_path = OUTPUT_PATH
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Wrote {len(results)} records to {out_path}")
    if any(skip_reasons.values()):
        print("Skip summary:", skip_reasons)


if __name__ == "__main__":
    main()
