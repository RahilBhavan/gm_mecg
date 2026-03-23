/**
 * Build-time: read ../auto_suppliers.xlsx from repo root, emit src/generated/dashboard-data.json.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as XLSX from 'xlsx'

import type { Benchmarks, DashboardData, Supplier, Tier, TierBenchmarks } from '../src/types/dashboard'
import { matchZones } from '../src/lib/zoneMatch'

const ROOT = path.resolve(import.meta.dirname, '..')
const XLSX_PATH = path.resolve(ROOT, '..', 'auto_suppliers.xlsx')
const OUT_DIR = path.join(ROOT, 'src', 'generated')
const OUT_FILE = path.join(OUT_DIR, 'dashboard-data.json')
const COUNTRY_MAP_PATH = path.join(ROOT, 'src', 'data', 'country_map.json')

type CountryEntry = { country: string; iso2: string; hqRegion: string | null }
const countryMap: Record<string, CountryEntry> = JSON.parse(
  fs.readFileSync(COUNTRY_MAP_PATH, 'utf-8'),
)

function parseNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const s = String(v).replace(/,/g, '').trim()
  if (s === '' || s === '—') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function parseTier(v: unknown): Tier {
  const n = Number(v)
  if (n === 2) return 2
  return 1
}

function readMatrix(
  sheet: XLSX.WorkSheet,
): (string | number | null | undefined)[][] {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as (string | number | null | undefined)[][]
}

function parseSuppliersSheet(sheet: XLSX.WorkSheet): Supplier[] {
  const matrix = readMatrix(sheet)
  const headerIdx = matrix.findIndex((r) => String(r[0]).trim() === 'DUNS Number')
  if (headerIdx < 0) throw new Error('Could not find header row (DUNS Number) in data sheet')
  const headers = matrix[headerIdx].map((h) => String(h).trim())
  const col = (name: string) => {
    const i = headers.indexOf(name)
    if (i < 0) throw new Error(`Missing column: ${name}`)
    return i
  }
  const ci = {
    duns: col('DUNS Number'),
    company: col('Company Name'),
    tier: col('Tier'),
    period: col('Period'),
    revenue: col('Revenue (USD)'),
    sga: col('SG&A (USD)'),
    ebit: col('EBIT (USD)'),
    oems: col('OEM Customers'),
    parts: col('Automotive Parts / Products'),
    fiscalYear: col('Fiscal Year'),
    source: col('Source'),
  }

  const out: Supplier[] = []
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r]
    if (!row || row.every((c) => c === '' || c == null)) continue
    const name = String(row[ci.company] ?? '').trim()
    if (!name) continue
    const revenue = parseNum(row[ci.revenue])
    const sga = parseNum(row[ci.sga])
    const ebit = parseNum(row[ci.ebit])
    let sgaPercent: number | null = null
    let ebitPercent: number | null = null
    if (revenue != null && revenue > 0) {
      if (sga != null) sgaPercent = sga / revenue
      if (ebit != null) ebitPercent = ebit / revenue
    }
    const sgaEbitPercent =
      sgaPercent != null && ebitPercent != null ? sgaPercent + ebitPercent : null

    const parts = String(row[ci.parts] ?? '')
    const oems = String(row[ci.oems] ?? '')
    const partZones = matchZones(parts)
    if (partZones.length === 0 && parts.trim()) {
      console.warn(`[parseSuppliers] No zone match for: ${name}`)
    }

    const duns = String(row[ci.duns] ?? '').trim() || `row-${r}`
    const geo = countryMap[duns] ?? null

    out.push({
      duns,
      companyName: name,
      tier: parseTier(row[ci.tier]),
      period: String(row[ci.period] ?? '').trim(),
      revenueUsd: revenue,
      sgaUsd: sga,
      ebitUsd: ebit,
      sgaPercent,
      ebitPercent,
      sgaEbitPercent,
      oemCustomers: oems,
      automotiveParts: parts,
      fiscalYear: String(row[ci.fiscalYear] ?? '').trim(),
      source: String(row[ci.source] ?? '').trim(),
      isGMSupplier: /general motors/i.test(oems),
      partZones,
      country: geo?.country ?? null,
      iso2: geo?.iso2 ?? null,
      hqRegion: geo?.hqRegion ?? null,
    })
  }
  return out
}

function parseTierSummarySheet(sheet: XLSX.WorkSheet): TierBenchmarks {
  const matrix = readMatrix(sheet)
  const metrics = new Map<string, number | null>()
  for (const row of matrix) {
    const label = String(row[0] ?? '').trim()
    const raw = row[1]
    if (!label) continue
    if (label === 'Avg SG&A %' || label === 'Avg EBIT %' || label === 'Avg SG&A + EBIT %') {
      const n = parseNum(raw)
      metrics.set(label, n)
    }
  }
  return {
    avgSgaPct: metrics.get('Avg SG&A %') ?? null,
    avgEbitPct: metrics.get('Avg EBIT %') ?? null,
    avgSgaEbitPct: metrics.get('Avg SG&A + EBIT %') ?? null,
  }
}

function parseMethodology(sheet: XLSX.WorkSheet): string {
  const matrix = readMatrix(sheet)
  const lines: string[] = []
  for (const row of matrix) {
    const txt = String(row[0] ?? '').trim()
    if (txt) lines.push(txt)
  }
  return lines.join('\n')
}

function main(): void {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(
      `Missing ${XLSX_PATH}. Run python build_auto_excel.py from repo root first.`,
    )
  }
  const buf = fs.readFileSync(XLSX_PATH)
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })

  const filtered = wb.Sheets['Filtered Publics']
  if (!filtered) throw new Error('Sheet "Filtered Publics" not found')
  const suppliers = parseSuppliersSheet(filtered)

  const s1 = wb.Sheets['Tier 1 Summary']
  const s2 = wb.Sheets['Tier 2 Summary']
  if (!s1 || !s2) throw new Error('Tier summary sheets missing')
  const benchmarks: Benchmarks = {
    tier1: parseTierSummarySheet(s1),
    tier2: parseTierSummarySheet(s2),
  }

  const meth = wb.Sheets['Methodology']
  const methodology = meth ? parseMethodology(meth) : ''

  const payload: DashboardData = { suppliers, benchmarks, methodology }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf-8')
  console.log(`Wrote ${suppliers.length} suppliers → ${OUT_FILE}`)
}

main()
