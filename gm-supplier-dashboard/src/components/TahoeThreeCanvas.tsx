import {
  Component,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
  Suspense,
  startTransition,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Bounds, Environment, Html, OrbitControls, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { buildZoneMeshMap, getSideProfilePlacementFromBox } from '@/lib/zoneMeshMap'
import type { ZoneMeshMapping } from '@/lib/zoneMeshMap'
import type { ZoneId } from '@/types/dashboard'
import { ZONE_SHORT_LABELS } from '@/data/zones'
import { ACTIVE_VEHICLE_PROFILE } from '@/models'

/** Orbit polar angle (phi from +Y): narrow band around side view after snap (~80°). */
const ORBIT_MIN_POLAR = ACTIVE_VEHICLE_PROFILE.camera.orbitMinPolar
const ORBIT_MAX_POLAR = ACTIVE_VEHICLE_PROFILE.camera.orbitMaxPolar

/** Frames orthographic zoom must stay unchanged before classifying meshes (post-Bounds fit). */
const STABLE_ZOOM_FRAMES = ACTIVE_VEHICLE_PROFILE.camera.stableZoomFrames
const BODY_COLOR = '#64748b'
const BODY_METALNESS = 0.9
const BODY_ROUGHNESS = 0.1

// Material colour constants — avoid re-allocating per frame
const C_NORMAL = new THREE.Color('#64748b')
const C_HOVER = new THREE.Color('#38bdf8')
const C_ACTIVE = new THREE.Color('#0ea5e9')
const E_HOVER = new THREE.Color('#7dd3fc')
const E_ACTIVE = new THREE.Color('#0ea5e9')
const E_NONE = new THREE.Color('#000000')

function applyHighlights(
  root: THREE.Object3D,
  zoneMap: Map<string, ZoneId>,
  activeZoneId: ZoneId | null,
  hoveredZoneId: ZoneId | null,
  pulseZones?: Set<ZoneId>,
): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const mat = child.material as THREE.MeshStandardMaterial
    if (!mat?.isMeshStandardMaterial) return
    const z = zoneMap.get(child.uuid)
    
    const isPulse = z && pulseZones?.has(z)
    
    if (z === activeZoneId && activeZoneId != null) {
      mat.color.copy(C_ACTIVE)
      mat.emissive.copy(E_ACTIVE)
      mat.emissiveIntensity = 1.2
      mat.opacity = 1.0
    } else if (z === hoveredZoneId && hoveredZoneId != null) {
      mat.color.copy(C_HOVER)
      mat.emissive.copy(E_HOVER)
      mat.emissiveIntensity = 0.8
      mat.opacity = 0.95
    } else if (isPulse) {
      mat.color.set('#22d3ee')
      mat.emissive.set('#22d3ee')
      mat.emissiveIntensity = 0.6
      mat.opacity = 0.9
    } else {
      mat.color.copy(C_NORMAL)
      mat.emissive.copy(E_NONE)
      mat.emissiveIntensity = 0
      mat.opacity = 0.65
    }
    mat.needsUpdate = true
  })
}

// ─── Side-view snap (direct camera pose; avoids damped setPolarAngle finishing after zone build) ─

type SideViewCameraSnapProps = {
  vehicleRoot: THREE.Object3D
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drei forwards three-stdlib OrbitControls
  orbitRef: RefObject<any>
  onSnapped: () => void
}

function SideViewCameraSnap({ vehicleRoot, orbitRef, onSnapped }: SideViewCameraSnapProps): null {
  const { camera, invalidate } = useThree()

  useEffect(() => {
    const id = window.setTimeout(() => {
      const box = new THREE.Box3().setFromObject(vehicleRoot)
      if (box.isEmpty()) return
      const center = new THREE.Vector3()
      const size = new THREE.Vector3()
      box.getCenter(center)
      box.getSize(size)
      const { position, target } = getSideProfilePlacementFromBox(
        center,
        size,
        ACTIVE_VEHICLE_PROFILE.camera.sideViewDir,
        ACTIVE_VEHICLE_PROFILE.camera.sideViewDistScale,
      )
      const cam = camera as THREE.OrthographicCamera
      cam.position.copy(position)
      cam.up.set(0, 1, 0)
      cam.lookAt(target)
      cam.updateMatrixWorld(true)
      cam.updateProjectionMatrix()

      const ctrl = orbitRef.current
      if (ctrl) {
        ctrl.target.copy(target)
        ctrl.update()
        ctrl.saveState()
      }
      onSnapped()
      invalidate()
    }, ACTIVE_VEHICLE_PROFILE.camera.fitDelayMs)
    return () => window.clearTimeout(id)
  }, [vehicleRoot, camera, orbitRef, onSnapped, invalidate])

  return null
}

