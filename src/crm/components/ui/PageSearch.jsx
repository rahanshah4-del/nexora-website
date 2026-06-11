import { HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2'
import { cn } from '../../utils/cn.js'

// Standardized page-level search bar. Controlled component — the parent owns the
// query string and filters its already-loaded rows. No global search, no extra
// Firestore listeners. Light/dark compatible and mobile responsive.
//
// Props:
//   value        current query string
//   onChange     (nextString) => void  — called with the new value
//   placeholder  page-specific placeholder, e.g. "Search customers..."
//   resultCount  number of rows shown after filtering (optional)
//   totalCount   total rows before filtering (optional)
//   onClear      () => void — optional; defaults to onChange('')
export default function PageSearch({
  value = '',
  onChange,
  placeholder = 'Search…',
  resultCount,
  totalCount,
  onClear,
  className,
  showCount = true,
}) {
  const hasValue = String(value || '').length > 0
  const showResultCount = showCount && typeof resultCount === 'number' && typeof totalCount === 'number'

  function clear() {
    if (onClear) onClear()
    else onChange?.('')
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="relative min-w-0">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
          <HiOutlineMagnifyingGlass className="h-5 w-5" />
        </span>
        <input
          type="text"
          inputMode="search"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            'focus-ring h-11 w-full rounded-2xl border border-slate-200 bg-white/90 pl-11 pr-11 text-sm text-slate-900 shadow-sm outline-none transition duration-200',
            'placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 focus:bg-white',
            'dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500',
          )}
        />
        {hasValue ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="focus-ring absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {showResultCount && hasValue ? (
        <p className="px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing {resultCount} of {totalCount}
        </p>
      ) : null}
    </div>
  )
}
