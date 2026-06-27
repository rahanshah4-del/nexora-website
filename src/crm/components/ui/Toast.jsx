export default function Toast({ tone = 'success', message, onClose }) {
  const isNetworkIssue = /internet|network|offline|connect|connection|server|sync/i.test(message || '')
  const toneIcon = isNetworkIssue
    ? '📡'
    : tone === 'error'
      ? '⚠️'
      : tone === 'warning'
        ? '⚡'
        : tone === 'info'
          ? 'ℹ️'
          : '✅'
  const toneClasses =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100'
        : tone === 'info'
          ? 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100'
          : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100'

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[110] flex w-[calc(100vw-1.5rem)] justify-end sm:right-5 sm:top-5 sm:w-auto" role="status" aria-live="polite">
      <div className={`pointer-events-auto w-full max-w-sm rounded-2xl border p-3 shadow-xl backdrop-blur-xl ${toneClasses}`}>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-lg shadow-sm dark:bg-white/10" aria-hidden="true">
            {toneIcon}
          </span>
          <p className="min-w-0 flex-1 pt-1 text-sm font-semibold leading-5">{message}</p>
          <button
            type="button"
            className="focus-ring shrink-0 rounded-xl px-2 py-1 text-xs font-black text-slate-600 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-white/10"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
