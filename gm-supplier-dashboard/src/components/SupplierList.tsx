import { List, type RowComponentProps } from 'react-window'

import { useDashboard } from '@/context/DashboardContext'
import type { Supplier } from '@/types/dashboard'

import { SupplierListItem } from '@/components/SupplierListItem'

const ROW_H = 118

type RowProps = {
  suppliers: Supplier[]
  selectedId: string | null
  comparisonIds: string[]
  onPick: (id: string) => void
  onToggleComparison: (id: string) => void
}

function SupplierRow({
  ariaAttributes,
  index,
  style,
  suppliers,
  selectedId,
  comparisonIds,
  onPick,
  onToggleComparison,
}: RowComponentProps<RowProps>) {
  const s = suppliers[index]
  if (!s) return null
  return (
    <div {...ariaAttributes} style={style} className="px-1 pb-2">
      <SupplierListItem
        supplier={s}
        selected={s.duns === selectedId}
        onSelect={() => onPick(s.duns)}
        inComparison={comparisonIds.includes(s.duns)}
        onToggleComparison={() => onToggleComparison(s.duns)}
        atMax={comparisonIds.length >= 5 && !comparisonIds.includes(s.duns)}
      />
    </div>
  )
}

/** Virtualised supplier list sorted by SG&A+EBIT% descending (PRD §5.5). */
export function SupplierList() {
  const { visibleSuppliers, state, dispatch, scrollRightPanelTop } =
    useDashboard()

  const onPick = (id: string) => {
    dispatch({ type: 'SET_SUPPLIER', id, fromList: true })
    scrollRightPanelTop()
  }

  const onToggleComparison = (id: string) => {
    dispatch({ type: 'TOGGLE_COMPARISON', id })
  }

  if (visibleSuppliers.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        No suppliers match the current filters.
      </p>
    )
  }

  return (
    <List<RowProps>
      rowHeight={ROW_H}
      rowCount={visibleSuppliers.length}
      rowComponent={SupplierRow}
      rowProps={{
        suppliers: visibleSuppliers,
        selectedId: state.selectedSupplierId,
        comparisonIds: state.comparisonIds,
        onPick,
        onToggleComparison,
      }}
      style={{ height: 'min(55vh, 520px)', width: '100%' }}
      className="pb-4"
    />
  )
}
