export default function Toast({ tone = 'success', message, onClose }) {
  const toneClasses =
    tone === 'error'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-900 dark:text-rose-100'
      : tone === 'warning'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-100'
        : tone === 'info'
          ? 'border-sky-500/20 bg-sky-500/10 text-sky-900 dark:text-sky-100'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] grid place-items-center p-4" role="status" aria-live="polite">
      <div className={`glass pointer-events-auto w-[22rem] max-w-full rounded-2xl border p-3 shadow-xl ${toneClasses}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold">{message}</p>
          <button
            type="button"
            className="focus-ring rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
