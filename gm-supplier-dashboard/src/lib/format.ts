/**
 * Title-case a company name for display (PRD §4.2).
 *
 * @param name - Raw company name from data.
 * @returns Normalised display string.
 */
export function toTitleCase(name: string): string {
  if (!name.trim()) return name
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      if (!w) return w
      const upper = ['Inc', 'Corp', 'Ltd', 'Llp', 'Llc', 'Lp', 'Nv', 'Ab', 'Se', 'Sa', 'Plc']
      const base = w.charAt(0).toUpperCase() + w.slice(1)
      const stripped = base.replace(/\.$/, '')
      const match = upper.find((u) => u.toLowerCase() === stripped.toLowerCase())
      return match != null ? (base.endsWith('.') ? `${match}.` : match) : base
    })
    .join(' ')
}

/**
 * Format revenue as `$XX.XB` / `$X.XM` for UI (PRD §5.5).
 *
 * @param usd - Revenue in USD or null.
 * @returns Display string or em dash.
 */
export function formatRevenueUsd(usd: number | null): string {
  if (usd == null || usd <= 0) return '—'
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`
  return `$${usd.toLocaleString()}`
}

/**
 * Format a ratio stored as decimal (0.074) as percentage with one decimal.
 */
export function formatPct1(p: number | null): string {
  if (p == null || Number.isNaN(p)) return '—'
  return `${(p * 100).toFixed(1)}%`
}
