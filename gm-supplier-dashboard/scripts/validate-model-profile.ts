import { ACTIVE_VEHICLE_PROFILE } from '../src/models'
import { ZONE_IDS } from '../src/data/zones'

function assertCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(): void {
  const { zones } = ACTIVE_VEHICLE_PROFILE

  const polygonKeys = Object.keys(zones.polygons)
  const anchorKeys = Object.keys(zones.labelAnchors)
  const matchOrderSet = new Set(zones.matchOrder)

  for (const zoneId of ZONE_IDS) {
    assertCondition(
      polygonKeys.includes(zoneId),
      `Missing polygon for zone ${zoneId} in active model profile`,
    )
    assertCondition(
      anchorKeys.includes(zoneId),
      `Missing label anchor for zone ${zoneId} in active model profile`,
    )
    assertCondition(
      matchOrderSet.has(zoneId),
      `Missing match-order entry for zone ${zoneId} in active model profile`,
    )
  }

  const duplicatePatterns = new Set<string>()
  for (const pattern of zones.ignoredMeshPathPatterns) {
    const key = pattern.toLowerCase()
    assertCondition(!duplicatePatterns.has(key), `Duplicate ignored pattern: ${pattern}`)
    duplicatePatterns.add(key)
  }

  const zoneByMeshPath = new Map<string, string>()
  for (const [zoneId, meshPaths] of Object.entries(zones.meshPathMap)) {
    for (const path of meshPaths ?? []) {
      const key = path.trim().toLowerCase()
      assertCondition(key.length > 0, `Empty mesh path entry in zone ${zoneId}`)
      const existing = zoneByMeshPath.get(key)
      assertCondition(
        !existing || existing === zoneId,
        `Mesh path "${path}" mapped to multiple zones (${existing}, ${zoneId})`,
      )
      zoneByMeshPath.set(key, zoneId)
    }
  }

  console.log('[validate-model-profile] OK')
  console.log(`[validate-model-profile] zones=${ZONE_IDS.length}`)
  console.log(`[validate-model-profile] authoredMeshPaths=${zoneByMeshPath.size}`)
}

run()
