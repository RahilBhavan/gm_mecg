import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { buildZoneMeshMap, getSideProfilePlacementFromBox } from '@/lib/zoneMeshMap'
import type { VehicleModelProfile } from '@/models/vehicle-profile'

function createBaseProfile(): VehicleModelProfile {
  return {
    id: 'test',
    name: 'Test Vehicle',
    modelUrl: '/models/test.glb',
    rootRotation: [0, 0, 0],
    camera: {
      position: [0, 0, 10],
      zoom: 40,
      near: 0.1,
      far: 100,
      orbitMinPolar: 0.1,
      orbitMaxPolar: 2.9,
      fitDelayMs: 100,
      stableZoomFrames: 2,
      sideViewDir: [0, 0, 1],
      sideViewDistScale: 2,
    },
    fallback2d: {
      viewBox: '0 0 100 55',
      silhouettePath: 'M 0 0 L 100 0',
    },
    zones: {
      polygons: {
        Z01: '0,0 0,1 1,1 1,0',
        Z02: '0,0 100,0 100,55 0,55',
        Z03: '0,0 0,1 1,1 1,0',
        Z04: '0,0 0,1 1,1 1,0',
        Z05: '0,0 0,1 1,1 1,0',
        Z06: '0,0 0,1 1,1 1,0',
        Z07: '0,0 0,1 1,1 1,0',
        Z08: '0,0 0,1 1,1 1,0',
        Z09: '0,0 0,1 1,1 1,0',
        Z10: '0,0 0,1 1,1 1,0',
        Z11: '0,0 0,1 1,1 1,0',
        Z12: '0,0 0,1 1,1 1,0',
        Z13: '0,0 0,1 1,1 1,0',
        Z14: '0,0 0,1 1,1 1,0',
      },
      matchOrder: [
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
      ],
      labelAnchors: {
        Z01: [0, 0, 0],
        Z02: [0, 0, 0],
        Z03: [0, 0, 0],
        Z04: [0, 0, 0],
        Z05: [0, 0, 0],
        Z06: [0, 0, 0],
        Z07: [0, 0, 0],
        Z08: [0, 0, 0],
        Z09: [0, 0, 0],
        Z10: [0, 0, 0],
        Z11: [0, 0, 0],
        Z12: [0, 0, 0],
        Z13: [0, 0, 0],
        Z14: [0, 0, 0],
      },
      meshPathMap: {},
      ignoredMeshPathPatterns: [],
    },
  }
}

describe('zoneMeshMap', () => {
  it('prefers deterministic mesh path mapping over projection', () => {
    const profile = createBaseProfile()
    profile.zones.meshPathMap.Z02 = ['BodyMesh']

    const root = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
    body.name = 'BodyMesh'
    root.add(body)

    const cam = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
    cam.position.set(0, 0, 10)
    cam.lookAt(new THREE.Vector3(0, 0, 0))
    cam.updateMatrixWorld(true)
    cam.updateProjectionMatrix()

    const result = buildZoneMeshMap(root, cam, profile)
    expect(result.meshPathMap.get('BodyMesh')).toBe('Z02')
    expect(result.diagnostics.deterministicMatches).toBe(1)
  })

  it('tracks unmatched meshes when no deterministic or projection match exists', () => {
    const profile = createBaseProfile()
    // Use tiny polygons that will not match projected coordinates.
    profile.zones.polygons.Z02 = '0,0 0,0.5 0.5,0.5 0.5,0'

    const root = new THREE.Group()
    const loose = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
    loose.name = 'LooseMesh'
    root.add(loose)

    const cam = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100)
    cam.position.set(0, 0, 10)
    cam.lookAt(new THREE.Vector3(0, 0, 0))
    cam.updateMatrixWorld(true)
    cam.updateProjectionMatrix()

    const result = buildZoneMeshMap(root, cam, profile)
    expect(result.diagnostics.unmatchedMeshes).toContain('LooseMesh')
  })

  it('computes side profile placement from configurable direction and scale', () => {
    const center = new THREE.Vector3(1, 2, 3)
    const size = new THREE.Vector3(10, 5, 3)
    const placement = getSideProfilePlacementFromBox(center, size, [0, 0, 1], 2)
    expect(placement.target.toArray()).toEqual([1, 2, 3])
    expect(placement.position.z).toBeGreaterThan(placement.target.z)
  })
})
