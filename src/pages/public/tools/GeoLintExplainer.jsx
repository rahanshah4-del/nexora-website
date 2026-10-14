import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import GeoLintIcon from '../../../components/brand/GeoLintIcon.jsx'
import { GEOLINT_HOW_DURATION, GEOLINT_HOW_POSTER_T, GEOLINT_SCENES } from '../../../lib/geolintHowData.js'

/**
 * GeoLint explainer. Every frame is a pure function of one number, the time `t`
 * in seconds, so the live player, the scrubber and the frame capture used to
 * render the MP4 (scripts/render-geolint-video.mjs) all show identical pictures.
 * The example site is made up: 22.5 + 19.4 + 21 + 17 = 79.9 out of 100.
 */

const W = 1280
const H = 720
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x) => 1 - (1 - clamp(x)) ** 3
const seg = (t, a, b) => clamp((t - a) / (b - a))
const num = (v, d = 0) => v.toFixed(d)

const EXAMPLE = { bots: 22.5, js: 19.4, answer: 21, facts: 17, total: 79.9 }

function sceneIndex(t) {
  const i = GEOLINT_SCENES.findIndex((s) => t >= s.start && t < s.end)
  return i === -1 ? GEOLINT_SCENES.length - 1 : i
}

/** 0 to 1 to 0 envelope so each scene fades in and out at its edges. */
function envelope(t, scene) {
  return Math.min(seg(t, scene.start, scene.start + 0.5), 1 - seg(t, scene.end - 0.45, scene.end))
}

function Card({ className = '', children, style }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.045] ${className}`} style={style}>{children}</div>
}

function Tag({ children, tone = 'sky' }) {
  const tones = {
    sky: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
    emerald: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
    rose: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
    amber: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    violet: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  }
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[15px] font-semibold ${tones[tone]}`}>{children}</span>
}

function SceneHead({ n, title, points, sub }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="font-mono text-[15px] uppercase tracking-[0.2em] text-sky-300">Stage {n}</p>
        <h3 className="mt-1 font-display text-[44px] font-bold leading-tight text-white">{title}</h3>
        {sub ? <p className="mt-1 text-[19px] text-slate-300">{sub}</p> : null}
      </div>
      {points ? <Tag tone="violet">{points} points</Tag> : null}
    </div>
  )
}

/* ───────────── scene 1: the question ───────────── */
function Intro({ s }) {
  const url = 'https://yourbusiness.com'
  const typed = url.slice(0, Math.floor(seg(s, 3.6, 5.6) * url.length))
  const pulse = s > 6 ? 0.5 + 0.5 * Math.sin((s - 6) * 9) : 0
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-24 text-center">
      <p style={{ opacity: ease(seg(s, 0.2, 1.0)), transform: `translateY(${(1 - ease(seg(s, 0.2, 1.0))) * 24}px)` }} className="font-display text-[46px] font-semibold leading-tight text-slate-200">
        People now ask ChatGPT, Claude and Perplexity<br />the questions they used to Google.
      </p>
      <p style={{ opacity: ease(seg(s, 2.0, 3.0)), transform: `translateY(${(1 - ease(seg(s, 2.0, 3.0))) * 24}px)` }} className="mt-8 whitespace-nowrap font-display text-[54px] font-bold leading-[1.05] text-white">
        Can their crawlers <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">read your website?</span>
      </p>
      <div style={{ opacity: ease(seg(s, 3.2, 4.0)) }} className="mt-12 flex w-[760px] items-center gap-4 rounded-2xl border border-white/15 bg-slate-950/70 p-3">
        <div className="flex-1 px-4 text-left font-mono text-[26px] text-white">
          {typed}<span style={{ opacity: s < 5.8 ? (Math.floor(s * 2) % 2 ? 1 : 0.2) : 0 }} className="text-sky-300">|</span>
          {typed.length === 0 ? <span className="text-slate-500">https://example.com/page</span> : null}
        </div>
        <div className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-4 text-[22px] font-semibold text-white" style={{ boxShadow: `0 0 ${20 + pulse * 40}px rgba(99,102,241,${0.3 + pulse * 0.5})` }}>Run free audit</div>
      </div>
    </div>
  )
}

