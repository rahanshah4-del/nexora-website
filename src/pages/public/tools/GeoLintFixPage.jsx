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
import { GlLoader, GlMini } from './GeoLintLoader.jsx'

const STEPS = WIZARD_STEPS
const STEP_TITLES = { site: 'Your website', competitors: 'Competitors', details: 'Your details', plan: 'Choose your plan' }
const inputClass = 'w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-[16px] text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus-visible:border-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-blue-600/40'
const bare = (host) => String(host || '').toLowerCase().replace(/^www\./, '')

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-semibold text-slate-900">{label}</label>
      {hint ? <p id={`${id}-hint`} className="mt-0.5 text-[13px] leading-5 text-slate-500">{hint}</p> : null}
      <div className="mt-2">{children}</div>
      {error ? <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] font-semibold text-rose-700"><span aria-hidden="true">!</span><span>{error}</span></p> : null}
    </div>
  )
}

function Busy({ children }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[14px] font-medium text-blue-900">
      <GlMini />
      <span>{children}</span>
    </div>
  )
}

/** Back and Next together. On phones this bar stays at the bottom of the screen while the step scrolls. */
function Actions({ onBack, children }) {
  return (
    <div className="gx-actions mt-7 flex items-center gap-3">
      {onBack ? <ActionButton tone="secondary" onClick={onBack} className="shrink-0">Back</ActionButton> : null}
      <div className="flex min-w-0 flex-1 sm:flex-none [&>button]:w-full sm:[&>button]:w-auto">{children}</div>
    </div>
  )
}

/** The score as a number with a bar, coloured by how much room there is to improve. */
function ScoreMeter({ value }) {
  const tone = value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="gx-card-flat p-4">
      <p className="text-[14px] text-slate-700">Your current GeoLint score</p>
      <p className="mt-1 flex items-baseline gap-1.5"><strong className="font-display text-4xl font-bold tabular-nums text-slate-950">{value}</strong><span className="text-[14px] text-slate-500">out of 100</span></p>
      <div className="gx-seg-track mt-3 h-2 overflow-hidden rounded-full" aria-hidden="true"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} /></div>
      <p className="mt-2.5 text-[13px] text-slate-500">We attach this report to your order.</p>
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

function StepHeader({ step, children }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-[22px] font-bold leading-tight tracking-tight text-slate-950 sm:text-2xl">{STEP_TITLES[step]}</h2>
      {children ? <p className="mt-1.5 text-[14.5px] leading-6 text-slate-600">{children}</p> : null}
    </div>
  )
}

