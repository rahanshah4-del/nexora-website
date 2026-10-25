import { useEffect, useRef, useState } from 'react'
import { ACCESS_OPTIONS, PLAN_OPTIONS, optionLabel, planPrice } from '../../../lib/geolintFix.js'
import { chosenFixes } from '../../../lib/geolintBrief.js'
import { PRIORITY_LABELS } from '../../../lib/geolintReport.js'

/**
 * The right half of the order wizard: one picture per step that shows the client's own answers as they
 * type them, and moves while they do. Everything shown is real (their site, their words, their audit);
 * nothing here invents a number. The motion is CSS keyframes (see geolint.css) plus one count-up hook,
 * and it all stops for people who ask their device for reduced motion.
 */

const PRIORITY_DOT = { critical: 'bg-rose-500', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-slate-400' }
const initialOf = (text) => String(text || '?').trim().charAt(0).toUpperCase()
const delay = (ms) => ({ '--d': `${ms}ms` })

/** Eases a number from where it is now to `target`. With reduced motion it jumps straight there. */
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(Number.isFinite(target) ? target : 0)
  const from = useRef(Number.isFinite(target) ? target : 0)
  useEffect(() => {
    if (!Number.isFinite(target)) return undefined
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (now) => {
      const p = reduced ? 1 : Math.min(1, (now - start) / duration)
      const next = a + (target - a) * (1 - (1 - p) ** 3)
      from.current = next
      setValue(next)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

/** True one frame after mount, so a CSS transition has a start and an end to run between. */
function useMounted() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}

function Logo({ profile, size = 'h-10 w-10', text = 'text-[15px]' }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white font-bold text-slate-500 ${text}`}>
      {profile?.logo ? <img src={profile.logo} alt="" className="h-full w-full object-contain p-1" /> : <span aria-hidden="true">{initialOf(profile?.title || profile?.host)}</span>}
    </span>
  )
}

function Skeleton({ className = '' }) {
  return <span className={`gx-shimmer block h-3 rounded-full ${className}`} />
}

function Card({ children, className = '', d = 0 }) {
  return <div style={delay(d)} className={`gx-rise rounded-3xl bg-white p-5 shadow-[0_30px_70px_-40px_rgba(15,23,42,.45)] ring-1 ring-slate-200/70 ${className}`}>{children}</div>
}

function Caption({ title, text }) {
  return (
    <div className="gx-rise mb-7 text-center">
      <h3 className="font-display text-[26px] font-bold leading-tight tracking-tight text-slate-900">{title}</h3>
      {text ? <p className="mx-auto mt-2 max-w-sm text-[14.5px] leading-6 text-slate-500">{text}</p> : null}
    </div>
  )
}

/** A circular score that draws itself from empty and counts up while it does. */
function Ring({ value, label = 'GeoLint score' }) {
  const has = Number.isFinite(value)
  const mounted = useMounted()
  const shown = useCountUp(has ? value : 0, 1200)
  const r = 52
  const c = 2 * Math.PI * r
  const tone = !has ? '#cbd5e1' : value >= 75 ? '#10b981' : value >= 50 ? '#f59e0b' : '#f43f5e'
  const fill = has && mounted ? Math.max(0.02, Math.min(100, value) / 100) : 0
  return (
    <div className="relative grid h-40 w-40 place-items-center" role="img" aria-label={has ? `${label} ${value} out of 100` : `${label} not measured yet`}>
      <span aria-hidden="true" className="gx-radar absolute inset-3 rounded-full" style={{ background: `${tone}22` }} />
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - fill)} style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.2,.7,.2,1), stroke .5s', filter: `drop-shadow(0 0 6px ${tone}66)` }} />
      </svg>
      <span className="text-center"><span className="block font-display text-[44px] font-bold leading-none tabular-nums text-slate-900">{has ? Math.round(shown) : '—'}</span><span className="mt-1 block text-[12px] text-slate-500">{has ? 'out of 100' : 'not measured'}</span></span>
    </div>
  )
}

function SiteVisual({ site }) {
  const p = site.profile
  const scanning = site.status === 'loading' || site.score.status === 'running'
  const score = useCountUp(Number.isFinite(site.score.scorePercent) ? site.score.scorePercent : 0, 1100)
  return (
    <div className="w-full max-w-[34rem]">
      <div className="gx-float">
        <div className="gx-rise relative overflow-hidden rounded-3xl bg-white shadow-[0_40px_90px_-50px_rgba(15,23,42,.55)] ring-1 ring-slate-200/70">
          <div className="flex items-center gap-3 bg-slate-100/80 px-4 py-3">
            <span className="flex gap-1.5" aria-hidden="true"><i className="h-3 w-3 rounded-full bg-[#ff5f57]" /><i className="h-3 w-3 rounded-full bg-[#febc2e]" /><i className="h-3 w-3 rounded-full bg-[#28c840]" /></span>
            <span className="min-w-0 flex-1 truncate rounded-full bg-white px-4 py-1.5 text-[13px] text-slate-600">{p?.host || 'your website'}{!p ? <span className="gx-caret" /> : null}</span>
          </div>
          <div className="relative space-y-5 p-6">
            {p ? (
              <div key={p.host} className="gx-rise flex items-start gap-4">
                <Logo profile={p} size="h-14 w-14" text="text-xl" />
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-bold text-slate-900">{p.title || p.host}</p>
                  <p className="mt-1 line-clamp-3 text-[13.5px] leading-5 text-slate-500">{p.description || 'We read this from your own website.'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3"><Skeleton className="w-full" /><Skeleton className="w-[88%]" /><Skeleton className="w-[62%]" /></div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <div key={i} className="gx-rise rounded-2xl border border-slate-200 p-3" style={delay(250 + i * 110)}><Skeleton className="w-3/4" /><Skeleton className="mt-2.5 w-1/2" /></div>)}
            </div>
            {scanning ? <span aria-hidden="true" className="gx-scan" /> : null}
          </div>
        </div>
      </div>
      {p && Number.isFinite(site.score.scorePercent)
        ? <p key="score" className="gx-rise mt-6 text-center text-[14px] font-semibold text-slate-700">Your GeoLint score today: <span className="tabular-nums text-slate-950">{Math.round(score)}/100</span></p>
        : <p className="mt-6 text-center text-[13.5px] text-slate-500">{p ? 'Checking your score…' : 'We read your name, logo and platform from your site.'}</p>}
    </div>
  )
}

/** A dotted globe whose meridians turn, with a pulsing pin. A picture of "where", not a data map. */
function MarketVisual({ form }) {
  return (
    <div className="w-full max-w-[30rem]">
      <Caption title="Written for the people you want" text="Answers, headings and FAQs use your market and your language." />
      <div className="gx-rise relative mx-auto aspect-square w-full max-w-[22rem]" style={delay(150)}>
        <span aria-hidden="true" className="gx-radar absolute inset-6 rounded-full bg-sky-300/30" />
        <svg viewBox="0 0 300 300" className="relative h-full w-full text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0.1 7" aria-hidden="true">
          <circle cx="150" cy="150" r="140" />
          {[0, 1, 2, 3].map((i) => <ellipse key={i} className="gx-meridian" style={{ '--d': `${-i * 3.5}s` }} cx="150" cy="150" rx="140" ry="140" />)}
          {[-95, -50, 0, 50, 95].map((dy) => <ellipse key={dy} cx="150" cy={150 + dy} rx={Math.sqrt(140 * 140 - dy * dy)} ry={Math.max(6, 28 - Math.abs(dy) / 5)} />)}
        </svg>
        <span className="gx-pop absolute left-[60%] top-[42%] -translate-x-1/2 -translate-y-1/2" style={delay(500)} aria-hidden="true">
          <span className="gx-radar absolute -inset-6 rounded-full bg-orange-400/40" />
          <span className="relative block h-4 w-4 rounded-full bg-orange-500 ring-4 ring-orange-200" />
        </span>
        <span key={`${form.market}|${form.language}`} className="gx-pop absolute left-1/2 top-[12%] max-w-[90%] -translate-x-1/2 truncate rounded-full bg-white px-4 py-1.5 text-[13.5px] font-semibold text-slate-900 shadow-lg ring-1 ring-slate-200">{form.market || 'Worldwide'}<span className="px-1.5 text-slate-300">|</span><span className="font-medium text-slate-500">{form.language || 'English'}</span></span>
      </div>
    </div>
  )
}

function BusinessVisual({ form }) {
  const audience = String(form.audience || '').split(/[,;\n]/).map((a) => a.trim()).filter(Boolean).slice(0, 4)
  return (
    <div className="w-full max-w-[30rem]">
      <Caption title="Every fix stays true to your business" text="We use your words, and we never add claims you did not make." />
      <div className="space-y-4">
        <Card d={150}>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">Your business</p>
          {form.business ? <p className="mt-2 line-clamp-5 text-[14.5px] leading-6 text-slate-800">{form.business}<span aria-hidden="true" className="gx-caret" /></p> : <div className="mt-3 space-y-2.5"><Skeleton className="w-full" /><Skeleton className="w-4/5" /></div>}
        </Card>
        <Card d={300}>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">Who you sell to</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {audience.length ? audience.map((a, i) => <span key={i} className="gx-pop rounded-full bg-orange-50 px-3 py-1.5 text-[13.5px] font-medium text-orange-800 ring-1 ring-orange-200">{a}</span>) : <><Skeleton className="w-28" /><Skeleton className="w-20" /></>}
          </div>
        </Card>
      </div>
    </div>
  )
}

/** You in the middle, rivals on slowly turning rings, a line drawn to each one you add. */
function CompetitorsVisual({ site, rivals }) {
  const spots = [{ x: 14, y: 26 }, { x: 86, y: 30 }, { x: 52, y: 90 }]
  const list = rivals.filter((r) => r.profile).slice(0, 3)
  return (
    <div className="w-full max-w-[30rem]">
      <Caption title="Your rivals are already ranking" text="We score them the same way, so you see exactly where you stand." />
      <div className="gx-rise relative mx-auto aspect-[1/1] w-full max-w-[26rem]" style={delay(150)}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-slate-400" fill="none" stroke="currentColor" strokeWidth="0.35" strokeDasharray="1 1.6" aria-hidden="true">
          <g className="gx-spin" style={{ '--t': '120s' }}><circle cx="50" cy="50" r="46" /></g>
          <g className="gx-spin gx-spin-rev" style={{ '--t': '90s' }}><circle cx="50" cy="50" r="30" /></g>
          <g className="gx-spin" style={{ '--t': '60s' }}><circle cx="50" cy="50" r="16" /></g>
          {list.map((r, i) => <line key={r.key || r.profile.host} x1="50" y1="50" x2={spots[i].x} y2={spots[i].y} pathLength="1" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="1" strokeDashoffset="1" className="gx-draw" style={delay(250)} />)}
        </svg>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white shadow-xl ring-4 ring-orange-100">
            <span aria-hidden="true" className="gx-radar absolute -inset-1 rounded-full bg-orange-300/40" />
            <span aria-hidden="true" className="gx-radar absolute -inset-1 rounded-full bg-orange-300/30" style={delay(1600)} />
            <Logo profile={site.profile} size="h-11 w-11" />
          </span>
          <span className="text-[12.5px] font-bold text-slate-700">You{Number.isFinite(site.score.scorePercent) ? ` · ${site.score.scorePercent}` : ''}</span>
        </div>
        {spots.map((spot, i) => {
          const r = list[i]
          return (
            <div key={r ? r.key || r.profile.host : `empty-${i}`} className="absolute w-28 -translate-x-1/2 -translate-y-1/2" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
              <div className={`${r ? 'gx-pop' : 'gx-rise'} flex flex-col items-center gap-1`} style={delay(r ? 350 : 300 + i * 120)}>
                <span className={`gx-float grid h-12 w-12 place-items-center rounded-full bg-white shadow-lg ring-4 ${r ? 'ring-sky-100' : 'opacity-40 ring-slate-100'}`} style={delay(i * 900)}>{r ? <Logo profile={r.profile} size="h-8 w-8" /> : <span className="text-lg text-slate-400" aria-hidden="true">+</span>}</span>
                <span className="max-w-full truncate text-center text-[12px] font-semibold text-slate-600">{r ? `${r.profile.host}${Number.isFinite(r.score.scorePercent) ? ` · ${r.score.scorePercent}` : ''}` : 'competitor.com'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScopeVisual({ form, choices, site }) {
  const kept = chosenFixes(choices, form.fixOff)
  const room = Number.isFinite(site.score.scorePercent) ? Math.max(0, 100 - site.score.scorePercent) : Infinity
  // each fix is measured on its own, so their sum can pass the room that is left; never show more than 100 in total
  const gain = Math.round(Math.min(room, kept.reduce((sum, c) => sum + (c.upTo || 0), 0)) * 10) / 10
  const count = useCountUp(kept.length, 500)
  return (
    <div className="w-full max-w-[30rem]">
      <Caption title="You decide what we touch" text="Anything you untick stays exactly as it is." />
      <Card className="space-y-5" d={150}>
        {choices.length ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <p><span className="font-display text-5xl font-bold tabular-nums text-slate-900">{Math.round(count)}</span><span className="ml-2 text-[15px] text-slate-500">of {choices.length} fixes</span></p>
              {gain > 0 ? <p key={gain} className="gx-pop rounded-full bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200">up to +{gain} points</p> : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out" style={{ width: `${(kept.length / choices.length) * 100}%` }} /></div>
            <ul className="space-y-2.5">
              {kept.slice(0, 4).map((c, i) => <li key={c.id} className="gx-rise flex items-start gap-2.5 text-[13.5px] leading-5 text-slate-700" style={delay(300 + i * 90)}><span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[c.priority]}`} /><span className="min-w-0"><span className="block truncate">{c.title}</span><span className="text-[12px] text-slate-400">{PRIORITY_LABELS[c.priority].label}</span></span></li>)}
              {kept.length > 4 ? <li className="pl-4 text-[13px] text-slate-400">and {kept.length - 4} more</li> : null}
            </ul>
          </>
        ) : (
          <p className="text-[14.5px] leading-6 text-slate-600">We run the audit on your site first, then fix everything it finds.</p>
        )}
      </Card>
    </div>
  )
}

