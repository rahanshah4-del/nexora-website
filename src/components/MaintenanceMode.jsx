import { HiOutlineWrenchScrewdriver } from 'react-icons/hi2'

export function MaintenanceBlock({ state, compact = false }) {
  const title = state?.config?.title || 'Scheduled maintenance'
  const message = state?.config?.activeMessage || 'This service is temporarily unavailable while we complete scheduled maintenance.'
  return (
    <div className={`${compact ? 'py-10' : 'min-h-dvh'} grid place-items-center px-4`}>
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white">
          <HiOutlineWrenchScrewdriver className="h-6 w-6" />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-sky-700">Nexora Solution</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
        {state?.windowLabel ? (
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-800">Maintenance window: {state.windowLabel}</p>
        ) : null}
      </section>
    </div>
  )
}