function SiteStep({ site, onCheck, onNext }) {
  const [input, setInput] = useState(site.input)
  const busy = site.status === 'loading'
  return (
    <section className="gx-card p-5 sm:p-8" aria-labelledby="s1">
      <div id="s1"><StepHeader step="site">Type your domain. We read the name, logo and platform from your site.</StepHeader></div>
      <form onSubmit={(e) => { e.preventDefault(); onCheck(input) }} noValidate>
        <Field id="siteUrl" label="Website address" error={site.error}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="siteUrl" className={inputClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder="example.com" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false} />
            <ActionButton type="submit" busy={busy} disabled={busy || !input.trim()} full className="sm:shrink-0">Check my website</ActionButton>
          </div>
        </Field>
      </form>
      {busy ? <div className="mt-4"><Busy>Reading your website…</Busy></div> : null}
      {site.profile ? (
        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
          <ProfileCard profile={site.profile} label="We found your website" />
          {site.score.status === 'running' ? <div className="gx-card-flat flex items-center p-4"><Busy>Checking your GeoLint score. This takes about 20 seconds.</Busy></div> : null}
          {site.score.status === 'done' && site.score.scorePercent !== null ? <ScoreMeter value={site.score.scorePercent} /> : null}
          {site.score.status === 'failed' ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[14px] text-amber-900 md:col-span-2">{site.score.error} You can continue; we will run the audit for you.</p> : null}
        </div>
      ) : null}
      <Actions><ActionButton onClick={onNext} disabled={!site.profile}>Next: competitors</ActionButton></Actions>
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
  const loading = sug.status === 'loading' || sug.status === 'idle'
  return (
    <div className="mb-7" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className="text-[16px] font-bold text-slate-950">Competitors we found for you</h3>
          <p className="mt-0.5 text-[13.5px] leading-5 text-slate-500">Based on what {site.profile?.title || site.profile?.host} offers. Tap Add to compare your score with theirs.</p>
        </div>
        {!loading ? <button type="button" onClick={sug.reload} className="gx-focus rounded-lg px-1 py-1 text-[13.5px] font-semibold text-blue-700 hover:underline">{items.length ? 'Show different competitors' : 'Try again'}</button> : null}
      </div>
      {loading ? <div className="mt-3"><Busy>Finding competitors in your field…</Busy></div> : null}
      {items.length ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li key={p.host} className="min-w-0">
              <ProfileCard profile={p} label={p.unverified ? 'Not checked yet' : ''} compact>
                <ActionButton tone="secondary" className="mt-3 !min-h-[40px] !px-4 !py-2 !text-[14px]" disabled={full} onClick={() => onAdd(p.url, p.unverified ? undefined : p)} full>{full ? 'Limit reached' : '+ Add competitor'}</ActionButton>
              </ProfileCard>
            </li>
          ))}
        </ul>
      ) : null}
      {sug.status === 'empty' && !items.length ? <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[14px] leading-5 text-slate-700">{sug.reason === 'ai' ? 'The competitor finder is not answering right now. Try again in a moment, or type a competitor below.' : 'We could not find competitors for this site automatically. Try again, or type one below.'}</p> : null}
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
    <section className="gx-card p-5 sm:p-8" aria-labelledby="s2">
      <div id="s2"><StepHeader step="competitors">Pick up to {MAX_COMPETITORS} websites you compete with. We score them the same way, so you see where you stand. You can skip this step.</StepHeader></div>

      {rivals.length ? (
        <div className="mb-7">
          <h3 className="text-[16px] font-bold text-slate-950">Your competitors <span className="font-medium text-slate-500">({rivals.length} of {MAX_COMPETITORS})</span></h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {rivals.map((r) => (
              <li key={r.key} className="min-w-0">
                {r.profile ? <ProfileCard profile={r.profile} compact>
                  <span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    {r.score.status === 'running' ? <span role="status" className="font-semibold text-blue-700">Scoring…</span> : null}
                    {r.score.status === 'done' && r.score.scorePercent !== null ? <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-semibold text-white">GeoLint score {r.score.scorePercent}</span> : null}
                    {r.score.status === 'failed' ? <span className="text-amber-800">{r.score.error}</span> : null}
                    {r.score.status === 'idle' ? <span className="text-slate-500">Score pending</span> : null}
                    <button type="button" onClick={() => onRemove(r.key)} className="gx-focus rounded-md px-1 font-semibold text-slate-600 underline-offset-2 hover:text-rose-700 hover:underline">Remove</button>
                  </span>
                </ProfileCard> : r.error ? (
                  <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[14px] text-rose-800">{r.error} <button type="button" onClick={() => onRemove(r.key)} className="font-semibold underline">Dismiss</button></p>
                ) : <Busy>Reading {r.host}…</Busy>}
              </li>
            ))}
          </ul>
          {rivals.some((r) => r.score.scorePercent !== null) && site.score.scorePercent !== null ? (
            <div className="gx-card-flat mt-4 p-4"><ScoreBars own={{ scorePercent: site.score.scorePercent, label: site.profile?.title || site.profile?.host }} competitors={rivals.map((r) => ({ host: r.profile?.host, title: r.profile?.title, scorePercent: r.score.scorePercent }))} /></div>
          ) : null}
        </div>
      ) : null}

      {!full ? <SuggestionPanel site={site} rivals={rivals} full={full} onAdd={onAdd} getSignal={getSignal} /> : <p className="mb-7 rounded-xl bg-emerald-50 p-3.5 text-[14px] text-emerald-900">You added {MAX_COMPETITORS} competitors, the most we compare. Remove one to pick another.</p>}

      <form onSubmit={add} noValidate>
        <Field id="rival" label="Or type a competitor yourself" error={error}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="rival" className={inputClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder="competitor.com" inputMode="url" autoCapitalize="none" spellCheck={false} disabled={full} />
            <ActionButton type="submit" tone="secondary" disabled={full || !input.trim()} full className="sm:shrink-0">{full ? 'Limit reached' : 'Add competitor'}</ActionButton>
          </div>
        </Field>
      </form>
      <Actions onBack={onBack}><ActionButton onClick={onNext}>{rivals.length ? 'Next: your details' : 'Skip: your details'}</ActionButton></Actions>
    </section>
  )
}

function Group({ title, children }) {
  return (
    <div className="border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
      <h3 className="mb-4 text-[16px] font-bold text-slate-950">{title}</h3>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function DetailsStep({ form, setForm, errors, site, onBack, onNext }) {
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  return (
    <section className="gx-card space-y-6 p-5 sm:p-8" aria-labelledby="s3">
      <div id="s3"><StepHeader step="details">So we can reach you and know how to get into your website.</StepHeader></div>
      <Group title="About you">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Your name" error={errors.name}><input id="name" className={inputClass} value={form.name} onChange={set('name')} autoComplete="name" /></Field>
          <Field id="whatsapp" label="WhatsApp number (optional)" hint="So we can reach you quickly." error={errors.whatsapp}><input id="whatsapp" className={inputClass} value={form.whatsapp} onChange={set('whatsapp')} placeholder="+92 300 1234567" inputMode="tel" autoComplete="tel" /></Field>
        </div>
      </Group>
      <Group title="Your website">
        <Field id="platform" label="What is your website built with?" hint={site.profile?.platformEvidence ? `We detected ${optionLabel(PLATFORM_OPTIONS, site.profile.platform)}. Change it if that is wrong.` : ''} error={errors.platform}>
          <select id="platform" className={inputClass} value={form.platform} onChange={set('platform')}>
            <option value="">Choose…</option>
            {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </Group>
      <Group title="How you give us access">
        <fieldset>
          <legend className="sr-only">How will you give us access?</legend>
          <p className="mb-3 text-[13.5px] leading-5 text-slate-500">Never send us a password. An invite lets you stay in control and remove our access when we are done.</p>
          <div className="grid gap-2.5">
            {ACCESS_OPTIONS.map((o) => (
              <label key={o.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-[14px] transition ${form.accessMethod === o.value ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <input type="radio" name="accessMethod" value={o.value} checked={form.accessMethod === o.value} onChange={set('accessMethod')} className="mt-1 h-4 w-4 accent-blue-600" />
                <span><span className="block font-semibold text-slate-900">{o.label}</span><span className="block text-[13px] leading-5 text-slate-500">{o.hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="accessNotes" label="Anything we should know about access? (optional)" hint="For example the admin email you will invite. Not a password." error={errors.accessNotes}><input id="accessNotes" className={inputClass} value={form.accessNotes} onChange={set('accessNotes')} maxLength={500} /></Field>
        <Field id="notes" label="Anything else? (optional)" hint="Pages that matter most, things we must not touch, deadlines."><textarea id="notes" rows={3} className={inputClass} value={form.notes} onChange={set('notes')} maxLength={1000} /></Field>
      </Group>
      <div>
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-[14px] leading-6 text-slate-800 ${errors.authorized ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
          <input type="checkbox" checked={form.authorized} onChange={set('authorized')} className="mt-1.5 h-4 w-4 accent-blue-600" />
          <span>I own this website or I am allowed to change it, and I agree that Nexora Solutions may edit it to apply the fixes.</span>
        </label>
        {errors.authorized ? <p role="alert" className="mt-1.5 text-[13px] font-semibold text-rose-700">{errors.authorized}</p> : null}
      </div>
      <Actions onBack={onBack}><ActionButton onClick={onNext}>Next: choose your plan</ActionButton></Actions>
    </section>
  )
}

function PlanStep({ service, plan, setPlan, site, rivals, serverError, busy, onBack, onPlace }) {
  const price = planPrice(service, plan)
  const rivalCount = rivals.filter((r) => r.profile).length
  return (
    <section className="gx-card p-5 sm:p-8" aria-labelledby="s4">
      <div id="s4"><StepHeader step="plan">Your details are complete. Choose what you want us to do.</StepHeader></div>
      <div role="radiogroup" aria-label="Plan" className="grid gap-4 md:grid-cols-2">
        {PLAN_OPTIONS.map((p) => {
          const on = plan === p.value
          return (
            <label key={p.value} className={`relative flex cursor-pointer flex-col rounded-2xl border p-5 transition ${on ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <input type="radio" name="plan" value={p.value} checked={on} onChange={() => setPlan(p.value)} className="sr-only" />
              <span className="flex items-start justify-between gap-3">
                <span className="text-[17px] font-bold text-slate-950">{p.label}</span>
                <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[11px] ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>{on ? '✓' : ''}</span>
              </span>
              <span className="mt-2 flex items-baseline gap-1.5"><span className="font-display text-[34px] font-bold leading-none tracking-tight text-slate-950">${planPrice(service, p.value)}</span><span className="text-[14px] text-slate-500">{p.unit}</span></span>
              <span className="mt-2 block text-[13.5px] leading-5 text-slate-600">{p.short}</span>
              <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-[13.5px] leading-5 text-slate-700">
                {p.features.map((f) => <li key={f} className="flex gap-2.5"><span className="mt-0.5 font-black text-emerald-600" aria-hidden="true">✓</span><span>{f}</span></li>)}
              </ul>
            </label>
          )
        })}
      </div>
      <div className="gx-card-flat mt-5 p-4 text-[14px] leading-6 text-slate-700">
        <p className="font-semibold text-slate-950">{site.profile?.title || site.profile?.host}{rivalCount ? `, compared with ${rivalCount} competitor${rivalCount === 1 ? '' : 's'}` : ''}</p>
        <ol className="mt-2 space-y-1.5">
          <li className="flex gap-2.5"><span className="font-bold text-blue-700">1.</span><span>Place the order. You pay after that, by card or by bank or mobile wallet.</span></li>
          <li className="flex gap-2.5"><span className="font-bold text-blue-700">2.</span><span>We start once the payment is confirmed.</span></li>
          <li className="flex gap-2.5"><span className="font-bold text-blue-700">3.</span><span>We run the audit again and show your real score before and after. Our target is {service?.targetScore ?? DEFAULT_TARGET}+; we never promise a number.</span></li>
        </ol>
      </div>
      {serverError ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[14px] font-semibold text-rose-800">{serverError}</p> : null}
      <Actions onBack={onBack}><ActionButton busy={busy} onClick={onPlace}>Place order, ${price}</ActionButton></Actions>
    </section>
  )
}

/** Four segments with the current step named above them. Finished steps are buttons, so the client can jump back without losing anything. */
function WizardProgress({ step, reached, onGo }) {
  const index = STEPS.indexOf(step)
  return (
    <nav aria-label="Order steps" className="mb-5">
      <p className="mb-2.5 text-[13.5px] font-semibold text-slate-500">Step {index + 1} of {STEPS.length}<span aria-hidden="true" className="mx-1.5 text-slate-300">/</span><span className="text-slate-950">{STEP_TITLES[step]}</span></p>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((id, i) => {
          const done = i < index
          const open = i <= reached && i !== index
          const bar = <span className={`block h-1.5 rounded-full transition-colors ${i <= index ? 'bg-blue-600' : 'gx-seg-track'}`} />
          const label = <span className={`mt-2 hidden text-[12.5px] font-medium leading-4 sm:block ${i === index ? 'text-slate-950' : done ? 'text-slate-700' : 'text-slate-400'}`}>{STEP_TITLES[id]}</span>
          return (
            <li key={id} aria-current={i === index ? 'step' : undefined}>
              {open ? <button type="button" onClick={() => onGo(id)} aria-label={`Go back to ${STEP_TITLES[id]}`} className="gx-focus block w-full rounded-md py-1.5 text-left">{bar}{label}</button> : <div className="py-1.5">{bar}{label}</div>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** The order so far. A slim strip on phones, a card beside the form on desktop, with the price once a plan matters. */
function OrderSummary({ site, rivals, plan, service, step, mobileOnly = false, desktopOnly = false }) {
  if (!site.profile) return null
  const priced = step === 'plan' || step === 'details'
  const score = site.score.scorePercent !== null ? `${site.score.scorePercent}/100` : site.score.status === 'running' ? 'Checking…' : 'Not scored'
  const rivalCount = rivals.filter((r) => r.profile).length
  const initial = (site.profile.title || site.profile.host || '?').trim().charAt(0).toUpperCase()
  const logo = site.profile.logo ? <img src={site.profile.logo} alt="" width="36" height="36" className="h-full w-full object-contain p-1" /> : <span aria-hidden="true">{initial}</span>
  return (
    <>
      {desktopOnly ? null : <div className="gx-card-flat mb-5 flex items-center gap-3 p-3 lg:hidden" aria-label="Your order so far">
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-[15px] font-bold text-slate-500">{logo}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold text-slate-950">{site.profile.title || site.profile.host}</span><span className="block truncate text-[12.5px] text-slate-500">Score {score}{rivalCount ? ` · ${rivalCount} competitor${rivalCount === 1 ? '' : 's'}` : ''}</span></span>
        {priced ? <span className="shrink-0 text-[15px] font-bold tabular-nums text-slate-950">${planPrice(service, plan)}</span> : null}
      </div>}
      {mobileOnly ? null : <aside className="gx-card hidden p-5 lg:block" aria-label="Your order so far">
        <h2 className="text-[15px] font-bold text-slate-950">Your order</h2>
        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-[17px] font-bold text-slate-500">{logo}</span>
          <span className="min-w-0"><span className="block truncate text-[15px] font-bold text-slate-950">{site.profile.title || site.profile.host}</span><span className="block truncate text-[13px] text-slate-500">{site.profile.host}</span></span>
        </div>
        <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-[14px]">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">GeoLint score</dt><dd className="font-semibold tabular-nums text-slate-900">{score}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Competitors</dt><dd className="font-semibold tabular-nums text-slate-900">{rivalCount}</dd></div>
          {priced ? <div className="flex justify-between gap-3 border-t border-slate-200 pt-3"><dt className="text-slate-700">{planLabel(plan)}</dt><dd className="text-[16px] font-bold tabular-nums text-slate-950">${planPrice(service, plan)}</dd></div> : null}
        </dl>
        <p className="mt-4 flex gap-2 rounded-xl bg-emerald-50 p-3 text-[13px] leading-5 text-emerald-900"><span aria-hidden="true">✓</span><span>Your progress is saved. You can leave and come back.</span></p>
      </aside>}
    </>
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
      <PageSeo title="Order your website fix | GeoLint" description="Order the GeoLint fix service: we read your site, compare you with competitors and fix it." canonical={`https://nexorasolution.us${GEOLINT_FIX_PATH}/`} path={GEOLINT_FIX_PATH} robots="noindex,follow" ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="sr-only"><Link to={GEOLINT_PATH} className="font-semibold text-blue-700 hover:underline">GeoLint</Link> <span aria-hidden="true">/</span> Order a fix</nav>
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 max-w-2xl">
            <h1 ref={headingRef} tabIndex={-1} className="font-display text-[28px] font-bold leading-[1.15] tracking-tight text-slate-950 outline-none sm:text-4xl">We fix your website for AI search</h1>
            <p className="mt-2 text-[15px] leading-6 text-slate-600">Four short steps. You pay after you place the order.</p>
          </div>
          {user ? (
            <div className="gx-account">
              <span className="gx-account-email">{user.email}</span>
              <Link to={GEOLINT_ORDERS_PATH} className="gx-pill gx-pill-primary">My dashboard</Link>
              <button type="button" onClick={() => signOutClient()} className="gx-pill">Use another account</button>
            </div>
          ) : null}
        </header>
        {restored ? (
          <p role="status" className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-900">
            <span><strong>Welcome back.</strong> We kept your progress for {restored.site.profile.host}.</span>
            <button type="button" onClick={startOver} className="gx-focus rounded-md font-semibold underline">Start over</button>
          </p>
        ) : null}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {!closed && ready ? <WizardProgress step={step} reached={reached} onGo={(id) => goStep(id)} /> : null}
            {!closed && ready && step !== 'site' ? <OrderSummary site={site} rivals={rivals} plan={plan} service={service} step={step} mobileOnly /> : null}
            {closed ? <div className="gx-card p-6 text-[15px] leading-7 text-slate-700">New orders are paused for now. Please check back soon.</div>
              : !ready || !hydrated ? <div className="gx-card"><GlLoader title="Getting things ready" bar={false} /></div>
              : step === 'site' ? <SiteStep key={siteNonce} site={site} onCheck={checkSite} onNext={() => goStep('competitors')} />
              : step === 'competitors' ? <CompetitorsStep site={site} rivals={rivals} onAdd={addRival} getSignal={() => abort.current.signal} onRemove={(key) => setRivals((l) => l.filter((r) => r.key !== key))} onBack={() => goStep('site')} onNext={toDetails} />
              : step === 'details' ? <DetailsStep form={form} setForm={setFormField} errors={errors} site={site} onBack={() => goStep('competitors')} onNext={toPlan} />
              : <PlanStep service={service} plan={plan} setPlan={setPlan} site={site} rivals={rivals} serverError={serverError} busy={busy} onBack={() => goStep('details')} onPlace={place} />}
          </div>
          <div className="hidden space-y-6 lg:sticky lg:top-24 lg:block">
            <OrderSummary site={site} rivals={rivals} plan={plan} service={service} step={step} desktopOnly />
            <JourneySteps current={step === 'plan' ? 'plan' : step} />
          </div>
        </div>
      </div>
    </PublicPageShell>
  )
}
