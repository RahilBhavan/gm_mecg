# GM Supplier Intelligence Dashboard

React + TypeScript + Vite SPA for PPCO-style supplier benchmarking. Consumes `auto_suppliers.xlsx` from the repo root at **build time** and ships static assets (no backend).

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node 20+
- From **repository root**: a current `auto_suppliers.xlsx` (run `python build_auto_excel.py` or the full `fetch_all_quarterly.py` pipeline)

## Commands

| Command | Description |
|--------|-------------|
| `bun install` | Install dependencies |
| `bun run data:build` | Parse `../auto_suppliers.xlsx` → `src/generated/dashboard-data.json` |
| `bun run dev` | Development server (run `data:build` first if JSON is missing) |
| `bun run build` | `data:build` + TypeScript + production bundle in `dist/` |
| `bun run preview` | Preview production build |
| `bun run test` | Vitest unit tests |
| `bun run lint` | ESLint |

## Data refresh

1. Regenerate Excel at repo root.
2. From this directory:
   ```bash
   bun run data:build && bun run build
   ```
3. Deploy `dist/` to any static host (GitHub Pages, Netlify, internal static hosting).

`src/generated/dashboard-data.json` is gitignored; CI and local builds must run `data:build`.

## Branding

The nav uses a **placeholder** “GM” mark. Replace with an approved General Motors logo/asset before production use.

## 3D vehicle mesh

The hotspot map stacks **SVG zones** over a **WebGL** view of `public/models/Car_tahoe.3ds` (Three.js `TDSLoader` via React Three Fiber). Place or symlink the Archibase `Car_tahoe.3DS` file there as **`Car_tahoe.3ds`** (lowercase extension is fine on macOS/Linux; adjust `MODEL_URL` in `TahoeThreeCanvas.tsx` if needed).

If WebGL or the 3DS load fails, the map falls back to the 2D silhouette in `tahoeZones.ts`. Tune **camera `zoom`**, **mesh `rotation`**, and **`Bounds` margin** in `src/components/TahoeThreeCanvas.tsx` so the side profile lines up with the SVG polygons in `tahoeZones.ts`.

## Structure

- `scripts/parseSuppliers.ts` — XLSX → JSON (benchmarks, methodology, enriched supplier rows + zone tags)
- `src/lib/zoneMatch.ts` — PRD keyword → Tahoe zone mapping (shared with parse script)
- `src/context/DashboardContext.tsx` — `useReducer` global state
- `src/components/` — Nav, KPIs, Recharts scatter, virtualised list, 3D Tahoe + SVG zones, detail card

See root `README.md` for the Python pipeline that produces the Excel workbook.
