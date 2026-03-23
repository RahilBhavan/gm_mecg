import { BenchmarkScatter } from '@/components/BenchmarkScatter'
import { KpiCards } from '@/components/KpiCards'
import { OemFilterBar } from '@/components/OemFilterBar'
import { SupplierList } from '@/components/SupplierList'
import { SupplierSearch } from '@/components/SupplierSearch'

/**
 * Left column (~35%): KPIs, scatter, OEM filter, search, list (PRD §5).
 */
export function LeftPanel() {
  return (
    <aside className="flex w-full flex-col gap-4 border-[var(--border)] bg-[var(--surface)] p-4 lg:w-[35%] lg:min-w-[300px] lg:border-r lg:overflow-y-auto">
      <KpiCards />
      <BenchmarkScatter />
      <OemFilterBar />
      <SupplierSearch />
      <SupplierList />
    </aside>
  )
}
