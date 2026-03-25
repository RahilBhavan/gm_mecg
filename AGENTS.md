# Agent memory (continual learning)

## Learned User Preferences

- Ask clarifying questions and share a plan before large changes to quarterly financials, `auto_suppliers.xlsx`, or substantial dashboard / PRD-scale frontend work in this repo.
- When the user attaches a plan and asks for implementation, follow it exactly, keep existing to-dos updated in order, and avoid editing the plan file itself.
- Keep README and module docstrings so contributors can run and extend the pipeline without reverse-engineering scripts.

## Learned Workspace Facts

- `shiii` is a Python pipeline: quarterly Revenue / SG&A / EBIT in USD → `latest_quarter_financials.json` → `build_auto_excel.py` → `auto_suppliers.xlsx`; companies without a quarterly row use annual `FINANCIALS` in `build_auto_excel.py`.
- US companies in `ticker_source_map.json` with `data_source` US are fetched from SEC Company Facts; optional `sec_cik_overrides.json` and env `ACCEPT_ANY_LATEST_QUARTER=1` widen coverage when tickers or periods are edge cases.
- Non-US quarterly Yahoo attempts come from `GLOBAL_QUARTERLY` in `fetch_quarterly_global_yf.py` plus any non-US map entry with `yahoo_symbol` and `reporting_currency`; `SYMBOL_ALIASES` supplies ADR fallbacks when the primary symbol has no usable P&L.
- `quarterly_overrides.json` fills names where SEC/Yahoo have no usable quarterly data (common for many Japan / HK / Mexico listings and some European symbols).
- `fetch_all_quarterly.py` runs SEC + Yahoo, merges overrides, then rebuilds the Excel; `LIMITATIONS.md` and `PLAN_DATA_ALL_COMPANIES.md` describe gaps and extension points.
- `list_companies_not_in_ticker_map.py` lists `INCLUDE_DETAILS` names missing from the ticker map (`--csv` for a fill-in template); `validate_quarterly_overrides.py` checks override keys and schema.
- `gm-supplier-dashboard/` is a Bun + Vite React SPA: `scripts/parseSuppliers.ts` reads `auto_suppliers.xlsx` at build time into `src/generated/dashboard-data.json` (gitignored); run `bun run data:build` before `bun run dev` / `bun run build`.
- The dashboard 3D map is profile-driven: `src/models/camaro-ss/profile.ts` defines model URL, camera settings, fallback silhouette, zone polygons/match order, label anchors, and mesh-path mapping; `src/models/index.ts` exports the active profile.
- The runtime 3D path is GLB-based (`/models/camaro-ss.glb`) loaded in `TahoeThreeCanvas.tsx`; `zoneMeshMap.ts` supports deterministic `meshPath -> ZoneId` mapping with projection fallback and diagnostics for unmapped meshes.
- 3D pipeline validation commands are `bun run model:convert` (checks USDZ source + GLB target pathing) and `bun run model:validate` (enforces zone/profile contracts); CI runs `model:validate` before dashboard tests/build.
- Third-party vehicle meshes require license and trademark review before external or GM-branded release.
