/** The site's loading look: flat grey boxes with a soft white sweep (same as the page skeleton). */
const CSS = `
@keyframes nxSkSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes nxSkIn { 0% { opacity: 0; } 100% { opacity: 1; } }
.nx-sk { position: relative; overflow: hidden; border-radius: .75rem; background: #e2e8f0; animation: nxSkIn .4s ease-out both; }
.nx-sk::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.6) 50%, transparent 100%); transform: translateX(-100%); animation: nxSkSweep 1.8s ease-in-out infinite; }
.dark .nx-sk { background: rgba(148,163,184,.18); }
.dark .nx-sk::after { background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.08) 50%, transparent 100%); }
@media (prefers-reduced-motion: reduce) { .nx-sk::after { display: none; } }
`

export function Skeleton({ className = '', style }) {
  return <div className={`nx-sk ${className}`} style={style} aria-hidden="true" />
}

/** Placeholder shaped like the billing card: plan header, two stat tiles and a few history rows. */
export function BillingSkeleton() {
  return (
    <div role="status" aria-label="Loading billing" className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-slate-900/60">
      <style>{CSS}</style>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2"><Skeleton className="h-5 w-2/5" /><Skeleton className="h-4 w-3/5" /></div>
        <Skeleton className="hidden h-9 w-28 sm:block" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20" style={{ animationDelay: '.08s' }} /><Skeleton className="h-20" style={{ animationDelay: '.14s' }} /><Skeleton className="h-20" style={{ animationDelay: '.2s' }} />
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton className="h-10" style={{ animationDelay: '.24s' }} /><Skeleton className="h-10" style={{ animationDelay: '.3s' }} /><Skeleton className="h-10" style={{ animationDelay: '.36s' }} />
      </div>
    </div>
  )
}
