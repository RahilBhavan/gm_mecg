import * as THREE from 'three'

import { ZONE_POLYGONS } from '@/components/tahoeZones'
import type { ZoneId } from '@/types/dashboard'

const VIEWBOX_W = 100
const VIEWBOX_H = 55

/**
 * Test smaller / specific polygons before the large Body (Z02) catch-all so mesh centers
 * in overlapping regions map to the intended zone.
 */
export const ZONE_MATCH_ORDER: ZoneId[] = [
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
  /** ZoneId -> average 3D centroid of all meshes in that zone */
  zoneCentroids: Map<ZoneId, THREE.Vector3>
}

const SIDE_VIEW_DIR = new THREE.Vector3(0, 0.18, 1).normalize()
const SIDE_VIEW_DIST_SCALE = 2.2

/**
 * Camera position + look-at target for a side profile aligned with SVG zone polygons.
 * Kept in sync with SideViewCameraSnap in TahoeThreeCanvas (vehicle mesh bounding box).
 */
export function getSideProfilePlacementFromBox(
  center: THREE.Vector3,
  size: THREE.Vector3,
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const target = center.clone()
  const extent = Math.max(size.x, size.y, size.z, 1e-6)
  const dist = extent * SIDE_VIEW_DIST_SCALE
  const position = target.clone().addScaledVector(SIDE_VIEW_DIR, dist)
  return { position, target }
}

function createSideProjectionCamera(
  root: THREE.Object3D,
  worldCam: THREE.OrthographicCamera,
): THREE.OrthographicCamera {
  const box = new THREE.Box3().setFromObject(root)
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  box.getCenter(center)
  box.getSize(size)
  const { position, target } = getSideProfilePlacementFromBox(center, size)

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
export function buildZoneMeshMap(
  root: THREE.Object3D,
  worldCam: THREE.Camera,
): ZoneMeshMapping {
  const meshMap = new Map<string, ZoneId>()
  const zoneCentroids = new Map<ZoneId, THREE.Vector3>()
  const zonePoints = new Map<ZoneId, THREE.Vector3[]>()

  const projectCam =
    worldCam instanceof THREE.OrthographicCamera
      ? createSideProjectionCamera(root, worldCam)
      : worldCam

  const bbox = new THREE.Box3()
  const center = new THREE.Vector3()

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    try {
      bbox.setFromObject(child, true)
      if (bbox.isEmpty()) return
      bbox.getCenter(center)

      // NDC: [-1, 1] in x and y
      const ndc = center.clone().project(projectCam)

      // Map NDC to viewBox coordinates
      const vx = (ndc.x + 1) / 2 * VIEWBOX_W
      const vy = (1 - ndc.y) / 2 * VIEWBOX_H

      for (const zoneId of ZONE_MATCH_ORDER) {
        const polyStr = ZONE_POLYGONS[zoneId]
        if (pointInPolygon(vx, vy, polyStr)) {
          const zid = zoneId
          meshMap.set(child.uuid, zid)
          
          // Collect points to calculate average centroid later
          if (!zonePoints.has(zid)) zonePoints.set(zid, [])
          zonePoints.get(zid)!.push(center.clone())
          break
        }
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

  return { meshMap, zoneCentroids }
}
