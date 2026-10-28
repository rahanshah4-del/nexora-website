import { useCallback, useEffect, useState } from 'react'
import { fetchFailedPayments } from '../../lib/polarBilling.js'

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function whenLabel(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function amountLabel(row) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: row.currency || 'USD' }).format(row.amount || 0)
  } catch {
    return `${row.currency} ${row.amount}`
  }
}

/**
 * Failed card payments from Polar: how many failed today, why (decline reasons), and who. Read live from Polar through
 * the payments worker, so there is nothing to maintain by hand.
 */
export default function FailedPaymentsPanel({ user }) {
  const [state, setState] = useState({ loading: true, error: '', data: null })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await fetchFailedPayments(user, startOfToday())
      setState({ loading: false, error: '', data })
    } catch (error) {
      setState({ loading: false, error: error.message || 'Could not load failed payments.', data: null })
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    fetchFailedPayments(user, startOfToday())
      .then((data) => { if (!cancelled) setState({ loading: false, error: '', data }) })
      .catch((error) => { if (!cancelled) setState({ loading: false, error: error.message || 'Could not load failed payments.', data: null }) })
    return () => { cancelled = true }
  }, [user])

  const { loading, error, data } = state
  const todayCount = data?.todayCount || 0
  const reasons = data?.todayReasons?.length ? data.todayReasons : data?.periodReasons || []
  const reasonsTitle = data?.todayReasons?.length ? 'Why they failed today' : 'Why recent payments failed'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">Failed payments</h3>
          <p className="text-xs font-semibold text-slate-500">Live from Polar: rejected cards and the bank&apos;s reason.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{error}</p> : null}

      {data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Failed today</p>
              <p className={`mt-1 text-2xl font-black ${todayCount ? 'text-rose-700' : 'text-emerald-700'}`}>{todayCount}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Failed recently</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{data.totalFailed}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{reasonsTitle}</p>
              {reasons.length ? (
                <ul className="mt-1 space-y-0.5">
                  {reasons.slice(0, 4).map((item) => (
                    <li key={item.reason} className="flex justify-between gap-2 text-xs font-bold text-slate-800"><span className="truncate">{item.reason}</span><span>{item.count}</span></li>
                  ))}
                </ul>
              ) : <p className="mt-1 text-xs font-bold text-slate-500">No failures</p>}
            </div>
          </div>

          {data.failures.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    <th className="py-2 pr-3">When</th><th className="py-2 pr-3">Client</th><th className="py-2 pr-3">Amount</th><th className="py-2 pr-3">Reason</th><th className="py-2">Card</th>
                  </tr>
                </thead>
                <tbody>
                  {data.failures.slice(0, 15).map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top">
                      <td className="whitespace-nowrap py-2 pr-3 font-semibold text-slate-600">{whenLabel(row.createdAt)}</td>
                      <td className="max-w-[200px] truncate py-2 pr-3 font-bold text-slate-900" title={row.email}>{row.email || '—'}</td>
                      <td className="whitespace-nowrap py-2 pr-3 font-bold text-slate-900">{amountLabel(row)}</td>
                      <td className="py-2 pr-3"><span className="rounded-full bg-rose-100 px-2 py-0.5 font-black text-rose-800" title={row.message || row.reasonCode}>{row.reason}</span></td>
                      <td className="whitespace-nowrap py-2 font-semibold text-slate-600">{row.method || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="mt-4 text-xs font-bold text-slate-500">No failed payments. Everything that was tried went through.</p>}
        </>
      ) : null}
    </section>
  )
}
