import Link from '../../../components/AppLink.jsx'
import TempMailIcon from '../../../components/brand/TempMailIcon.jsx'
import { TEMP_MAIL_LAUNCHED, TEMP_MAIL_PATH } from '../../../lib/tempMailLaunch.js'

/**
 * "New" strip for the Temp Mail tool (tools hub, homepage tools section).
 * Renders nothing until Temp Mail launches (src/lib/tempMailLaunch.js).
 * Kept free of the tool's page copy so the homepage bundle stays small.
 */
export default function TempMailPromo({ className = '' }) {
  if (!TEMP_MAIL_LAUNCHED) return null
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#041527_0%,#0b4a86_60%,#4338ca_100%)] p-6 text-white shadow-[0_30px_80px_-40px_rgba(14,116,144,.8)] sm:p-8 ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-sky-400/30 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-2xl items-start gap-4"><TempMailIcon size={56} animated className="mt-1 hidden shrink-0 sm:block" /><div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">New · Free · No signup</p>
          <h3 className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">Temp Mail: free temporary email address in one click</h3>
          <p className="mt-2 text-[15px] leading-7 text-blue-100">Nexora Temp Mail is a free temporary email generator. Get a disposable email address, read verification codes (OTP) live and test your own signup emails. It is a 10 minute mail alternative that lasts one hour, with no signup, and the inbox is erased automatically.</p>
        </div></div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link to={TEMP_MAIL_PATH} className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-slate-950 shadow-sm transition hover:bg-blue-50">Get a temp email<span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </div>
  )
}
