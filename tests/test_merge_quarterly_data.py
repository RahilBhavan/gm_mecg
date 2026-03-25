"""Unit tests for merge_quarterly_data in fetch_all_quarterly."""
from __future__ import annotations

import pytest

from src.fetch_all_quarterly import merge_quarterly_data


def test_us_overwrites_global_for_same_key() -> None:
    """When same company is in both global and US, US wins."""
    gl = {"ACME CORP": {"period": "Q3 2025", "revenue_usd": 100, "source": "Yahoo"}}
    us = {"ACME CORP": {"period": "Q4 2025", "revenue_usd": 120, "source": "SEC 10-Q"}}
    overrides = {}
    merged = merge_quarterly_data(gl, us, overrides)
    assert merged["ACME CORP"]["period"] == "Q4 2025"
    assert merged["ACME CORP"]["revenue_usd"] == 120
    assert merged["ACME CORP"]["source"] == "SEC 10-Q"


def test_overrides_fill_gaps_only() -> None:
    """Overrides add companies not in global or US; they do not overwrite."""
    gl = {"A": {"period": "Q4 2025", "revenue_usd": 10, "source": "Y"}}
    us = {}
    overrides = {
        "A": {"period": "Q3 2025", "revenue_usd": 9, "source": "Override"},
        "B": {"period": "Q4 2025", "revenue_usd": 20, "source": "Override"},
    }
    merged = merge_quarterly_data(gl, us, overrides)
    assert merged["A"]["revenue_usd"] == 10  # gl already had A, override not used
    assert merged["B"]["revenue_usd"] == 20  # B added from override


def test_override_with_null_revenue_not_added() -> None:
    """Override record with revenue_usd None is not merged."""
    gl = {}
    us = {}
    overrides = {"C": {"period": "Q4 2025", "revenue_usd": None, "source": "X"}}
    merged = merge_quarterly_data(gl, us, overrides)
    assert "C" not in merged


def test_merge_order_global_then_us() -> None:
    """Result contains all keys from global and US with US taking precedence."""
    gl = {"G1": {"period": "Q4 2025", "revenue_usd": 1, "source": "Y"}}
    us = {"U1": {"period": "Q4 2025", "revenue_usd": 2, "source": "SEC"}}
    merged = merge_quarterly_data(gl, us, {})
    assert set(merged.keys()) == {"G1", "U1"}
    assert merged["G1"]["revenue_usd"] == 1
    assert merged["U1"]["revenue_usd"] == 2
