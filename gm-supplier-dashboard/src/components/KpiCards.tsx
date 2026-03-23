import type { ReactNode } from 'react'

import { useDashboard } from '@/context/DashboardContext'
import { formatPct1 } from '@/lib/format'

function Delta({
  delta,
  inverted,
}: {
  delta: number | null
  /** If true, positive delta is good (green). */
  inverted?: boolean
}) {
  if (delta == null || Number.isNaN(delta)) return null
  const good = inverted ? delta > 0 : delta < 0
  const color = good ? 'var(--below-bench)' : 'var(--above-bench)'
  const sign = delta > 0 ? '+' : ''
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {sign}
      {(delta * 100).toFixed(2)}pp vs bench
    </span>
  )
}

function Card({
  title,
  value,
  sub,
  border,
}: {
  title: string
  value: string
  sub: ReactNode
  border: string
}) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: border }}
    >
      <p className="text-xs font-medium text-[var(--text-muted)]">{title}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      <div className="mt-1">{sub}</div>
    </div>
  )
}

/** Four KPI stat cards (PRD §5.3). */
export function KpiCards() {
  const { kpi } = useDashboard()

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card
        title="Total suppliers in view"
        value={String(kpi.count)}
        sub={<span className="text-xs text-[var(--text-muted)]">After filters</span>}
        border="var(--gm-blue)"
      />
      <Card
        title="Avg SG&A%"
        value={formatPct1(kpi.avgSga)}
        sub={<Delta delta={kpi.deltaSgaVsBench} />}
        border="var(--accent-teal)"
      />
      <Card
        title="Avg EBIT%"
        value={formatPct1(kpi.avgEbit)}
        sub={
          <Delta delta={kpi.deltaEbitVsBench} inverted />
        }
        border="#8b5cf6"
      />
      <Card
        title="Avg SG&A + EBIT%"
        value={formatPct1(kpi.avgCombined)}
        sub={<Delta delta={kpi.deltaCombinedVsBench} />}
        border="#f59e0b"
      />
    </div>
  )
}
