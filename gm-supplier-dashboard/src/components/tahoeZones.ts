import type { ZoneId } from '@/types/dashboard'

/** SVG viewBox for Tahoe silhouette + hotspot layer (PRD §6.1). */
export const TAHOE_VIEWBOX = '0 0 100 55'

/**
 * Stylised side-profile silhouette path (generic SUV; not a traced trademark).
 */
export const TAHOE_SILHOUETTE_PATH =
  'M 4 34 L 6 30 L 10 28 L 18 26 L 28 25 L 38 22 L 52 20 L 68 20 L 78 22 L 86 26 L 92 30 L 96 36 L 96 40 L 90 42 L 82 42 L 78 38 L 72 36 L 60 36 L 48 38 L 36 40 L 24 42 L 14 44 L 8 42 L 4 38 Z'

/**
 * Hotspot polygons in viewBox coords (refine against final SVG artwork).
 */
export const ZONE_POLYGONS: Record<ZoneId, string> = {
  Z01: '66,18 82,18 84,26 68,28',
  Z02: '28,26 64,24 76,30 74,38 32,40 24,36',
  Z03: '18,40 26,40 28,44 20,44',
  Z04: '38,24 52,22 58,28 56,34 36,34',
  Z05: '58,22 68,22 72,26 64,28',
  Z06: '72,20 86,24 88,30 78,28',
  Z07: '44,30 56,30 54,36 46,36',
  Z08: '30,28 42,28 40,36 28,38',
  Z09: '82,24 92,28 90,32 84,30',
  Z10: '40,24 54,24 54,32 42,32',
  Z11: '22,38 32,38 30,44 20,44',
  Z12: '48,36 62,36 60,40 50,40',
  Z13: '62,20 68,18 70,22 64,24',
  Z14: '8,32 22,28 24,34 10,38',
}
