import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { GEOLINT_FIX_PATH, GEOLINT_ORDERS_PATH, GEOLINT_PATH, GEOLINT_SIGNIN_PATH } from '../../../lib/geolintLaunch.js'
import { getFixService, placeOrder, signOutClient, siteProfile } from '../../../lib/geolintClient.js'
import { normalizeAuditUrl, runGeoAudit } from '../../../lib/geolint.js'
import {
  ACCESS_OPTIONS, DEFAULT_TARGET, MAX_COMPETITORS, PLAN_OPTIONS, PLATFORM_OPTIONS, optionLabel, orderErrorMessage, planLabel, planPrice, scorePercentOf, validateOrderForm,
} from '../../../lib/geolintFix.js'
import { loadReport } from '../../../lib/geolintReport.js'
import { suggestCompetitors } from '../../../lib/geolintCompetitors.js'
import { WIZARD_STEPS, clearDraft, emptyForm, emptyScore, loadDraft, reachableStep, saveDraft } from '../../../lib/geolintDraft.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { ActionButton, JourneySteps, ProfileCard, ScoreBars } from './GeoLintFixShared.jsx'
import { useFixClient } from './geolintFixHooks.js'
import './geolint.css'

const STEPS = WIZARD_STEPS
const STEP_TITLES = { site: 'Your website', competitors: 'Competitors', details: 'Your details', plan: 'Choose your plan' }
const inputClass = 'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600'
const bare = (host) => String(host || '').toLowerCase().replace(/^www\./, '')

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-slate-900">{label}</label>
      {hint ? <p id={`${id}-hint`} className="mt-0.5 text-[13px] leading-5 text-slate-500">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
      {error ? <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-700">{error}</p> : null}
    </div>
  )
}

