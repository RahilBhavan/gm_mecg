import { useState } from 'react'

import { useDashboard } from '@/context/DashboardContext'
import { ZONE_LABELS } from '@/data/zones'

import { MethodologyModal } from '@/components/MethodologyModal'
import { SupplierDetailCard } from '@/components/SupplierDetailCard'
import { TahoeMap } from '@/components/TahoeMap'
import { WorldMapView } from '@/components/WorldMapView'
import { ZoneRevenueChart } from '@/components/ZoneRevenueChart'
import { ZoneSupplierPanel } from '@/components/ZoneSupplierPanel'

type ViewTab = 'vehicle' | 'worldmap'

/**
 * Right column (~65% Tahoe + detail (PRD §5)).
 * Tab toggle between 3D vehicle zone drill-down and geographic world map.
 */
export function RightPanel() {
  const {
    state,
    dispatch,
    selectedSupplier,
    benchmarks,
    visibleSuppliers,
    rightPanelAnchorRef,
  } = useDashboard()
  const [methodOpen, setMethodOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ViewTab>('vehicle')

  const tierBench = selectedSupplier
    ? selectedSupplier.tier === 1
      ? benchmarks.tier1
      : benchmarks.tier2
    : null

  const zoneFiltered = state.activeZoneId
    ? visibleSuppliers.filter((s) => s.partZones.includes(state.activeZoneId!))
    : []

  return (
    <section
      ref={rightPanelAnchorRef}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-[var(--surface)] p-4"
    >
      {/* Top bar: tab switcher + active filter pills + methodology */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex rounded-lg border border-[var(--border)] p-0.5 text-xs">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                activeTab === 'vehicle'
                  ? 'bg-[var(--gm-blue)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setActiveTab('vehicle')}
            >
              Vehicle Zones
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                activeTab === 'worldmap'
                  ? 'bg-[var(--gm-blue)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => setActiveTab('worldmap')}
            >
              World Map
            </button>
          </div>

          {/* Active zone pill (vehicle tab) */}
          {activeTab === 'vehicle' && state.activeZoneId && (
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-sm dark:bg-slate-900">
              <span className="font-medium">{ZONE_LABELS[state.activeZoneId]}</span>
              <button
                type="button"
                className="ml-1 rounded-full px-2 font-bold hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Clear zone filter"
                onClick={() => dispatch({ type: 'SET_ZONE', zone: null })}
              >
                ✕
              </button>
            </div>
          )}

          {/* Active country pill (world map tab) */}
          {activeTab === 'worldmap' && state.countryFilter && (
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <span className="font-medium">{state.countryFilter}</span>
              <button
                type="button"
                className="ml-1 rounded-full px-2 font-bold hover:bg-amber-200 dark:hover:bg-amber-800/30"
                aria-label="Clear country filter"
                onClick={() => dispatch({ type: 'SET_COUNTRY_FILTER', iso2: null })}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => setMethodOpen(true)}
        >
          Methodology
        </button>
      </div>

      {/* Vehicle tab content */}
      {activeTab === 'vehicle' && (
        <>
          <TahoeMap />
          <ZoneRevenueChart
            suppliers={zoneFiltered.length > 0 ? zoneFiltered : visibleSuppliers.slice(0, 20)}
            title={
              state.activeZoneId
                ? `Revenue — ${ZONE_LABELS[state.activeZoneId]}`
                : 'Revenue — top suppliers in view'
            }
          />
          {selectedSupplier && tierBench && (
            <SupplierDetailCard
              supplier={selectedSupplier}
              benchSga={tierBench.avgSgaPct}
              benchEbit={tierBench.avgEbitPct}
              benchCombined={tierBench.avgSgaEbitPct}
            />
          )}
          {!selectedSupplier && (
            <p className="text-center text-sm text-[var(--text-muted)]">
              Select a supplier from the list, scatter plot, or a vehicle zone.
            </p>
          )}
          <ZoneSupplierPanel />
        </>
      )}

      {/* World map tab content */}
      {activeTab === 'worldmap' && (
        <>
          <WorldMapView />
          {selectedSupplier && tierBench && (
            <SupplierDetailCard
              supplier={selectedSupplier}
              benchSga={tierBench.avgSgaPct}
              benchEbit={tierBench.avgEbitPct}
              benchCombined={tierBench.avgSgaEbitPct}
            />
          )}
          {!selectedSupplier && (
            <p className="text-center text-sm text-[var(--text-muted)]">
              Click a country to filter, then select a supplier from the list.
            </p>
          )}
        </>
      )}

      <MethodologyModal open={methodOpen} onClose={() => setMethodOpen(false)} />
    </section>
  )
}