/* ───────────── scene 2: bot access ───────────── */
const BOTS = [
  { name: 'OAI-SearchBot', kind: 'ChatGPT search', ok: true },
  { name: 'ChatGPT-User', kind: 'ChatGPT live answers', ok: true },
  { name: 'Claude-SearchBot', kind: 'Claude search', ok: true },
  { name: 'PerplexityBot', kind: 'Perplexity search', ok: false },
]

function Tick({ ok, p }) {
  if (p <= 0) return <span className="inline-block h-5 w-5 rounded-full border-2 border-slate-600" style={{ borderTopColor: '#7dd3fc', transform: `rotate(${p * 0}deg)` }} />
  return <span style={{ opacity: ease(p), transform: `scale(${0.6 + 0.4 * ease(p)})` }} className={`inline-block text-[26px] font-bold ${ok ? 'text-emerald-400' : 'text-rose-400'}`}>{ok ? '✓' : '✕'}</span>
}

function BotAccess({ s }) {
  const earned = BOTS.reduce((sum, b, i) => sum + (b.ok ? 7.5 : 0) * ease(seg(s, 1.2 + i * 1.0 + 1.0, 1.2 + i * 1.0 + 1.5)), 0)
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <SceneHead n={1} title="Can the AI search bots get in?" points={30} />
      <div className="mt-8 grid grid-cols-[1.35fr_0.65fr] gap-8">
        <Card className="p-5">
          <div className="grid grid-cols-[1fr_130px_130px] items-center gap-x-4 px-3 pb-3 text-[16px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Bot</span><span className="text-center">robots.txt</span><span className="text-center">Server reply</span>
          </div>
          {BOTS.map((b, i) => {
            const a = 1.2 + i * 1.0
            const appear = ease(seg(s, a - 0.3, a))
            const rob = seg(s, a + 0.4, a + 0.8)
            const http = seg(s, a + 1.0, a + 1.4)
            return (
              <div key={b.name} style={{ opacity: appear, transform: `translateX(${(1 - appear) * -30}px)` }} className={`grid grid-cols-[1fr_130px_130px] items-center gap-x-4 rounded-xl px-3 py-2.5 ${!b.ok && http > 0.5 ? 'bg-rose-500/10' : ''}`}>
                <div>
                  <p className="font-mono text-[22px] font-semibold text-white">{b.name}</p>
                  <p className="text-[15px] text-slate-400">{b.kind}</p>
                </div>
                <div className="text-center"><Tick ok p={rob} /></div>
                <div className="text-center">
                  {http > 0 ? <span className={`font-mono text-[22px] font-bold ${b.ok ? 'text-emerald-400' : 'text-rose-400'}`} style={{ opacity: ease(http) }}>{b.ok ? '200' : '403'}</span> : <Tick ok p={0} />}
                </div>
              </div>
            )
          })}
          <p style={{ opacity: ease(seg(s, 6.2, 7)) }} className="mt-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-[17px] leading-7 text-rose-200">
            PerplexityBot is allowed in robots.txt, but the firewall returns 403. GeoLint tests the real reply, not just the file.
          </p>
        </Card>
        <div className="flex flex-col gap-5">
          <Card className="p-6 text-center">
            <p className="text-[16px] uppercase tracking-wider text-slate-400">Bot access, example site</p>
            <p className="mt-2 font-display text-[78px] font-bold tabular-nums leading-none text-white">{num(earned, 1)}<span className="text-[34px] text-slate-400"> / 30</span></p>
          </Card>
          <Card className="p-6 text-[18px] leading-7 text-slate-300">
            <p className="font-semibold text-white">Also checked</p>
            <p style={{ opacity: ease(seg(s, 4.5, 5.3)) }} className="mt-2">A normal browser request tells a bot-only block from a site that is down.</p>
            <p style={{ opacity: ease(seg(s, 6.0, 6.8)) }} className="mt-2">GPTBot and ClaudeBot (training) are reported, not scored.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ───────────── scene 3: JavaScript differential ───────────── */
function Lines({ count, shown, tone }) {
  const widths = [92, 78, 96, 64, 88, 72, 94, 58, 84, 70]
  return (
    <div className="mt-3 space-y-2">
      {widths.slice(0, count).map((w, i) => {
        const on = ease(clamp(shown * count - i))
        return <div key={i} className={`h-3 rounded-full ${tone}`} style={{ width: `${w * on}%`, opacity: 0.25 + 0.75 * on }} />
      })}
    </div>
  )
}

function JsDifferential({ s }) {
  const raw = 1840
  const full = 2830
  const rawShown = ease(seg(s, 0.8, 2.6))
  const fullShown = ease(seg(s, 2.2, 4.4))
  const gap = ease(seg(s, 4.6, 5.8)) * 0.35
  const score = 25 - Math.max(0, gap - 0.2) / 0.4 * 15
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <SceneHead n={2} title="Does the text exist without JavaScript?" points={25} />
      <div className="mt-6 grid grid-cols-2 gap-8">
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="font-display text-[26px] font-semibold text-white">Raw HTML</p><Tag tone="amber">what many AI bots read</Tag></div>
          <Lines count={8} shown={rawShown * 0.62} tone="bg-amber-300/70" />
          <p className="mt-4 font-mono text-[34px] font-bold tabular-nums text-amber-300">{Math.round(raw * rawShown).toLocaleString('en-US')}<span className="text-[20px] text-slate-400"> characters</span></p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><p className="font-display text-[26px] font-semibold text-white">After JavaScript runs</p><Tag tone="sky">what a browser sees</Tag></div>
          <Lines count={8} shown={fullShown} tone="bg-sky-300/70" />
          <p className="mt-4 font-mono text-[34px] font-bold tabular-nums text-sky-300">{Math.round(full * fullShown).toLocaleString('en-US')}<span className="text-[20px] text-slate-400"> characters</span></p>
        </Card>
      </div>
      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between">
          <p className="text-[22px] text-slate-200">Text that only exists after JavaScript: <span className="font-bold text-white tabular-nums">{Math.round(gap * 100)}%</span></p>
          <p style={{ opacity: ease(seg(s, 5.6, 6.4)) }} className="font-display text-[34px] font-bold text-white">{num(score, 1)} <span className="text-[20px] text-slate-400">/ 25</span></p>
        </div>
        <div className="relative mt-4 h-5 rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400" style={{ width: `${gap * 100}%` }} />
          <div className="absolute -top-2 h-9 w-[3px] bg-white/70" style={{ left: '20%' }} />
          <div className="absolute -top-2 h-9 w-[3px] bg-white/70" style={{ left: '60%' }} />
        </div>
        <div className="relative mt-2 h-6 text-[15px] text-slate-400">
          <span className="absolute" style={{ left: '20%', transform: 'translateX(-50%)' }}>20% full points up to here</span>
          <span className="absolute" style={{ left: '60%', transform: 'translateX(-50%)' }}>60% marked client-rendered</span>
        </div>
      </Card>
    </div>
  )
}

