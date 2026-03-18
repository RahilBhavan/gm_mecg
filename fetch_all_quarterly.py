"""
Run SEC (US) + Yahoo Finance (Canada/Europe/Korea), merge, write latest_quarter_financials.json, rebuild Excel.

Run from project root. Writes latest_quarter_financials.json then runs build_auto_excel.py.
Merge order: global (YF) first, then US (SEC) so US overwrites when the same company exists in both;
quarterly_overrides.json fills gaps for names with no SEC or Yahoo data (e.g. Japan/HK/Mexico).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

from fetch_quarterly_global_yf import fetch_global_quarterly

QUARTERLY_OVERRIDES_JSON = "quarterly_overrides.json"


def load_quarterly_overrides() -> dict:
    """Load manual/scraped quarterly data for names with no SEC or Yahoo data. Keys = company names (exact match)."""
    if not os.path.isfile(QUARTERLY_OVERRIDES_JSON):
        return {}
    try:
        with open(QUARTERLY_OVERRIDES_JSON, encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return {}
        return {k: v for k, v in data.items() if not k.startswith("_") and isinstance(v, dict)}
    except (json.JSONDecodeError, OSError):
        return {}


def fetch_us_quarterly() -> dict:
    """Fetch US quarterly financials from SEC EDGAR Company Facts.

    Uses ticker->CIK from SEC list; optional sec_cik_overrides.json for names whose ticker
    is not in SEC list. Respects ACCEPT_ANY_LATEST_QUARTER env (default: only 2025/2026).
    """
    import time

    from fetch_quarterly_sec import (
        ACCEPT_ANY_LATEST_QUARTER,
        SEC_FACTS_BASE,
        build_ticker_to_cik,
        fetch_json,
        get_latest_quarter_values,
        load_cik_overrides,
        load_ticker_map,
    )

    ticker_map = load_ticker_map()
    ticker_to_cik = build_ticker_to_cik()
    cik_overrides = load_cik_overrides()
    results = {}
    for name, info in ticker_map.items():
        ticker = (info.get("ticker") or "").upper()
        cik = cik_overrides.get(name) or ticker_to_cik.get(ticker)
        if not cik:
            continue
        try:
            time.sleep(0.2)
            data = fetch_json(SEC_FACTS_BASE.format(cik=cik))
        except Exception:
            continue
        period, rev_val, sga_val, op_val = get_latest_quarter_values(data)
        if not period and rev_val is None:
            continue
        if not ACCEPT_ANY_LATEST_QUARTER and period and "2025" not in period and "2026" not in period:
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
    return results


def main() -> None:
    """Run full pipeline: SEC US fetch, YF global fetch, merge (US overwrites same key), overrides, write JSON, build Excel."""
    print("=== SEC US (2025/2026) ===")
    us = fetch_us_quarterly()
    print(f"  {len(us)} companies")
    print("=== Yahoo Finance (Canada / Europe / Korea) ===")
    gl = fetch_global_quarterly()
    print(f"  {len(gl)} companies")
    # Merge: global first, then US so US overwrites when same company key
    merged = {**gl, **us}
    overrides = load_quarterly_overrides()
    n_before = len(merged)
    for name, rec in overrides.items():
        if name in merged:
            continue
        if isinstance(rec, dict) and rec.get("revenue_usd") is not None:
            merged[name] = rec
            print(f"  Override: {name} -> {rec.get('period', '')} rev={rec.get('revenue_usd')}")
    n_added = len(merged) - n_before
    if n_added:
        print(f"  Filled {n_added} gaps from {QUARTERLY_OVERRIDES_JSON}")
    path = "latest_quarter_financials.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)
    print(f"Merged {len(merged)} total -> {path}")
    subprocess.run([sys.executable, "build_auto_excel.py"], check=True)


if __name__ == "__main__":
    main()
