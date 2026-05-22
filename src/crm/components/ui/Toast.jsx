export default function Toast({ tone = 'success', message, onClose }) {
  const toneClasses =
    tone === 'error'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-900 dark:text-rose-100'
      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'

  return (
    <div className={`glass fixed right-4 top-4 z-[70] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border p-3 ${toneClasses}`}>
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
  )
}

