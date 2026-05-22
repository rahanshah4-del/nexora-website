import { useCollectionData } from '../../lib/useCollectionData.js'

export default function Customers() {
  const { items: customers, loading, error } = useCollectionData('customers', { orderByField: 'name', direction: 'asc', limitCount: 15 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="mt-2 text-sm text-slate-300">View customer accounts, contact information, and engagement records.</p>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading customers…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">Unable to load customer data.</div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-6 text-slate-300">
          <h2 className="text-lg font-semibold text-white">No customers available</h2>
          <p className="mt-2 text-sm text-slate-400">Add customers to begin tracking accounts and activity.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <div key={customer.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">{customer.name || 'Unnamed customer'}</h2>
              <p className="mt-2 text-sm text-slate-400">{customer.company || 'No company'}</p>
              <div className="mt-4 text-sm text-slate-300 space-y-2">
                <p>Email: {customer.email || 'n/a'}</p>
                <p>Phone: {customer.phone || 'n/a'}</p>
                <p>Status: <span className="font-semibold text-white">{customer.status || 'Active'}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

