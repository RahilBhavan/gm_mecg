/** Zone identifiers for Tahoe hotspot map (PRD §6.2). */
export type ZoneId =
  | 'Z01'
  | 'Z02'
  | 'Z03'
  | 'Z04'
  | 'Z05'
  | 'Z06'
  | 'Z07'
  | 'Z08'
  | 'Z09'
  | 'Z10'
  | 'Z11'
  | 'Z12'
  | 'Z13'
  | 'Z14'

export type TierFilter = 'ALL' | 'T1' | 'T2'

export type Tier = 1 | 2

/** One supplier row after build-time enrichment. */
export type Supplier = {
  duns: string
  companyName: string
  tier: Tier
  period: string
  revenueUsd: number | null
  sgaUsd: number | null
  ebitUsd: number | null
  sgaPercent: number | null
  ebitPercent: number | null
  sgaEbitPercent: number | null
  oemCustomers: string
  automotiveParts: string
  fiscalYear: string
  source: string
  isGMSupplier: boolean
  partZones: ZoneId[]
  country: string | null
  iso2: string | null
  hqRegion: string | null
}

export type TierBenchmarks = {
  avgSgaPct: number | null
  avgEbitPct: number | null
  avgSgaEbitPct: number | null
}

export type Benchmarks = {
  tier1: TierBenchmarks
  tier2: TierBenchmarks
}

export type DashboardData = {
  suppliers: Supplier[]
  benchmarks: Benchmarks
  methodology: string
}
