"""Quarterly revenue / SG&A / operating income via Yahoo Finance for Canada, Europe, Korea.

Converts to USD using Yahoo FX pairs (or hardcoded fallbacks). Used by fetch_all_quarterly.py;
can also be run standalone to write latest_quarter_financials.json. Japanese primary listings
often lack full quarterly lines on Yahoo and are skipped here.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any

import yfinance as yf

TICKER_MAP_PATH = os.path.join(os.path.dirname(__file__), "../data", "ticker_source_map.json")

# (company_name, yahoo_symbol, reporting_currency). Keys must match build_auto_excel.py INCLUDE_DETAILS/FINANCIALS.
# To add more: append (name, symbol, currency); ensure Yahoo quarterly_income_stmt has Total/Operating Revenue (and ideally SG&A, Operating Income).
GLOBAL_QUARTERLY: list[tuple[str, str, str]] = [
    # Canada (TSX) — Yahoo used as proxy; SEDAR+ not automated (see LIMITATIONS.md)
    ("LINAMAR CORP", "LNR.TO", "CAD"),
    ("MARTINREA INTERNATIONAL INC", "MRE.TO", "CAD"),
    ("EXCO TECHNOLOGIES LTD", "XTC.TO", "CAD"),
    ("AIRBOSS OF AMERICA CORP", "BOS.TO", "CAD"),
    # Europe
    ("CONTINENTAL AKTIENGESELLSCHAFT", "CON.DE", "EUR"),
    ("THYSSENKRUPP AG", "TKA.DE", "EUR"),
    ("AB SKF", "SKF-B.ST", "SEK"),
    ("VALEO", "FR.PA", "EUR"),  # FR.PA often empty; VLEEY alias tried below
    ("BURELLE", "BUR.PA", "EUR"),
    ("MELROSE INDUSTRIES PLC", "MRO.L", "GBP"),
    ("FAURECIA", "FRVIA.PA", "EUR"),
    ("COMPAGNIE GENERALE DES ETABLISSEMEN", "ML.PA", "EUR"),  # Michelin
    ("VITESCO TECHNOLOGIES GROUP AG", "VTSC.DE", "EUR"),
    # Korea
    ("HYUNDAI MOBIS CO LTD", "012330.KS", "KRW"),
    ("POSCO HOLDINGS INC", "005490.KS", "KRW"),
    # Japan — primary TYO symbols; many lack full quarterly on Yahoo, aliases tried below
    ("NIDEC CORP", "6594.T", "JPY"),
    ("DENSO CORPORATION", "6902.T", "JPY"),
    ("AISIN CORP", "7259.T", "JPY"),
    ("NIPPON STEEL CORPORATION", "5401.T", "JPY"),
    ("SUMITOMO ELECTRIC INDUSTRIES LTD", "5802.T", "JPY"),
    ("HITACHI LTD", "6501.T", "JPY"),
    # Other (HK, Mexico)
    ("NEXTEER AUTOMOTIVE GROUP LTD", "1316.HK", "HKD"),
    ("ALFA SAB DE CV", "ALFAA.MX", "MXN"),
]

# Alternate Yahoo symbols when primary returns no quarterly P&L (ADR or other listing).
SYMBOL_ALIASES: dict[str, list[tuple[str, str]]] = {
    "VALEO": [("VLEEY", "EUR")],
    "DENSO CORPORATION": [("DNZOY", "USD")],
    "NIDEC CORP": [("NJ", "USD")],
    "HITACHI LTD": [("HTHIY", "USD")],
}


def load_quarterly_candidates_from_ticker_map() -> list[tuple[str, str, str]]:
    """Load (name, yahoo_symbol, reporting_currency) from ticker_source_map for non-US entries that have yahoo_symbol.

    Enables adding new companies to the map with yahoo_symbol + reporting_currency without editing GLOBAL_QUARTERLY.
    """
    if not os.path.isfile(TICKER_MAP_PATH):
        return []
    try:
        with open(TICKER_MAP_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return []
    out: list[tuple[str, str, str]] = []
    for name, info in data.items():
        if name.startswith("_") or not isinstance(info, dict):
            continue
        if info.get("data_source") == "US":
            continue
        sym = info.get("yahoo_symbol") or info.get("ticker")
        cur = info.get("reporting_currency")
        if not sym or not cur:
            continue
        # Build Yahoo-style symbol if exchange suffix missing (e.g. 1316 -> 1316.HK, LNR -> LNR.TO)
        if "." not in str(sym):
            ex = (info.get("exchange") or "").upper()
            suffix = {"TSX": "TO", "HKEX": "HK", "BMV": "MX", "TYO": "T", "KRX": "KS", "XETRA": "DE", "EPA": "PA", "EURONEXT": "PA", "LON": "L", "SSTO": "ST"}.get(ex, "")
            if suffix:
                sym = f"{sym}.{suffix}"
        out.append((name, str(sym), str(cur)))
    return out


FX_PAIRS = {
    "CAD": "CADUSD=X",
    "EUR": "EURUSD=X",
    "SEK": "SEKUSD=X",
    "KRW": "KRWUSD=X",
    "GBP": "GBPUSD=X",
    "JPY": "JPYUSD=X",
    "MXN": "MXNUSD=X",
    "HKD": "HKDUSD=X",
}


def _fx_to_usd(currency: str) -> float:
    """Return USD per 1 unit of foreign currency. Uses yfinance for FX_PAIRS; falls back to _fx_fallback if fetch fails."""
    if currency == "USD":
        return 1.0
    pair = FX_PAIRS.get(currency)
    if not pair:
        return 1.0
    try:
        h = yf.Ticker(pair).history(period="5d")
        if h.empty or "Close" not in h.columns:
            return _fx_fallback(currency)
        return float(h["Close"].iloc[-1])
    except Exception:
        return _fx_fallback(currency)


def _fx_fallback(currency: str) -> float:
    """Return hardcoded approximate USD rate when live FX is unavailable."""
    fallbacks = {
        "CAD": 0.71,
        "EUR": 1.08,
        "SEK": 0.092,
        "KRW": 0.00073,
        "GBP": 1.27,
        "JPY": 0.0067,
        "MXN": 0.055,
        "HKD": 0.128,
    }
    return fallbacks.get(currency, 1.0)


def _quarter_label(dt: datetime) -> str:
    """Return 'Qn YYYY' from a datetime (e.g. Q4 2025)."""
    m, y = dt.month, dt.year
    if m <= 3:
        return f"Q1 {y}"
    if m <= 6:
        return f"Q2 {y}"
    if m <= 9:
        return f"Q3 {y}"
    return f"Q4 {y}"


def _get_row(q: Any, row_names: list[str], col) -> float | None:
    """Extract the first matching value from a yfinance quarterly income dataframe row. Internal helper."""
    for name in row_names:
        if name in q.index:
            v = q.loc[name, col]
            if v is not None and v == v:
                return float(v)
    return None


def fetch_one_company(name: str, symbol: str, currency: str) -> dict[str, Any] | None:
    """Fetch latest quarter for one company; convert to USD via _fx_to_usd.

    Returns:
        Dict with period, revenue_usd, sga_usd, ebit_usd, source, or None if no quarterly revenue.
    """
    t = yf.Ticker(symbol)
    q = t.quarterly_income_stmt
    if q is None or q.empty:
        return None
    col = None
    for c in q.columns:
        rev = _get_row(q, ["Total Revenue", "Operating Revenue"], c)
        if rev is not None and rev > 0:
            col = c
            break
    if col is None:
        return None
    rev = _get_row(q, ["Total Revenue", "Operating Revenue"], col)
    sga = _get_row(
        q,
        [
            "Selling General And Administration",
            "SellingGeneralAndAdministrative",
            "General And Administrative Expense",
        ],
        col,
    )
    ebit = _get_row(
        q,
        ["Operating Income", "EBIT", "Total Operating Income As Reported"],
        col,
    )
    if rev is None:
        return None
    rate = _fx_to_usd(currency)
    period = _quarter_label(col.to_pydatetime() if hasattr(col, "to_pydatetime") else col)
    def usd(x: float | None) -> int | None:
        if x is None:
            return None
        return int(round(x * rate))

    return {
        "period": period,
        "revenue_usd": usd(rev),
        "sga_usd": usd(sga) if sga is not None else None,
        "ebit_usd": usd(ebit) if ebit is not None else None,
        "source": f"Yahoo Finance ({symbol})",
    }


def fetch_global_quarterly() -> tuple[dict[str, dict[str, Any]], list[dict[str, str]]]:
    """Iterate GLOBAL_QUARTERLY + ticker_map Yahoo candidates; try SYMBOL_ALIASES when primary has no data.

    Returns:
        Tuple of (results dict, list of skip entries {name, reason, detail}).
    """
    names_in_static = {t[0] for t in GLOBAL_QUARTERLY}
    from_map = [(n, s, c) for n, s, c in load_quarterly_candidates_from_ticker_map() if n not in names_in_static]
    combined: list[tuple[str, str, str]] = list(GLOBAL_QUARTERLY) + from_map
    out: dict[str, dict[str, Any]] = {}
    skips: list[dict[str, str]] = []
    for name, sym, cur in combined:
        rec = None
        err_msg: str | None = None
        try:
            rec = fetch_one_company(name, sym, cur)
        except Exception as e:
            err_msg = str(e)
            print(f"  Error {name} ({sym}): {e}")
        if not rec and name in SYMBOL_ALIASES:
            for alt_sym, alt_cur in SYMBOL_ALIASES[name]:
                try:
                    rec = fetch_one_company(name, alt_sym, alt_cur)
                    if rec:
                        rec["source"] = f"Yahoo Finance ({alt_sym})"
                        break
                except Exception as e2:
                    err_msg = err_msg or str(e2)
                    continue
        if rec:
            out[name] = rec
            print(f"  OK {name}: {rec['period']} rev_usd={rec['revenue_usd']}")
        else:
            reason = "error" if err_msg else "no_quarterly_revenue"
            detail = err_msg if err_msg else f"no quarterly revenue for {sym}"
            skips.append({"name": name, "reason": reason, "detail": detail})
            print(f"  Skip {name} ({sym}): no quarterly revenue")
    return out, skips


if __name__ == "__main__":
    r, _ = fetch_global_quarterly()
    path = os.path.join(os.path.dirname(__file__), "../data", "latest_quarter_financials.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(r, f, indent=2)
    print(f"Wrote {len(r)} records to {path}")
