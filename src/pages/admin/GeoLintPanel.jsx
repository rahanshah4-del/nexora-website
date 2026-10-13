import { useCallback, useEffect, useState } from 'react'
import {
  GEOLINT_API_URL,
  appendAudits,
  getGeoLintAudit,
  getGeoLintStats,
  listGeoLintAudits,
  moduleLabel,
  scoreLabel,
  scoreTone,
  shortUrl,
} from '../../lib/geolint.js'

const PAGE_SIZE = 20

const TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
}

const SEVERITY_TONE = { error: 'rose', warning: 'amber', info: 'slate' }

function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

function Panel({ title, action, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-black text-slate-950">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

function Button({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function Notice({ tone = 'slate', children }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${TONES[tone]}`}>{children}</div>
}

function Pill({ tone, children }) {
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-black ${TONES[tone]}`}>{children}</span>
}

function StatCard({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
    </Card>
  )
}

function timeLabel(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function moduleMessages(moduleResult) {
  return Array.isArray(moduleResult?.messages) ? moduleResult.messages : []
}

function AuditDetail({ detail, onClose }) {
  const modules = detail?.result?.modules && typeof detail.result.modules === 'object' ? Object.entries(detail.result.modules) : []
  return (
    <Panel title={`Audit: ${shortUrl(detail.url, 80)}`} action={<Button onClick={onClose}>Close</Button>}>
      <div className="flex flex-wrap items-center gap-3">
        <Pill tone={scoreTone(detail.scorePercent)}>{scoreLabel(detail.earned, detail.evaluatedMax)}</Pill>
        <span className="text-xs font-semibold text-slate-500">{timeLabel(detail.createdAt)}</span>
        {detail.partial ? <Pill tone="amber">Partial: a module could not run</Pill> : null}
        <a className="text-xs font-bold text-violet-700 hover:underline" href={detail.url} target="_blank" rel="noreferrer noopener">
          Open page
        </a>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {modules.map(([key, value]) => {
          const percent = value?.maxScore > 0 ? (Number(value.score) / Number(value.maxScore)) * 100 : null
          const status = value?.status && value.status !== 'ok' ? value.status : ''
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-950">{moduleLabel(key)}</p>
                <Pill tone={status === 'unavailable' ? 'slate' : scoreTone(percent)}>
                  {status === 'unavailable' ? 'not scored' : scoreLabel(value?.score, value?.maxScore)}
                </Pill>
              </div>
              {status ? <p className="mt-1 text-xs font-bold text-slate-500">Status: {status}</p> : null}
              <ul className="mt-3 space-y-2">
                {moduleMessages(value).map((message, index) => (
                  <li key={index} className={`rounded-lg border px-3 py-2 text-xs font-semibold leading-5 ${TONES[SEVERITY_TONE[message?.severity] || 'slate']}`}>
                    {message?.message || ''}
                  </li>
                ))}
                {moduleMessages(value).length === 0 ? <li className="text-xs font-semibold text-slate-400">No messages.</li> : null}
              </ul>
            </Card>
          )
        })}
      </div>
    </Panel>
  )
}

export default function GeoLintPanel() {
  const [stats, setStats] = useState(null)
  const [rows, setRows] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState('')
  const [detailError, setDetailError] = useState('')

  const fetchAll = useCallback(async () => {
    try {
      const [statsResult, listResult] = await Promise.all([getGeoLintStats(), listGeoLintAudits({ limit: PAGE_SIZE })])
      return { ok: true, statsResult, listResult }
    } catch (err) {
      return { ok: false, message: err?.message || 'Could not load GeoLint data.' }
    }
  }, [])

  const apply = useCallback((result) => {
    if (result.ok) {
      setStats(result.statsResult)
      setRows(Array.isArray(result.listResult?.items) ? result.listResult.items : [])
      setNextCursor(result.listResult?.nextCursor || null)
    } else {
      setError(result.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAll().then((result) => {
      if (!cancelled) apply(result)
    })
    return () => {
      cancelled = true
    }
  }, [fetchAll, apply])

  async function refresh() {
    setLoading(true)
    setError('')
    apply(await fetchAll())
  }

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const page = await listGeoLintAudits({ limit: PAGE_SIZE, cursor: nextCursor })
      setRows((current) => appendAudits(current, Array.isArray(page?.items) ? page.items : []))
      setNextCursor(page?.nextCursor || null)
    } catch (err) {
      setError(err?.message || 'Could not load more audits.')
    } finally {
      setLoadingMore(false)
    }
  }

  async function openDetail(id) {
    setDetailLoading(id)
    setDetailError('')
    try {
      setDetail(await getGeoLintAudit(id))
    } catch (err) {
      setDetailError(err?.message || 'Could not open this audit.')
    } finally {
      setDetailLoading('')
    }
  }

  if (!GEOLINT_API_URL) {
    return (
      <Panel title="GeoLint">
        <Notice tone="amber">
          GeoLint server URL is not set. Add <code>VITE_GEOLINT_API_URL</code> (the Cloud Run URL of geolint-backend) in the build
          environment, then redeploy. See <code>.env.example</code>.
        </Notice>
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">GeoLint audits</h2>
          <p className="text-sm font-semibold text-slate-500">Free AI-crawler readiness audits run by visitors and by you.</p>
        </div>
        <Button onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
      </div>

      {error ? <Notice tone="rose">{error}</Notice> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total audits" value={stats ? stats.total : '—'} />
        <StatCard label="Last 24 hours" value={stats ? stats.last24h : '—'} />
        <StatCard label="Average score" value={stats && stats.averageScorePercent !== null ? `${stats.averageScorePercent}%` : '—'} />
      </div>

      {detailError ? <Notice tone="rose">{detailError}</Notice> : null}
      {detail ? <AuditDetail detail={detail} onClose={() => setDetail(null)} /> : null}

      <Panel title="Recent audits">
        {rows.length === 0 && !loading && !error ? (
          <p className="text-sm font-semibold text-slate-500">No audits saved yet. Run one from the GeoLint tool and it will appear here.</p>
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="max-w-[22rem] truncate px-3 py-2 font-semibold text-slate-900" title={row.url}>{shortUrl(row.url)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Pill tone={scoreTone(row.scorePercent)}>{scoreLabel(row.earned, row.evaluatedMax)}</Pill>
                      {row.partial ? <span className="ml-2 text-xs font-bold text-amber-700">partial</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-500">{timeLabel(row.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button onClick={() => openDetail(row.id)} disabled={detailLoading === row.id}>
                        {detailLoading === row.id ? 'Opening…' : 'Details'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {nextCursor ? (
          <div className="mt-3 text-center">
            <Button onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</Button>
          </div>
        ) : null}
      </Panel>
    </div>
  )
}
