"""Merge ticker additions into ticker_source_map.json.

Reads companies from ticker_additions_data.ADDITIONS that are in build_auto_excel.INCLUDE_DETAILS
and not already in ticker_source_map.json, then adds them to the map. Run from repo root:

  python scripts/merge_ticker_additions.py

Keeps existing _comment and all existing entries; only adds missing names.
"""
from __future__ import annotations

import json
import os
import sys

# Repo root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import build_auto_excel as build  # noqa: E402
from scripts.ticker_additions_data import ADDITIONS  # noqa: E402

TICKER_MAP_PATH = os.path.join(ROOT, "ticker_source_map.json")


def main() -> None:
    include_names = set(build.INCLUDE_DETAILS.keys())
    if not os.path.isfile(TICKER_MAP_PATH):
        print(f"Missing {TICKER_MAP_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(TICKER_MAP_PATH, encoding="utf-8") as f:
        data = json.load(f)

    in_map = {k for k in data if not k.startswith("_") and isinstance(data.get(k), dict)}
    to_add = include_names & set(ADDITIONS.keys()) - in_map

    added = 0
    for name in sorted(to_add):
        data[name] = dict(ADDITIONS[name])
        added += 1

    with open(TICKER_MAP_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Added {added} entries to {TICKER_MAP_PATH}")
    if to_add:
        for name in sorted(to_add):
            print(f"  + {name}")


if __name__ == "__main__":
    main()
