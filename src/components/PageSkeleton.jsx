/* Apple-style shimmer skeleton — no icons, no logos, no spinners */
const SKELETON_CSS = `
@keyframes skShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes skFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sk-shim { display: none !important; } .sk-box { opacity: .15 !important; } }
.sk-wrap { overflow: hidden; position: relative; }
.sk-shim { position: absolute; inset: 0; background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.6) 50%,transparent 100%); animation: skShimmer 1.8s ease-in-out infinite; }
.sk-box { border-radius: .75rem; background: #e2e8f0; animation: skFadeIn .4s ease-out both; }
.dark .sk-box { background: #1e293b; }
.dark .sk-shim { background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.08) 50%,transparent 100%); }
`

export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <style>{SKELETON_CSS}</style>
      {/* Header skeleton */}
      <div className="flex h-14 items-center justify-between border-b border-slate-100 px-5 dark:border-white/10 sm:px-8">
        <div className="h-7 w-28 sk-box sk-wrap" style={{ animationDelay: '.05s' }}><div className="sk-shim" /></div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-20 sk-box sk-wrap" style={{ animationDelay: '.1s' }}><div className="sk-shim" /></div>
          <div className="h-7 w-7 sk-box sk-wrap" style={{ animationDelay: '.12s' }}><div className="sk-shim" /></div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex gap-8 pt-8">
          {/* Sidebar skeleton (hidden on mobile) */}
          <div className="hidden w-56 shrink-0 space-y-3 lg:block">
            {[.15, .2, .25, .3, .35, .4].map((d) => (
              <div key={d} className="h-8 sk-box sk-wrap" style={{ animationDelay: `${d}s` }}><div className="sk-shim" /></div>
            ))}
          </div>
          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-5">
            <div className="h-10 w-3/5 sk-box sk-wrap" style={{ animationDelay: '.1s' }}><div className="sk-shim" /></div>
            <div className="h-4 w-full max-w-lg sk-box sk-wrap" style={{ animationDelay: '.18s' }}><div className="sk-shim" /></div>
            <div className="h-4 w-2/3 sk-box sk-wrap" style={{ animationDelay: '.22s' }}><div className="sk-shim" /></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[.25, .3, .35].map((d) => (
                <div key={d} className="h-44 rounded-xl sk-box sk-wrap" style={{ animationDelay: `${d}s` }}><div className="sk-shim" /></div>
              ))}
            </div>
            <div className="h-32 rounded-xl sk-box sk-wrap" style={{ animationDelay: '.38s' }}><div className="sk-shim" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-24 rounded-xl sk-box sk-wrap" style={{ animationDelay: '.42s' }}><div className="sk-shim" /></div>
              <div className="h-24 rounded-xl sk-box sk-wrap" style={{ animationDelay: '.46s' }}><div className="sk-shim" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


/** One shimmering block for a section or card that loads on its own (charts, reviews, embedded widgets). */
export function SectionSkeleton({ height = 240, className = '' }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label="Loading">
      <style>{SKELETON_CSS}</style>
      <div className="sk-box sk-wrap w-full rounded-xl" style={{ height }}><div className="sk-shim" /></div>
    </div>
  )
}
