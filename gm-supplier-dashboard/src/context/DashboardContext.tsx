import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
  type RefObject,
} from 'react'

import type { Benchmarks, Supplier, TierFilter, ZoneId } from '@/types/dashboard'

import rawData from '@/generated/dashboard-data.json'

export type DashboardState = {
  selectedSupplierId: string | null
  activeZoneId: ZoneId | null
  tierFilter: TierFilter
  gmOnly: boolean
  darkMode: boolean
  search: string
  /** Triggers one-shot zone pulse when supplier picked from list (PRD §6.5). */
  pulseKey: number
  /** DUNS IDs selected for side-by-side comparison (max 5). */
  comparisonIds: string[]
  /** OEM names that must appear in supplier.oemCustomers (empty = no filter). */
  oemFilter: string[]
  /** ISO2 country code for geographic drill-down (null = all countries). */
  countryFilter: string | null
}

export type DashboardAction =
  | { type: 'SET_SUPPLIER'; id: string | null; fromList?: boolean }
  | { type: 'SET_ZONE'; zone: ZoneId | null }
  | { type: 'SET_TIER_FILTER'; filter: TierFilter }
  | { type: 'SET_GM_ONLY'; value: boolean }
  | { type: 'SET_DARK_MODE'; value: boolean }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'TOGGLE_COMPARISON'; id: string }
  | { type: 'CLEAR_COMPARISON' }
  | { type: 'TOGGLE_OEM_FILTER'; oem: string }
  | { type: 'CLEAR_OEM_FILTER' }
  | { type: 'SET_COUNTRY_FILTER'; iso2: string | null }

function dashboardReducer(
  state: DashboardState,
  action: DashboardAction,
): DashboardState {
  switch (action.type) {
    case 'SET_SUPPLIER':
      return {
        ...state,
        selectedSupplierId: action.id,
        pulseKey: action.fromList ? state.pulseKey + 1 : state.pulseKey,
      }
    case 'SET_ZONE':
      return { ...state, activeZoneId: action.zone }
    case 'SET_TIER_FILTER':
      return { ...state, tierFilter: action.filter }
    case 'SET_GM_ONLY':
      return { ...state, gmOnly: action.value }
    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.value }
    case 'SET_SEARCH':
      return { ...state, search: action.value }
    case 'TOGGLE_COMPARISON': {
      const ids = state.comparisonIds
      if (ids.includes(action.id)) {
        return { ...state, comparisonIds: ids.filter((x) => x !== action.id) }
      }
      if (ids.length >= 5) return state
      return { ...state, comparisonIds: [...ids, action.id] }
    }
    case 'CLEAR_COMPARISON':
      return { ...state, comparisonIds: [] }
    case 'TOGGLE_OEM_FILTER': {
      const active = state.oemFilter
      return {
        ...state,
        oemFilter: active.includes(action.oem)
          ? active.filter((x) => x !== action.oem)
          : [...active, action.oem],
      }
    }
    case 'CLEAR_OEM_FILTER':
      return { ...state, oemFilter: [] }
    case 'SET_COUNTRY_FILTER':
      return { ...state, countryFilter: action.iso2 }
    default:
      return state
  }
}

const initialState = (): DashboardState => ({
  selectedSupplierId: null,
  activeZoneId: null,
  tierFilter: 'ALL',
  gmOnly: false,
  darkMode:
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('gm-dash-dark') === '1',
  search: '',
  pulseKey: 0,
  comparisonIds: [],
  oemFilter: [],
  countryFilter: null,
})

type DashboardData = {
  suppliers: Supplier[]
  benchmarks: Benchmarks
  methodology: string
}

const data = rawData as DashboardData

