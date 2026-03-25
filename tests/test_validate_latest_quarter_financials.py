"""Unit tests for validate_latest_quarter_financials.py."""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import src.build_auto_excel as build
from src.validate_latest_quarter_financials import main as validate_json_main

SAMPLE_COMPANY = next(iter(build.INCLUDE_DETAILS.keys()))


def test_valid_record_passes() -> None:
    """Valid latest_quarter_financials.json passes."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {
                SAMPLE_COMPANY: {
                    "period": "Q4 2025",
                    "revenue_usd": 5_000_000_000,
                    "sga_usd": 250_000_000,
                    "ebit_usd": 200_000_000,
                    "source": "SEC 10-Q",
                }
            },
            f,
        )
        path = f.name
    try:
        assert validate_json_main(path) == 0
    finally:
        Path(path).unlink(missing_ok=True)


def test_record_with_null_revenue_passes() -> None:
    """revenue_usd can be null in latest_quarter_financials (unlike overrides)."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {
                SAMPLE_COMPANY: {
                    "period": "Q1 2026",
                    "revenue_usd": None,
                    "sga_usd": None,
                    "ebit_usd": None,
                    "source": "Yahoo Finance (SYM)",
                }
            },
            f,
        )
        path = f.name
    try:
        assert validate_json_main(path) == 0
    finally:
        Path(path).unlink(missing_ok=True)


def test_unknown_company_fails() -> None:
    """Company not in INCLUDE_DETAILS fails."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "UNKNOWN COMPANY LTD": {
                    "period": "Q4 2025",
                    "revenue_usd": 1,
                    "sga_usd": None,
                    "ebit_usd": None,
                    "source": "Test",
                }
            },
            f,
        )
        path = f.name
    try:
        assert validate_json_main(path) == 1
    finally:
        Path(path).unlink(missing_ok=True)


def test_missing_required_key_fails() -> None:
    """Missing period or source fails."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {
                SAMPLE_COMPANY: {
                    "revenue_usd": 1,
                    "sga_usd": None,
                    "ebit_usd": None,
                }
            },
            f,
        )
        path = f.name
    try:
        assert validate_json_main(path) == 1
    finally:
        Path(path).unlink(missing_ok=True)


def test_wrong_type_fails() -> None:
    """revenue_usd must be number or null."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {
                SAMPLE_COMPANY: {
                    "period": "Q4 2025",
                    "revenue_usd": "not a number",
                    "sga_usd": None,
                    "ebit_usd": None,
                    "source": "Test",
                }
            },
            f,
        )
        path = f.name
    try:
        assert validate_json_main(path) == 1
    finally:
        Path(path).unlink(missing_ok=True)


def test_comment_key_ignored() -> None:
    """Keys starting with _ are ignored."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "_comment": "metadata",
                SAMPLE_COMPANY: {
                    "period": "Q4 2025",
                    "revenue_usd": 1,
                    "sga_usd": None,
                    "ebit_usd": None,
                    "source": "Test",
                },
            },
            f,
        )
        path = f.name
    try:
        assert validate_json_main(path) == 0
    finally:
        Path(path).unlink(missing_ok=True)
