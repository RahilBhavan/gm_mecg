"""
Check that companies in build_auto_excel INCLUDE_DETAILS are present in ticker_source_map.json.

Used to ensure the pipeline can attempt SEC/Yahoo fetch for all included suppliers.
Use --strict to exit with code 1 when any INCLUDE_DETAILS company is missing from the ticker map
(e.g. in CI to enforce coverage).

Usage:
  python validate_ticker_map_coverage.py           # report only, exit 0
  python validate_ticker_map_coverage.py --strict # exit 1 if any company not in ticker map
"""
from __future__ import annotations

import json
import os
import sys

import src.build_auto_excel as build

TICKER_MAP_PATH = os.path.join(os.path.dirname(__file__), "../data", "ticker_source_map.json")


def main() -> int:
    """Report coverage; with --strict exit 1 if any INCLUDE_DETAILS company not in ticker map."""
    include_names = set(build.INCLUDE_DETAILS.keys())
    strict = "--strict" in sys.argv
    if not os.path.isfile(TICKER_MAP_PATH):
        print(f"Missing {TICKER_MAP_PATH}", file=sys.stderr)
        return 1
    with open(TICKER_MAP_PATH, encoding="utf-8") as f:
        data = json.load(f)
    in_map = {k for k in data if not k.startswith("_") and isinstance(data.get(k), dict)}
    not_in_map = sorted(include_names - in_map)
    print(f"Companies in INCLUDE_DETAILS: {len(include_names)}")
    print(f"Companies in ticker_source_map: {len(in_map)}")
    print(f"Not in map: {len(not_in_map)}")
    if not_in_map:
        for name in not_in_map[:20]:
            tier = build.INCLUDE_DETAILS[name][0]
            print(f"  {name} (Tier {tier})")
        if len(not_in_map) > 20:
            print(f"  ... and {len(not_in_map) - 20} more")
        if strict:
            print("\n--strict: failing because some companies are not in ticker map", file=sys.stderr)
            return 1
    else:
        print("OK: all INCLUDE_DETAILS companies are in ticker_source_map")
    return 0


if __name__ == "__main__":
    sys.exit(main())
