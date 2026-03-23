import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useDashboard } from '@/context/DashboardContext'
import { exportToXlsx } from '@/lib/exportXlsx'
import { formatPct1, formatRevenueUsd, toTitleCase } from '@/lib/format'
import type { Supplier } from '@/types/dashboard'

const COMPARISON_COLORS = ['#0057a8', '#00b4d8', '#22c55e', '#f59e0b', '#ef4444']

function shortName(name: string): string {
  const words = toTitleCase(name).split(' ')
  return words.length > 2 ? `${words[0]} ${words[1]}` : words.join(' ')
}

const METRICS: { label: string; getValue: (s: Supplier) => string }[] = [
  { label: 'Tier', getValue: (s) => `T${s.tier}` },
  { label: 'Revenue', getValue: (s) => formatRevenueUsd(s.revenueUsd) },
  { label: 'SG&A %', getValue: (s) => formatPct1(s.sgaPercent) },
  { label: 'EBIT %', getValue: (s) => formatPct1(s.ebitPercent) },
  { label: 'Combined %', getValue: (s) => formatPct1(s.sgaEbitPercent) },
  { label: 'OEM Customers', getValue: (s) => s.oemCustomers || '—' },
  { label: 'Parts', getValue: (s) => s.automotiveParts || '—' },
  { label: 'Period', getValue: (s) => s.fiscalYear },
  { label: 'Source', getValue: (s) => s.source || '—' },
]

type Props = { onClose: () => void }

export function ComparisonModal({ onClose }: Props) {
  const { comparisonSuppliers } = useDashboard()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ratioData = comparisonSuppliers.map((s) => ({
    name: shortName(s.companyName),
    'SG&A%': s.sgaPercent != null ? parseFloat((s.sgaPercent * 100).toFixed(2)) : null,
    'EBIT%': s.ebitPercent != null ? parseFloat((s.ebitPercent * 100).toFixed(2)) : null,
    'Combined%':
      s.sgaEbitPercent != null ? parseFloat((s.sgaEbitPercent * 100).toFixed(2)) : null,
  }))

  const revenueData = comparisonSuppliers.map((s) => ({
    name: shortName(s.companyName),
    Revenue: s.revenueUsd != null ? parseFloat((s.revenueUsd / 1e9).toFixed(2)) : null,
  }))

  const node = (
    <>
      <div
        className="fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Supplier Comparison"
        className="fixed inset-4 z-[9991] flex flex-col overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl md:inset-8"
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Supplier Comparison —{' '}
            <span className="text-[var(--gm-blue)]">
              {comparisonSuppliers.length} supplier
              {comparisonSuppliers.length !== 1 ? 's' : ''}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => exportToXlsx(comparisonSuppliers, 'comparison.xlsx')}
            >
              Export Excel
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Close comparison"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {/* Ratio chart */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              SG&A% · EBIT% · Combined%
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ratioData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} width={36} />
                <Tooltip
                  formatter={(v) =>
                    typeof v === 'number' ? `${v.toFixed(2)}%` : '—'
                  }
                  contentStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="SG&A%" fill="#0057a8" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="EBIT%" fill="#00b4d8" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Combined%" fill="#7c3aed" radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Revenue chart */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Revenue ($B)
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={revenueData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `$${v}B`}
                  width={44}
                />
                <Tooltip
                  formatter={(v) =>
                    typeof v === 'number' ? [`$${v.toFixed(2)}B`, 'Revenue'] : ['—', 'Revenue']
                  }
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="Revenue" radius={[3, 3, 0, 0]} maxBarSize={60}>
                  {comparisonSuppliers.map((_, i) => (
                    <Cell key={i} fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Full comparison table */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Full Comparison
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="w-28 py-2.5 pl-4 pr-3 text-left text-[11px] font-medium text-[var(--text-muted)]">
                      Metric
                    </th>
                    {comparisonSuppliers.map((s, i) => (
                      <th
                        key={s.duns}
                        className="min-w-[150px] px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-primary)]"
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: COMPARISON_COLORS[i % COMPARISON_COLORS.length] }}
                          />
                          {shortName(s.companyName)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((m) => (
                    <tr
                      key={m.label}
                      className="border-b border-[var(--border)]/40 last:border-0 hover:bg-black/[.02] dark:hover:bg-white/[.02]"
                    >
                      <td className="py-2 pl-4 pr-3 text-[11px] font-medium text-[var(--text-muted)]">
                        {m.label}
                      </td>
                      {comparisonSuppliers.map((s) => (
                        <td
                          key={s.duns}
                          className="max-w-[220px] truncate px-3 py-2 text-xs text-[var(--text-primary)]"
                          title={m.getValue(s)}
                        >
                          {m.getValue(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  )

  return createPortal(node, document.body)
}
