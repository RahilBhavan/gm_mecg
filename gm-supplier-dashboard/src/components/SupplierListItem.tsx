import { useDashboard } from '@/context/DashboardContext'
import { formatPct1, formatRevenueUsd, toTitleCase } from '@/lib/format'
import type { Supplier } from '@/types/dashboard'

function pctBar(
  value: number | null,
  bench: number | null,
  label: string,
): React.ReactElement {
  const cap = Math.max(value ?? 0, bench ?? 0, 0.01) * 1.15
  const w = value != null ? (value / cap) * 100 : 0
  const bw = bench != null ? (bench / cap) * 100 : 0
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
        <span>{label}</span>
        <span>{formatPct1(value)}</span>
      </div>
      <div className="relative mt-0.5 h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
        <div
          className="absolute bottom-0 left-0 top-0 rounded bg-[var(--accent-teal)] opacity-90"
          style={{ width: `${w}%` }}
        />
        {bench != null && (
          <div
            className="absolute bottom-0 top-0 w-0.5 bg-[var(--gm-blue)] opacity-80"
            style={{ left: `${bw}%` }}
            title="Tier benchmark"
          />
        )}
      </div>
    </div>
  )
}

export function SupplierListItem({
  supplier,
  selected,
  onSelect,
  inComparison,
  onToggleComparison,
  atMax,
}: {
  supplier: Supplier
  selected: boolean
  onSelect: () => void
  inComparison: boolean
  onToggleComparison: () => void
  atMax: boolean
}) {
  const { benchmarks } = useDashboard()
  const sgaB =
    supplier.tier === 1 ? benchmarks.tier1.avgSgaPct : benchmarks.tier2.avgSgaPct
  const ebitB =
    supplier.tier === 1 ? benchmarks.tier1.avgEbitPct : benchmarks.tier2.avgEbitPct

  const compareDisabled = !inComparison && atMax

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect()
      }}
      className={
        'w-full cursor-pointer rounded-lg border p-3 text-left shadow-sm transition-colors ' +
        (selected
          ? 'border-2 border-[var(--gm-blue)] bg-white dark:bg-slate-900'
          : 'border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gm-blue)]/40')
      }
    >
      <div className="flex items-start justify-between gap-1.5">
        <span
          className="flex-1 text-[13px] font-medium uppercase tracking-wide text-[var(--text-primary)]"
          style={{ letterSpacing: '0.02em' }}
        >
          {toTitleCase(supplier.companyName)}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={
              supplier.tier === 1
                ? 'rounded-full bg-[var(--gm-blue)] px-2 py-0.5 text-[10px] font-bold text-white'
                : 'rounded-full bg-[var(--accent-teal)] px-2 py-0.5 text-[10px] font-bold text-white'
            }
          >
            T{supplier.tier}
          </span>
          <button
            type="button"
            title={
              inComparison
                ? 'Remove from comparison'
                : atMax
                  ? 'Comparison full (max 5)'
                  : 'Add to comparison'
            }
            aria-label={
              inComparison
                ? `Remove ${supplier.companyName} from comparison`
                : `Add ${supplier.companyName} to comparison`
            }
            disabled={compareDisabled}
            onClick={(e) => {
              e.stopPropagation()
              onToggleComparison()
            }}
            className={
              'flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold transition-colors ' +
              (inComparison
                ? 'bg-[var(--accent-teal)] text-white'
                : compareDisabled
                  ? 'cursor-not-allowed border border-[var(--border)] text-[var(--text-muted)] opacity-30'
                  : 'border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)]')
            }
          >
            {inComparison ? '✓' : '+'}
          </button>
        </div>
      </div>
      {supplier.isGMSupplier && (
        <span className="mt-1 inline-block rounded border border-[var(--gm-blue)] px-1.5 text-[10px] font-bold text-[var(--gm-blue)]">
          GM
        </span>
      )}
      {pctBar(supplier.sgaPercent, sgaB, 'SG&A%')}
      {pctBar(supplier.ebitPercent, ebitB, 'EBIT%')}
      <p className="mt-2 text-xs font-semibold tabular-nums text-[var(--text-muted)]">
        {formatRevenueUsd(supplier.revenueUsd)}
      </p>
    </div>
  )
}
