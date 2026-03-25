"""Optional integration test for SEC fetch: mocked to avoid network in CI.

Tests that fetch_us_quarterly returns correctly shaped JSON when SEC responses are mocked.
Run with network (e.g. RUN_INTEGRATION_NETWORK=1) to skip mocking and hit real SEC for one company (optional).
"""
from __future__ import annotations

import os
from unittest.mock import patch

import pytest

from src.fetch_all_quarterly import fetch_us_quarterly

# Minimal SEC Company Facts-like structure for one quarter
MOCK_FACTS = {
    "facts": {
        "us-gaap": {
            "Revenues": {
                "units": {
                    "USD": [
                        {"fy": 2025, "fp": "Q4", "val": 6_000_000_000},
                    ]
                }
            },
            "SellingGeneralAndAdministrativeExpense": {
                "units": {
                    "USD": [
                        {"fy": 2025, "fp": "Q4", "val": 250_000_000},
                    ]
                }
            },
            "OperatingIncomeLoss": {
                "units": {
                    "USD": [
                        {"fy": 2025, "fp": "Q4", "val": 200_000_000},
                    ]
                }
            },
        }
    }
}


def test_fetch_us_quarterly_mocked_returns_correct_shape() -> None:
    """With mocked SEC and one company in ticker map, result has period/revenue_usd/sga_usd/ebit_usd/source."""
    # One company that exists in INCLUDE_DETAILS and is US in ticker map in real repo
    fake_name = "LEAR CORP"
    fake_ticker = "LEA"
    fake_cik = "0001234567"

    def fake_load_ticker_map():
        return {fake_name: {"ticker": fake_ticker, "exchange": "NYSE", "data_source": "US"}}

    def fake_build_ticker_to_cik():
        return {fake_ticker: fake_cik}

    def fake_load_cik_overrides():
        return {}

    def fake_fetch_json(url):
        return MOCK_FACTS

    with (
        patch("src.fetch_quarterly_sec.load_ticker_map", side_effect=fake_load_ticker_map),
        patch("src.fetch_quarterly_sec.build_ticker_to_cik", side_effect=fake_build_ticker_to_cik),
        patch("src.fetch_quarterly_sec.load_cik_overrides", side_effect=fake_load_cik_overrides),
        patch("src.fetch_quarterly_sec.fetch_json", side_effect=fake_fetch_json),
    ):
        results, skips = fetch_us_quarterly()

    assert fake_name in results
    rec = results[fake_name]
    assert rec["period"] == "Q4 2025"
    assert rec["revenue_usd"] == 6_000_000_000
    assert rec["sga_usd"] == 250_000_000
    assert rec["ebit_usd"] == 200_000_000
    assert rec["source"] == "SEC 10-Q"