function AccessVisual({ form }) {
  return (
    <div className="w-full max-w-[28rem]">
      <Caption title="Access, the safe way" text="You stay in control from the first minute to the last." />
      <Card className="space-y-5" d={150}>
        <div className="flex justify-center">
          <span className="gx-glow gx-float grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" pathLength="1" className="gx-draw" style={delay(600)} /></svg>
          </span>
        </div>
        {[
          ['No passwords, ever', 'We only work through an invite.'],
          ['You can remove us any time', 'Take our access away when the work is done.'],
          ['Every change is written down', 'You get a short summary of what we changed.'],
        ].map(([t, d], i) => (
          <div key={t} className="gx-rise flex items-start gap-3" style={delay(350 + i * 160)}>
            <span aria-hidden="true" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className="gx-draw" style={delay(550 + i * 160)} /></svg></span>
            <span><span className="block text-[15px] font-semibold text-slate-900">{t}</span><span className="block text-[13.5px] leading-5 text-slate-500">{d}</span></span>
          </div>
        ))}
        <p key={form.accessMethod} className="gx-pop rounded-2xl bg-slate-50 px-4 py-3 text-[13.5px] text-slate-600">Your choice: <strong className="text-slate-900">{optionLabel(ACCESS_OPTIONS, form.accessMethod)}</strong></p>
      </Card>
    </div>
  )
}

