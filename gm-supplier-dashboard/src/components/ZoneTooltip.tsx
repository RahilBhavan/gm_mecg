import { createPortal } from 'react-dom'

import { ZONE_LABELS } from '@/data/zones'
import type { Supplier, ZoneId } from '@/types/dashboard'

const PREVIEW_COUNT = 6

function TierBadge({ tier }: { tier: 1 | 2 }) {
  return (
    <span
      className={
        tier === 1
          ? 'inline-flex items-center rounded px-1 py-0 text-[9px] font-bold text-white'
          : 'inline-flex items-center rounded px-1 py-0 text-[9px] font-bold text-white'
      }
      style={{ background: tier === 1 ? '#0057a8' : '#00b4d8', lineHeight: 1.6 }}
    >
      T{tier}
    </span>
  )
}

type Props = {
  zoneId: ZoneId | null
  suppliers: Supplier[]
  anchor: { x: number; y: number } | null
}

/**
 * Floating hover tooltip — shows zone name, up to 6 suppliers with tier badges,
 * and a "Click to expand" hint for zones with many suppliers.
 */
export function ZoneTooltip({ zoneId, suppliers, anchor }: Props) {
  if (!zoneId || !anchor) return null

  const label = ZONE_LABELS[zoneId]
  const preview = suppliers.slice(0, PREVIEW_COUNT)
  const overflow = suppliers.length - PREVIEW_COUNT

  const node = (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[9999] w-60 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left shadow-xl"
      style={{ left: anchor.x + 14, top: anchor.y + 14 }}
    >
      <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>

      {preview.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {preview.map((s) => (
            <li key={s.duns} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <TierBadge tier={s.tier} />
              <span className="truncate">{s.companyName}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">No mapped suppliers in view</p>
      )}

      {overflow > 0 && (
        <p className="mt-1.5 text-[10px] font-medium text-[var(--text-muted)]">
          +{overflow} more · Click to expand
        </p>
      )}

      {preview.length > 0 && overflow <= 0 && (
        <p className="mt-1.5 text-[10px] text-[var(--text-muted)]/60">Click to expand</p>
      )}
    </div>
  )

  return createPortal(node, document.body)
}
