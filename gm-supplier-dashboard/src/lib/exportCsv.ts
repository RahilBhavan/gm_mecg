import type { Supplier } from '@/types/dashboard'

const HEADERS = [
  'Company',
  'Tier',
  'Revenue_$B',
  'SGA_pct',
  'EBIT_pct',
  'Combined_pct',
  'OEM_Customers',
  'Parts',
  'Period',
  'Source',
]

function cell(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const s = String(value)
  // Quote cells that contain commas, quotes, or newlines
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportToCsv(suppliers: Supplier[], filename = 'gm-suppliers.csv'): void {
  const rows = suppliers.map((s) => [
    cell(s.companyName),
    cell(s.tier),
    cell(s.revenueUsd != null ? (s.revenueUsd / 1e9).toFixed(3) : ''),
    cell(s.sgaPercent != null ? (s.sgaPercent * 100).toFixed(2) : ''),
    cell(s.ebitPercent != null ? (s.ebitPercent * 100).toFixed(2) : ''),
    cell(s.sgaEbitPercent != null ? (s.sgaEbitPercent * 100).toFixed(2) : ''),
    cell(s.oemCustomers),
    cell(s.automotiveParts),
    cell(s.period),
    cell(s.source),
  ])

  const csv = [HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
