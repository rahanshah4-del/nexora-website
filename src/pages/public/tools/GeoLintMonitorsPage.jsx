import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { addMonitor, listMonitors, removeMonitor } from '../../../lib/geolintClient.js'
import { GEOLINT_MONITORS_PATH, GEOLINT_PATH, GEOLINT_SIGNIN_PATH } from '../../../lib/geolintLaunch.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ActionButton } from './GeoLintFixShared.jsx'
import { useFixClient } from './geolintFixHooks.js'
import './geolint.css'

const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const tone = (s) => (s === null || s === undefined ? 'text-slate-400' : s >= 80 ? 'text-emerald-700' : s >= 60 ? 'text-amber-700' : 'text-rose-700')

/** The last results as a tiny bar row, oldest left. Failed weeks are grey. */
function Trend({ history }) {
  if (!history.length) return <p className="text-[13px] text-slate-500">First check runs within the hour.</p>
  return (
    <div className="flex h-10 items-end gap-1" role="img" aria-label={`Scores: ${history.map((h) => (h.score === null ? 'failed' : h.score)).join(', ')}`}>
      {history.map((h) => (
        <span key={h.at} title={`${day(h.at)}: ${h.score === null ? 'could not load' : `${h.score}/100`}`} className={`w-3 rounded-sm ${h.score === null ? 'bg-slate-300' : h.score >= 80 ? 'bg-emerald-500' : h.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ height: `${h.score === null ? 20 : Math.max(8, h.score)}%` }} />
      ))}
    </div>
  )
}

/** /tools/geo-audit/monitors/: the signed-in person's watched pages (free weekly monitoring). */
export default function GeoLintMonitorsPage() {
  const { user, ready } = useFixClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState('')
  const added = useRef(false)

  const load = useCallback(async () => {
    try { setData(await listMonitors()); setError('') } catch (e) { setError(e?.message || 'Could not load your watched pages.') }
  }, [])

  const add = useCallback(async (target, auditId) => {
    setBusy('add'); setError('')
    try { await addMonitor({ url: target, auditId }); setUrl(''); await load() } catch (e) { setError(e?.message || 'Could not watch this page.') } finally { setBusy('') }
  }, [load])

  useEffect(() => {
    if (!ready || !user?.emailVerified) return
    // coming back from sign-in with ?add=: add that page once, then tidy the address bar
    const pending = params.get('add')
    if (pending && !added.current) {
      added.current = true
      const audit = params.get('audit') || undefined
      navigate(GEOLINT_MONITORS_PATH, { replace: true })
      add(pending, audit)
    } else load()
  }, [ready, user, params, navigate, add, load])

  if (ready && !user?.emailVerified) {
    return <Navigate to={`${GEOLINT_SIGNIN_PATH}?next=${encodeURIComponent(`${GEOLINT_MONITORS_PATH}${location.search}`)}`} replace />
  }

  const remove = async (id) => {
    setBusy(id)
    try { await removeMonitor(id); await load() } catch (e) { setError(e?.message || 'Could not stop watching.') } finally { setBusy('') }
  }

  const items = data?.items || []
  const full = data && items.length >= data.limit

  return (
    <PublicPageShell backTo={GEOLINT_PATH} backLabel="Back to GeoLint">
      <PageSeo title="My watched pages | GeoLint" description="Free weekly GeoLint monitoring of your pages." canonical={`https://nexorasolution.us${GEOLINT_MONITORS_PATH}/`} path={GEOLINT_MONITORS_PATH} robots="noindex,nofollow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-tight text-slate-950 sm:text-4xl">My watched pages</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
          <strong className="font-semibold text-slate-900">GeoLint re-audits each page once a week, for free.</strong> We email you only when the score drops by 5 or more points, AI search bots lose access, or the page stops loading. You can watch up to {data?.limit ?? 3} pages.
        </p>
        {data && !data.emails ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">Email alerts are being set up. Your weekly results are still recorded here.</p> : null}

        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (url.trim()) add(url.trim()) }}>
          <label className="flex-1">
            <span className="sr-only">Page address</span>
            <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourwebsite.com/" disabled={full} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100" />
          </label>
          <ActionButton type="submit" busy={busy === 'add'} disabled={full}>Watch page</ActionButton>
        </form>
        {full ? <p className="mt-2 text-[13px] text-slate-500">You are watching the maximum number of pages. Remove one to add another.</p> : null}
        {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-rose-700">{error}</p> : null}

        <ul className="mt-8 grid gap-4">
          {!data && !error ? <li className="text-[14px] text-slate-500">Loading…</li> : null}
          {data && !items.length ? <li className="gl-card p-5 text-[14.5px] text-slate-600">No pages yet. Add one above, or press “Watch this page weekly” on any GeoLint report.</li> : null}
          {items.map((m) => (
            <li key={m.id} className="gl-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-[15.5px] font-semibold text-slate-900">{m.host}</p>
                  <p className="truncate text-[13px] text-slate-500">{m.url}</p>
                  <p className="mt-2 text-[13px] text-slate-600">
                    Last score <span className={`font-bold ${tone(m.lastScore)}`}>{m.lastScore ?? '—'}{m.lastScore !== null && m.lastScore !== undefined ? '/100' : ''}</span>
                    {' · '}Last check {day(m.lastRunAt)}{' · '}{m.active ? <>Next check {day(m.nextRunAt)}</> : <span className="font-semibold text-rose-700">Paused after repeated failures</span>}
                  </p>
                </div>
                <Trend history={m.history} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to={`${GEOLINT_PATH}/?url=${encodeURIComponent(m.url)}`} className="text-[14px] font-semibold text-blue-700 hover:underline">Run the full audit</Link>
                <button type="button" onClick={() => remove(m.id)} disabled={busy === m.id} className="text-[14px] font-semibold text-slate-600 hover:text-rose-700 disabled:opacity-50">{m.active ? 'Stop watching' : 'Remove'}</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PublicPageShell>
  )
}
