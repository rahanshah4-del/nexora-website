export default function ChartEmptyState({ label = 'No data yet' }) {
  return (
    <div className="grid h-64 w-full place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
      {label}
    </div>
  )
}
