"""
Validate latest_quarter_financials.json: keys must be in build_auto_excel INCLUDE_DETAILS;
each record must have allowed keys (period, revenue_usd, sga_usd, ebit_usd, source) with correct types.

Usage:
  python validate_latest_quarter_financials.py [path_to_json]
  Default path: latest_quarter_financials.json

Exit code: 0 if valid, 1 if invalid.
"""
from __future__ import annotations

import json
import os
import sys

import src.build_auto_excel as build

DEFAULT_JSON_PATH = os.path.join(os.path.dirname(__file__), "../data", "latest_quarter_financials.json")
ALLOWED_KEYS = frozenset({"period", "revenue_usd", "sga_usd", "ebit_usd", "source"})


def validate_record(name: str, val: object) -> list[str]:
    """Validate one company record. Returns list of error messages (empty if valid)."""
    errors: list[str] = []
    if not isinstance(val, dict):
        errors.append(f"{name}: value is not a dict")
        return errors
    for key in val:
        if key not in ALLOWED_KEYS:
            errors.append(f"{name}: unknown key '{key}' (allowed: {sorted(ALLOWED_KEYS)})")
    for req in ("period", "revenue_usd", "source"):
        if req not in val:
            errors.append(f"{name}: missing required key '{req}'")
    # Type checks
    if "period" in val and val["period"] is not None and not isinstance(val["period"], str):
        errors.append(f"{name}: period must be str or null")
    if "revenue_usd" in val and val["revenue_usd"] is not None:
        if not isinstance(val["revenue_usd"], (int, float)):
            errors.append(f"{name}: revenue_usd must be number or null")
    if "sga_usd" in val and val["sga_usd"] is not None:
        if not isinstance(val["sga_usd"], (int, float)):
            errors.append(f"{name}: sga_usd must be number or null")
    if "ebit_usd" in val and val["ebit_usd"] is not None:
        if not isinstance(val["ebit_usd"], (int, float)):
            errors.append(f"{name}: ebit_usd must be number or null")
    if "source" in val and val["source"] is not None and not isinstance(val["source"], str):
        errors.append(f"{name}: source must be str or null")
    return errors


def main(json_path: str | None = None) -> int:
    """Validate JSON file. Return 0 if valid, 1 if invalid."""
    path = json_path or DEFAULT_JSON_PATH
    include_names = set(build.INCLUDE_DETAILS.keys())
    if not os.path.isfile(path):
        print(f"OK: {path} not present (nothing to validate)")
        return 0
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"Error reading {path}: {e}")
        return 1
    if not isinstance(data, dict):
        print(f"Error: {path} root must be a dict")
        return 1
    errors: list[str] = []
    for key, val in data.items():
        if key.startswith("_"):
            continue
        if key not in include_names:
            errors.append(f"Unknown company (not in INCLUDE_DETAILS): {key}")
        errors.extend(validate_record(key, val))
    if errors:
        for e in errors:
            print(e)
        print(f"\n{len(errors)} error(s)")
        return 1
    count = sum(1 for k in data if not k.startswith("_") and isinstance(data.get(k), dict))
    print(f"OK: {count} record(s) valid")
    return 0


if __name__ == "__main__":
    path_arg = sys.argv[1] if len(sys.argv) > 1 else None
    sys.exit(main(path_arg))
