import { type MouseEvent, useMemo, useState } from 'react'
import {
  ComposableMap,
  Geographies,
  type GeoFeature,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps'

import { useDashboard } from '@/context/DashboardContext'

// TopoJSON world atlas (110m)
const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO numeric → ISO2 mapping for the countries present in our dataset
const ISO_NUMERIC_TO_ISO2: Record<string, string> = {
  '004': 'AF', '008': 'AL', '012': 'DZ', '024': 'AO', '032': 'AR',
  '036': 'AU', '040': 'AT', '056': 'BE', '068': 'BO', '076': 'BR',
  '100': 'BG', '116': 'KH', '124': 'CA', '144': 'LK', '152': 'CL',
  '156': 'CN', '170': 'CO', '191': 'HR', '203': 'CZ', '208': 'DK',
  '818': 'EG', '233': 'EE', '231': 'ET', '246': 'FI', '250': 'FR',
  '276': 'DE', '288': 'GH', '300': 'GR', '344': 'HK', '348': 'HU',
  '356': 'IN', '360': 'ID', '372': 'IE', '376': 'IL', '380': 'IT',
  '392': 'JP', '404': 'KE', '410': 'KR', '414': 'KW', '458': 'MY',
  '484': 'MX', '528': 'NL', '554': 'NZ', '566': 'NG', '578': 'NO',
  '586': 'PK', '604': 'PE', '608': 'PH', '616': 'PL', '620': 'PT',
  '630': 'PR', '642': 'RO', '643': 'RU', '682': 'SA', '710': 'ZA',
  '724': 'ES', '752': 'SE', '756': 'CH', '158': 'TW', '764': 'TH',
  '792': 'TR', '804': 'UA', '784': 'AE', '826': 'GB', '840': 'US',
  '858': 'UY', '862': 'VE', '704': 'VN', '716': 'ZW', '442': 'LU',
}

const FILL_BASE = '#e2e8f0'
const FILL_ACTIVE = '#0057a8'
const FILL_SELECTED = '#f59e0b'
const FILL_HOVER = '#00b4d8'
const STROKE = '#94a3b8'

function interpolateBlue(t: number): string {
  // t in [0, 1] → light steel → GM blue
  const r = Math.round(226 + (0 - 226) * t)
  const g = Math.round(232 + (87 - 232) * t)
  const b = Math.round(240 + (168 - 240) * t)
  return `rgb(${r},${g},${b})`
}

export function WorldMapView() {
  const { state, dispatch, suppliers } = useDashboard()
  const [hovered, setHovered] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    label: string
  } | null>(null)

  // Count ALL suppliers per ISO2 (unfiltered — choropleth shows full picture)
  const countryCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of suppliers) {
      if (s.iso2) m.set(s.iso2, (m.get(s.iso2) ?? 0) + 1)
    }
    return m
  }, [suppliers])

  const maxCount = useMemo(
    () => Math.max(...countryCounts.values(), 1),
    [countryCounts],
  )

  // Build summary rows for the legend table
  const topCountries = useMemo(() => {
    return [...countryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([iso2, count]) => ({ iso2, count }))
  }, [countryCounts])

  function fillFor(iso2: string | undefined): string {
    if (!iso2) return FILL_BASE
    if (iso2 === state.countryFilter) return FILL_SELECTED
    if (iso2 === hovered) return FILL_HOVER
    const count = countryCounts.get(iso2) ?? 0
    if (count === 0) return FILL_BASE
    return interpolateBlue(count / maxCount)
  }

  function handleClick(iso2: string | undefined) {
    if (!iso2) return
    if (countryCounts.get(iso2) === 0) return
    dispatch({
      type: 'SET_COUNTRY_FILTER',
      iso2: state.countryFilter === iso2 ? null : iso2,
    })
  }

  const activeCount = state.countryFilter
    ? (countryCounts.get(state.countryFilter) ?? 0)
    : null

  return (
    <div className="flex flex-col gap-3">
      {/* Active filter pill */}
      {state.countryFilter && (
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[var(--border)] bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {state.countryFilter} · {activeCount} supplier
            {activeCount !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            className="rounded-full border border-[var(--border)] px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => dispatch({ type: 'SET_COUNTRY_FILTER', iso2: null })}
          >
            Clear
          </button>
        </div>
      )}

      {/* Map */}
      <div
        className="relative overflow-hidden rounded-xl border border-[var(--border)]"
        style={{ background: 'var(--surface-alt, #f1f5f9)' }}
      >
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          width={800}
          height={400}
          style={{ width: '100%', height: 'auto' }}
        >
          <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={5}>
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: GeoFeature[] }) =>
                geographies.map((geo: GeoFeature) => {
                  const numId = String(geo.id).padStart(3, '0')
                  const iso2 = ISO_NUMERIC_TO_ISO2[numId]
                  const count = iso2 ? (countryCounts.get(iso2) ?? 0) : 0
                  const isSelected = iso2 === state.countryFilter
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillFor(iso2)}
                      stroke={isSelected ? FILL_ACTIVE : STROKE}
                      strokeWidth={isSelected ? 1.5 : 0.4}
                      style={{
                        default: { outline: 'none' },
                        hover: { outline: 'none', cursor: count > 0 ? 'pointer' : 'default' },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={(e: MouseEvent<SVGPathElement>) => {
                        setHovered(iso2 ?? null)
                        if (iso2 && count > 0) {
                          setTooltip({
                            x: e.clientX,
                            y: e.clientY,
                            label: `${iso2}: ${count} supplier${count !== 1 ? 's' : ''}`,
                          })
                        }
                      }}
                      onMouseMove={(e: MouseEvent<SVGPathElement>) => {
                        if (tooltip)
                          setTooltip((t) =>
                            t ? { ...t, x: e.clientX, y: e.clientY } : null,
                          )
                      }}
                      onMouseLeave={() => {
                        setHovered(null)
                        setTooltip(null)
                      }}
                      onClick={() => handleClick(iso2)}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Floating tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs shadow-md"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            {tooltip.label}
          </div>
        )}
      </div>

      {/* Legend + top countries */}
      <div className="flex items-start justify-between gap-4">
        {/* Gradient legend */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)]">0</span>
          <div
            className="h-2.5 w-24 rounded"
            style={{
              background: `linear-gradient(to right, #e2e8f0, #0057a8)`,
            }}
          />
          <span className="text-[10px] text-[var(--text-muted)]">{maxCount}</span>
          <span className="ml-1 text-[10px] text-[var(--text-muted)]">suppliers</span>
        </div>

        {/* Top countries table */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {topCountries.map(({ iso2, count }) => (
            <button
              key={iso2}
              type="button"
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors ${
                state.countryFilter === iso2
                  ? 'bg-amber-100 font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              onClick={() => handleClick(iso2)}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-sm"
                style={{ background: interpolateBlue(count / maxCount) }}
              />
              {iso2} <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {!state.countryFilter && (
        <p className="text-center text-xs text-[var(--text-muted)]">
          Click a country to filter suppliers by HQ location
        </p>
      )}
    </div>
  )
}
