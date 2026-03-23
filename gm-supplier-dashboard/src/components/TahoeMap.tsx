import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

import { useDashboard } from '@/context/DashboardContext'
import { ZONE_LABELS } from '@/data/zones'
import type { ZoneId } from '@/types/dashboard'

import { TahoeThreeCanvas } from '@/components/TahoeThreeCanvas'
import { TAHOE_SILHOUETTE_PATH, TAHOE_VIEWBOX } from '@/components/tahoeZones'
import { ZoneTooltip } from '@/components/ZoneTooltip'


function SilhouetteFallback(): ReactElement {
  return (
    <svg viewBox={TAHOE_VIEWBOX} className="h-full w-full opacity-70" role="img" aria-hidden>
      <path
        d={TAHOE_SILHOUETTE_PATH}
        fill="currentColor"
        className="text-slate-400/60 dark:text-slate-600/60"
      />
    </svg>
  )
}

/**
 * 3D vehicle with direct mesh raycasting for zone interaction.
 * SVG overlay shows labels and count badges only — no pointer events.
 * Camera auto-resets to side profile when a supplier is selected from the list.
 */
export function TahoeMap(): ReactElement {
  const { visibleSuppliers, suppliers, state, dispatch, selectedSupplier } = useDashboard()
  const [hoveredZoneId, setHoveredZoneId] = useState<ZoneId | null>(null)
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null)
  const cameraResetRef = useRef<(() => void) | null>(null)
  const prevPulseKeyRef = useRef(state.pulseKey)

  // Auto-reset camera to side profile when supplier is selected from the list
  useEffect(() => {
    if (state.pulseKey !== prevPulseKeyRef.current) {
      prevPulseKeyRef.current = state.pulseKey
      cameraResetRef.current?.()
    }
  }, [state.pulseKey])

  // Propagate hover tooltip anchor from canvas mouse position
  const containerRef = useRef<HTMLDivElement>(null)
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipAnchor({ x: e.clientX, y: e.clientY })
  }, [])

  const onZoneEnter = useCallback((z: ZoneId) => setHoveredZoneId(z), [])
  const onZoneLeave = useCallback(() => {
    setHoveredZoneId(null)
    setTooltipAnchor(null)
  }, [])
  const onZoneClick = useCallback(
    (z: ZoneId) => dispatch({ type: 'SET_ZONE', zone: z }),
    [dispatch],
  )

  const tooltipSuppliers = useMemo(() => {
    if (!hoveredZoneId) return []
    return visibleSuppliers.filter((s) => s.partZones.includes(hoveredZoneId))
  }, [hoveredZoneId, visibleSuppliers])

  /** Per-zone counts using all filter dims except zone (so badges stay accurate when a zone is active). */
  const zoneCounts = useMemo(() => {
    const q = state.search.trim().toLowerCase()
    const base = suppliers.filter((s) => {
      if (state.tierFilter === 'T1' && s.tier !== 1) return false
      if (state.tierFilter === 'T2' && s.tier !== 2) return false
      if (state.gmOnly && !s.isGMSupplier) return false
      if (
        q &&
        !s.companyName.toLowerCase().includes(q) &&
        !s.automotiveParts.toLowerCase().includes(q)
      )
        return false
      return true
    })
    const counts = new Map<ZoneId, number>()
    for (const s of base) {
      for (const z of s.partZones) counts.set(z, (counts.get(z) ?? 0) + 1)
    }
    return counts
  }, [suppliers, state.tierFilter, state.gmOnly, state.search])

  const pulseZones = useMemo(
    () => (selectedSupplier ? new Set(selectedSupplier.partZones) : new Set<ZoneId>()),
    [selectedSupplier],
  )

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-b from-[#05080e] via-[#070b11] to-[#05080e] shadow-[inset_0_1px_0_0_rgba(94,234,212,0.08)]"
        style={{ aspectRatio: '100 / 55', minHeight: 260 }}
        onMouseMove={onMouseMove}
      >
        {/* 3D base — raycasting handles zone hover/click from any angle */}
        <div className="absolute inset-0 z-0">
          <TahoeThreeCanvas
            fallback2d={
              <div className="flex h-full w-full items-center justify-center p-4">
                <SilhouetteFallback />
              </div>
            }
            activeZoneId={state.activeZoneId}
            hoveredZoneId={hoveredZoneId}
            zoneCounts={zoneCounts}
            pulseZones={pulseZones}
            onZoneEnter={onZoneEnter}
            onZoneLeave={onZoneLeave}
            onZoneClick={onZoneClick}
            cameraResetRef={cameraResetRef}
          />
        </div>

        {/* Drag hint */}
        <div className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-white/30">
          Drag to rotate · Click any part
        </div>
      </div>

      <ZoneTooltip zoneId={hoveredZoneId} suppliers={tooltipSuppliers} anchor={tooltipAnchor} />

      <div aria-live="polite" className="sr-only">
        {hoveredZoneId
          ? `${ZONE_LABELS[hoveredZoneId]}, ${tooltipSuppliers.length} suppliers`
          : ''}
      </div>
    </div>
  )
}
