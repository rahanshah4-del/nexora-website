import { useEffect, useRef, useState } from 'react'
import { ACCESS_OPTIONS, PLAN_OPTIONS, optionLabel, planPrice } from '../../../lib/geolintFix.js'
import { chosenFixes } from '../../../lib/geolintBrief.js'
import { PRIORITY_LABELS } from '../../../lib/geolintReport.js'
import Globe from './GeoLintGlobe.jsx'

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
    <div className="gx-cap gx-rise mb-7 text-center">
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
        <circle cx="60" cy="60" r={r} fill="none" className="gx-ring-track" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - fill)} style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.2,.7,.2,1), stroke .5s', filter: `drop-shadow(0 0 6px ${tone}66)` }} />
      </svg>
      <span className="text-center"><span className="block font-display text-[44px] font-bold leading-none tabular-nums text-slate-900">{has ? Math.round(shown) : '—'}</span><span className="mt-1 block text-[12px] text-slate-500">{has ? 'out of 100' : 'not measured'}</span></span>
    </div>
  )
}

/** A Mac browser window: traffic lights, one tab with the site's icon and name, toolbar with a lock and the address. */
function BrowserFrame({ profile, scanning, children }) {
  const host = profile?.host || 'your website'
  return (
    <div className="gx-rise relative overflow-hidden rounded-xl gx-bframe shadow-[0_40px_90px_-40px_rgba(15,23,42,.6)] ring-1 ring-slate-300/80">
      <div className="gx-bchrome flex items-end gap-3 pl-3.5 pr-3 pt-2.5">
        <span className="mb-3 flex gap-2" aria-hidden="true"><i className="h-3 w-3 rounded-full bg-[#ff5f57] ring-1 ring-black/10" /><i className="h-3 w-3 rounded-full bg-[#febc2e] ring-1 ring-black/10" /><i className="h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-black/10" /></span>
        <span className="relative flex h-9 min-w-0 max-w-[15rem] flex-1 items-center gap-2 gx-btab rounded-t-[10px] px-3 text-[12.5px]">
          <span className="grid h-4 w-4 shrink-0 place-items-center overflow-hidden rounded-[4px] bg-slate-100 text-[9px] font-bold text-slate-500">{profile?.logo ? <img src={profile.logo} alt="" className="h-full w-full object-contain" /> : <span aria-hidden="true">{initialOf(profile?.title || host)}</span>}</span>
          <span className="min-w-0 flex-1 truncate">{profile?.title || host}</span>
          <span aria-hidden="true" className="text-[15px] leading-none text-slate-400">×</span>
        </span>
        <span aria-hidden="true" className="mb-1.5 grid h-6 w-6 place-items-center rounded-full text-[17px] leading-none text-slate-500">+</span>
      </div>
      <div className="gx-bbar flex items-center gap-2.5 border-b px-3 py-2">
        <span aria-hidden="true" className="flex gap-3.5 text-[15px] text-slate-400"><span>←</span><span>→</span><span className={scanning ? 'gx-spin-slow inline-block' : ''}>↻</span></span>
        <span className="flex min-w-0 flex-1 items-center gap-2 gx-burl rounded-full px-3.5 py-1.5 text-[13px]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-slate-500" fill="currentColor" aria-hidden="true"><path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" /></svg>
          <span className="min-w-0 truncate">{host}{!profile ? <span className="gx-caret" /> : null}</span>
        </span>
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

function SiteVisual({ site }) {
  const p = site.profile
  const scanning = site.status === 'loading' || site.score.status === 'running'
  const score = useCountUp(Number.isFinite(site.score.scorePercent) ? site.score.scorePercent : 0, 1100)
  return (
    <div className="w-full max-w-[36rem]">
      <div className="gx-float">
        <BrowserFrame profile={p} scanning={scanning}>
          <div className="relative space-y-5 overflow-hidden p-6">
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
        </BrowserFrame>
      </div>
      {p && Number.isFinite(site.score.scorePercent)
        ? <p key="score" className="gx-rise mt-6 text-center text-[14px] font-semibold text-slate-700">Your GeoLint score today: <span className="tabular-nums text-slate-950">{Math.round(score)}/100</span></p>
        : <p className="mt-6 text-center text-[13.5px] text-slate-500">{p ? 'Checking your score…' : 'We read your name, logo and platform from your site.'}</p>}
    </div>
  )
}

/** The real world as a dotted globe: turns to the chosen country and lights it up. */
function MarketVisual({ form }) {
  return (
    <div className="w-full max-w-[30rem]">
      <Caption title="Written for the people you want" text="Answers, headings and FAQs use your market and your language." />
      <div className="gx-rise relative mx-auto w-full max-w-[24rem]" style={delay(150)}>
        <Globe market={form.market} size={380} />
        <span key={`${form.market}|${form.language}`} className="gx-pop absolute left-1/2 top-[3%] max-w-[90%] -translate-x-1/2 truncate rounded-full bg-white px-4 py-1.5 text-[13.5px] font-semibold text-slate-900 shadow-lg ring-1 ring-slate-200">{form.market || 'Worldwide'}<span className="px-1.5 text-slate-300">|</span><span className="font-medium text-slate-500">{form.language || 'English'}</span></span>
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

/** One line of the leaderboard: logo, name, a bar that grows to the real score, and the score counting up. */
function RankRow({ entry, rank, lead, d }) {
  const on = useMounted()
  const has = Number.isFinite(entry.score)
  const shown = useCountUp(has ? entry.score : 0, 1000)
  const tone = !has ? '#cbd5e1' : entry.score >= 75 ? '#10b981' : entry.score >= 50 ? '#f59e0b' : '#f43f5e'
  return (
    <li className={`gx-rise relative rounded-2xl p-3.5 ${entry.you ? 'bg-orange-50/80 ring-1 ring-orange-200' : 'bg-white ring-1 ring-slate-200/80'}`} style={delay(d)}>
      <div className="flex items-center gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold tabular-nums ${lead && rank === 1 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{has ? rank : '·'}</span>
        <Logo profile={entry.profile} size="h-9 w-9" text="text-[13px]" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-[14px] font-bold text-slate-900"><span className="truncate">{entry.profile?.title || entry.profile?.host}</span>{entry.you ? <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">You</span> : null}</p>
          <p className="truncate text-[12px] text-slate-400">{entry.profile?.host}</p>
        </div>
        <p className="shrink-0 text-right"><span className="font-display text-[24px] font-bold tabular-nums leading-none text-slate-900">{has ? Math.round(shown) : '—'}</span><span className="block text-[11px] text-slate-400">{has ? '/ 100' : 'checking…'}</span></p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        {has ? <div className="h-full rounded-full" style={{ width: on ? `${Math.max(3, entry.score)}%` : '0%', background: `linear-gradient(90deg, ${tone}99, ${tone})`, transition: 'width 1.2s cubic-bezier(.2,.7,.2,1)' }} /> : <div className="gx-shimmer h-full w-1/3 rounded-full" />}
      </div>
    </li>
  )
}

/** A live leaderboard: you and the rivals you add, scored the same way, with the gap spelled out. */
function CompetitorsVisual({ site, rivals }) {
  const me = site.profile ? { you: true, key: 'you', profile: site.profile, score: site.score.scorePercent } : null
  const others = rivals.filter((r) => r.profile).slice(0, 3).map((r) => ({ key: r.key || r.profile.host, profile: r.profile, score: r.score.scorePercent }))
  const rows = [me, ...others].filter(Boolean)
  rows.sort((a, b) => (Number.isFinite(b.score) ? b.score : -1) - (Number.isFinite(a.score) ? a.score : -1))
  const empty = Math.max(0, 3 - others.length)
  const best = others.filter((o) => Number.isFinite(o.score)).sort((a, b) => b.score - a.score)[0]
  const mine = me && Number.isFinite(me.score) ? me.score : null
  const gap = best && mine !== null ? Math.round((best.score - mine) * 10) / 10 : null
  const place = mine !== null ? rows.filter((r) => Number.isFinite(r.score)).findIndex((r) => r.you) + 1 : 0
  const scored = rows.filter((r) => Number.isFinite(r.score)).length
  return (
    <div className="w-full max-w-[30rem]">
      <Caption title="Your rivals are already ranking" text="We score them the same way, so you see exactly where you stand." />
      <div className="gx-rise rounded-[1.75rem] bg-white/60 p-3 shadow-[0_40px_90px_-50px_rgba(15,23,42,.5)] ring-1 ring-slate-200/70 backdrop-blur" style={delay(120)}>
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">AI-search leaderboard</p>
          {place && scored > 1 ? <p key={`${place}/${scored}`} className="gx-pop rounded-full bg-slate-900 px-2.5 py-1 text-[11.5px] font-semibold text-white">You are #{place} of {scored}</p> : null}
        </div>
        <ul className="space-y-2.5">
          {rows.map((r, i) => <RankRow key={r.key} lead={scored > 1} entry={r} rank={rows.filter((x) => Number.isFinite(x.score)).indexOf(r) + 1} d={200 + i * 110} />)}
          {Array.from({ length: empty }, (_, i) => (
            <li key={`empty-${i}`} className="gx-rise flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-3.5 opacity-70" style={delay(200 + (rows.length + i) * 110)}>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[15px] text-slate-400">+</span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-300">?</span>
              <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold text-slate-500">competitor.com</p><div className="mt-2 h-2 rounded-full bg-slate-100" /></div>
            </li>
          ))}
        </ul>
      </div>
      <p key={gap === null ? 'none' : String(gap)} className="gx-rise mt-5 text-center text-[14px] leading-6 text-slate-600">
        {gap === null ? 'Add up to 3 rivals to see where you stand.' : gap > 0 ? <><strong className="text-slate-900">{best.profile.host}</strong> scores <strong className="text-rose-600">{gap} points</strong> above you today.</> : <>You are ahead of every rival you added. <strong className="text-emerald-700">Keep it that way.</strong></>}
      </p>
    </div>
  )
}

/** What the fixes are worth: today's score, the room above it, and every fix with its weight. Untick one and it drops out. */
function ScopeVisual({ form, choices, site }) {
  const on = useMounted()
  const kept = chosenFixes(choices, form.fixOff)
  const now = Number.isFinite(site.score.scorePercent) ? site.score.scorePercent : null
  const room = now !== null ? Math.max(0, 100 - now) : Infinity
  // each fix is measured on its own, so their sum can pass the room that is left; never show more than 100 in total
  const gain = Math.round(Math.min(room, kept.reduce((sum, c) => sum + (c.upTo || 0), 0)) * 10) / 10
  const count = useCountUp(kept.length, 500)
  const gainShown = useCountUp(gain, 700)
  const after = now !== null ? Math.min(100, now + gain) : null
  const levels = ['critical', 'high', 'medium', 'low'].map((p) => ({ p, n: kept.filter((c) => c.priority === p).length })).filter((l) => l.n)
  return (
    <div className="w-full max-w-[30rem]">
      <Caption title="You decide what we touch" text="Anything you untick stays exactly as it is." />
      <Card className="space-y-5" d={150}>
        {choices.length ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <p><span className="font-display text-5xl font-bold tabular-nums text-slate-900">{Math.round(count)}</span><span className="ml-2 text-[15px] text-slate-500">of {choices.length} fixes</span></p>
              {gain > 0 ? <p key={gain} className="gx-pop rounded-full bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200">up to +{Math.round(gainShown * 10) / 10} points</p> : null}
            </div>
            {now !== null ? (
              <div>
                <div className="relative h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-300/70" style={{ width: on ? `${after}%` : '0%', transition: 'width 1s cubic-bezier(.2,.7,.2,1)' }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-slate-700 to-slate-900" style={{ width: on ? `${now}%` : '0%', transition: 'width 1.2s cubic-bezier(.2,.7,.2,1)' }} />
                </div>
                <div className="mt-2 flex justify-between text-[12.5px] text-slate-500"><span>Today <strong className="tabular-nums text-slate-900">{Math.round(now)}</strong></span><span>With these fixes <strong className="tabular-nums text-emerald-700">up to {Math.round(after)}</strong></span></div>
              </div>
            ) : <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out" style={{ width: `${(kept.length / choices.length) * 100}%` }} /></div>}
            {levels.length ? <div className="flex flex-wrap gap-2">{levels.map((l) => <span key={l.p} className="gx-pop inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${PRIORITY_DOT[l.p]}`} />{l.n} {PRIORITY_LABELS[l.p].label}</span>)}</div> : null}
            <ul className="space-y-1">
              {choices.slice(0, 6).map((c, i) => {
                const off = (form.fixOff || []).includes(c.id)
                return (
                  <li key={c.id} className={`gx-rise flex items-center gap-3 rounded-xl px-2 py-2 text-[13.5px] leading-5 transition-opacity ${off ? 'opacity-40' : ''}`} style={delay(300 + i * 80)}>
                    <span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[12px] font-black ${off ? 'bg-slate-100 text-slate-300' : 'bg-emerald-100 text-emerald-700'}`}>{off ? '' : '✓'}</span>
                    <span className={`min-w-0 flex-1 truncate ${off ? 'line-through' : 'text-slate-800'}`}>{c.title}</span>
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[c.priority]}`} />
                    {c.upTo ? <span className="w-12 shrink-0 text-right text-[12px] font-semibold tabular-nums text-slate-500">+{c.upTo}</span> : null}
                  </li>
                )
              })}
              {choices.length > 6 ? <li className="pl-2 pt-1 text-[13px] text-slate-400">and {choices.length - 6} more</li> : null}
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

function stepBody({ step, site, rivals, form, choices, plan, service }) {
  if (step === 'site') return <SiteVisual site={site} />
  if (step === 'market') return <MarketVisual form={form} />
  if (step === 'business') return <BusinessVisual form={form} />
  if (step === 'competitors') return <CompetitorsVisual site={site} rivals={rivals} />
  if (step === 'scope') return <ScopeVisual form={form} choices={choices} site={site} />
  if (step === 'details') return <AccessVisual form={form} />
  return <PlanVisual site={site} plan={plan} service={service} />
}

/** The grey, gridded half of the screen. Hidden on phones, which get the smaller MobileStage above their form instead. */
export default function StepVisual(props) {
  return (
    <div aria-hidden="true" className="gx-panel relative hidden items-center justify-center overflow-hidden px-10 py-12 lg:sticky lg:top-0 lg:flex lg:h-[calc(100vh-4rem)] lg:self-start lg:rounded-bl-[7rem]">
      <div key={props.step} className="gx-visual-in flex w-full justify-center">{stepBody(props)}</div>
    </div>
  )
}

/** How big each picture is drawn on a phone (scale) and how tall its stage is. The picture is the same live one as on the desktop. */
const MOBILE_STAGE = { site: { s: 0.7, h: 252 }, market: { s: 0.62, h: 238 }, business: { s: 0.78, h: 214 }, competitors: { s: 0.62, h: 264 }, scope: { s: 0.64, h: 262 }, details: { s: 0.66, h: 238 }, plan: { s: 0.6, h: 262 } }

/** A small animated stage that sits above the form on phones: the same picture as the desktop side, scaled to fit. */
export function MobileStage(props) {
  const m = MOBILE_STAGE[props.step] || MOBILE_STAGE.site
  return (
    <div aria-hidden="true" className="gx-panel gx-mini relative mb-6 overflow-hidden rounded-3xl ring-1 ring-slate-200/70 lg:hidden" style={{ height: m.h }}>
      <div key={props.step} className="gx-visual-in absolute left-1/2 top-1/2 w-[30rem]" style={{ transform: `translate(-50%, -50%) scale(${m.s})` }}>{stepBody(props)}</div>
    </div>
  )
}
