import { useEffect } from 'react'

import { useDashboard } from '@/context/DashboardContext'

export function MethodologyModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { methodology } = useDashboard()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-title"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="methodology-title" className="text-lg font-semibold">
            Methodology
          </h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-primary)]">
          {methodology || 'No methodology text loaded.'}
        </pre>
      </div>
    </div>
  )
}