function Busy({ children }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-[14px] font-semibold text-blue-800">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

/** Looks up a website (name, logo, platform) and audits it for a score. Both run for the client's site and for each rival. */
async function inspect(rawUrl, { signal, reuse, known }) {
  const url = normalizeAuditUrl(rawUrl)
  if (!url) throw new Error('Enter a full website address, for example example.com.')
  const profile = known || await siteProfile(url)
  return {
    profile,
    scored: (async () => {
      if (reuse && bare(new URL(reuse.url).hostname) === bare(profile.host)) return { auditId: reuse.id ? String(reuse.id) : null, scorePercent: scorePercentOf(reuse) }
      const report = await runGeoAudit(profile.url, { signal })
      return { auditId: report.id ? String(report.id) : null, scorePercent: scorePercentOf(report) }
    })(),
  }
}

function StepHeader({ step }) {
  const n = STEPS.indexOf(step) + 1
  return (
    <div className="mb-5">
      <p className="text-[13px] font-semibold text-blue-700">Step {n} of {STEPS.length}</p>
      <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950">{STEP_TITLES[step]}</h2>
    </div>
  )
}

function SiteStep({ site, onCheck, onNext }) {
  const [input, setInput] = useState(site.input)
  const busy = site.status === 'loading'
  return (
    <section className="gl-card p-5 sm:p-7" aria-labelledby="s1">
      <div id="s1"><StepHeader step="site" /></div>
      <form onSubmit={(e) => { e.preventDefault(); onCheck(input) }} noValidate>
        <Field id="siteUrl" label="Website address" hint="Type your domain. We read the rest from your site." error={site.error}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="siteUrl" className={inputClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder="example.com" inputMode="url" autoComplete="url" />
            <ActionButton type="submit" busy={busy} disabled={busy || !input.trim()} className="sm:shrink-0">Check my website</ActionButton>
          </div>
        </Field>
      </form>
      {busy ? <div className="mt-4"><Busy>Reading your website…</Busy></div> : null}
      {site.profile ? (
        <div className="mt-5 space-y-3">
          <ProfileCard profile={site.profile} label="We found your website" />
          {site.score.status === 'running' ? <Busy>Checking your GeoLint score. This takes about 20 seconds.</Busy> : null}
          {site.score.status === 'done' && site.score.scorePercent !== null ? <p className="rounded-xl bg-slate-100 p-3 text-[14px] text-slate-800">Your current GeoLint score: <strong className="text-lg text-slate-950">{site.score.scorePercent}</strong> out of 100. We attach this report to your order.</p> : null}
          {site.score.status === 'failed' ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[14px] text-amber-900">{site.score.error} You can continue; we will run the audit for you.</p> : null}
        </div>
      ) : null}
      <div className="mt-6"><ActionButton onClick={onNext} disabled={!site.profile}>Next: competitors</ActionButton></div>
    </section>
  )
}

const SUGGEST_CACHE = 'geolint:suggest:'
const readCache = (host) => { try { const v = JSON.parse(sessionStorage.getItem(`${SUGGEST_CACHE}${host}`) || 'null'); return Array.isArray(v) ? v : null } catch { return null } }
const writeCache = (host, list) => { try { sessionStorage.setItem(`${SUGGEST_CACHE}${host}`, JSON.stringify(list)) } catch { /* private mode: suggestions are just fetched again */ } }

/** Competitors found for the client's kind of business: the AI names them, we read each site for its real name and logo. */
function useSuggestions(profile, rivals, getSignal) {
  const host = profile?.host || ''
  const [state, setState] = useState(() => { const cached = host ? readCache(host) : null; return { status: cached ? 'done' : 'idle', items: cached || [], seen: (cached || []).map((p) => p.host), reason: '' } })
  const load = async (more = false) => {
    if (!profile) return
    setState((s) => ({ ...s, status: 'loading' }))
    try {
      const exclude = [...state.seen, ...rivals.map((r) => r.profile?.host || r.host)]
      const { items: found, reason } = await suggestCompetitors(profile, { lookup: siteProfile, signal: getSignal(), exclude: more ? exclude : rivals.map((r) => r.profile?.host || r.host) })
      setState((s) => {
        const items = more ? [...s.items, ...found] : found
        if (items.length) writeCache(host, items)
        return { status: items.length ? 'done' : 'empty', items, reason, seen: [...new Set([...(more ? s.seen : []), ...found.map((p) => p.host)])] }
      })
    } catch (e) {
      if (e?.name !== 'AbortError') setState((s) => ({ ...s, status: s.items.length ? 'done' : 'empty' }))
    }
  }
  const started = useRef(false)
  useEffect(() => {
    if (started.current || state.status !== 'idle' || !profile) return
    started.current = true
    load(false)
  // runs once when the step opens with no saved suggestions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])
  return { ...state, reload: () => load(true) }
}

function SuggestionPanel({ site, rivals, full, onAdd, getSignal }) {
  const sug = useSuggestions(site.profile, rivals, getSignal)
  const taken = new Set(rivals.map((r) => bare(r.profile?.host || r.host)))
  const items = sug.items.filter((p) => !taken.has(bare(p.host)))
  return (
    <div className="mb-6" aria-live="polite">
      <h3 className="text-[15px] font-bold text-slate-950">Competitors we found for you</h3>
      <p className="mt-0.5 text-[13px] leading-5 text-slate-500">Based on what {site.profile?.title || site.profile?.host} offers. Tap Add to compare your score with theirs.</p>
      {sug.status === 'loading' || sug.status === 'idle' ? <div className="mt-3"><Busy>Finding competitors in your field…</Busy></div> : null}
      {items.length ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li key={p.host}>
              <ProfileCard profile={p} label={p.unverified ? 'Suggested competitor, not checked yet' : 'Suggested competitor'}>
                <ActionButton tone="secondary" className="mt-3 !min-h-[38px] !px-4 !py-1.5 !text-[14px]" disabled={full} onClick={() => onAdd(p.url, p.unverified ? undefined : p)}>{full ? 'Limit reached' : '+ Add'}</ActionButton>
              </ProfileCard>
            </li>
          ))}
        </ul>
      ) : null}
      {sug.status === 'empty' && !items.length ? <p className="mt-3 rounded-xl bg-slate-100 p-3 text-[13.5px] leading-5 text-slate-700">{sug.reason === 'ai' ? 'The competitor finder is not answering right now. Try again in a moment, or type a competitor below.' : 'We could not find competitors for this site automatically. Try again, or type one below.'}</p> : null}
      {sug.status !== 'loading' && sug.status !== 'idle' ? <button type="button" onClick={sug.reload} className="mt-3 text-[13.5px] font-semibold text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{items.length ? 'Show different competitors' : 'Try again'}</button> : null}
    </div>
  )
}

function CompetitorsStep({ site, rivals, onAdd, onRemove, onBack, onNext, getSignal }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const full = rivals.length >= MAX_COMPETITORS
  const add = async (event) => {
    event.preventDefault()
    setError('')
    const url = normalizeAuditUrl(input)
    if (!url) { setError('Enter a full website address, for example example.com.'); return }
    const host = bare(new URL(url).hostname)
    if (host === bare(site.profile?.host)) { setError('That is your own website. Add a rival instead.'); return }
    if (rivals.some((r) => bare(r.profile?.host || r.host) === host)) { setError('You already added this one.'); return }
    setInput('')
    await onAdd(url)
  }
  return (
    <section className="gl-card p-5 sm:p-7" aria-labelledby="s2">
      <div id="s2"><StepHeader step="competitors" /></div>
      <p className="mb-4 text-[14px] leading-6 text-slate-600">Pick up to {MAX_COMPETITORS} websites you compete with. We read them the same way and score them, so you can see where you stand. This step is optional.</p>
      <SuggestionPanel site={site} rivals={rivals} full={full} onAdd={onAdd} getSignal={getSignal} />
      <form onSubmit={add} noValidate>
        <Field id="rival" label="Or type a competitor yourself" error={error}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="rival" className={inputClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder="competitor.com" inputMode="url" disabled={full} />
            <ActionButton type="submit" tone="secondary" disabled={full || !input.trim()} className="sm:shrink-0">{full ? 'Limit reached' : 'Add competitor'}</ActionButton>
          </div>
        </Field>
      </form>
      <ul className="mt-5 space-y-3">
        {rivals.map((r) => (
          <li key={r.key}>
            {r.profile ? <ProfileCard profile={r.profile} label="Competitor">
              <span className="mt-2 block text-[13px]">
                {r.score.status === 'running' ? <span role="status" className="font-semibold text-blue-700">Scoring…</span> : null}
                {r.score.status === 'done' && r.score.scorePercent !== null ? <span className="font-semibold text-slate-900">GeoLint score {r.score.scorePercent}</span> : null}
                {r.score.status === 'failed' ? <span className="text-amber-800">{r.score.error}</span> : null}
              </span>
              <button type="button" onClick={() => onRemove(r.key)} className="mt-2 text-[13px] font-semibold text-slate-600 underline-offset-2 hover:text-rose-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">Remove</button>
            </ProfileCard> : r.error ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[14px] text-rose-800">{r.error} <button type="button" onClick={() => onRemove(r.key)} className="font-semibold underline">Dismiss</button></p>
            ) : <Busy>Reading {r.host}…</Busy>}
          </li>
        ))}
      </ul>
      {rivals.some((r) => r.score.scorePercent !== null) && site.score.scorePercent !== null ? (
        <div className="mt-6 rounded-2xl bg-slate-100 p-4"><ScoreBars own={{ scorePercent: site.score.scorePercent, label: site.profile?.title || site.profile?.host }} competitors={rivals.map((r) => ({ host: r.profile?.host, title: r.profile?.title, scorePercent: r.score.scorePercent }))} /></div>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3"><ActionButton tone="secondary" onClick={onBack}>Back</ActionButton><ActionButton onClick={onNext}>{rivals.length ? 'Next: your details' : 'Skip: your details'}</ActionButton></div>
    </section>
  )
}

function DetailsStep({ form, setForm, errors, site, onBack, onNext }) {
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  return (
    <section className="gl-card space-y-5 p-5 sm:p-7" aria-labelledby="s3">
      <div id="s3"><StepHeader step="details" /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Your name" error={errors.name}><input id="name" className={inputClass} value={form.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field id="whatsapp" label="WhatsApp number (optional)" hint="So we can reach you quickly." error={errors.whatsapp}><input id="whatsapp" className={inputClass} value={form.whatsapp} onChange={set('whatsapp')} placeholder="+92 300 1234567" inputMode="tel" autoComplete="tel" /></Field>
      </div>
      <Field id="platform" label="What is your website built with?" hint={site.profile?.platformEvidence ? `We detected ${optionLabel(PLATFORM_OPTIONS, site.profile.platform)}. Change it if that is wrong.` : ''} error={errors.platform}>
        <select id="platform" className={inputClass} value={form.platform} onChange={set('platform')}>
          <option value="">Choose…</option>
          {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <fieldset>
        <legend className="text-[14px] font-semibold text-slate-900">How will you give us access?</legend>
        <p className="mt-0.5 text-[13px] leading-5 text-slate-500">Never send us a password. An invite lets you stay in control and remove our access when we are done.</p>
        <div className="mt-2 space-y-2">
          {ACCESS_OPTIONS.map((o) => (
            <label key={o.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-[14px] ${form.accessMethod === o.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <input type="radio" name="accessMethod" value={o.value} checked={form.accessMethod === o.value} onChange={set('accessMethod')} className="mt-1 h-4 w-4 accent-blue-600" />
              <span><span className="block font-semibold text-slate-900">{o.label}</span><span className="block text-[13px] text-slate-500">{o.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="accessNotes" label="Anything we should know about access? (optional)" hint="For example the admin email you will invite. Not a password." error={errors.accessNotes}><input id="accessNotes" className={inputClass} value={form.accessNotes} onChange={set('accessNotes')} maxLength={500} /></Field>
      <Field id="notes" label="Anything else? (optional)" hint="Pages that matter most, things we must not touch, deadlines."><textarea id="notes" rows={3} className={inputClass} value={form.notes} onChange={set('notes')} maxLength={1000} /></Field>
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-6 text-slate-800">
          <input type="checkbox" checked={form.authorized} onChange={set('authorized')} className="mt-1.5 h-4 w-4 accent-blue-600" />
          <span>I own this website or I am allowed to change it, and I agree that Nexora Solutions may edit it to apply the fixes.</span>
        </label>
        {errors.authorized ? <p role="alert" className="mt-1 text-[13px] font-semibold text-rose-700">{errors.authorized}</p> : null}
      </div>
      <div className="flex flex-wrap gap-3"><ActionButton tone="secondary" onClick={onBack}>Back</ActionButton><ActionButton onClick={onNext}>Next: choose your plan</ActionButton></div>
    </section>
  )
}

function PlanStep({ service, plan, setPlan, site, rivals, serverError, busy, onBack, onPlace }) {
  const price = planPrice(service, plan)
  return (
    <section className="gl-card p-5 sm:p-7" aria-labelledby="s4">
      <div id="s4"><StepHeader step="plan" /></div>
      <p className="mb-4 text-[14px] leading-6 text-slate-600">Your details are complete. Choose what you want us to do.</p>
      <div role="radiogroup" aria-label="Plan" className="grid gap-4 md:grid-cols-2">
        {PLAN_OPTIONS.map((p) => {
          const on = plan === p.value
          return (
            <label key={p.value} className={`relative flex cursor-pointer flex-col rounded-2xl border-2 p-5 transition ${on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <input type="radio" name="plan" value={p.value} checked={on} onChange={() => setPlan(p.value)} className="sr-only" />
              <span className="flex items-start justify-between gap-3">
                <span className="text-[17px] font-bold text-slate-950">{p.label}</span>
                <span aria-hidden="true" className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-blue-600 bg-blue-600 text-[11px] text-white' : 'border-slate-300'}`}>{on ? '✓' : ''}</span>
              </span>
              <span className="mt-1 block text-[28px] font-black tracking-tight text-slate-950">${planPrice(service, p.value)} <span className="text-[14px] font-semibold text-slate-500">{p.unit}</span></span>
              <span className="mt-1 block text-[13px] leading-5 text-slate-600">{p.short}</span>
              <ul className="mt-3 space-y-1.5 text-[13px] leading-5 text-slate-700">
                {p.features.map((f) => <li key={f} className="flex gap-2"><span className="font-black text-emerald-600" aria-hidden="true">✓</span><span>{f}</span></li>)}
              </ul>
            </label>
          )
        })}
      </div>
      <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-[14px] leading-6 text-slate-700">
        <p><strong className="text-slate-950">{site.profile?.title || site.profile?.host}</strong>{rivals.length ? `, compared with ${rivals.length} competitor${rivals.length === 1 ? '' : 's'}` : ''}.</p>
        <p className="mt-1">You pay after you place the order, by card or by bank or mobile wallet. We start once payment is confirmed. We re-run the audit when we finish and show your real score before and after. Our target is {service?.targetScore ?? DEFAULT_TARGET}+; we never promise a number.</p>
      </div>
      {serverError ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[14px] font-semibold text-rose-800">{serverError}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3"><ActionButton tone="secondary" onClick={onBack}>Back</ActionButton><ActionButton busy={busy} onClick={onPlace}>Place order, ${price}</ActionButton></div>
    </section>
  )
}


/** The four steps as a bar. Finished steps are buttons, so the client can jump back without losing anything. */
function WizardProgress({ step, reached, onGo }) {
  const index = STEPS.indexOf(step)
  return (
    <ol className="mb-5 grid grid-cols-4 gap-2" aria-label="Order steps">
      {STEPS.map((id, i) => {
        const done = i < index
        const open = i <= reached
        const inner = (
          <>
            <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-black ${done ? 'bg-emerald-500 text-white' : i === index ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-slate-200 text-slate-600'}`}>{done ? '✓' : i + 1}</span>
            <span className={`mt-1 block text-[12px] font-semibold leading-4 ${i === index ? 'text-slate-950' : 'text-slate-600'}`}>{STEP_TITLES[id]}</span>
          </>
        )
        return (
          <li key={id} aria-current={i === index ? 'step' : undefined} className="text-center">
            {open && i !== index ? <button type="button" onClick={() => onGo(id)} className="w-full rounded-xl py-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{inner}</button> : <div className="py-1">{inner}</div>}
          </li>
        )
      })}
    </ol>
  )
}

/** Always-visible summary of the order so far, with the price once a plan is chosen. */
function OrderSummary({ site, rivals, plan, service, step }) {
  if (!site.profile) return null
  const priced = step === 'plan' || step === 'details'
  return (
    <aside className="gl-card p-5" aria-label="Your order so far">
      <h2 className="text-[16px] font-bold text-slate-950">Your order</h2>
      <p className="mt-3 truncate text-[15px] font-bold text-slate-950">{site.profile.title || site.profile.host}</p>
      <p className="truncate text-[13px] text-slate-500">{site.profile.host}</p>
      <dl className="mt-3 space-y-1.5 text-[13.5px]">
        <div className="flex justify-between gap-3"><dt className="text-slate-500">GeoLint score</dt><dd className="font-semibold text-slate-900">{site.score.scorePercent !== null ? `${site.score.scorePercent} / 100` : site.score.status === 'running' ? 'Checking…' : 'We will check it'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-500">Competitors</dt><dd className="font-semibold text-slate-900">{rivals.filter((r) => r.profile).length}</dd></div>
        {priced ? <div className="flex justify-between gap-3"><dt className="text-slate-500">{planLabel(plan)}</dt><dd className="font-semibold text-slate-900">${planPrice(service, plan)}</dd></div> : null}
      </dl>
      <p className="mt-3 rounded-xl bg-emerald-50 p-2.5 text-[12.5px] leading-5 text-emerald-900">Your progress is saved. You can leave and come back; nothing is lost.</p>
    </aside>
  )
}

/** /tools/geo-audit/fix/: the order wizard. Needs a confirmed sign-in (the sign-in page sends people back here). */
export default function GeoLintFixPage() {
  const { user, ready } = useFixClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [service, setService] = useState(null)
  const [site, setSite] = useState(() => ({ input: params.get('url') || '', status: 'idle', error: '', profile: null, score: emptyScore }))
  const [rivals, setRivals] = useState([])
  const [form, setForm] = useState({ ...emptyForm })
  const [errors, setErrors] = useState({})
  const [plan, setPlan] = useState('geo')
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const [restored, setRestored] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [siteNonce, setSiteNonce] = useState(0)
  const abort = useRef(new AbortController())
  const started = useRef(false)
  const checkId = useRef(0)
  const headingRef = useRef(null)

  const confirmed = ready && Boolean(user?.emailVerified)
  const autoUrl = params.get('url')
  const wantedStep = params.get('step') || 'site'
  const detailsValid = useMemo(() => Object.keys(validateOrderForm({ ...form, siteUrl: site.profile?.url || '', plan })).length === 0, [form, site.profile, plan])
  const step = reachableStep(wantedStep, { hasSite: Boolean(site.profile), detailsValid })
  const reached = !site.profile ? 0 : detailsValid ? 3 : 2

  useEffect(() => {
    let live = true
    getFixService().then((s) => live && setService(s)).catch(() => {})
    // a fresh controller for every mount (React may mount, clean up and mount again in development)
    const controller = new AbortController()
    abort.current = controller
    return () => { live = false; controller.abort() }
  }, [])

  // go to a step with a normal history entry, so the browser Back button walks the steps instead of leaving the page
  const goStep = (next, { replace = false } = {}) => {
    setParams((prev) => {
      const q = new URLSearchParams(prev)
      if (next === 'site') q.delete('step')
      else q.set('step', next)
      return q
    }, { replace })
  }

  // bring the saved draft back once we know who the client is; a link with ?url= for another site starts fresh
  useEffect(() => {
    if (!confirmed || hydrated) return
    const draft = loadDraft(user.uid)
    const sameSite = draft && (!autoUrl || draft.site.profile.url.replace(/\/$/, '').includes(String(autoUrl).replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]))
    if (draft && sameSite) {
      setSite(draft.site)
      setRivals(draft.rivals)
      setForm(draft.form)
      setPlan(draft.plan)
      setRestored(draft)
      setSiteNonce((n) => n + 1)
      if (!params.get('step') && draft.step !== 'site') setParams((prev) => { const q = new URLSearchParams(prev); q.set('step', draft.step); return q }, { replace: true })
    }
    setHydrated(true)
    // runs once per sign-in; params are read, not watched
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, hydrated, user?.uid])

  // keep the draft up to date while the client works (debounced a little so typing is not slow)
  useEffect(() => {
    if (!hydrated || !user?.uid || !site.profile) return undefined
    const timer = setTimeout(() => saveDraft(user.uid, { step, site, rivals, form, plan }), 400)
    return () => clearTimeout(timer)
  }, [hydrated, user?.uid, step, site, rivals, form, plan])

  // each new step starts at the top with the heading in view for screen readers
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'auto' })
    headingRef.current?.focus?.({ preventScroll: true })
  }, [step])

  const reuse = () => {
    const r = typeof window === 'undefined' ? null : loadReport()
    return r && r.url ? r : null
  }

  async function checkSite(raw) {
    const mine = ++checkId.current
    setRestored(null)
    setSite((s) => ({ ...s, input: raw, status: 'loading', error: '', profile: null, score: emptyScore }))
    try {
      const { profile, scored } = await inspect(raw, { signal: abort.current.signal, reuse: reuse() })
      if (mine !== checkId.current) return
      setSite((s) => ({ ...s, status: 'ready', profile, score: { ...emptyScore, status: 'running' } }))
      setForm((f) => ({ ...f, platform: f.platform || (profile.platformEvidence ? profile.platform : '') }))
      scored.then(
        (r) => { if (mine === checkId.current) setSite((s) => ({ ...s, score: { status: 'done', ...r, error: '' } })) },
        (e) => { if (mine === checkId.current && e?.name !== 'AbortError') setSite((s) => ({ ...s, score: { ...emptyScore, status: 'failed', error: e?.message || 'We could not score your site now.' } })) },
      )
    } catch (e) {
      if (mine !== checkId.current || e?.name === 'AbortError') return
      setSite((s) => ({ ...s, status: 'error', error: e?.message || 'We could not read that website. Check the address.' }))
    }
  }

  // arriving from the report page with ?url=: read the site straight away (once, after the draft check)
  useEffect(() => {
    if (started.current || !confirmed || !hydrated || !autoUrl || site.profile) return
    started.current = true
    Promise.resolve().then(() => checkSite(autoUrl))
    // checkSite only uses refs and state setters, so it does not need to be a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, hydrated, autoUrl])

  async function addRival(url, known) {
    if (rivals.length >= MAX_COMPETITORS) return
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const host = new URL(url).hostname
    setRivals((list) => [...list, { key, host, profile: null, error: '', score: emptyScore }])
    try {
      const { profile, scored } = await inspect(url, { signal: abort.current.signal, known })
      setRivals((list) => list.map((r) => (r.key === key ? { ...r, profile, score: { ...emptyScore, status: 'running' } } : r)))
      scored.then(
        (r) => setRivals((list) => list.map((x) => (x.key === key ? { ...x, score: { status: 'done', ...r, error: '' } } : x))),
        (e) => { if (e?.name !== 'AbortError') setRivals((list) => list.map((x) => (x.key === key ? { ...x, score: { ...emptyScore, status: 'failed', error: e?.message || 'Could not score this site.' } } : x))) },
      )
    } catch (e) {
      if (e?.name === 'AbortError') return
      setRivals((list) => list.map((r) => (r.key === key ? { ...r, error: e?.message || 'We could not read that website.' } : r)))
    }
  }

  const toDetails = () => {
    // the name comes from the account the first time
    setForm((f) => ({ ...f, name: f.name || user?.name || '' }))
    goStep('details')
  }

  const toPlan = () => {
    const found = validateOrderForm({ ...form, siteUrl: site.profile?.url || 'x', plan })
    setErrors(found)
    if (Object.keys(found).length === 0) { goStep('plan'); return }
    // put the first problem in view so nothing fails silently below the fold
    setTimeout(() => document.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
  }

  const setFormField = (updater) => {
    setForm(updater)
    setErrors({})
  }

  const startOver = () => {
    checkId.current += 1
    clearDraft(user?.uid)
    setRestored(null)
    setSite({ input: '', status: 'idle', error: '', profile: null, score: emptyScore })
    setRivals([])
    setForm({ ...emptyForm })
    setPlan('geo')
    setErrors({})
    setSiteNonce((n) => n + 1)
    setParams(new URLSearchParams(), { replace: true })
  }

  async function place() {
    setBusy(true)
    setServerError('')
    try {
      const payload = {
        siteUrl: site.profile.url,
        siteTitle: site.profile.title || '',
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        platform: form.platform,
        plan,
        accessMethod: form.accessMethod,
        accessNotes: form.accessNotes.trim(),
        notes: form.notes.trim(),
        authorized: true,
        ...(site.score.auditId ? { auditId: site.score.auditId } : {}),
        competitors: rivals.filter((r) => r.profile).map((r) => ({ url: r.profile.url, title: r.profile.title || r.profile.host, ...(r.score.auditId ? { auditId: r.score.auditId } : {}) })),
      }
      const { order } = await placeOrder(payload)
      clearDraft(user?.uid)
      navigate(`${GEOLINT_ORDERS_PATH}/${order.id}`, { state: { fresh: true }, replace: true })
    } catch (error) {
      if (error?.code === 'DUPLICATE' && error.orderId) { clearDraft(user?.uid); navigate(`${GEOLINT_ORDERS_PATH}/${error.orderId}`, { replace: true }); return }
      setServerError(orderErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  if (ready && (!user || !user.emailVerified)) {
    return <Navigate to={`${GEOLINT_SIGNIN_PATH}?next=${encodeURIComponent(`${GEOLINT_FIX_PATH}${location.search}`)}`} replace />
  }
  const closed = service && service.enabled === false

  return (
    <PublicPageShell backTo={GEOLINT_PATH} backLabel="Back to GeoLint">
      <PageSeo title="Order your website fix | GeoLint" description="Order the GeoLint fix service: we read your site, compare you with competitors and fix it." canonical={`https://nexorasolution.online${GEOLINT_FIX_PATH}/`} path={GEOLINT_FIX_PATH} robots="noindex,follow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <nav aria-label="Breadcrumb" className="sr-only"><Link to={GEOLINT_PATH} className="font-semibold text-blue-700 hover:underline">GeoLint</Link> <span aria-hidden="true">/</span> Order a fix</nav>
        <h1 ref={headingRef} tabIndex={-1} className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 outline-none sm:text-4xl">We fix your website for AI search</h1>
        {user ? <p className="mt-2 text-[13px] text-slate-600">Signed in as <strong className="text-slate-900">{user.email}</strong>. <button type="button" onClick={() => signOutClient()} className="font-semibold text-blue-700 hover:underline">Use another account</button> · <Link to={GEOLINT_ORDERS_PATH} className="font-semibold text-blue-700 hover:underline">My dashboard</Link></p> : null}
        {restored ? (
          <p role="status" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[14px] text-emerald-900">
            <span><strong>Welcome back.</strong> We kept your progress for {restored.site.profile.host}.</span>
            <button type="button" onClick={startOver} className="font-semibold underline">Start over</button>
          </p>
        ) : null}
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div>
            {!closed && ready ? <WizardProgress step={step} reached={reached} onGo={(id) => goStep(id)} /> : null}
            {closed ? <div className="gl-card p-6 text-[15px] leading-7 text-slate-700">New orders are paused for now. Please check back soon.</div>
              : !ready || !hydrated ? <div className="gl-card p-6 text-slate-500" role="status">Loading…</div>
              : step === 'site' ? <SiteStep key={siteNonce} site={site} onCheck={checkSite} onNext={() => goStep('competitors')} />
              : step === 'competitors' ? <CompetitorsStep site={site} rivals={rivals} onAdd={addRival} getSignal={() => abort.current.signal} onRemove={(key) => setRivals((l) => l.filter((r) => r.key !== key))} onBack={() => goStep('site')} onNext={toDetails} />
              : step === 'details' ? <DetailsStep form={form} setForm={setFormField} errors={errors} site={site} onBack={() => goStep('competitors')} onNext={toPlan} />
              : <PlanStep service={service} plan={plan} setPlan={setPlan} site={site} rivals={rivals} serverError={serverError} busy={busy} onBack={() => goStep('details')} onPlace={place} />}
          </div>
          <div className="space-y-6">
            <OrderSummary site={site} rivals={rivals} plan={plan} service={service} step={step} />
            <JourneySteps current={step === 'plan' ? 'plan' : step} />
          </div>
        </div>
      </div>
    </PublicPageShell>
  )
}
