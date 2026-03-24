import type { ZoneId } from '@/types/dashboard'

export type Vec3 = readonly [number, number, number]

export type VehicleModelProfile = {
  id: string
  name: string
  modelUrl: string
  rootRotation: Vec3
  camera: {
    position: Vec3
    zoom: number
    near: number
    far: number
    orbitMinPolar: number
    orbitMaxPolar: number
    fitDelayMs: number
    stableZoomFrames: number
    sideViewDir: Vec3
    sideViewDistScale: number
  }
  fallback2d: {
    viewBox: string
    silhouettePath: string
  }
  zones: {
    polygons: Record<ZoneId, string>
    matchOrder: ZoneId[]
    labelAnchors: Record<ZoneId, Vec3>
    meshPathMap: Partial<Record<ZoneId, readonly string[]>>
    ignoredMeshPathPatterns: readonly string[]
  }
}
