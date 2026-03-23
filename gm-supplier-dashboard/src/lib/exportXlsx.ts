import * as XLSX from 'xlsx'

import type { Supplier } from '@/types/dashboard'

const HEADERS = [
  'Company',
  'Tier',
  'Revenue ($B)',
  'SG&A %',
  'EBIT %',
  'Combined %',
  'OEM Customers',
  'Automotive Parts',
  'Period',
  'Source',
  'GM Supplier',
]

function toRow(s: Supplier): (string | number | null)[] {
  return [
    s.companyName,
    s.tier,
    s.revenueUsd != null ? parseFloat((s.revenueUsd / 1e9).toFixed(3)) : null,
    s.sgaPercent != null ? parseFloat((s.sgaPercent * 100).toFixed(2)) : null,
    s.ebitPercent != null ? parseFloat((s.ebitPercent * 100).toFixed(2)) : null,
    s.sgaEbitPercent != null ? parseFloat((s.sgaEbitPercent * 100).toFixed(2)) : null,
    s.oemCustomers,
    s.automotiveParts,
    s.period,
    s.source,
    s.isGMSupplier ? 'Yes' : 'No',
  ]
}

/** Download suppliers as a formatted .xlsx workbook. */
export function exportToXlsx(suppliers: Supplier[], filename = 'gm-suppliers.xlsx'): void {
  const rows = suppliers.map(toRow)
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])

  // Column widths
  const colWidths = [
    { wch: 36 }, // Company
    { wch: 6 },  // Tier
    { wch: 13 }, // Revenue
    { wch: 10 }, // SG&A %
    { wch: 10 }, // EBIT %
    { wch: 12 }, // Combined %
    { wch: 40 }, // OEM Customers
    { wch: 50 }, // Parts
    { wch: 10 }, // Period
    { wch: 40 }, // Source
    { wch: 12 }, // GM Supplier
  ]
  ws['!cols'] = colWidths

  // Bold header row
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!ws[addr]) continue
    ws[addr].s = { font: { bold: true } }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers')
  XLSX.writeFile(wb, filename)
}
