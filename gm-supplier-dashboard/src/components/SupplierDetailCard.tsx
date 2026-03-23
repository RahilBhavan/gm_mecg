import { formatPct1, formatRevenueUsd, toTitleCase } from '@/lib/format'
import type { Supplier } from '@/types/dashboard'

import { MiniBarChart } from '@/components/MiniBarChart'

function MetricBox({
  label,
  value,
  delta,
  goodIfPositive = false,
}: {
  label: string
  value: string
  delta: number | null
  /** If true, positive delta is favourable (green). */
  goodIfPositive?: boolean
}) {
  const good =
    delta != null
      ? goodIfPositive
        ? delta > 0
        : delta < 0
      : null
  const color =
    good == null ? 'var(--text-muted)' : good ? 'var(--below-bench)' : 'var(--above-bench)'
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white/50 p-2 dark:bg-slate-900/50">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {delta != null && (
        <p className="text-xs font-medium tabular-nums" style={{ color }}>
          {delta > 0 ? '+' : ''}
          {(delta * 100).toFixed(2)}pp vs bench
        </p>
      )}
    </div>
  )
}

export function SupplierDetailCard({
  supplier,
  benchSga,
  benchEbit,
  benchCombined,
}: {
  supplier: Supplier
  benchSga: number | null
  benchEbit: number | null
  benchCombined: number | null
}) {
  const dSga =
    supplier.sgaPercent != null && benchSga != null
      ? supplier.sgaPercent - benchSga
      : null
  const dEbit =
    supplier.ebitPercent != null && benchEbit != null
      ? supplier.ebitPercent - benchEbit
      : null
  const dCombo =
    supplier.sgaEbitPercent != null && benchCombined != null
      ? supplier.sgaEbitPercent - benchCombined
      : null

  const oems = supplier.oemCustomers
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const parts = supplier.automotiveParts
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {toTitleCase(supplier.companyName)}
        </h2>
        <span
          className={
            supplier.tier === 1
              ? 'rounded-full bg-[var(--gm-blue)] px-2 py-0.5 text-xs font-bold text-white'
              : 'rounded-full bg-[var(--accent-teal)] px-2 py-0.5 text-xs font-bold text-white'
          }
        >
          Tier {supplier.tier}
        </span>
        <span className="text-sm text-[var(--text-muted)]">{supplier.period}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricBox label="Revenue" value={formatRevenueUsd(supplier.revenueUsd)} delta={null} />
        <MetricBox
          label="SG&A (USD)"
          value={
            supplier.sgaUsd != null
              ? `$${(supplier.sgaUsd / 1e9).toFixed(2)}B`
              : '—'
          }
          delta={null}
        />
        <MetricBox
          label="EBIT (USD)"
          value={
            supplier.ebitUsd != null
              ? `$${(supplier.ebitUsd / 1e9).toFixed(2)}B`
              : '—'
          }
          delta={null}
        />
        <MetricBox label="SG&A%" value={formatPct1(supplier.sgaPercent)} delta={dSga} />
        <MetricBox
          label="EBIT%"
          value={formatPct1(supplier.ebitPercent)}
          delta={dEbit}
          goodIfPositive
        />
        <MetricBox label="SG&A+EBIT%" value={formatPct1(supplier.sgaEbitPercent)} delta={dCombo} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-[var(--text-muted)]">Parts supplied</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {parts.slice(0, 20).map((p) => (
            <span
              key={p}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-0.5 text-xs dark:bg-slate-900"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-[var(--text-muted)]">OEM customers</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {oems.map((o) => (
            <span
              key={o}
              className={
                /general motors/i.test(o)
                  ? 'rounded-md border border-[var(--gm-blue)] bg-[var(--gm-blue)]/10 px-2 py-0.5 text-xs font-medium text-[var(--gm-blue)]'
                  : 'rounded-md border border-[var(--border)] px-2 py-0.5 text-xs'
              }
            >
              {o}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-[var(--text-muted)]">
        <span aria-hidden>ℹ</span>
        <span>{supplier.source || '—'}</span>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold text-[var(--text-muted)]">
          vs tier benchmark
        </p>
        <MiniBarChart
          sgaPct={supplier.sgaPercent}
          ebitPct={supplier.ebitPercent}
          benchSga={benchSga}
          benchEbit={benchEbit}
        />
      </div>
    </div>
  )
}
