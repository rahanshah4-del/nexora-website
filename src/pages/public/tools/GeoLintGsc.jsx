import { useState } from 'react'
import { clientSignInMessage, fetchGsc, listGscProperties, requestSearchConsoleToken } from '../../../lib/geolintClient.js'
import { compact, gscCtr, gscDelta, gscPosition, nearMisses, orderErrorMessage } from '../../../lib/geolintFix.js'
import { GoogleButton } from './GeoLintFixShared.jsx'

function Stat({ label, value, delta, goodWhenUp = true }) {
  const good = delta === null ? null : goodWhenUp ? delta >= 0 : delta >= 0
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{value}</p>
      {delta === null ? null : (
        <p className={`mt-0.5 text-xs font-bold ${good ? 'text-emerald-700' : 'text-rose-700'}`}>{delta > 0 ? '+' : ''}{delta}% vs the 90 days before</p>
      )}
    </div>
  )
}

/** Clicks per day as a small bar chart. Decorative summary: the numbers are also in the stat tiles. */
function DailyBars({ daily }) {
  if (!daily?.length) return null
  const max = Math.max(...daily.map((d) => d.clicks), 1)
  return (
    <figure className="mt-4">
      <div className="flex h-24 items-end gap-[2px]" role="img" aria-label={`Clicks per day, highest ${max}`}>
        {daily.map((d) => (
          <span key={d.date} className="flex-1 rounded-t bg-blue-500/80" style={{ height: `${Math.max(3, (d.clicks / max) * 100)}%` }} title={`${d.date}: ${d.clicks} clicks`} />
        ))}
      </div>
      <figcaption className="mt-1 text-[12px] text-slate-500">Clicks per day, {daily[0].date} to {daily[daily.length - 1].date}</figcaption>
    </figure>
  )
}

function Table({ caption, rows, keyName }) {
  if (!rows?.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] text-left text-[13px]">
        <caption className="pb-2 text-left text-[14px] font-bold text-slate-950">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
            <th scope="col" className="py-2 pr-3">{keyName}</th>
            <th scope="col" className="px-2 py-2 text-right">Clicks</th>
            <th scope="col" className="px-2 py-2 text-right">Impressions</th>
            <th scope="col" className="px-2 py-2 text-right">CTR</th>
            <th scope="col" className="py-2 pl-2 text-right">Position</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.query || r.page} className="border-b border-slate-100">
              <th scope="row" className="max-w-[260px] truncate py-2 pr-3 font-semibold text-slate-900" title={r.query || r.page}>{r.query || r.page}</th>
              <td className="px-2 py-2 text-right tabular-nums">{r.clicks}</td>
              <td className="px-2 py-2 text-right tabular-nums">{compact(r.impressions)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{gscCtr(r.ctr)}</td>
              <td className="py-2 pl-2 text-right tabular-nums">{gscPosition(r.position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GscData({ gsc }) {
  const t = gsc.totals
  const misses = nearMisses(gsc.queries, 8)
  return (
    <div className="space-y-6">
      <p className="text-[13px] text-slate-500">Property <strong className="text-slate-800">{gsc.siteUrl}</strong>, {gsc.range.start} to {gsc.range.end}. Data comes straight from Google Search Console.</p>
      {t ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Clicks" value={compact(t.clicks)} delta={gscDelta(t, gsc.previous, 'clicks')} />
          <Stat label="Impressions" value={compact(t.impressions)} delta={gscDelta(t, gsc.previous, 'impressions')} />
          <Stat label="Average CTR" value={gscCtr(t.ctr)} delta={gscDelta(t, gsc.previous, 'ctr')} />
          <Stat label="Average position" value={gscPosition(t.position)} delta={gscDelta(t, gsc.previous, 'position')} />
        </div>
      ) : <p className="text-[14px] text-slate-600">Google has no search data for this property in this period yet.</p>}
      <DailyBars daily={gsc.daily} />
      {misses.length ? <Table caption="Closest to page one: searches where you show up but rank 4 to 20" rows={misses} keyName="Search" /> : null}
      <Table caption="Top searches" rows={gsc.queries.slice(0, 15)} keyName="Search" />
      <Table caption="Top pages" rows={gsc.pages.slice(0, 10)} keyName="Page" />
    </div>
  )
}

/**
 * Connect Search Console: Google asks for read-only access, we read once and keep the numbers only.
 * The access token never leaves this function's scope except in the two calls that need it.
 */
export function GscConnect({ order, onData }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [choice, setChoice] = useState(null)

  const run = async (token, siteUrl) => {
    const { gsc } = await fetchGsc(order.id, token, siteUrl)
    onData(gsc)
  }

  const start = async () => {
    setBusy(true)
    setError('')
    setChoice(null)
    try {
      const token = await requestSearchConsoleToken()
      const { properties } = await listGscProperties(order.id, token)
      if (properties.length === 0) {
        setError(`That Google account has no Search Console property for ${order.host}. Try again and choose the account that owns it, or ask us to help you add the site to Search Console.`)
      } else if (properties.length === 1) {
        await run(token, properties[0].siteUrl)
      } else {
        setChoice({ token, properties })
      }
    } catch (e) {
      setError(e?.code?.startsWith?.('auth/') || e?.code === 'GSC_NO_TOKEN' ? clientSignInMessage(e) : orderErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const pick = async (siteUrl) => {
    const token = choice.token
    setBusy(true)
    setError('')
    try {
      await run(token, siteUrl)
      setChoice(null)
    } catch (e) {
      setError(orderErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <GoogleButton onClick={start} busy={busy}>{order.gsc ? 'Refresh from Search Console' : 'Connect Google Search Console'}</GoogleButton>
      <p className="mt-2 max-w-xl text-[13px] leading-5 text-slate-500">Read-only. Choose the Google account that has {order.host} in Search Console; it can be a different account from the one you signed in with. We read your search numbers once and keep the numbers, not your Google access.</p>
      {choice ? (
        <div className="mt-4" role="group" aria-label="Choose a Search Console property">
          <p className="text-[14px] font-semibold text-slate-900">Which property should we read?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {choice.properties.map((p) => (
              <button key={p.siteUrl} type="button" disabled={busy} onClick={() => pick(p.siteUrl)} className="min-h-[44px] rounded-full border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-800 hover:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60">{p.siteUrl}</button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-rose-700">{error}</p> : null}
    </div>
  )
}
