import * as THREE from 'three'

import type { VehicleModelProfile } from '@/models/vehicle-profile'
import type { ZoneId } from '@/types/dashboard'

/** 2D ray-casting point-in-polygon test for SVG polygon point strings ("x,y x,y …"). */
export function pointInPolygon(px: number, py: number, polyStr: string): boolean {
  const pts = polyStr.trim().split(' ').map((p) => p.split(',').map(Number))
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0]
    const yi = pts[i][1]
    const xj = pts[j][0]
    const yj = pts[j][1]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Result of the zone-mesh mapping process. */
export type ZoneMeshMapping = {
  /** mesh.uuid -> ZoneId */
  meshMap: Map<string, ZoneId>
  /** mesh.path -> ZoneId (stable mapping key) */
  meshPathMap: Map<string, ZoneId>
  /** ZoneId -> average 3D centroid of all meshes in that zone */
  zoneCentroids: Map<ZoneId, THREE.Vector3>
  diagnostics: {
    totalMeshes: number
    deterministicMatches: number
    projectionMatches: number
    unmatchedMeshes: string[]
  }
}

/**
 * Camera position + look-at target for a side profile aligned with SVG zone polygons.
 * Kept in sync with SideViewCameraSnap in TahoeThreeCanvas (vehicle mesh bounding box).
 */
export function getSideProfilePlacementFromBox(
  center: THREE.Vector3,
  size: THREE.Vector3,
  sideViewDir: readonly [number, number, number],
  sideViewDistScale: number,
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const dir = new THREE.Vector3(sideViewDir[0], sideViewDir[1], sideViewDir[2]).normalize()
  const target = center.clone()
  const extent = Math.max(size.x, size.y, size.z, 1e-6)
  const dist = extent * sideViewDistScale
  const position = target.clone().addScaledVector(dir, dist)
  return { position, target }
}

function createSideProjectionCamera(
  root: THREE.Object3D,
  worldCam: THREE.OrthographicCamera,
  profile: VehicleModelProfile,
): THREE.OrthographicCamera {
  const box = new THREE.Box3().setFromObject(root)
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  box.getCenter(center)
  box.getSize(size)
  const { position, target } = getSideProfilePlacementFromBox(
    center,
    size,
    profile.camera.sideViewDir,
    profile.camera.sideViewDistScale,
  )

  const ref = worldCam.clone()
  ref.position.copy(position)
  ref.up.set(0, 1, 0)
  ref.lookAt(target)
  ref.zoom = worldCam.zoom
  ref.near = worldCam.near
  ref.far = worldCam.far
  ref.updateMatrixWorld(true)
  ref.updateProjectionMatrix()
  return ref
}

/**
 * Classifies meshes into zones by projecting bbox centers with a **canonical side-view**
 * orthographic camera (same zoom/frustum as `worldCam`), so SVG polygons stay valid even
 * if the live camera is still orbiting. Call after Bounds zoom has settled.
 */
function getObjectPath(root: THREE.Object3D, object: THREE.Object3D): string {
  const segments: string[] = []
  let cursor: THREE.Object3D | null = object
  while (cursor && cursor !== root) {
    const name = cursor.name?.trim() || cursor.type
    segments.push(name)
    cursor = cursor.parent
  }
  return segments.reverse().join('/')
}

export function buildZoneMeshMap(
  root: THREE.Object3D,
  worldCam: THREE.Camera,
  profile: VehicleModelProfile,
): ZoneMeshMapping {
  const meshMap = new Map<string, ZoneId>()
  const meshPathMap = new Map<string, ZoneId>()
  const zoneCentroids = new Map<ZoneId, THREE.Vector3>()
  const zonePoints = new Map<ZoneId, THREE.Vector3[]>()

  const deterministicPathMap = new Map<string, ZoneId>()
  for (const [zoneId, paths] of Object.entries(profile.zones.meshPathMap)) {
    for (const path of paths ?? []) deterministicPathMap.set(path, zoneId as ZoneId)
  }

  const projectCam =
    worldCam instanceof THREE.OrthographicCamera
      ? createSideProjectionCamera(root, worldCam, profile)
      : worldCam

  const [viewW, viewH] = profile.fallback2d.viewBox
    .split(' ')
    .slice(-2)
    .map((v) => Number(v))
  const diagnostics = {
    totalMeshes: 0,
    deterministicMatches: 0,
    projectionMatches: 0,
    unmatchedMeshes: [] as string[],
  }

  const bbox = new THREE.Box3()
  const center = new THREE.Vector3()

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    diagnostics.totalMeshes += 1
    const meshPath = getObjectPath(root, child)
    const deterministicZone = deterministicPathMap.get(meshPath)
    if (deterministicZone) {
      bbox.setFromObject(child, true)
      if (!bbox.isEmpty()) {
        bbox.getCenter(center)
        meshMap.set(child.uuid, deterministicZone)
        meshPathMap.set(meshPath, deterministicZone)
        if (!zonePoints.has(deterministicZone)) zonePoints.set(deterministicZone, [])
        zonePoints.get(deterministicZone)!.push(center.clone())
        diagnostics.deterministicMatches += 1
      }
      return
    }
    try {
      bbox.setFromObject(child, true)
      if (bbox.isEmpty()) return
      bbox.getCenter(center)

      // NDC: [-1, 1] in x and y
      const ndc = center.clone().project(projectCam)

      // Map NDC to viewBox coordinates
      const vx = ((ndc.x + 1) / 2) * viewW
      const vy = ((1 - ndc.y) / 2) * viewH

      for (const zoneId of profile.zones.matchOrder) {
        const polyStr = profile.zones.polygons[zoneId]
        if (pointInPolygon(vx, vy, polyStr)) {
          const zid = zoneId
          meshMap.set(child.uuid, zid)
          meshPathMap.set(meshPath, zid)
          
          // Collect points to calculate average centroid later
          if (!zonePoints.has(zid)) zonePoints.set(zid, [])
          zonePoints.get(zid)!.push(center.clone())
          diagnostics.projectionMatches += 1
          break
        }
      }
      if (!meshMap.has(child.uuid)) {
        const isIgnored = profile.zones.ignoredMeshPathPatterns.some((pattern) =>
          meshPath.toLowerCase().includes(pattern.toLowerCase()),
        )
        if (!isIgnored) diagnostics.unmatchedMeshes.push(meshPath)
      }
    } catch {
      // Skip any malformed mesh entries
    }
  })

  // Calculate average centroid for each zone
  for (const [zoneId, points] of zonePoints.entries()) {
    const avg = new THREE.Vector3(0, 0, 0)
    for (const p of points) avg.add(p)
    avg.divideScalar(points.length)
    zoneCentroids.set(zoneId, avg)
  }

  return { meshMap, meshPathMap, zoneCentroids, diagnostics }
}
