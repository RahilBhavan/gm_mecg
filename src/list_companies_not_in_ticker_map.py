"""
List companies in build_auto_excel INCLUDE_DETAILS that are not in ticker_source_map.json.

Use to drive Phase 2 of PLAN_DATA_ALL_COMPANIES.md: add ticker, exchange, data_source
(and optionally yahoo_symbol, reporting_currency for non-US) for each listed company.

Usage:
  python list_companies_not_in_ticker_map.py           # print to stdout
  python list_companies_not_in_ticker_map.py --csv     # write companies_not_in_ticker_map.csv
"""
from __future__ import annotations

import csv
import json
import os
import sys

# Import from build_auto_excel without running main()
import src.build_auto_excel as build  # noqa: E402

TICKER_MAP_PATH = os.path.join(os.path.dirname(__file__), "../data", "ticker_source_map.json")
OUTPUT_CSV = "companies_not_in_ticker_map.csv"


def main() -> None:
    include_names = set(build.INCLUDE_DETAILS.keys())
    if not os.path.isfile(TICKER_MAP_PATH):
        print(f"Missing {TICKER_MAP_PATH}", file=sys.stderr)
        sys.exit(1)
    with open(TICKER_MAP_PATH, encoding="utf-8") as f:
        data = json.load(f)
    in_map = {k for k in data if not k.startswith("_") and isinstance(data.get(k), dict)}
    not_in_map = sorted(include_names - in_map)
    print(f"Companies in INCLUDE_DETAILS: {len(include_names)}")
    print(f"Companies in ticker_source_map: {len(in_map)}")
    print(f"Not in map (need ticker/source): {len(not_in_map)}")
    print()
    for name in not_in_map:
        tier = build.INCLUDE_DETAILS[name][0]
        print(f"  {name} (Tier {tier})")
    if "--csv" in sys.argv:
        with open(OUTPUT_CSV, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["company_name", "tier", "suggested_ticker", "exchange", "data_source", "yahoo_symbol", "reporting_currency"])
            for name in not_in_map:
                tier = build.INCLUDE_DETAILS[name][0]
                w.writerow([name, tier, "", "", "", "", ""])
        print(f"\nWrote {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