function PlanVisual({ site, plan, service }) {
  const chosen = PLAN_OPTIONS.find((p) => p.value === plan) || PLAN_OPTIONS[0]
  const price = useCountUp(planPrice(service, plan), 600)
  return (
    <div className="w-full max-w-[30rem]">
      <Caption title="Be readable for AI search" text="We run the audit again afterwards and show you the real before and after. We never promise a number." />
      <Card className="flex flex-col items-center gap-5" d={150}>
        <Ring value={site.score.scorePercent} />
        <div className="w-full border-t border-slate-200 pt-4">
          <p className="flex items-baseline justify-between gap-3"><span key={plan} className="gx-pop text-[15px] font-bold text-slate-900">{chosen.label}</span><span className="font-display text-2xl font-bold tabular-nums text-slate-900">${Math.round(price)}</span></p>
          <ul key={plan} className="mt-3 space-y-2">
            {chosen.features.slice(0, 4).map((f, i) => <li key={f} className="gx-rise flex gap-2.5 text-[13.5px] leading-5 text-slate-600" style={delay(250 + i * 110)}><span aria-hidden="true" className="font-black text-emerald-600">✓</span><span>{f}</span></li>)}
          </ul>
        </div>
      </Card>
    </div>
  )
}

/** The grey, gridded half of the screen. Hidden on phones, where the form has the whole screen. */
export default function StepVisual({ step, site, rivals, form, choices, plan, service }) {
  let body
  if (step === 'site') body = <SiteVisual site={site} />
  else if (step === 'market') body = <MarketVisual form={form} />
  else if (step === 'business') body = <BusinessVisual form={form} />
  else if (step === 'competitors') body = <CompetitorsVisual site={site} rivals={rivals} />
  else if (step === 'scope') body = <ScopeVisual form={form} choices={choices} site={site} />
  else if (step === 'details') body = <AccessVisual form={form} />
  else body = <PlanVisual site={site} plan={plan} service={service} />
  return (
    <div aria-hidden="true" className="relative hidden items-center justify-center overflow-hidden bg-[#f3f4f2] px-10 py-12 lg:sticky lg:top-0 lg:flex lg:h-[calc(100vh-4rem)] lg:self-start lg:rounded-bl-[7rem]" style={{ backgroundImage: 'linear-gradient(#e7e9e5 1px, transparent 1px), linear-gradient(90deg, #e7e9e5 1px, transparent 1px)', backgroundSize: '44px 44px' }}>
      <div key={step} className="gx-visual-in flex w-full justify-center">{body}</div>
    </div>
  )
}
