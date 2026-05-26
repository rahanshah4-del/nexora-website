import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Dropdown from '../ui/Dropdown.jsx'
import Input from '../ui/Input.jsx'
import { navItems } from '../../data/navigation.js'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return navItems
      .filter((n) => n.label.toLowerCase().includes(q))
      .slice(0, 7)
  }, [query])

  return (
    <div className="relative flex w-full min-w-0 max-w-[34rem]">
      <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
      <Dropdown
        align="left"
        className="w-full min-w-0"
        panelClassName="w-[22rem]"
        trigger={() => (
          <Input
            className="h-10 w-full rounded-2xl border-slate-200 bg-slate-50/80 pl-10 shadow-none"
            placeholder="Search customers, leads, reports..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
      >
        {({ close }) => (
          <div className="w-[22rem] max-w-[calc(100vw-2rem)] p-1">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Global Search</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Search workspace shortcuts</p>
            </div>
            <div className="max-h-64 space-y-1 overflow-auto p-1">
              {results.length ? (
                results.map((r) => (
                  <button
                    key={r.to}
                    type="button"
                    className="focus-ring w-full rounded-2xl px-3 py-2 text-left hover:bg-white/40 dark:hover:bg-white/10"
                    onClick={() => {
                      navigate(r.to)
                      setQuery('')
                      close()
                    }}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.label}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{r.to}</p>
                  </button>
                ))
              ) : query.trim() ? (
                <div className="rounded-2xl px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                  No results.
                </div>
              ) : (
                <div className="rounded-2xl px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                  Type to search…
                </div>
              )}
            </div>
          </div>
        )}
      </Dropdown>
    </div>
  )
}
