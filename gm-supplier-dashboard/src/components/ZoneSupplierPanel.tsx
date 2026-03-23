import { useEffect, useMemo, useState, type ReactElement } from 'react'

import { useDashboard } from '@/context/DashboardContext'
import { ZONE_LABELS } from '@/data/zones'
import { formatPct1, formatRevenueUsd, toTitleCase } from '@/lib/format'
import type { Supplier } from '@/types/dashboard'

type SortKey = 'revenue' | 'sga' | 'ebit'

function sortSuppliers(list: Supplier[], key: SortKey): Supplier[] {
  return [...list].sort((a, b) => {
    const va = key === 'revenue' ? (a.revenueUsd ?? -Infinity)
      : key === 'sga' ? (a.sgaPercent ?? Infinity)
      : (b.ebitPercent ?? -Infinity)
    const vb = key === 'revenue' ? (b.revenueUsd ?? -Infinity)
      : key === 'sga' ? (b.sgaPercent ?? Infinity)
      : (a.ebitPercent ?? -Infinity)
    return vb > va ? 1 : vb < va ? -1 : 0
  })
}

function SupplierRow({ supplier }: { supplier: Supplier }): ReactElement {
  const { state, dispatch } = useDashboard()
  const isSelected = state.selectedSupplierId === supplier.duns
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'SET_SUPPLIER', id: supplier.duns, fromList: false })}
      className={
        'w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ' +
        (isSelected
          ? 'border-[var(--gm-blue)] bg-[var(--gm-blue)]/10'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gm-blue)]/40')
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-[var(--text-primary)] leading-tight">
          {toTitleCase(supplier.companyName)}
        </span>
        <span className="shrink-0 text-[var(--text-muted)]">
          {formatRevenueUsd(supplier.revenueUsd)}
        </span>
      </div>
      <div className="mt-1 flex gap-3 text-[var(--text-muted)]">
        <span>SG&A: {formatPct1(supplier.sgaPercent)}</span>
        <span>EBIT: {formatPct1(supplier.ebitPercent)}</span>
      </div>
    </button>
  )
}

function TierSection({
  tier,
  suppliers,
}: {
  tier: 1 | 2
  suppliers: Supplier[]
}): ReactElement | null {
  if (suppliers.length === 0) return null
  const label = tier === 1 ? 'Tier 1' : 'Tier 2'
  const color = tier === 1 ? '#0057a8' : '#00b4d8'
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
        <h3 className="text-xs font-semibold text-[var(--text-muted)]">
          {label} — {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
        </h3>
      </div>
      <div className="flex flex-col gap-1.5">
        {suppliers.map((s) => (
          <SupplierRow key={s.duns} supplier={s} />
        ))}
      </div>
    </div>
  )
}

/**
 * Full-height slide-in drawer listing every supplier in the active zone.
 * Grouped by Tier 1 / Tier 2, sortable, scrollable.
 * Opens when `state.activeZoneId` is set; closes on X or backdrop click.
 */
export function ZoneSupplierPanel(): ReactElement | null {
  const { state, dispatch, visibleSuppliers } = useDashboard()
  const [sortKey, setSortKey] = useState<SortKey>('revenue')

  const isOpen = state.activeZoneId != null

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'SET_ZONE', zone: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, dispatch])

  const sorted = useMemo(() => sortSuppliers(visibleSuppliers, sortKey), [visibleSuppliers, sortKey])
  const tier1 = useMemo(() => sorted.filter((s) => s.tier === 1), [sorted])
  const tier2 = useMemo(() => sorted.filter((s) => s.tier === 2), [sorted])

  if (!isOpen || !state.activeZoneId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9997] bg-black/20"
        aria-hidden
        onClick={() => dispatch({ type: 'SET_ZONE', zone: null })}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Suppliers in ${ZONE_LABELS[state.activeZoneId]}`}
        className="fixed inset-y-0 right-0 z-[9998] flex w-80 flex-col bg-[var(--surface)] shadow-2xl"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-start justify-between gap-3 p-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Zone
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] leading-tight">
              {ZONE_LABELS[state.activeZoneId]}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {visibleSuppliers.length} supplier{visibleSuppliers.length !== 1 ? 's' : ''} in view
            </p>
          </div>
          <button
            type="button"
            className="mt-0.5 shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close panel"
            onClick={() => dispatch({ type: 'SET_ZONE', zone: null })}
          >
            ✕
          </button>
        </div>

        {/* Sort controls */}
        <div
          className="flex shrink-0 items-center gap-1 px-4 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="mr-1 text-[10px] text-[var(--text-muted)]">Sort:</span>
          {(['revenue', 'sga', 'ebit'] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSortKey(k)}
              className={
                'rounded px-2 py-0.5 text-[10px] font-medium transition-colors ' +
                (sortKey === k
                  ? 'bg-[var(--gm-blue)] text-white'
                  : 'text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10')
              }
            >
              {k === 'revenue' ? 'Revenue' : k === 'sga' ? 'SG&A%' : 'EBIT%'}
            </button>
          ))}
        </div>

        {/* Supplier list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {visibleSuppliers.length === 0 ? (
            <p className="text-center text-sm text-[var(--text-muted)]">
              No suppliers match the current filters.
            </p>
          ) : (
            <>
              <TierSection tier={1} suppliers={tier1} />
              <TierSection tier={2} suppliers={tier2} />
            </>
          )}
        </div>
      </aside>
    </>
  )
}
