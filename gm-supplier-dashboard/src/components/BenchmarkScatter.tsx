import { useMemo } from 'react'
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useDashboard } from '@/context/DashboardContext'
import type { Supplier } from '@/types/dashboard'

const GM_BLUE = '#0057A8'
const TEAL = '#00B4D8'

type Point = {
  duns: string
  name: string
  tier: 1 | 2
  sgaPercent: number
  ebitPercent: number
}

function buildPoints(suppliers: Supplier[]): { t1: Point[]; t2: Point[] } {
  const t1: Point[] = []
  const t2: Point[] = []
  for (const s of suppliers) {
    if (s.sgaPercent == null || s.ebitPercent == null) continue
    const p: Point = {
      duns: s.duns,
      name: s.companyName,
      tier: s.tier,
      sgaPercent: s.sgaPercent,
      ebitPercent: s.ebitPercent,
    }
    if (s.tier === 1) t1.push(p)
    else t2.push(p)
  }
  return { t1, t2 }
}

/**
 * SG&A% vs EBIT% scatter with tier benchmark reference lines (PRD §5.4).
 */
export function BenchmarkScatter() {
  const { visibleSuppliers, dispatch, benchmarks, state } = useDashboard()

  const { t1, t2 } = useMemo(() => buildPoints(visibleSuppliers), [visibleSuppliers])

  const b1 = benchmarks.tier1
  const b2 = benchmarks.tier2

  return (
    <div className="h-64 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
      <p className="mb-1 px-1 text-xs font-semibold text-[var(--text-muted)]">
        Benchmark scatter (SG&A% vs EBIT%)
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            type="number"
            dataKey="sgaPercent"
            name="SG&A%"
            tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
            domain={['auto', 'auto']}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="ebitPercent"
            name="EBIT%"
            tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
            domain={['auto', 'auto']}
            tick={{ fontSize: 11 }}
          />
          {(state.tierFilter === 'ALL' || state.tierFilter === 'T1') &&
            b1.avgSgaPct != null && (
              <ReferenceLine
                x={b1.avgSgaPct}
                stroke={GM_BLUE}
                strokeDasharray="4 4"
                strokeOpacity={0.8}
              />
            )}
          {(state.tierFilter === 'ALL' || state.tierFilter === 'T1') &&
            b1.avgEbitPct != null && (
              <ReferenceLine
                y={b1.avgEbitPct}
                stroke={GM_BLUE}
                strokeDasharray="4 4"
                strokeOpacity={0.8}
              />
            )}
          {(state.tierFilter === 'ALL' || state.tierFilter === 'T2') &&
            b2.avgSgaPct != null && (
              <ReferenceLine
                x={b2.avgSgaPct}
                stroke={TEAL}
                strokeDasharray="2 6"
                strokeOpacity={0.8}
              />
            )}
          {(state.tierFilter === 'ALL' || state.tierFilter === 'T2') &&
            b2.avgEbitPct != null && (
              <ReferenceLine
                y={b2.avgEbitPct}
                stroke={TEAL}
                strokeDasharray="2 6"
                strokeOpacity={0.8}
              />
            )}
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value) =>
              typeof value === 'number'
                ? [`${(value * 100).toFixed(1)}%`, 'Ratio']
                : [String(value), '']
            }
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as Point | undefined)?.name ?? ''
            }
          />
          <Scatter
            name="Tier 1"
            data={t1}
            fill={GM_BLUE}
            onClick={(d) => {
              const p = d as unknown as Point
              if (p?.duns)
                dispatch({ type: 'SET_SUPPLIER', id: p.duns, fromList: false })
            }}
          />
          <Scatter
            name="Tier 2"
            data={t2}
            fill={TEAL}
            onClick={(d) => {
              const p = d as unknown as Point
              if (p?.duns)
                dispatch({ type: 'SET_SUPPLIER', id: p.duns, fromList: false })
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