/* ───────────── scene 4: answer-first ───────────── */
function AnswerFirst({ s }) {
  const weakIn = ease(seg(s, 0.8, 1.6))
  const strongIn = ease(seg(s, 3.0, 3.8))
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <SceneHead n={3} title="Is the answer easy to quote?" points={25} sub="GeoLint reads the first block under every heading." />
      <div className="mt-8 grid grid-cols-2 gap-8">
        <Card className="p-7" style={{ opacity: weakIn, transform: `translateY(${(1 - weakIn) * 24}px)` }}>
          <p className="font-display text-[28px] font-semibold text-white"># What does the plan cost?</p>
          <p className="mt-4 text-[22px] leading-9 text-slate-300">Welcome to our world of innovation. We are passionate about delivering excellence and a seamless experience for every customer, every day…</p>
          <div style={{ opacity: ease(seg(s, 1.8, 2.6)) }} className="mt-5 flex flex-wrap gap-2"><Tag tone="rose">filler opening</Tag><Tag tone="rose">no number</Tag><Tag tone="rose">no direct answer</Tag></div>
        </Card>
        <Card className="border-emerald-400/30 p-7" style={{ opacity: strongIn, transform: `translateY(${(1 - strongIn) * 24}px)` }}>
          <p className="font-display text-[28px] font-semibold text-white"># What does the plan cost?</p>
          <p className="mt-4 text-[22px] leading-9 text-slate-100">The Pro plan costs <mark className="rounded bg-emerald-400/25 px-1 text-emerald-200">$29 a month</mark> and includes <mark className="rounded bg-emerald-400/25 px-1 text-emerald-200">5 users</mark>, unlimited invoices and email support. There is no setup fee.</p>
          <div style={{ opacity: ease(seg(s, 4.0, 4.8)) }} className="mt-5 flex flex-wrap gap-2"><Tag tone="emerald">direct answer</Tag><Tag tone="emerald">30 to 60 words</Tag><Tag tone="emerald">has numbers</Tag></div>
        </Card>
      </div>
      <p style={{ opacity: ease(seg(s, 5.2, 6)) }} className="mt-8 text-center font-display text-[34px] font-bold text-white">Answer-first content, example site: {num(EXAMPLE.answer, 0)} <span className="text-[20px] text-slate-400">/ 25</span></p>
    </div>
  )
}