/** Top OEMs sorted by supplier count, derived once at module load. */
export const TOP_OEMS: string[] = (() => {
  const counts = new Map<string, number>()
  for (const s of data.suppliers) {
    for (const oem of s.oemCustomers.split(',').map((x) => x.trim())) {
      if (oem && oem !== 'N/A') counts.set(oem, (counts.get(oem) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name]) => name)
})()

type Ctx = {
  state: DashboardState
  dispatch: Dispatch<DashboardAction>
  suppliers: Supplier[]
  benchmarks: Benchmarks
  methodology: string
  visibleSuppliers: Supplier[]
  selectedSupplier: Supplier | undefined
  referenceBenchmark: {
    avgSgaPct: number | null
    avgEbitPct: number | null
    avgSgaEbitPct: number | null
  }
  kpi: {
    count: number
    avgSga: number | null
    avgEbit: number | null
    avgCombined: number | null
    deltaSgaVsBench: number | null
    deltaEbitVsBench: number | null
    deltaCombinedVsBench: number | null
  }
  comparisonSuppliers: Supplier[]
  rightPanelAnchorRef: RefObject<HTMLDivElement | null>
  scrollRightPanelTop: () => void
}

const DashboardContext = createContext<Ctx | null>(null)

function tierMatch(filter: TierFilter, tier: 1 | 2): boolean {
  if (filter === 'ALL') return true
  if (filter === 'T1') return tier === 1
  return tier === 2
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/**
 * Reference benchmark for KPI deltas: tier filter picks that tier; ALL uses average of T1 and T2 metrics.
 */
function refBenchmark(bench: Benchmarks, filter: TierFilter): {
  avgSgaPct: number | null
  avgEbitPct: number | null
  avgSgaEbitPct: number | null
} {
  if (filter === 'T1') return bench.tier1
  if (filter === 'T2') return bench.tier2
  const a = bench.tier1
  const b = bench.tier2
  const pick = (
    ka: keyof typeof a,
    kb: keyof typeof b,
  ): number | null => {
    const x = a[ka]
    const y = b[kb]
    if (x != null && y != null) return (x + y) / 2
    return x ?? y ?? null
  }
  return {
    avgSgaPct: pick('avgSgaPct', 'avgSgaPct'),
    avgEbitPct: pick('avgEbitPct', 'avgEbitPct'),
    avgSgaEbitPct: pick('avgSgaEbitPct', 'avgSgaEbitPct'),
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    dashboardReducer,
    undefined,
    initialState,
  )
  const rightPanelAnchorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (state.darkMode) {
      root.classList.add('dark')
      localStorage.setItem('gm-dash-dark', '1')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('gm-dash-dark', '0')
    }
  }, [state.darkMode])

  const visibleSuppliers = useMemo(() => {
    const q = state.search.trim().toLowerCase()
    return data.suppliers
      .filter((s) => tierMatch(state.tierFilter, s.tier))
      .filter((s) => !state.gmOnly || s.isGMSupplier)
      .filter((s) => {
        if (!state.activeZoneId) return true
        return s.partZones.includes(state.activeZoneId)
      })
      .filter((s) => {
        if (state.oemFilter.length === 0) return true
        const supplierOems = s.oemCustomers.split(',').map((x) => x.trim())
        return state.oemFilter.some((oem) => supplierOems.includes(oem))
      })
      .filter((s) => {
        if (!state.countryFilter) return true
        return s.iso2 === state.countryFilter
      })
      .filter((s) => {
        if (!q) return true
        return (
          s.companyName.toLowerCase().includes(q) ||
          s.automotiveParts.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const ca = a.sgaEbitPercent ?? -1
        const cb = b.sgaEbitPercent ?? -1
        return cb - ca
      })
  }, [state.tierFilter, state.gmOnly, state.search, state.activeZoneId, state.oemFilter, state.countryFilter])

  const referenceBenchmark = useMemo(
    () => refBenchmark(data.benchmarks, state.tierFilter),
    [state.tierFilter],
  )

  const kpi = useMemo(() => {
    const withSga = visibleSuppliers
      .map((s) => s.sgaPercent)
      .filter((v): v is number => v != null)
    const withEbit = visibleSuppliers
      .map((s) => s.ebitPercent)
      .filter((v): v is number => v != null)
    const withCombo = visibleSuppliers
      .map((s) => s.sgaEbitPercent)
      .filter((v): v is number => v != null)
    const avgSga = mean(withSga)
    const avgEbit = mean(withEbit)
    const avgCombined = mean(withCombo)
    const b = referenceBenchmark
    const delta = (avg: number | null, bench: number | null) =>
      avg != null && bench != null ? avg - bench : null
    return {
      count: visibleSuppliers.length,
      avgSga,
      avgEbit,
      avgCombined,
      deltaSgaVsBench: delta(avgSga, b.avgSgaPct),
      deltaEbitVsBench: delta(avgEbit, b.avgEbitPct),
      deltaCombinedVsBench: delta(avgCombined, b.avgSgaEbitPct),
    }
  }, [visibleSuppliers, referenceBenchmark])

  const selectedSupplier = useMemo(
    () =>
      data.suppliers.find((s) => s.duns === state.selectedSupplierId) ??
      undefined,
    [state.selectedSupplierId],
  )

  const comparisonSuppliers = useMemo(
    () => data.suppliers.filter((s) => state.comparisonIds.includes(s.duns)),
    [state.comparisonIds],
  )

  const scrollRightPanelTop = useCallback(() => {
    rightPanelAnchorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      suppliers: data.suppliers,
      benchmarks: data.benchmarks,
      methodology: data.methodology,
      visibleSuppliers,
      selectedSupplier,
      comparisonSuppliers,
      referenceBenchmark,
      kpi,
      rightPanelAnchorRef,
      scrollRightPanelTop,
    }),
    [
      state,
      visibleSuppliers,
      selectedSupplier,
      comparisonSuppliers,
      referenceBenchmark,
      kpi,
      scrollRightPanelTop,
    ],
  )

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  )
}

export function useDashboard(): Ctx {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard outside DashboardProvider')
  return ctx
}
