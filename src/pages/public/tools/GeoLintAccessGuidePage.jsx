import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageSeo from '../../../components/PageSeo.jsx'
import PublicPageShell from '../PublicPageShell.jsx'
import { ACCESS_EMAIL, ACCESS_GUIDES, ACCESS_RULES, guideById } from '../../../lib/geolintAccessGuide.js'
import { GEOLINT_ACCESS_GUIDE_PATH, GEOLINT_FIX_PATH } from '../../../lib/geolintLaunch.js'
import './geolint.css'

/** The platform's logo from /platform-logos/<id>.svg when that file exists, else a neutral coloured tile with its initials. */
function PlatformMark({ guide, size = 44 }) {
  const [failed, setFailed] = useState(false)
  const box = { width: size, height: size }
  if (!failed) {
    return (
      <span className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200" style={box}>
        <img src={`/platform-logos/${guide.id}.svg`} alt="" width={size - 14} height={size - 14} loading="lazy" onError={() => setFailed(true)} />
      </span>
    )
  }
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-xl text-[15px] font-extrabold text-white" style={{ ...box, background: guide.tint }}>{guide.mark}</span>
  )
}

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

/** /tools/geo-audit/access-guide/: how to give safe access, per platform. Opened from the order wizard; Back returns there with the draft kept. */
export default function GeoLintAccessGuidePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const guide = guideById(params.get('p')) || null

  const goBack = () => {
    // the wizard keeps the client's progress, so going back to the previous page lands exactly where they were
    if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate(`${GEOLINT_FIX_PATH}?step=details`)
  }
  const pick = (id) => {
    setParams(id ? { p: id } : {}, { replace: true })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <PublicPageShell>
      <PageSeo
        title="How to give us safe access to your website | GeoLint"
        description="Step-by-step: how to invite us to WordPress, Shopify, Wix, Squarespace, Webflow, your code or your hosting without sharing a password."
        canonical={`https://nexorasolution.us${GEOLINT_ACCESS_GUIDE_PATH}/`}
        path={GEOLINT_ACCESS_GUIDE_PATH}
        robots="noindex,follow"
        ogLocale="en_US"
        ogLocaleAlternates={false}
        defaultSchemas={false}
      />
      <div className="relative border-b border-slate-200 bg-white pt-16 sm:pt-20">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <button type="button" onClick={goBack} className="gx-focus inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-4 text-[14px] font-semibold text-white hover:bg-slate-800">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4"><path d="M12.5 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back to my order
          </button>
          {guide ? <button type="button" onClick={() => pick('')} className="gx-focus min-h-[44px] rounded-full px-3 text-[14px] font-semibold text-blue-700 hover:underline">All platforms</button> : null}
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-orange-600">Access guide</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">How to give us safe access</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-7 text-slate-600">Pick the tool your website is built with. You will see exactly what to click. It takes about two minutes, and you stay in control the whole time.</p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Our safety rules">
          {ACCESS_RULES.map((r) => (
            <li key={r.title} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-[14px] font-bold text-emerald-900"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white"><CheckIcon /></span>{r.title}</p>
              <p className="mt-1.5 text-[13.5px] leading-5 text-emerald-900/80">{r.text}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-[18px] font-bold text-slate-950">{guide ? 'Your platform' : 'What is your website built with?'}</h2>
        <div role="tablist" aria-label="Platform" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ACCESS_GUIDES.map((g) => {
            const on = guide?.id === g.id
            return (
              <button key={g.id} type="button" role="tab" aria-selected={on} onClick={() => pick(g.id)} className={`gx-focus flex min-h-[64px] min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${on ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                <PlatformMark guide={g} />
                <span className="min-w-0 break-words text-[14px] font-semibold leading-5 text-slate-900">{g.label}</span>
              </button>
            )
          })}
        </div>

        {guide ? (
          <article key={guide.id} className="gx-rise mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="guide-title">
            <header className="flex items-center gap-3">
              <PlatformMark guide={guide} size={52} />
              <div className="min-w-0">
                <h2 id="guide-title" className="text-[22px] font-bold leading-tight text-slate-950">{guide.label}</h2>
                <p className="text-[13.5px] text-slate-500">Invite us in {guide.steps.length} steps</p>
              </div>
            </header>
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-[14px] leading-6 text-slate-700"><strong className="text-slate-950">Role to choose:</strong> {guide.role}</p>
            <ol className="mt-5 space-y-3">
              {guide.steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-[13px] font-bold text-white">{i + 1}</span>
                  <span className="min-w-0 break-words text-[15px] leading-7 text-slate-800">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <p className="rounded-2xl border border-slate-200 p-4 text-[14px] leading-6 text-slate-700"><strong className="block text-slate-950">Invite this email</strong><span className="break-all font-mono text-[13.5px]">{ACCESS_EMAIL}</span></p>
              <p className="rounded-2xl border border-slate-200 p-4 text-[14px] leading-6 text-slate-700"><strong className="block text-slate-950">Remove us later</strong>{guide.remove}</p>
            </div>
            <p className="mt-4 text-[13.5px] leading-6 text-slate-600"><strong className="text-slate-800">Good to know:</strong> {guide.tip}</p>
            <button type="button" onClick={goBack} className="gx-focus mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-[15px] font-semibold text-white hover:brightness-110 sm:w-auto">Got it, back to my order</button>
          </article>
        ) : (
          <p className="mt-6 text-[14px] leading-6 text-slate-500">Tap your platform above. If none fits, choose "Not sure". We will work it out with you.</p>
        )}
      </main>
    </PublicPageShell>
  )
}
