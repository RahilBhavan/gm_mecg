"""
Run SEC (US) + Yahoo Finance (Canada/Europe/Korea), merge, write latest_quarter_financials.json, rebuild Excel.

Run from project root. Writes latest_quarter_financials.json then runs build_auto_excel.py.
Merge order: global (YF) first, then US (SEC) so US overwrites when the same company exists in both;
quarterly_overrides.json fills gaps for names with no SEC or Yahoo data (e.g. Japan/HK/Mexico).
Writes fetch_skip_report.json with companies skipped by SEC and Yahoo and the reason.
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any

from src.fetch_quarterly_global_yf import fetch_global_quarterly

logger = logging.getLogger(__name__)

QUARTERLY_OVERRIDES_JSON = os.path.join(os.path.dirname(__file__), "../data", "quarterly_overrides.json")
FETCH_SKIP_REPORT_JSON = os.path.join(os.path.dirname(__file__), "../data", "fetch_skip_report.json")


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


def merge_quarterly_data(
    global_data: dict[str, Any],
    us_data: dict[str, Any],
    overrides: dict[str, Any],
) -> dict[str, Any]:
    """Merge global (Yahoo), US (SEC), and overrides. US overwrites global for same key; overrides fill gaps only."""
    merged = {**global_data, **us_data}
    for name, rec in overrides.items():
        if name in merged:
            continue
        if isinstance(rec, dict) and rec.get("revenue_usd") is not None:
            merged[name] = rec
    return merged


def fetch_us_quarterly() -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Fetch US quarterly financials from SEC EDGAR Company Facts.

    Uses ticker->CIK from SEC list; optional sec_cik_overrides.json for names whose ticker
    is not in SEC list. Respects ACCEPT_ANY_LATEST_QUARTER env (default: only 2025/2026).

    Returns:
        Tuple of (results dict, list of skip entries {name, reason, detail}).
    """
    import time

    from urllib.error import HTTPError, URLError

    from src.fetch_quarterly_sec import (
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
    results: dict[str, Any] = {}
    skips: list[dict[str, str]] = []
    for name, info in ticker_map.items():
        ticker = (info.get("ticker") or "").upper()
        cik = cik_overrides.get(name) or ticker_to_cik.get(ticker)
        if not cik:
            skips.append({"name": name, "reason": "ticker_not_in_sec", "detail": f"ticker {ticker} not in SEC list"})
            logger.debug("Skip %s: ticker %s not in SEC list", name, ticker)
            continue
        try:
            time.sleep(0.2)
            data = fetch_json(SEC_FACTS_BASE.format(cik=cik))
        except (HTTPError, URLError, OSError, json.JSONDecodeError) as e:
            skips.append({"name": name, "reason": "error", "detail": str(e)})
            logger.warning("Error fetching %s (%s): %s", name, ticker, e)
            continue
        period, rev_val, sga_val, op_val = get_latest_quarter_values(data)
        if not period and rev_val is None:
            skips.append({"name": name, "reason": "no_quarterly", "detail": "no quarterly revenue in Company Facts"})
            logger.debug("No quarterly data: %s (%s)", name, ticker)
            continue
        if not ACCEPT_ANY_LATEST_QUARTER and period and "2025" not in period and "2026" not in period:
            skips.append({"name": name, "reason": "stale_period", "detail": period or "unknown"})
            logger.debug("Skip (stale period): %s: %s", name, period)
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
    return results, skips


def main() -> None:
    """Run full pipeline: SEC US fetch, YF global fetch, merge (US overwrites same key), overrides, write JSON, build Excel."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logger.setLevel(logging.INFO)

    print("=== SEC US (2025/2026) ===")
    us, sec_skips = fetch_us_quarterly()
    print(f"  {len(us)} companies")
    if sec_skips:
        print(f"  Skipped: {len(sec_skips)} (see fetch_skip_report.json)")
    print("=== Yahoo Finance (Canada / Europe / Korea) ===")
    gl, yf_skips = fetch_global_quarterly()
    print(f"  {len(gl)} companies")
    if yf_skips:
        print(f"  Skipped: {len(yf_skips)} (see fetch_skip_report.json)")
    # Merge: global first, then US so US overwrites when same company key; overrides fill gaps
    overrides = load_quarterly_overrides()
    merged = merge_quarterly_data(gl, us, overrides)
    n_before_override = len({**gl, **us})
    n_added = len(merged) - n_before_override
    for name, rec in overrides.items():
        if name not in gl and name not in us and isinstance(rec, dict) and rec.get("revenue_usd") is not None:
            print(f"  Override: {name} -> {rec.get('period', '')} rev={rec.get('revenue_usd')}")
    if n_added:
        print(f"  Filled {n_added} gaps from {QUARTERLY_OVERRIDES_JSON}")
    path = os.path.join(os.path.dirname(__file__), "../data", "latest_quarter_financials.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)
    print(f"Merged {len(merged)} total -> {path}")

    # Schema validation: fail pipeline if JSON is invalid
    from src.validate_latest_quarter_financials import main as validate_main
    if validate_main(path) != 0:
        logger.error("latest_quarter_financials.json validation failed; not running build_auto_excel")
        sys.exit(1)

    # Write skip report for analysts
    skip_report: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sec": {"count": len(sec_skips), "skipped": sec_skips},
        "yahoo": {"count": len(yf_skips), "skipped": yf_skips},
    }
    with open(FETCH_SKIP_REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(skip_report, f, indent=2)
    if sec_skips or yf_skips:
        print(f"Skip report -> {FETCH_SKIP_REPORT_JSON}")

    subprocess.run([sys.executable, "build_auto_excel.py"], check=True)


if __name__ == "__main__":
    main()
