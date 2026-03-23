declare module 'react-simple-maps' {
  import type { ReactNode, CSSProperties, MouseEvent } from 'react'

  interface ComposableMapProps {
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    style?: CSSProperties
    children?: ReactNode
  }
  export function ComposableMap(props: ComposableMapProps): JSX.Element

  interface ZoomableGroupProps {
    zoom?: number
    minZoom?: number
    maxZoom?: number
    children?: ReactNode
  }
  export function ZoomableGroup(props: ZoomableGroupProps): JSX.Element

  interface GeographiesProps {
    geography: string
    children: (props: { geographies: GeoFeature[] }) => ReactNode
  }
  export function Geographies(props: GeographiesProps): JSX.Element

  interface GeoFeature {
    rsmKey: string
    id: string | number
    properties: Record<string, unknown>
    type: string
  }

  interface GeographyProps {
    geography: GeoFeature
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: CSSProperties
      hover?: CSSProperties
      pressed?: CSSProperties
    }
    onMouseEnter?: (e: MouseEvent<SVGPathElement>) => void
    onMouseMove?: (e: MouseEvent<SVGPathElement>) => void
    onMouseLeave?: (e: MouseEvent<SVGPathElement>) => void
    onClick?: (e: MouseEvent<SVGPathElement>) => void
  }
  export function Geography(props: GeographyProps): JSX.Element
}
