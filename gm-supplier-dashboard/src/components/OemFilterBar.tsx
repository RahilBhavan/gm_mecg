import { useMemo } from 'react'

import { TOP_OEMS } from '@/context/DashboardContext'
import { useDashboard } from '@/context/DashboardContext'

/** Display aliases for long OEM names so chips stay compact. */
const OEM_SHORT: Record<string, string> = {
  'General Motors': 'GM',
  Volkswagen: 'VW',
  Stellantis: 'Stellantis',
  Mercedes: 'Mercedes',
}

function chipLabel(oem: string): string {
  return OEM_SHORT[oem] ?? oem
}

/**
 * Horizontal scrollable OEM filter chip row.
 * Multi-select: active chips must appear in a supplier's oemCustomers to pass the filter.
 */
export function OemFilterBar() {
  const { state, dispatch, suppliers } = useDashboard()

  /** Per-OEM supplier counts across the full unfiltered dataset. */
  const oemCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of suppliers) {
      for (const oem of s.oemCustomers.split(',').map((x) => x.trim())) {
        if (oem && oem !== 'N/A') counts.set(oem, (counts.get(oem) ?? 0) + 1)
      }
    }
    return counts
  }, [suppliers])

  const hasFilter = state.oemFilter.length > 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          OEM Customer
        </span>
        {hasFilter && (
          <button
            type="button"
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => dispatch({ type: 'CLEAR_OEM_FILTER' })}
          >
            Clear
          </button>
        )}
      </div>

      {/* Scrollable chip row */}
      <div className="flex flex-wrap gap-1.5">
        {TOP_OEMS.map((oem) => {
          const active = state.oemFilter.includes(oem)
          const count = oemCounts.get(oem) ?? 0
          return (
            <button
              key={oem}
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_OEM_FILTER', oem })}
              className={
                'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ' +
                (active
                  ? 'border-[var(--gm-blue)] bg-[var(--gm-blue)] text-white'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--gm-blue)]/50 hover:text-[var(--text-primary)]')
              }
            >
              {chipLabel(oem)}
              <span
                className={
                  'rounded-full px-1 text-[9px] font-bold ' +
                  (active ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10')
                }
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
