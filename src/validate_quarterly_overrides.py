"""
Validate quarterly_overrides.json: keys must exist in build_auto_excel INCLUDE_DETAILS;
each record must have period, revenue_usd (required), and optionally sga_usd, ebit_usd, source.

Usage:
  python validate_quarterly_overrides.py
"""
from __future__ import annotations

import json
import os
import sys

import src.build_auto_excel as build

QUARTERLY_OVERRIDES_JSON = os.path.join(os.path.dirname(__file__), "../data", "quarterly_overrides.json")
REQUIRED_KEYS = ("period", "revenue_usd")
OPTIONAL_KEYS = ("sga_usd", "ebit_usd", "source")


def main(json_path: str | None = None) -> int:
    """Validate override keys and schema. Return 0 if valid, 1 if invalid."""
    path = json_path or QUARTERLY_OVERRIDES_JSON
    include_names = set(build.INCLUDE_DETAILS.keys())
    if not os.path.isfile(path):
        print(f"OK: {path} not present (nothing to validate)")
        return 0
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    errors: list[str] = []
    for key, val in data.items():
        if key.startswith("_"):
            continue
        if key not in include_names:
            errors.append(f"Unknown company (not in INCLUDE_DETAILS): {key}")
        if not isinstance(val, dict):
            errors.append(f"{key}: value is not a dict")
            continue
        for rk in REQUIRED_KEYS:
            if rk not in val:
                errors.append(f"{key}: missing required key '{rk}'")
        if val.get("revenue_usd") is None:
            errors.append(f"{key}: revenue_usd must be non-null")
        for k in val:
            if k not in REQUIRED_KEYS and k not in OPTIONAL_KEYS:
                errors.append(f"{key}: unknown key '{k}' (allowed: {REQUIRED_KEYS + OPTIONAL_KEYS})")
    if errors:
        for e in errors:
            print(e)
        print(f"\n{len(errors)} error(s)")
        return 1
    count = sum(1 for k in data if not k.startswith("_") and isinstance(data.get(k), dict))
    print(f"OK: {count} override(s) valid")
    return 0


if __name__ == "__main__":
    path_arg = sys.argv[1] if len(sys.argv) > 1 else None
    sys.exit(main(path_arg))
