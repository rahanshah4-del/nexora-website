import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Invoices() {
  const { items: invoices, loading, error } = useCollectionData('invoices', { orderByField: 'dueDate', direction: 'asc', limitCount: 12 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Invoices & Payments</h1>
            <p className="mt-2 text-sm text-slate-300">Monitor billing, due invoices, and payment statuses across all clients.</p>
          </div>
          <span className="rounded-full bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            {loading ? 'Fetching...' : `${invoices.length} invoices`}
          </span>
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading invoices…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load invoice data.</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No invoices found</h2>
          <p className="mt-2 text-sm text-slate-400">Create your first invoice to track payments and due dates here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{invoice.number || 'INV-000'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{invoice.client || 'No client assigned'}</p>
                </div>
                <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                  {invoice.status || 'Pending'}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-300">
                <p>Amount: <span className="font-semibold text-white">${invoice.amount ?? '0.00'}</span></p>
                <p>Due: <span className="font-semibold text-white">{invoice.dueDate || 'TBD'}</span></p>
                <p>Paid: <span className="font-semibold text-white">{invoice.paid ? 'Yes' : 'No'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
