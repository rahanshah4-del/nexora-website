import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query as firestoreQuery,
} from 'firebase/firestore'
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineClock,
  HiOutlineDocumentChartBar,
  HiOutlineDocumentText,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiOutlineXMark,
} from 'react-icons/hi2'
import { useNavigate } from 'react-router-dom'
import { useOnClickOutside } from '../../hooks/useOnClickOutside.js'
import { useUser } from '../../hooks/useUser.js'
import { businessModuleKeys, normalizeBusinessType } from '../../data/moduleAccess.js'
import { cn } from '../../utils/cn.js'
import { belongsToBusiness, collectionRef, workspaceCollectionPath } from '../../lib/firestore.js'

const RECENTS_KEY = 'nexora_global_search_recent_v1'
const SEARCH_COLLECTION_LIMIT = 50
const emptySearchRows = { customers: [], leads: [], invoices: [] }
const searchCollections = [
  { key: 'customers', moduleKey: 'customers', path: 'customers' },
  { key: 'leads', moduleKey: 'leads', path: 'leads' },
  { key: 'invoices', moduleKey: 'invoices', path: 'invoices' },
]

const placeholders = {
  'General CRM': 'Search customers, leads, invoices...',
  'School ERP': 'Search students, fees, classes, teachers...',
  'Property ERP': 'Search tenants, properties, rent records...',
  'Restaurant POS': 'Search customers, menu items, bills...',
  'Retail / POS': 'Search customers, products, invoices...',
  'WhatsApp CRM': 'Search customers, leads, follow-ups...',
}

function safeText(...values) {
  return values.filter((value) => value !== undefined && value !== null && String(value).trim()).join(' ')
}

function matches(row, query) {
  return row.searchText.includes(query)
}

function makeResult({ id, type, title, subtitle, route, icon: Icon, keywords = '' }) {
  return {
    id: `${type}:${id}`,
    type,
    title: title || 'Untitled',
    subtitle,
    route,
    icon: Icon,
    searchText: safeText(type, title, subtitle, keywords).toLowerCase(),
  }
}

function readRecents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : []
  } catch {
    return []
  }
}

function resultLimit(rows, query) {
  if (!query) return []
  return rows.filter((row) => matches(row, query)).slice(0, 24)
}

function recentCollectionQuery(workspaceId, path) {
  const ref = collectionRef(workspaceCollectionPath(workspaceId, path))
  return ref ? firestoreQuery(ref, orderBy('createdAt', 'desc'), firestoreLimit(SEARCH_COLLECTION_LIMIT)) : null
}

