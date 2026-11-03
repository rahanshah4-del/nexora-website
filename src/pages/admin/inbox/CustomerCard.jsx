/** Who the sender is in Nexora: service, plan and status, shown above the ticket. */
export default function CustomerCard({ customer, loading, email }) {
  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-400">🔎 Checking if {email} is a Nexora client…</div>
  if (!customer) return <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">👤 <span className="font-bold text-slate-700">New contact</span> — {email} is not a registered Nexora client (likely a sales enquiry).</div>
  const rows = [['🏢 Company', customer.company], ['👤 Owner', customer.owner], ['🧩 Service', customer.service], ['💳 Plan', customer.plan], ['📞 Phone', customer.phone], ['📅 Joined', customer.joined], ['🕘 Last login', customer.lastLogin], ['⏳ Trial ends', customer.trialEnds], ['🔁 Renewal', customer.renewal]].filter(([, v]) => v)
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="flex flex-wrap items-center gap-2 text-xs font-black text-emerald-800">✅ Registered Nexora client<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold">{customer.status}</span></p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">{rows.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 break-words font-semibold text-slate-800">{v}</dd></div>)}</dl>
      {customer.modules.length ? <p className="mt-2 flex flex-wrap gap-1">{customer.modules.map((m) => <span key={m} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-emerald-200">{m}</span>)}</p> : null}
    </div>
  )
}
