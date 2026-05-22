import { useMemo } from 'react'
import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Dashboard() {
  const { items: customers = [] } = useCollectionData('customers', { limitCount: 5 })
  const { items: leads = [] } = useCollectionData('leads', { limitCount: 5 })
  const { items: invoices = [] } = useCollectionData('invoices', { orderByField: 'dueDate', direction: 'asc', limitCount: 5 })

  const pipelineCount = leads.length
  const customerCount = customers.length
  const overdueInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'Overdue'),
    [invoices]
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Active customers</p>
          <p className="mt-5 text-4xl font-semibold text-white">{customerCount}</p>
          <p className="mt-3 text-sm text-slate-400">Latest customer data from Firestore.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Pipeline leads</p>
          <p className="mt-5 text-4xl font-semibold text-white">{pipelineCount}</p>
          <p className="mt-3 text-sm text-slate-400">Leads currently in your sales funnel.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Overdue invoices</p>
          <p className="mt-5 text-4xl font-semibold text-white">{overdueInvoices.length}</p>
          <p className="mt-3 text-sm text-slate-400">Invoices requiring immediate follow-up.</p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Recent leads</h2>
          <div className="mt-4 space-y-3">
            {leads.length === 0 ? (
              <p className="text-sm text-slate-400">No recent leads available yet.</p>
            ) : (
              leads.map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="font-semibold text-white">{lead.name || 'Unnamed Lead'}</p>
                  <p className="text-sm text-slate-400">{lead.company || 'No company'}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Recent customers</h2>
          <div className="mt-4 space-y-3">
            {customers.length === 0 ? (
              <p className="text-sm text-slate-400">No customers yet. Add a new customer to start tracking.</p>
            ) : (
              customers.map((customer) => (
                <div key={customer.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="font-semibold text-white">{customer.name || 'Unnamed customer'}</p>
                  <p className="text-sm text-slate-400">{customer.email || 'No email'}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

