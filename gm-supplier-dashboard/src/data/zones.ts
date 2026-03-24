import type { ZoneId } from '@/types/dashboard'

export const ZONE_IDS: ZoneId[] = [
  'Z01',
  'Z02',
  'Z03',
  'Z04',
  'Z05',
  'Z06',
  'Z07',
  'Z08',
  'Z09',
  'Z10',
  'Z11',
  'Z12',
  'Z13',
  'Z14',
]

/** Human-readable region labels (PRD §6.2). */
export const ZONE_LABELS: Record<ZoneId, string> = {
  Z01: 'Windshield / Glass',
  Z02: 'Body / Chassis / Steel',
  Z03: 'Tyres',
  Z04: 'Seating / Interior',
  Z05: 'HVAC / Climate',
  Z06: 'Engine / Powertrain',
  Z07: 'Transmission',
  Z08: 'Wiring / Electrical',
  Z09: 'Lighting / Wipers',
  Z10: 'Safety (Airbags / Belts)',
  Z11: 'Brakes',
  Z12: 'EV / E-Axle',
  Z13: 'Mirrors / Vision',
  Z14: 'Fasteners / Fluids / Adhesives',
}

/** Short zone labels for SVG overlay (max ~7 chars). */
export const ZONE_SHORT_LABELS: Record<ZoneId, string> = {
  Z01: 'Glass',
  Z02: 'Body',
  Z03: 'Tyres',
  Z04: 'Seats',
  Z05: 'HVAC',
  Z06: 'Engine',
  Z07: 'Trans',
  Z08: 'Wiring',
  Z09: 'Lights',
  Z10: 'Safety',
  Z11: 'Brakes',
  Z12: 'E-Motor',
  Z13: 'Mirror',
  Z14: 'Fluids',
}

/** Optional world-space [x, y, z] added to each zone centroid for Html label placement. */
export const ZONE_LABEL_OFFSETS: Partial<Record<ZoneId, readonly [number, number, number]>> = {}
