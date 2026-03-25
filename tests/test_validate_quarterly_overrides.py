"""Unit tests for validate_quarterly_overrides.py."""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

# Import build to get a real INCLUDE_DETAILS name for fixtures
import src.build_auto_excel as build  # noqa: E402
from src.validate_quarterly_overrides import main as validate_overrides_main  # noqa: E402

# Use a company that exists in INCLUDE_DETAILS
SAMPLE_COMPANY = next(iter(build.INCLUDE_DETAILS.keys()))


def test_override_valid_single_record() -> None:
    """Valid override with required keys passes."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {
                SAMPLE_COMPANY: {
                    "period": "Q4 2025",
                    "revenue_usd": 1_000_000,
                    "sga_usd": 100_000,
                    "ebit_usd": 50_000,
                    "source": "Manual",
                }
            },
            f,
        )
        path = f.name
    try:
        assert validate_overrides_main(path) == 0
    finally:
        Path(path).unlink(missing_ok=True)


def test_override_missing_required_key_fails() -> None:
    """Missing period or revenue_usd fails."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {SAMPLE_COMPANY: {"revenue_usd": 1_000_000}},
            f,
        )
        path = f.name
    try:
        assert validate_overrides_main(path) == 1
    finally:
        Path(path).unlink(missing_ok=True)


def test_override_unknown_company_fails() -> None:
    """Company not in INCLUDE_DETAILS fails."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {"NOT A REAL COMPANY XYZ": {"period": "Q4 2025", "revenue_usd": 1}},
            f,
        )
        path = f.name
    try:
        assert validate_overrides_main(path) == 1
    finally:
        Path(path).unlink(missing_ok=True)


def test_override_revenue_null_fails() -> None:
    """revenue_usd must be non-null in overrides."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {SAMPLE_COMPANY: {"period": "Q4 2025", "revenue_usd": None}},
            f,
        )
        path = f.name
    try:
        assert validate_overrides_main(path) == 1
    finally:
        Path(path).unlink(missing_ok=True)


def test_override_unknown_key_fails() -> None:
    """Unknown key in record fails."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(
            {
                SAMPLE_COMPANY: {
                    "period": "Q4 2025",
                    "revenue_usd": 1,
                    "extra_key": "not allowed",
                }
            },
            f,
        )
        path = f.name
    try:
        assert validate_overrides_main(path) == 1
    finally:
        Path(path).unlink(missing_ok=True)
