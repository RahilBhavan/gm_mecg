import { useMemo, type ReactElement } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { toTitleCase } from '@/lib/format'
import type { Supplier } from '@/types/dashboard'

const T1_COLOR = '#0057a8'
const T2_COLOR = '#00b4d8'
const MAX_SUPPLIERS = 10
const NAME_MAX_CHARS = 14

type ChartEntry = {
  name: string
  revenue: number
  tier: 1 | 2
}

type Props = {
  suppliers: Supplier[]
  title?: string
}

export function ZoneRevenueChart({ suppliers, title }: Props): ReactElement | null {
  const data = useMemo((): ChartEntry[] => {
    return [...suppliers]
      .filter((s) => s.revenueUsd != null)
      .sort((a, b) => (b.revenueUsd ?? 0) - (a.revenueUsd ?? 0))
      .slice(0, MAX_SUPPLIERS)
      .map((s) => ({
        name: toTitleCase(s.companyName).slice(0, NAME_MAX_CHARS),
        revenue: s.revenueUsd! / 1e9,
        tier: s.tier,
      }))
  }, [suppliers])

  if (data.length === 0) return null

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          {title ?? 'Revenue — top suppliers'}
        </p>
        <div className="flex shrink-0 items-center gap-3 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ background: T1_COLOR }}
            />
            Tier 1
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ background: T2_COLOR }}
            />
            Tier 2
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(1)}B`}
            tick={{ fontSize: 10 }}
            width={44}
          />
          <Tooltip
            formatter={(v) =>
              typeof v === 'number' ? [`$${v.toFixed(2)}B`, 'Revenue'] : ['—', 'Revenue']
            }
            labelStyle={{ fontSize: 11 }}
            contentStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.tier === 1 ? T1_COLOR : T2_COLOR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
