import { useState } from 'react'

import { useDashboard } from '@/context/DashboardContext'
import { toTitleCase } from '@/lib/format'

import { ComparisonModal } from '@/components/ComparisonModal'

/**
 * Sticky bottom bar that appears when ≥1 supplier is selected for comparison.
 * Houses the comparison modal trigger and per-supplier remove pills.
 */
export function ComparisonTray() {
  const { state, dispatch, comparisonSuppliers } = useDashboard()
  const [modalOpen, setModalOpen] = useState(false)

  if (state.comparisonIds.length === 0) return null

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-[9000] shadow-[0_-2px_12px_0_rgba(0,0,0,0.12)]"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-2.5">
          <span className="shrink-0 text-[11px] font-semibold text-[var(--text-muted)]">
            Compare ({state.comparisonIds.length}/5):
          </span>

          {/* Supplier pills */}
          <div className="flex flex-1 flex-wrap gap-1.5 overflow-hidden">
            {comparisonSuppliers.map((s) => (
              <span
                key={s.duns}
                className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-2.5 py-0.5 text-[11px] font-medium dark:bg-slate-800"
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background:
                      s.tier === 1 ? '#0057a8' : '#00b4d8',
                  }}
                />
                {toTitleCase(s.companyName).split(' ')[0]}
                <button
                  type="button"
                  className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] hover:bg-black/10 dark:hover:bg-white/10"
                  aria-label={`Remove ${s.companyName} from comparison`}
                  onClick={() => dispatch({ type: 'TOGGLE_COMPARISON', id: s.duns })}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => dispatch({ type: 'CLEAR_COMPARISON' })}
            >
              Clear all
            </button>
            <button
              type="button"
              disabled={state.comparisonIds.length < 2}
              className="rounded-lg bg-[var(--gm-blue)] px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setModalOpen(true)}
            >
              Compare ({state.comparisonIds.length})
            </button>
          </div>
        </div>
      </div>

      {modalOpen && <ComparisonModal onClose={() => setModalOpen(false)} />}
    </>
  )
}
