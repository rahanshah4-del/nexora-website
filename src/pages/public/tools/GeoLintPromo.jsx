import Link from '../../../components/AppLink.jsx'
import { GEOLINT_HOW_PATH, GEOLINT_LAUNCHED, GEOLINT_PATH } from '../../../lib/geolintLaunch.js'
import GeoLintIcon from '../../../components/brand/GeoLintIcon.jsx'

/**
 * "New" strip for the GeoLint audit tool (tools hub, homepage tools section).
 * Renders nothing until GeoLint launches (src/lib/geolintLaunch.js). Kept free
 * of the tools pages' content so the homepage bundle stays small.
 */
export default function GeoLintPromo({ className = '' }) {
  if (!GEOLINT_LAUNCHED) return null
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#050a18_0%,#10306b_60%,#312e81_100%)] p-6 text-white shadow-[0_30px_80px_-40px_rgba(30,64,175,.8)] sm:p-8 ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-violet-500/30 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-2xl items-start gap-4"><GeoLintIcon size={56} animated className="mt-1 hidden shrink-0 sm:block" /><div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">New · Free · No signup</p>
          <h3 className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">GeoLint: can AI crawlers read your website?</h3>
          <p className="mt-2 text-[15px] leading-7 text-blue-100">GeoLint is a free audit that checks any public page for ChatGPT, Claude and Perplexity access, JavaScript dependence, answer-first structure and structured data. Then copy a ready AI prompt for Claude Code, ChatGPT, Cursor or Gemini to fix what it finds, or download the report as a PDF. GeoLint checks public pages, so the address you enter is sent to our audit server.</p>
        </div></div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link to={GEOLINT_PATH} className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-slate-950 shadow-sm transition hover:bg-blue-50">Run a free audit<span aria-hidden="true">→</span></Link>
          <Link to={GEOLINT_HOW_PATH} className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full border border-white/30 px-5 text-[14px] font-semibold text-white transition hover:bg-white/10">How it works</Link>
        </div>
      </div>
    </div>
  )
}
