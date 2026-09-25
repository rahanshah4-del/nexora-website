/**
 * Stylised, illustrative preview of the desktop app — pure JSX/CSS, no
 * screenshots. Decorative only (aria-hidden); the figures are sample data.
 */

const BARS = [38, 52, 44, 68, 57, 82, 74]
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const ORDERS = [
  { id: '#1042', place: 'Table 4 · Dine-in', amount: 'Rs 2,340', status: 'Paid', tone: 'bg-emerald-50 text-emerald-700' },
  { id: '#1043', place: 'Takeaway', amount: 'Rs 980', status: 'Kitchen', tone: 'bg-amber-50 text-amber-700' },
  { id: '#1044', place: 'Table 9 · Dine-in', amount: 'Rs 4,150', status: 'Ready', tone: 'bg-sky-50 text-sky-700' },
]

export default function AppPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-xl select-none">
      <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-sky-100 via-indigo-50 to-violet-100 opacity-80 blur-2xl sm:-inset-8" />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.35)]">
        {/* Window title bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 truncate text-[11px] font-semibold text-slate-500">Nexora Restaurant POS — Dashboard</span>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-slate-100 bg-slate-50 py-4 sm:flex">
            <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600" />
            {[0, 1, 2, 3].map((item) => (
              <span key={item} className={`h-6 w-6 rounded-md ${item === 0 ? 'bg-sky-100' : 'bg-slate-100'}`} />
            ))}
          </div>

          <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Today’s sales</p>
                <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">Rs 84,250</p>
                <p className="mt-0.5 text-[10px] font-semibold text-emerald-600">+12% vs yesterday</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Orders</p>
                <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">126</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">18 open tables</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">This week</p>
                <p className="text-[10px] font-semibold text-slate-400">Sales</p>
              </div>
              {/* Bars are direct children of the fixed-height row so their % heights resolve. */}
              <div className="mt-2 flex h-20 items-end gap-1.5 sm:h-24">
                {BARS.map((height, index) => (
                  <span
                    key={index}
                    className={`flex-1 rounded-t-md bg-gradient-to-t ${index === 5 ? 'from-indigo-600 to-violet-500' : 'from-sky-500 to-indigo-500'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex gap-1.5">
                {DAYS.map((day, index) => (
                  <span key={index} className="flex-1 text-center text-[9px] font-semibold text-slate-400">{day}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white">
              {ORDERS.map((order, index) => (
                <div key={order.id} className={`flex items-center gap-2 px-3 py-2 ${index ? 'border-t border-slate-100' : ''}`}>
                  <span className="text-[11px] font-bold text-slate-900">{order.id}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500">{order.place}</span>
                  <span className="hidden text-[11px] font-semibold text-slate-700 min-[400px]:inline">{order.amount}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${order.tone}`}>{order.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