export default function GlobalSearch({ className }) {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const { businessType, workspaceId } = useUser()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [searchRows, setSearchRows] = useState(emptySearchRows)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [recents, setRecents] = useState(() => readRecents())

  useOnClickOutside(rootRef, () => setOpen(false))

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const placeholder = placeholders[normalizeBusinessType(businessType)] || placeholders['General CRM']
  const allowedModules = useMemo(() => new Set(businessModuleKeys(businessType)), [businessType])
  const normalizedQuery = query.trim().toLowerCase()
  const shouldLoadSearchData = open || normalizedQuery.length >= 2
  const activeSearchCollections = useMemo(
    () => searchCollections.filter((item) => allowedModules.has(item.moduleKey)),
    [allowedModules],
  )

  useEffect(() => {
    if (!shouldLoadSearchData) {
      console.log('[GlobalSearch] idle', { open, queryLength: normalizedQuery.length })
    }
  }, [normalizedQuery.length, open, shouldLoadSearchData])

  useEffect(() => {
    if (shouldLoadSearchData) {
      console.log('[GlobalSearch] activated', { open, queryLength: normalizedQuery.length })
    }
  }, [normalizedQuery.length, open, shouldLoadSearchData])

  useEffect(() => {
    if (!shouldLoadSearchData) {
      setSearchLoading(false)
      setSearchError('')
      return undefined
    }

    if (!workspaceId || !activeSearchCollections.length) {
      setSearchRows(emptySearchRows)
      setSearchLoading(false)
      setSearchError('')
      return undefined
    }

    console.log('[GlobalSearch] loading collections', {
      collections: activeSearchCollections.map((item) => item.path),
      limit: SEARCH_COLLECTION_LIMIT,
    })

    setSearchLoading(true)
    setSearchError('')
    setSearchRows(emptySearchRows)

    const loaded = new Set()
    const markLoaded = (key) => {
      loaded.add(key)
      if (loaded.size >= activeSearchCollections.length) setSearchLoading(false)
    }

    const unsubscribers = activeSearchCollections.map((item) => {
      const searchQuery = recentCollectionQuery(workspaceId, item.path)
      if (!searchQuery) {
        markLoaded(item.key)
        return () => {}
      }

      return onSnapshot(
        searchQuery,
        (snap) => {
          const rows = snap.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter((row) => belongsToBusiness(row, businessType))
          setSearchRows((current) => ({ ...current, [item.key]: rows }))
          markLoaded(item.key)
        },
        (error) => {
          console.warn('[GlobalSearch] collection load failed', {
            collection: item.path,
            code: error?.code,
            message: error?.message,
          })
          setSearchRows((current) => ({ ...current, [item.key]: [] }))
          setSearchError('Some search data is unavailable for this account.')
          markLoaded(item.key)
        },
      )
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.())
    }
  }, [activeSearchCollections, businessType, shouldLoadSearchData, workspaceId])

  const allResults = useMemo(() => {
    const customers = !allowedModules.has('customers') ? [] : searchRows.customers.map((customer) =>
      makeResult({
        id: customer.id,
        type: normalizeBusinessType(businessType) === 'School ERP' ? 'Students/Customers' : 'Customers',
        title: customer.name || customer.studentName || customer.customerName,
        subtitle: safeText(customer.company, customer.className, customer.email, customer.phone),
        route: '/app/customers',
        icon: HiOutlineUserGroup,
        keywords: safeText(customer.customerType, customer.status),
      }),
    )

    const invoices = !allowedModules.has('invoices') ? [] : searchRows.invoices.map((invoice) =>
      makeResult({
        id: invoice.id,
        type: normalizeBusinessType(businessType) === 'School ERP' ? 'Invoices/Fees' : 'Invoices',
        title: invoice.invoiceNumber || invoice.id,
        subtitle: safeText(invoice.customerName, invoice.customerEmail, invoice.status, invoice.currency, invoice.total),
        route: '/app/invoices',
        icon: HiOutlineDocumentText,
      }),
    )

    const leads = !allowedModules.has('leads') ? [] : searchRows.leads.map((lead) =>
      makeResult({
        id: lead.id,
        type: 'Leads',
        title: lead.name,
        subtitle: safeText(lead.company, lead.email, lead.source, lead.status, lead.priority),
        route: '/app/leads',
        icon: HiOutlineUserGroup,
      }),
    )

    return [...customers, ...invoices, ...leads]
  }, [
    allowedModules,
    businessType,
    searchRows.customers,
    searchRows.invoices,
    searchRows.leads,
  ])

  const results = useMemo(() => resultLimit(allResults, normalizedQuery), [allResults, normalizedQuery])

  const quickActions = useMemo(
    () =>
      [
        allowedModules.has('customers')
          ? { label: normalizeBusinessType(businessType) === 'School ERP' ? 'Add student' : 'Add customer', route: '/app/customers', icon: HiOutlinePlus }
          : null,
        allowedModules.has('invoices')
          ? { label: normalizeBusinessType(businessType) === 'School ERP' ? 'Create fee invoice' : 'Create invoice', route: '/app/invoices/create', icon: HiOutlineDocumentText }
          : null,
        allowedModules.has('products')
          ? { label: normalizeBusinessType(businessType) === 'Restaurant POS' ? 'Add menu item' : 'Add product', route: '/app/products', icon: HiOutlineSquares2X2 }
          : null,
        allowedModules.has('expenses') ? { label: 'Add expense', route: '/app/expenses', icon: HiOutlineDocumentText } : null,
        allowedModules.has('reports') ? { label: 'Open reports', route: '/app/reports', icon: HiOutlineDocumentChartBar } : null,
      ].filter(Boolean),
    [allowedModules, businessType],
  )

  const remember = useCallback((value) => {
    const text = String(value || '').trim()
    if (!text) return
    const next = [text, ...recents.filter((item) => item.toLowerCase() !== text.toLowerCase())].slice(0, 6)
    setRecents(next)
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  }, [recents])

  const openRoute = useCallback((route, recentValue = query) => {
    remember(recentValue)
    setOpen(false)
    setQuery('')
    navigate(route)
  }, [navigate, query, remember])

  const clear = useCallback(() => {
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }, [])

  return (
    <div ref={rootRef} className={cn('relative flex w-full min-w-0', className)}>
      <div className="relative flex h-12 w-full min-w-0 items-center sm:h-[50px]">
        <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          className="focus-ring h-full w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50/85 pl-12 pr-24 text-sm font-medium leading-none text-slate-900 shadow-none outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-400"
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          aria-label="Global search"
        />
        {query ? (
          <button
            type="button"
            className="focus-ring absolute right-[4.75rem] top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-white/10"
            onClick={clear}
            aria-label="Clear search"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        ) : null}
        <span className="pointer-events-none absolute right-3 top-1/2 inline-flex h-7 -translate-y-1/2 items-center rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold leading-none text-slate-400 dark:border-slate-700 dark:bg-slate-900">
          Ctrl K
        </span>
      </div>

      {open ? (
        <div className="glass absolute left-0 top-[calc(100%+0.75rem)] z-[60] w-full max-w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-2 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-slate-950/95">
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Global Search</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">Search live workspace data and shortcuts.</p>
            </div>
            <HiOutlineMagnifyingGlass className="h-5 w-5 text-slate-400" />
          </div>

          {normalizedQuery ? (
            <div className="max-h-[22rem] overflow-auto p-1">
              {results.length ? (
                <div className="space-y-1">
                  {results.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="focus-ring flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-slate-100/80 dark:hover:bg-white/10"
                        onClick={() => openRoute(item.route)}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">{item.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-300">{item.type} · {item.subtitle || item.route}</span>
                        </span>
                        <HiOutlineArrowTopRightOnSquare className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    )
                  })}
                </div>
              ) : searchLoading ? (
                <div className="rounded-2xl px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                  Loading search results...
                </div>
              ) : (
                <div className="rounded-2xl px-3 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
                  No results found.
                </div>
              )}
              {searchError ? <p className="px-3 pb-2 text-xs font-semibold text-amber-700">{searchError}</p> : null}
            </div>
          ) : (
            <div className="grid gap-3 p-1 md:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-2 dark:border-white/10 dark:bg-white/5">
                <p className="px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Recent</p>
                {recents.length ? (
                  recents.map((recent) => (
                    <button
                      key={recent}
                      type="button"
                      className="focus-ring flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-white/10"
                      onClick={() => {
                        setQuery(recent)
                        setOpen(true)
                        inputRef.current?.focus()
                      }}
                    >
                      <HiOutlineClock className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{recent}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-2 py-5 text-sm text-slate-500 dark:text-slate-300">No recent searches yet.</p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-2 dark:border-white/10 dark:bg-white/5">
                <p className="px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quick actions</p>
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      type="button"
                      className="focus-ring flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                      onClick={() => openRoute(action.route, action.label)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-sky-600" />
                      <span className="truncate">{action.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
