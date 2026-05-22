import Spinner from './Spinner.jsx'

export default function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="glass rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="font-medium">Loading…</span>
        </div>
      </div>
    </div>
  )
}

