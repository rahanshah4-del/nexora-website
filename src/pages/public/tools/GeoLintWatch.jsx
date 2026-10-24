import { useEffect, useState } from 'react'
import Link from '../../../components/AppLink.jsx'
import { checkCitations, getCitationStatus, suggestCitationQueries } from '../../../lib/geolint.js'
import { addMonitor } from '../../../lib/geolintClient.js'
import { GEOLINT_MONITORS_PATH, GEOLINT_SIGNIN_PATH } from '../../../lib/geolintLaunch.js'
import { ActionButton } from './GeoLintFixShared.jsx'
import { useFixClient } from './geolintFixHooks.js'

const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } }

/**
 * "Watch this page weekly": free monitoring for signed-in people. The open report becomes the baseline,
 * so the first email can only come after next week's check finds a real change.
 */
export function WatchPanel({ report }) {
  const { user, ready } = useFixClient()
  const [state, setState] = useState({ phase: 'idle', message: '' })
  const next = `${GEOLINT_MONITORS_PATH}/?add=${encodeURIComponent(report.url)}${report.id ? `&audit=${encodeURIComponent(report.id)}` : ''}`

  const watch = async () => {
    setState({ phase: 'busy', message: '' })
    try {
      const { existed } = await addMonitor({ url: report.url, auditId: report.id })
      setState({ phase: 'done', message: existed ? 'You are already watching this page.' : 'Done. We will check this page every week and email you if something important changes.' })
    } catch (error) {
      setState({ phase: 'error', message: error?.message || 'Could not start watching this page.' })
    }
  }

  return (
    <div className="gl-card p-5">
      <ul className="grid gap-2 text-[14px] leading-6 text-slate-600 sm:grid-cols-3">
        <li><strong className="font-semibold text-slate-900">Weekly re-audit</strong> of this page, free.</li>
        <li><strong className="font-semibold text-slate-900">Email only when it matters:</strong> a score drop of 5+ points or AI bots losing access.</li>
        <li><strong className="font-semibold text-slate-900">Up to 3 pages</strong>, stop any time.</li>
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!ready ? null : user?.emailVerified ? (
          <>
            {state.phase === 'done' ? null : <ActionButton onClick={watch} busy={state.phase === 'busy'}>Watch this page weekly</ActionButton>}
            <Link to={GEOLINT_MONITORS_PATH} className="text-[14px] font-semibold text-blue-700 hover:underline">My watched pages</Link>
          </>
        ) : (
          <Link to={`${GEOLINT_SIGNIN_PATH}?next=${encodeURIComponent(next)}`} className="gx-focus inline-flex min-h-[48px] items-center rounded-xl bg-blue-600 px-6 py-2.5 text-[15px] font-semibold text-white hover:bg-blue-700">Sign in to watch this page</Link>
        )}
      </div>
      {state.message ? <p role={state.phase === 'error' ? 'alert' : 'status'} className={`mt-3 text-[14px] font-semibold ${state.phase === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{state.message}</p> : null}
    </div>
  )
}

function ResultRow({ r }) {
  const tone = r.cited ? 'border-emerald-200 bg-emerald-50/60' : r.mentioned ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'
  const verdict = r.cited ? `Cited as source #${r.position}` : r.mentioned ? 'Named, but not linked as a source' : 'Not cited'
  return (
    <li className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-[14.5px] font-semibold text-slate-900">“{r.query}”</p>
      <p className={`mt-1 text-[13.5px] font-bold ${r.cited ? 'text-emerald-700' : r.mentioned ? 'text-amber-700' : 'text-slate-600'}`}>{verdict}</p>
      {r.excerpt ? <p className="mt-2 text-[13px] leading-6 text-slate-600">{r.excerpt}</p> : null}
      {r.others?.length ? <p className="mt-2 text-[12.5px] leading-5 text-slate-500">Sources used instead: {r.others.join(', ')}</p> : null}
    </li>
  )
}

/**
 * "Does AI cite you?": asks a real answer engine up to 3 questions and shows whether this site is a source.
 * `wrap` puts the page's own section heading around it, so nothing (not even the heading) shows while the
 * feature is off on the server.
 */
export function CitationPanel({ report, wrap = (children) => children }) {
  const host = hostOf(report.url)
  const [status, setStatus] = useState(null)
  const [queries, setQueries] = useState(() => suggestCitationQueries({ host, title: report?.fixPack?.basis?.title || '' }))
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    let live = true
    getCitationStatus().then((s) => { if (live) setStatus(s) }).catch(() => { if (live) setStatus({ enabled: false }) })
    return () => { live = false }
  }, [])

  if (!status?.enabled) return null

  const run = async (event) => {
    event.preventDefault()
    const qs = queries.map((q) => q.trim()).filter((q) => q.length >= 5)
    if (!qs.length) { setError('Write at least one question (5+ characters).'); return }
    setPhase('busy'); setError('')
    try {
      setResult(await checkCitations({ url: report.url, queries: qs }))
      setPhase('done')
    } catch (e) {
      setError(e?.message || 'The check failed. Try again in a minute.')
      setPhase('idle')
    }
  }

  return wrap(
    <div className="gl-card p-5">
      <form onSubmit={run}>
        <p className="text-[14px] leading-6 text-slate-600">
          <strong className="font-semibold text-slate-900">We ask {status.engine} these questions and check its sources.</strong> Write what a customer would really ask. Free, up to 3 questions per check.
        </p>
        <div className="mt-3 grid gap-2">
          {queries.map((q, i) => (
            <label key={i} className="block">
              <span className="sr-only">Question {i + 1}</span>
              <input
                value={q}
                maxLength={200}
                onChange={(e) => setQueries((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[14.5px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ActionButton type="submit" busy={phase === 'busy'}>{phase === 'busy' ? 'Asking the AI…' : 'Check AI citations'}</ActionButton>
          <span className="text-[12.5px] text-slate-500">Takes about 10-20 seconds.</span>
        </div>
        {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-rose-700">{error}</p> : null}
      </form>
      {result ? (
        <div className="mt-5" aria-live="polite">
          <p className="text-[15px] font-bold text-slate-900">
            {result.citedCount ? `${result.host} was a source in ${result.citedCount} of ${result.results.length} answers.` : `${result.host} was not a source in any of the ${result.results.length} answers.`}
          </p>
          <ul className="mt-3 grid gap-3">{result.results.map((r) => <ResultRow key={r.query} r={r} />)}</ul>
          <p className="mt-3 text-[12.5px] leading-5 text-slate-500">Answers change from day to day and per person, so treat this as a snapshot. Checked {new Date(result.checkedAt).toLocaleString()}.</p>
        </div>
      ) : null}
    </div>
  )
}

