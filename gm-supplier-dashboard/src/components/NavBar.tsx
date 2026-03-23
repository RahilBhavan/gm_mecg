import { useState, useRef, useEffect, type ReactElement } from 'react'

import { useDashboard } from '@/context/DashboardContext'
import { exportToCsv } from '@/lib/exportCsv'
import { exportToXlsx } from '@/lib/exportXlsx'
import type { TierFilter } from '@/types/dashboard'

function tierBtn(
  active: boolean,
  label: string,
  onClick: () => void,
): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[var(--gm-blue)] shadow-sm'
          : 'rounded-full px-4 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10'
      }
    >
      {label}
    </button>
  )
}

/** Split-button: primary = Excel export, secondary dropdown = CSV. */
function ExportMenu({ onExcel, onCsv }: { onExcel: () => void; onCsv: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        type="button"
        className="rounded-l-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10"
        title="Export filtered suppliers as Excel (.xlsx)"
        onClick={onExcel}
      >
        ↓ Excel
      </button>
      <button
        type="button"
        className="rounded-r-lg border-l border-white/20 px-1.5 py-1.5 text-xs hover:bg-white/10"
        aria-label="Export options"
        onClick={() => setOpen((v) => !v)}
      >
        ▾
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-36 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        >
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => { onExcel(); setOpen(false) }}
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => { onCsv(); setOpen(false) }}
          >
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Top navigation: tier filters, GM-only, dark mode, export, print.
 */
export function NavBar() {
  const { state, dispatch, visibleSuppliers } = useDashboard()

  const setTier = (filter: TierFilter) =>
    dispatch({ type: 'SET_TIER_FILTER', filter })

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 text-white"
      style={{ background: 'var(--gm-blue)' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-white/30 bg-white/10 text-xs font-bold"
          title="Replace with approved GM brand mark"
        >
          GM
        </span>
        <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
          PPCO Supplier Intelligence Dashboard
        </h1>
      </div>

      <nav
        className="flex shrink-0 items-center gap-1 rounded-full bg-black/15 p-1"
        aria-label="Tier filter"
      >
        {tierBtn(state.tierFilter === 'ALL', 'All Suppliers', () => setTier('ALL'))}
        {tierBtn(state.tierFilter === 'T1', 'Tier 1', () => setTier('T1'))}
        {tierBtn(state.tierFilter === 'T2', 'Tier 2', () => setTier('T2'))}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <span className="hidden sm:inline">GM Suppliers Only</span>
          <span className="sm:hidden">GM only</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-white"
            checked={state.gmOnly}
            onChange={(e) =>
              dispatch({ type: 'SET_GM_ONLY', value: e.target.checked })
            }
          />
        </label>

        <button
          type="button"
          className="rounded-lg p-2 hover:bg-white/10"
          title={state.darkMode ? 'Light mode' : 'Dark mode'}
          aria-label={state.darkMode ? 'Light mode' : 'Dark mode'}
          onClick={() => dispatch({ type: 'SET_DARK_MODE', value: !state.darkMode })}
        >
          {state.darkMode ? '☀' : '☾'}
        </button>

        <ExportMenu
          onExcel={() => exportToXlsx(visibleSuppliers)}
          onCsv={() => exportToCsv(visibleSuppliers)}
        />

        <button
          type="button"
          className="rounded-lg p-2 hover:bg-white/10 no-print"
          title="Print / Save as PDF"
          aria-label="Print"
          onClick={() => window.print()}
        >
          ⎙
        </button>
      </div>
    </header>
  )
}
