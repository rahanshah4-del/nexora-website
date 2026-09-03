import { useEffect, useRef, useState } from 'react'
import { HiSparkles, HiOutlineXMark } from 'react-icons/hi2'
import { useOnClickOutside } from '../../hooks/useOnClickOutside.js'
import { cn } from '../../utils/cn.js'
import logoUrl from '../../../assets/logo/nexora-logo.png'

// Lightweight global entry point for the upcoming Nexora AI assistant —
// distinct from the existing full /app/ai-assistant module. Renders as a
// floating logo button on desktop and as a header icon on mobile (matching
// the Cloudflare-style header this mirrors); either trigger opens the same
// "Coming Soon" panel.
export default function NexoraAiLauncher() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  useOnClickOutside(rootRef, () => setOpen(false))

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div ref={rootRef} className="contents">
      <button
        type="button"
        className="focus-ring relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
        onClick={() => setOpen((value) => !value)}
        aria-label="Nexora AI — coming soon"
        aria-expanded={open}
      >
        <HiSparkles className="h-5 w-5" />
      </button>

      <button
        type="button"
        className="focus-ring fixed bottom-6 right-6 z-50 hidden h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white shadow-[0_12px_32px_-10px_rgba(15,23,42,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-10px_rgba(15,23,42,0.45)] active:scale-95 dark:border-white/10 dark:bg-slate-900 lg:flex"
        onClick={() => setOpen((value) => !value)}
        aria-label="Nexora AI — coming soon"
        aria-expanded={open}
      >
        <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />
        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
          <HiSparkles className="h-3 w-3" />
        </span>
      </button>

      {open ? (
        <div
          className={cn(
            'glass fixed z-[70] w-[19rem] max-w-[calc(100vw-1.5rem)] animate-ai-pop rounded-2xl border border-white/70 bg-white/95 p-4 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-slate-950/95',
            'right-3 top-[4.5rem] lg:right-6 lg:top-auto lg:bottom-[5.5rem]',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
                <HiSparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">Nexora AI</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  Coming Soon
                </span>
              </div>
            </div>
            <button
              type="button"
              className="focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <HiOutlineXMark className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Your intelligent workspace assistant is on its way — ask questions, get insights and automate tasks right from here. Stay tuned!
          </p>
        </div>
      ) : null}
    </div>
  )
}
