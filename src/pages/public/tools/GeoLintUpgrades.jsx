import Link from '../../../components/AppLink.jsx'
import { GEOLINT_FIX_PATH } from '../../../lib/geolintLaunch.js'
import { FIX_PROMPT_TOOLS } from '../../../lib/geolintPrompt.js'
import { GEOLINT_UPGRADES as U } from '../../../lib/geolintPageData.js'
import { AI_ENGINE_PATHS } from './aiEngineMarks.js'

const ICONS = {
  ai: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15z',
  pack: 'M4 7l8-4 8 4v10l-8 4-8-4V7zm8 4l8-4m-8 4v10m0-10L4 7',
  site: 'M3 5h18v14H3V5zm0 4h18M8 5v14',
  watch: 'M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z',
  health: 'M3 12h4l2-6 4 12 2-6h6',
  proof: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  report: 'M7 3h7l5 5v13H7V3zm7 0v5h5M10 13h6m-6 4h6',
  done: 'M5 13l4 4L19 7',
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={ICONS[name] || ICONS.done} />
    </svg>
  )
}

/** Logos of the AI tools the Fix with AI prompts are written for. Cursor has no mark in our set, so it gets a plain cursor icon. */
function ToolLogos() {
  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="AI tools supported by Fix with AI">
      {FIX_PROMPT_TOOLS.map((t) => (
        <li key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[12.5px] font-semibold text-white">
          {t.mark && AI_ENGINE_PATHS[t.mark] ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true" focusable="false"><path d={AI_ENGINE_PATHS[t.mark]} /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M5 3l14 7.5-6 1.8-2.2 6.2L5 3z" /></svg>
          )}
          {t.name}
        </li>
      ))}
    </ul>
  )
}

/** Landing page band: the GeoLint features that come after the audit (Fix with AI, Fix Pack, whole-site audit, weekly watch and more). */
export default function GeoLintUpgrades() {
  return (
    <section id="geolint-upgrades" aria-labelledby="geolint-upgrades-heading" className="scroll-mt-20 bg-slate-50 px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-violet-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />{U.eyebrow}
          </p>
          <h2 id="geolint-upgrades-heading" className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{U.heading}</h2>
          <p className="mt-4 text-[16px] leading-7 text-slate-600">{U.lead}</p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {U.items.map((item) => (
            <li key={item.title} className={`flex flex-col rounded-2xl border bg-white p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,.4)] ${item.tools ? 'border-violet-300 ring-1 ring-violet-200 sm:col-span-2' : item.wide ? 'border-slate-200 sm:col-span-2 lg:col-span-4' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white"><Icon name={item.icon} /></span>
                {item.badge ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">{item.badge}</span> : null}
              </div>
              <h3 className="mt-4 font-display text-[17px] font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-[14.5px] leading-7 text-slate-600">{item.text}</p>
              {item.tools ? <ToolLogos /> : null}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href="#geolint-url" className="inline-flex min-h-[48px] items-center rounded-xl bg-slate-900 px-6 text-[15px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Run a free audit</a>
          <Link to={GEOLINT_FIX_PATH} className="inline-flex min-h-[48px] items-center rounded-xl border border-slate-300 bg-white px-6 text-[15px] font-semibold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Get it fixed for you</Link>
        </div>
        <p className="mx-auto mt-4 max-w-xl text-center text-[12px] leading-5 text-slate-500">Logos belong to their owners and only identify the AI tools the prompts are written for. No partnership or endorsement is implied.</p>
      </div>
    </section>
  )
}
