import type { ZoneId } from '../types/dashboard'

/** Keyword dictionary — PRD §7.2, case-insensitive substring match. */
export const ZONE_KEYWORDS: Record<ZoneId, readonly string[]> = {
  Z01: ['glass', 'glazing', 'windshield', 'sekurit', 'sealing'],
  Z02: [
    'steel',
    'chassis',
    'stamping',
    'body panel',
    'structural steel',
    'galvanized',
    'dual-phase',
  ],
  Z03: ['tire', 'tyre', 'rubber'],
  Z04: ['seat', 'seating', 'seat foam', 'seat mechanism'],
  Z05: /*
   */ ['hvac', 'thermal management', 'climate', 'air conditioning'],
  Z06: [
    'engine',
    'fuel injection',
    'powertrain',
    'diesel',
    'hydrogen engine',
    'starter',
    'alternator',
  ],
  Z07: ['transmission', 'automatic transmission', 'gearbox'],
  Z08: [
    'wiring harness',
    'wire',
    'cable',
    'e-system',
    'junction box',
    'power cable',
  ],
  Z09: ['lighting', 'headlamp', 'led', 'taillight', 'wiper'],
  Z10: ['airbag', 'seatbelt', 'safety system', 'key safety'],
  Z11: ['brake', 'brake hose'],
  Z12: [
    'ev motor',
    'inverter',
    'e-axle',
    'ev drive',
    'compressor',
    'electric motor',
  ],
  Z13: ['mirror', 'exterior mirror', 'vision system'],
  Z14: ['fastener', 'polymer', 'fluid', 'welding', 'adhesive'],
}

/**
 * Map free-text automotive parts to Tahoe zones. Unmatched → [].
 *
 * @param parts - Automotive Parts / Products field from Excel.
 * @returns Sorted unique zone IDs.
 */
export function matchZones(parts: string): ZoneId[] {
  const hay = parts.toLowerCase()
  const found = new Set<ZoneId>()
  ;(Object.entries(ZONE_KEYWORDS) as [ZoneId, readonly string[]][]).forEach(
    ([zone, keywords]) => {
      for (const kw of keywords) {
        if (hay.includes(kw.toLowerCase())) {
          found.add(zone)
          break
        }
      }
    },
  )
  return [...found].sort()
}
