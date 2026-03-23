import { useDashboard } from '@/context/DashboardContext'

export function SupplierSearch() {
  const { state, dispatch } = useDashboard()

  return (
    <div className="sticky top-0 z-10 bg-[var(--surface)] pb-2">
      <label htmlFor="supplier-search" className="sr-only">
        Search suppliers
      </label>
      <input
        id="supplier-search"
        type="search"
        placeholder="Search company or part category…"
        value={state.search}
        onChange={(e) => dispatch({ type: 'SET_SEARCH', value: e.target.value })}
        className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm placeholder:text-slate-400 focus:border-[var(--gm-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--gm-blue)] dark:bg-slate-900"
      />
    </div>
  )
}