// ─── TahoeMesh ───────────────────────────────────────────────────────────────

type TahoeMeshProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orbitRef: RefObject<any>
  onSideViewSnapped: () => void
  /** When true, mesh→zone projection runs (after side-view snap + stable zoom). */
  cameraAligned: boolean
  activeZoneId: ZoneId | null
  hoveredZoneId: ZoneId | null
  zoneCounts?: Map<ZoneId, number>
  pulseZones?: Set<ZoneId>
  onZoneEnter: (z: ZoneId) => void
  onZoneLeave: () => void
  onZoneClick: (z: ZoneId) => void
}

function TahoeMesh({
  orbitRef,
  onSideViewSnapped,
  cameraAligned,
  activeZoneId,
  hoveredZoneId,
  zoneCounts,
  pulseZones,
  onZoneEnter,
  onZoneLeave,
  onZoneClick,
}: TahoeMeshProps): ReactNode {
  const loaded = useLoader(GLTFLoader, ACTIVE_VEHICLE_PROFILE.modelUrl)
  const { camera, invalidate } = useThree()
  const [mapping, setMapping] = useState<ZoneMeshMapping | null>(null)
  const sceneRef = useRef<THREE.Object3D | null>(null)
  const mappingBuiltRef = useRef(false)
  const prevZoomRef = useRef<number | null>(null)
  const stableZoomFramesRef = useRef(0)

  // Track latest values in refs for useFrame / applyHighlights (avoid stale closures)
  const activeRef = useRef(activeZoneId)
  const hoveredRef = useRef(hoveredZoneId)
  const pulseRef = useRef(pulseZones)
  useLayoutEffect(() => {
    activeRef.current = activeZoneId
    hoveredRef.current = hoveredZoneId
    pulseRef.current = pulseZones
  }, [activeZoneId, hoveredZoneId, pulseZones])

  const scene = useMemo(() => {
    const root = loaded.scene.clone(true)
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const prev = child.material
        child.material = new THREE.MeshStandardMaterial({
          color: BODY_COLOR,
          metalness: BODY_METALNESS,
          roughness: BODY_ROUGHNESS,
          envMapIntensity: 1.5,
          transparent: true,
          opacity: 0.65,
          flatShading: false,
        })
        if (Array.isArray(prev)) prev.forEach((m) => (m as THREE.Material).dispose?.())
        else (prev as THREE.Material | undefined)?.dispose?.()
      }
    })
    return root
  }, [loaded])

  useLayoutEffect(() => {
    sceneRef.current = scene
  }, [scene])

  // After Bounds orthographic zoom finishes animating (~1s), zoom must be stable before
  // projecting mesh centers into the SVG viewBox — otherwise NDC → zone polygons misalign.
  useEffect(() => {
    mappingBuiltRef.current = false
    prevZoomRef.current = null
    stableZoomFramesRef.current = 0
    startTransition(() => {
      setMapping(null)
    })
  }, [scene])

  // After parent snaps orbit to side profile, re-run stable-zoom classification.
  useEffect(() => {
    if (!cameraAligned) return
    mappingBuiltRef.current = false
    prevZoomRef.current = null
    stableZoomFramesRef.current = 0
    startTransition(() => {
      setMapping(null)
    })
  }, [cameraAligned])

  useFrame(() => {
    if (!cameraAligned || mappingBuiltRef.current || !sceneRef.current) return

    const z = camera.zoom
    if (prevZoomRef.current === null) {
      prevZoomRef.current = z
      stableZoomFramesRef.current = 0
      invalidate()
      return
    }
    if (prevZoomRef.current === z) {
      stableZoomFramesRef.current += 1
    } else {
      prevZoomRef.current = z
      stableZoomFramesRef.current = 0
    }

    if (stableZoomFramesRef.current < STABLE_ZOOM_FRAMES) {
      invalidate()
      return
    }

    const result = buildZoneMeshMap(sceneRef.current, camera, ACTIVE_VEHICLE_PROFILE)
    if (result.diagnostics.unmatchedMeshes.length > 0) {
      console.warn('[TahoeThreeCanvas] Unmapped meshes', result.diagnostics.unmatchedMeshes)
    }
    setMapping(result)
    mappingBuiltRef.current = true
    applyHighlights(
      sceneRef.current,
      result.meshMap,
      activeRef.current,
      hoveredRef.current,
      pulseRef.current,
    )
    invalidate()
  })

  // Update material highlights when active/hovered zone changes
  useEffect(() => {
    if (!sceneRef.current || !mapping) return
    applyHighlights(sceneRef.current, mapping.meshMap, activeZoneId, hoveredZoneId, pulseZones)
    invalidate()
  }, [activeZoneId, hoveredZoneId, pulseZones, mapping, invalidate])

  return (
    <group
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (!mapping) return
        const z = mapping.meshMap.get(e.object.uuid)
        if (z) onZoneEnter(z)
      }}
      onPointerOut={() => onZoneLeave()}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (!mapping) return
        const z = mapping.meshMap.get(e.object.uuid)
        if (z) onZoneClick(z)
      }}
    >
      <primitive object={scene} />
      <SideViewCameraSnap vehicleRoot={scene} orbitRef={orbitRef} onSnapped={onSideViewSnapped} />

      {/* 3D Labels rendered via Html overlay */}
      {mapping &&
        Array.from(mapping.zoneCentroids.entries()).map(([zid, pos]) => {
          const count = zoneCounts?.get(zid) ?? 0
          const isActive = activeZoneId === zid
          const isHovered = hoveredZoneId === zid
          const isPulse = pulseZones?.has(zid)
          const anchor = ACTIVE_VEHICLE_PROFILE.zones.labelAnchors[zid]
          const labelPos: [number, number, number] = anchor
            ? [anchor[0], anchor[1], anchor[2]]
            : [pos.x, pos.y, pos.z]

          return (
            <Html
              key={zid}
              position={labelPos}
              center
              // distanceFactor does not work as expected with orthographic zoom
              // occlude={[scene]} often hides them because centroid is inside the mesh
              className="z-10 transition-all duration-200"
              style={{
                opacity: isHovered || isActive || isPulse ? 1 : 0.85,
                transform: `scale(${isHovered || isActive ? 1.1 : 1})`,
              }}
            >
              <div 
                className="group flex cursor-pointer items-center gap-1.5 whitespace-nowrap"
                onPointerEnter={(e) => { e.stopPropagation(); onZoneEnter(zid); }}
                onPointerLeave={() => onZoneLeave()}
                onClick={(e) => { e.stopPropagation(); onZoneClick(zid); }}
              >
                <div
                  className={`flex h-7 items-center justify-center rounded-lg border px-2.5 text-[11px] font-bold shadow-xl transition-all ${
                    isActive
                      ? 'border-cyan-400 bg-cyan-500 text-white ring-4 ring-cyan-500/20'
                      : isHovered
                        ? 'border-cyan-300 bg-cyan-600/90 text-white'
                        : isPulse
                          ? 'border-cyan-500/50 bg-cyan-700/40 text-cyan-50'
                          : 'border-slate-400/30 bg-slate-900/60 text-slate-100 backdrop-blur-sm'
                  }`}
                >
                  {ZONE_SHORT_LABELS[zid]}
                </div>
                {count > 0 && (
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-extrabold shadow-lg transition-transform group-hover:scale-110 ${
                      isActive
                        ? 'bg-white text-cyan-600'
                        : isPulse
                          ? 'bg-cyan-500 text-white'
                          : 'bg-indigo-600 text-white shadow-indigo-500/30'
                    }`}
                  >
                    {count > 99 ? '99+' : count}
                  </div>
                )}
              </div>
            </Html>
          )
        })}
    </group>
  )
}

// ─── TahoeScene ──────────────────────────────────────────────────────────────

type SceneProps = Omit<TahoeMeshProps, 'cameraAligned' | 'orbitRef' | 'onSideViewSnapped'> & {
  cameraResetRef: RefObject<(() => void) | null>
}

function TahoeScene({ cameraResetRef, ...meshProps }: SceneProps): ReactNode {
  const [cameraAligned, setCameraAligned] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null)

  const onSideViewSnapped = useCallback(() => {
    setCameraAligned(true)
  }, [])

  useEffect(() => {
    // reset() restores the same default pose as the camera’s initial position/OrbitControls target
    cameraResetRef.current = () => orbitRef.current?.reset()
    return () => {
      cameraResetRef.current = null
    }
  }, [cameraResetRef])

  return (
    <>
      <color attach="background" args={['#0f172a']} />
      
      {/* Enhanced Lighting for "Studio" look */}
      <hemisphereLight color="#bae6fd" groundColor="#1e293b" intensity={0.8} />
      <ambientLight intensity={0.4} />
      
      {/* Key light */}
      <directionalLight position={[10, 20, 10]} intensity={2} />
      
      {/* Rim light (Backlight) */}
      <pointLight position={[0, 10, -15]} intensity={4} color="#38bdf8" />
      <directionalLight position={[0, -5, -10]} intensity={1.5} color="#1e40af" />

      <Environment preset="city" environmentIntensity={0.6} />
      
      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        enableZoom={true}
        minDistance={8}
        maxDistance={25}
        minPolarAngle={ORBIT_MIN_POLAR}
        maxPolarAngle={ORBIT_MAX_POLAR}
        dampingFactor={0.08}
        enableDamping
        makeDefault
      />
      
      <Bounds fit clip observe margin={1.2}>
        {/* Align model axes to profile side-view projection; tune via profile config. */}
        <group rotation={ACTIVE_VEHICLE_PROFILE.rootRotation}>
          <TahoeMesh
            orbitRef={orbitRef}
            onSideViewSnapped={onSideViewSnapped}
            cameraAligned={cameraAligned}
            {...meshProps}
          />
          
          {/* Subtle floor shadow / pedestal */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
            <circleGeometry args={[6, 32]} />
            <meshBasicMaterial 
              color="#000" 
              transparent 
              opacity={0.3} 
              side={THREE.DoubleSide} 
            />
          </mesh>
        </group>
      </Bounds>
    </>
  )
}

// ─── Error boundary ───────────────────────────────────────────────────────────

type BoundaryProps = { children: ReactNode; fallback: ReactNode }

class ModelErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TahoeThreeCanvas]', error, info.componentStack)
  }
  override render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

function LoadingIndicator(): ReactNode {
  return (
    <Html center>
      <span className="rounded bg-black/60 px-2 py-1 text-xs text-white">Loading 3D…</span>
    </Html>
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type TahoeThreeCanvasProps = Omit<
  TahoeMeshProps,
  'cameraAligned' | 'orbitRef' | 'onSideViewSnapped'
> & {
  fallback2d: ReactNode
  cameraResetRef: RefObject<(() => void) | null>
}

/**
 * 3D vehicle with orbit controls and direct mesh raycasting.
 * Zone interaction works from any camera angle.
 */
export function TahoeThreeCanvas({
  fallback2d,
  cameraResetRef,
  ...sceneProps
}: TahoeThreeCanvasProps): ReactNode {
  return (
    <ModelErrorBoundary fallback={fallback2d}>
      <Canvas
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        className="h-full w-full touch-none"
        dpr={[1, 2]}
        orthographic
        frameloop="demand"
      >
        <OrthographicCamera
          makeDefault
          position={ACTIVE_VEHICLE_PROFILE.camera.position}
          zoom={ACTIVE_VEHICLE_PROFILE.camera.zoom}
          near={ACTIVE_VEHICLE_PROFILE.camera.near}
          far={ACTIVE_VEHICLE_PROFILE.camera.far}
        />
        <Suspense fallback={<LoadingIndicator />}>
          <TahoeScene cameraResetRef={cameraResetRef} {...sceneProps} />
        </Suspense>
      </Canvas>
    </ModelErrorBoundary>
  )
}
