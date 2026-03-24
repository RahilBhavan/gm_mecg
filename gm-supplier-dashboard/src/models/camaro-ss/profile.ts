import type { ZoneId } from '@/types/dashboard'
import type { VehicleModelProfile } from '@/models/vehicle-profile'

const MATCH_ORDER: ZoneId[] = [
  'Z01',
  'Z13',
  'Z03',
  'Z11',
  'Z14',
  'Z04',
  'Z05',
  'Z06',
  'Z07',
  'Z08',
  'Z09',
  'Z10',
  'Z12',
  'Z02',
]

/**
 * Authoritative runtime profile for the current vehicle model.
 * Mesh-path mappings start empty and are filled as model authoring improves.
 */
export const CAMARO_SS_PROFILE: VehicleModelProfile = {
  id: 'camaro-ss',
  name: 'Chevrolet Camaro SS (2010)',
  // Runtime currently uses the checked-in Tahoe mesh until a converted GLB is finalized.
  modelUrl: '/models/Car_tahoe.3ds',
  rootRotation: [0, -Math.PI / 2, -Math.PI / 2],
  camera: {
    position: [0, 2.35, 13.5],
    zoom: 52,
    near: 0.1,
    far: 500,
    orbitMinPolar: Math.PI * 0.4,
    orbitMaxPolar: Math.PI * 0.58,
    fitDelayMs: 1280,
    stableZoomFrames: 3,
    sideViewDir: [0, 0.18, 1],
    sideViewDistScale: 2.2,
  },
  fallback2d: {
    viewBox: '0 0 100 55',
    silhouettePath:
      'M 4 34 L 6 30 L 10 28 L 18 26 L 28 25 L 38 22 L 52 20 L 68 20 L 78 22 L 86 26 L 92 30 L 96 36 L 96 40 L 90 42 L 82 42 L 78 38 L 72 36 L 60 36 L 48 38 L 36 40 L 24 42 L 14 44 L 8 42 L 4 38 Z',
  },
  zones: {
    polygons: {
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
    },
    matchOrder: MATCH_ORDER,
    labelAnchors: {
      Z01: [2.5, 0.9, 0.4],
      Z02: [0.7, 0.4, 0.0],
      Z03: [-2.2, -0.7, -0.2],
      Z04: [0.1, 0.7, 0.0],
      Z05: [1.2, 0.75, 0.2],
      Z06: [2.2, 0.65, 0.1],
      Z07: [0.7, 0.2, 0.1],
      Z08: [-0.8, 0.45, -0.1],
      Z09: [2.7, 0.35, 0.2],
      Z10: [0.6, 0.6, 0.2],
      Z11: [-1.6, -0.4, -0.2],
      Z12: [1.3, 0.15, 0.2],
      Z13: [1.9, 0.95, 0.1],
      Z14: [-2.3, 0.05, -0.2],
    },
    meshPathMap: {},
    ignoredMeshPathPatterns: ['__helpers__', '__debug__'],
  },
}