/* ───────────── scene 5: facts and structure ───────────── */
function Facts({ s }) {
  const tiles = [
    { name: 'Numbers per 100 words', got: 5, max: 8, tone: 'bg-sky-400', note: '1.3 facts per 100 words' },
    { name: 'Links to other sites', got: 4, max: 4, tone: 'bg-emerald-400', note: '3 outside sources' },
    { name: 'JSON-LD structured data', got: 6, max: 6, tone: 'bg-violet-400', note: 'Organization + Article' },
    { name: 'llms.txt file', got: 2, max: 2, tone: 'bg-fuchsia-400', note: 'found at the site root' },
  ]
  const code = ['{', '  "@type": "Organization",', '  "name": "Your Business",', '  "url": "https://yourbusiness.com"', '}']
  const total = tiles.reduce((sum, t, i) => sum + t.got * ease(seg(s, 0.8 + i * 0.7, 1.8 + i * 0.7)), 0)
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <SceneHead n={4} title="Is there something checkable to quote?" points={20} />
      <div className="mt-8 grid grid-cols-[1.2fr_0.8fr] gap-8">
        <div className="grid gap-3">
          {tiles.map((t, i) => {
            const p = ease(seg(s, 0.8 + i * 0.7, 1.8 + i * 0.7))
            return (
              <Card key={t.name} className="px-5 py-3" style={{ opacity: 0.35 + 0.65 * p }}>
                <div className="flex items-baseline justify-between"><p className="text-[21px] font-semibold text-white">{t.name}</p><p className="font-mono text-[21px] tabular-nums text-slate-200">{num(t.got * p, 1)} / {t.max}</p></div>
                <div className="mt-2 h-3 rounded-full bg-white/10"><div className={`h-full rounded-full ${t.tone}`} style={{ width: `${(t.got / t.max) * p * 100}%` }} /></div>
                <p className="mt-1 text-[15px] text-slate-400">{t.note}</p>
              </Card>
            )
          })}
        </div>
        <div className="flex flex-col gap-5">
          <Card className="whitespace-pre p-5 font-mono text-[19px] leading-8 text-emerald-200">
            {code.map((line, i) => <div key={i} style={{ opacity: ease(seg(s, 2.0 + i * 0.35, 2.4 + i * 0.35)) }}>{line}</div>)}
          </Card>
          <Card className="p-6 text-center">
            <p className="text-[16px] uppercase tracking-wider text-slate-400">Facts and structure, example</p>
            <p className="mt-1 font-display text-[64px] font-bold tabular-nums leading-none text-white">{num(total, 1)}<span className="text-[28px] text-slate-400"> / 20</span></p>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ───────────── scene 6: verification ───────────── */
function Verify({ s }) {
  const items = [
    ['Control request', 'A normal-browser request separates a bot block from a site outage.'],
    ['One retry', 'Every failed request is tried again before it counts.'],
    ['Unverified checks removed', 'If a check cannot be proven, it leaves the points and the maximum, never scored as 0.'],
    ['Lost-render guard', 'If a render crashes, GeoLint reads the raw HTML instead of scoring a blank page.'],
    ['Integrity check', 'Every module is re-added and compared with the total before you see it.'],
  ]
  return (
    <div className="absolute inset-0 px-20 pt-[74px]">
      <SceneHead n={5} title="Then it checks its own work" />
      <div className="mt-6 grid gap-2.5">
        {items.map(([title, text], i) => {
          const a = 0.8 + i * 0.85
          const p = ease(seg(s, a, a + 0.5))
          const tick = ease(seg(s, a + 0.4, a + 0.8))
          return (
            <Card key={title} className="flex items-center gap-5 px-6 py-3" style={{ opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-[26px] font-bold text-emerald-400" style={{ transform: `scale(${0.5 + 0.5 * tick})`, opacity: tick }}>✓</span>
              <div><p className="font-display text-[25px] font-semibold text-white">{title}</p><p className="text-[18px] leading-7 text-slate-300">{text}</p></div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────── scene 7: result ───────────── */
function Ring({ value, size = 300 }) {
  const r = 86
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="12" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="#34d399" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ filter: 'drop-shadow(0 0 10px #34d39988)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[82px] font-bold tabular-nums leading-none text-white">{num(value, 1)}</span>
        <span className="mt-1 text-[20px] text-slate-400">out of 100</span>
      </div>
    </div>
  )
}

function Result({ s }) {
  const value = EXAMPLE.total * ease(seg(s, 0.4, 2.4))
  const rows = [
    ['Bot access', EXAMPLE.bots, 30, 'bg-sky-400'],
    ['JavaScript', EXAMPLE.js, 25, 'bg-amber-400'],
    ['Answer-first', EXAMPLE.answer, 25, 'bg-emerald-400'],
    ['Facts', EXAMPLE.facts, 20, 'bg-violet-400'],
  ]
  const fixes = [
    ['Allow PerplexityBot in the firewall', '+7.5'],
    ['Put product text in the HTML (server-render)', '+5.6'],
  ]
  return (
    <div className="absolute inset-0 px-20 pt-12">
      <div className="grid grid-cols-[360px_1fr] items-center gap-10">
        <div className="flex flex-col items-center">
          <Ring value={value} />
          <p style={{ opacity: ease(seg(s, 2.4, 3)) }} className="mt-3"><Tag tone="emerald">Confidence: High</Tag></p>
        </div>
        <div>
          <h3 className="font-display text-[44px] font-bold text-white">Your score, and what to fix first</h3>
          <div className="mt-5 space-y-3">
            {rows.map(([name, got, max, tone], i) => {
              const p = ease(seg(s, 1.0 + i * 0.3, 2.2 + i * 0.3))
              return (
                <div key={name} className="grid grid-cols-[170px_1fr_100px] items-center gap-4 text-[21px]">
                  <span className="text-slate-200">{name}</span>
                  <div className="h-3 rounded-full bg-white/10"><div className={`h-full rounded-full ${tone}`} style={{ width: `${(got / max) * p * 100}%` }} /></div>
                  <span className="text-right font-mono tabular-nums text-slate-200">{num(got * p, 1)}/{max}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-7 grid grid-cols-[1fr_340px] gap-6">
        <Card className="p-5">
          <p className="text-[16px] font-semibold uppercase tracking-wider text-slate-400">Fix list, ranked by points gained</p>
          {fixes.map(([text, pts], i) => (
            <div key={text} style={{ opacity: ease(seg(s, 3.2 + i * 0.6, 3.9 + i * 0.6)) }} className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.05] px-4 py-3">
              <span className="text-[21px] text-white"><span className="mr-3 font-mono text-slate-400">{i + 1}</span>{text}</span>
              <span className="font-mono text-[22px] font-bold text-emerald-300">{pts}</span>
            </div>
          ))}
        </Card>
        <div style={{ opacity: ease(seg(s, 5.0, 5.8)), transform: `scale(${0.94 + 0.06 * ease(seg(s, 5.0, 5.8))})` }} className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-5 text-center">
          <p className="font-display text-[30px] font-bold text-white">Run it on your site</p>
          <p className="mt-1 text-[18px] text-blue-100">Free · no signup · 20 seconds</p>
          <p className="mt-2 font-mono text-[15px] text-white/90 whitespace-nowrap">nexorasolution.online/tools/geo-audit</p>
        </div>
      </div>
    </div>
  )
}

const SCENE_VIEW = { intro: Intro, bots: BotAccess, javascript: JsDifferential, answer: AnswerFirst, facts: Facts, verify: Verify, result: Result }

/** One frame of the explainer at time t, drawn in a fixed 1280 x 720 space. */
export function ExplainerStage({ t }) {
  const idx = sceneIndex(t)
  const scene = GEOLINT_SCENES[idx]
  const View = SCENE_VIEW[scene.id]
  const fade = clamp(envelope(t, scene))
  return (
    <div className="relative overflow-hidden text-white" style={{ width: W, height: H, background: 'radial-gradient(1100px 600px at 70% -10%, #1e2a78 0%, #0a1230 45%, #050914 100%)' }}>
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <div className="absolute left-14 top-5 z-10 flex items-center gap-3 opacity-90"><GeoLintIcon size={34} /><span className="font-display text-[22px] font-bold tracking-tight">GeoLint</span><span className="text-[15px] text-slate-400">by Nexora</span></div>
      <div className="absolute inset-0" style={{ opacity: fade }}><View s={t - scene.start} /></div>
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 px-14 pb-5">
        {GEOLINT_SCENES.map((sc, i) => (
          <div key={sc.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400" style={{ width: `${(i < idx ? 1 : i === idx ? seg(t, sc.start, sc.end) : 0) * 100}%` }} /></div>
        ))}
      </div>
    </div>
  )
}

const fmt = (t) => `0:${String(Math.floor(t)).padStart(2, '0')}`

/** Player with play/pause, scrubber and chapter buttons. Starts when scrolled into view. */
export default function GeoLintExplainer({ capture = false }) {
  const [t, setT] = useState(GEOLINT_HOW_POSTER_T)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [scale, setScale] = useState(1)
  const wrap = useRef(null)
  const last = useRef(0)
  const raf = useRef(0)
  const autoDone = useRef(false)

  // Fit the fixed 1280 x 720 stage to the container.
  useEffect(() => {
    const el = wrap.current
    if (!el || capture) return undefined
    const fit = () => setScale(el.clientWidth / W)
    fit()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [capture])

  // Frame capture hook for scripts/render-geolint-video.mjs.
  useEffect(() => {
    if (!capture) return undefined
    window.__setT = (value) => { flushSync(() => setT(value)) }
    window.__explainerReady = true
    return () => { delete window.__setT }
  }, [capture])

  useEffect(() => {
    if (!playing) return undefined
    last.current = performance.now()
    const tick = (now) => {
      const dt = (now - last.current) / 1000
      last.current = now
      let ended = false
      setT((prev) => {
        const next = prev + dt
        if (next >= GEOLINT_HOW_DURATION) { ended = true; return GEOLINT_HOW_DURATION - 0.001 }
        return next
      })
      if (ended) setPlaying(false)
      else raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing])

  const play = useCallback((from) => {
    setStarted(true)
    setT((prev) => (typeof from === 'number' ? from : prev >= GEOLINT_HOW_DURATION - 0.5 || !started ? 0 : prev))
    setPlaying(true)
  }, [started])

  // Autoplay once when half of the player is visible, unless the visitor prefers reduced motion.
  useEffect(() => {
    const el = wrap.current
    if (!el || capture || typeof IntersectionObserver !== 'function') return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !autoDone.current) { autoDone.current = true; play(0) }
    }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [capture, play])

  if (capture) return <ExplainerStage t={t} />

  const idx = sceneIndex(t)
  const scene = GEOLINT_SCENES[idx]
  const atRest = !started && !playing
  return (
    <div>
      <div ref={wrap} className="relative w-full overflow-hidden rounded-2xl border border-white/15 shadow-[0_30px_90px_-30px_rgba(79,70,229,0.6)]" style={{ aspectRatio: `${W} / ${H}` }}>
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }} aria-hidden="true">
          <ExplainerStage t={t} />
        </div>
        {atRest ? (
          <button type="button" onClick={() => play(0)} className="absolute inset-0 flex items-center justify-center bg-slate-950/45 transition hover:bg-slate-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
            <span className="flex items-center gap-3 rounded-full bg-white px-7 py-4 font-display text-[16px] font-semibold text-slate-950 shadow-xl sm:text-[18px]">
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true"><path d="M6 4l11 6-11 6z" fill="currentColor" /></svg>
              Watch how GeoLint works · 52 s
            </span>
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => (playing ? setPlaying(false) : play())} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" aria-label={playing ? 'Pause the walkthrough' : t >= GEOLINT_HOW_DURATION - 0.5 ? 'Replay the walkthrough' : 'Play the walkthrough'}>
          {playing
            ? <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" fill="currentColor" /></svg>
            : <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true"><path d="M6 4l11 6-11 6z" fill="currentColor" /></svg>}
        </button>
        <input type="range" min={0} max={GEOLINT_HOW_DURATION} step={0.1} value={t} onChange={(e) => { setStarted(true); setPlaying(false); setT(Number(e.target.value)) }} className="h-2 flex-1 cursor-pointer accent-violet-400" aria-label="Walkthrough position" aria-valuetext={`${fmt(t)} of ${fmt(GEOLINT_HOW_DURATION)}`} />
        <span className="w-[96px] shrink-0 whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-slate-300">{fmt(t)} / {fmt(GEOLINT_HOW_DURATION)}</span>
      </div>
      <p className="mt-3 min-h-[3.5rem] text-[15px] leading-7 text-slate-200"><span className="font-semibold text-sky-300">{scene.title}. </span>{scene.caption}</p>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Chapters">
        {GEOLINT_SCENES.map((sc, i) => (
          <li key={sc.id}>
            <button type="button" onClick={() => { setStarted(true); setT(sc.start + 0.6); setPlaying(false) }} aria-current={i === idx ? 'true' : undefined} className={`min-h-[40px] rounded-full border px-3.5 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${i === idx ? 'border-sky-300 bg-sky-300/15 text-sky-200' : 'border-white/20 text-slate-300 hover:bg-white/10'}`}>
              {i + 1}. {sc.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
