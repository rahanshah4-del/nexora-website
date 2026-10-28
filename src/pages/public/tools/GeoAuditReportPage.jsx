import SpeedPanel, { SpeedCard } from './GeoLintSpeedPanel.jsx'
import { SPEED_SECTION_ID, useSpeedTest } from './geolintSpeedHooks.js'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { GEOLINT_API_URL, collectFindings, moduleLabel } from '../../../lib/geolint.js'
import { GEOLINT_PATH, GEOLINT_REPORT_PATH } from '../../../lib/geolintLaunch.js'
import { CONFIDENCE_LABELS, LEVEL_LABELS, PRIORITY_LABELS, buildOverview, domainTiles, gradeFor, hostLabel, isValidReport, issueLabel, loadReport, solutionSteps, strengthOf, summarizeReport, verdictInfo, verifyReportClient } from '../../../lib/geolintReport.js'
import PublicPageShell from '../PublicPageShell.jsx'
import { BadgePanel } from './GeoLintExtras.jsx'
import { CitationPanel, WatchPanel } from './GeoLintWatch.jsx'
import { FixFloat } from './GeoLintFixShared.jsx'
import { FixAllPromptPanel, FixPromptRow } from './GeoLintFixPrompt.jsx'
import SiteAuditPanel from './GeoLintSite.jsx'
import GeoLintGate from './GeoLintGate.jsx'
import PageHealthPanel from './GeoLintHealth.jsx'
import WordPressFixPanel, { WpMark } from './GeoLintWordPress.jsx'
import { wordpressGuidePath } from '../../../lib/geolintWordPress.js'
import { ChartCard, DonutChart, ScoreBars, SegmentBar, WinBackBars } from './GeoLintCharts.jsx'
import { GrowBar, Pill, ScoreRing } from './GeoLintVisuals.jsx'
import { toneText } from './geolintHooks.js'
import './geolint.css'

const subscribeNever = () => () => {}
const MODULE_KEYS = ['botAccess', 'jsDifferential', 'bluf', 'facts']
const MODULE_BLURB = {
  botAccess: 'Can the search bots fetch this page: robots.txt and a live request as each bot.',
  jsDifferential: 'How much of the text is already in the HTML, before any JavaScript runs.',
  bluf: 'Whether each H2 and H3 opens with a direct answer. A heuristic, not a proven rule.',
  facts: 'Numbers, outside sources, structured data and llms.txt.',
}

function Section({ title, hint, children, delay = 0, id }) {
  return (
    <section id={id} className="gl-reveal mt-10 scroll-mt-24" style={{ '--d': `${delay}s` }}>
      <h2 className="font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
      {hint ? <p className="mt-1 text-[14px] leading-6 text-slate-500">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-950">{value}</p>
      {sub ? <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p> : null}
    </div>
  )
}

function ModuleCard({ id, mod, index, excluded }) {
  const unavailable = mod.status === 'unavailable' || excluded
  const s = strengthOf(mod.score, mod.maxScore, mod.status)
  return (
    <li className="gl-card gl-reveal p-5" style={{ '--d': `${0.1 + index * 0.08}s` }}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-[15px] font-semibold text-slate-900">{moduleLabel(id)}</h2>
        <Pill tone={s.tone}>{s.label}</Pill>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums text-slate-950">
        {unavailable ? '–' : mod.score}<span className="text-base font-medium text-slate-400"> / {mod.maxScore}</span>
      </p>
      <div className="mt-3"><GrowBar ratio={s.ratio ?? 0} tone={s.tone} delay={0.3 + index * 0.1} /></div>
      <p className="mt-3 text-[13px] leading-5 text-slate-500">{MODULE_BLURB[id]}</p>
      {excluded ? <p className="mt-2 text-[12px] leading-5 text-slate-500">Not counted: the page could not be loaded for any visitor.</p> : null}
      {id === 'botAccess' && mod.maxScore < 30 && !unavailable ? <p className="mt-2 text-[12px] leading-5 text-slate-500">Scored out of {mod.maxScore}: part of this check could not be verified.</p> : null}
    </li>
  )
}

function BotCard({ bot }) {
  const verdict = verdictInfo(bot.http?.verdict)
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-[15px] font-semibold text-slate-900">{bot.bot}</p>
        <Pill tone={bot.scored ? 'emerald' : 'slate'}>{bot.scored ? 'Search · scored' : 'Training · not scored'}</Pill>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
        <div><dt className="text-slate-500">robots.txt</dt><dd className="mt-1"><Pill tone={bot.robots?.allowed ? 'emerald' : 'rose'}>{bot.robots?.allowed ? 'Allowed' : 'Blocked'}</Pill></dd></div>
        <div><dt className="text-slate-500">Live request</dt><dd className="mt-1"><Pill tone={verdict.tone}>{verdict.label}{bot.http?.status ? ` · ${bot.http.status}` : ''}</Pill></dd></div>
      </dl>
      {bot.http?.attribution === 'bot_specific' ? <p className="mt-3 text-[12.5px] leading-5 text-rose-700">A normal browser gets through, so this block targets bots (confirmed).</p> : null}
      {bot.http?.attribution === 'site_wide' ? <p className="mt-3 text-[12.5px] leading-5 text-amber-700">A normal browser fails too: the page itself is the problem.</p> : null}
      {bot.http?.verified === false ? <p className="mt-3 text-[12.5px] leading-5 text-slate-500">Could not be verified, so it is not counted in the score.</p> : null}
    </li>
  )
}

function HeadingRow({ h }) {
  const ratio = h.points
  const tone = ratio >= 0.85 ? 'emerald' : ratio >= 0.5 ? 'amber' : 'rose'
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[14px] font-medium text-slate-900"><span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">H{h.level}</span>{h.text}</p>
        <span className={`shrink-0 text-[13px] font-semibold tabular-nums ${tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-rose-600'}`}>{Math.round(ratio * 100)}%</span>
      </div>
      <div className="mt-2"><GrowBar ratio={ratio} tone={tone} className="h-1.5" /></div>
      {h.issues?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{h.issues.map((code) => <Pill key={code} tone="amber">{issueLabel(code)}</Pill>)}</div> : null}
    </li>
  )
}

function CopyBlock({ snippet }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <span className="min-w-0 truncate text-[12px] font-medium text-slate-300">{snippet.label}</span>
        <button type="button" onClick={copy} className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre tabIndex={0} aria-label="Code you can copy" className="max-h-64 overflow-auto p-3 text-[12px] leading-5 text-slate-100"><code>{snippet.code}</code></pre>
    </div>
  )
}

function FixCard({ item, index, report }) {
  const priority = PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.medium
  const conf = CONFIDENCE_LABELS[item.confidence] || CONFIDENCE_LABELS.heuristic
  const steps = solutionSteps(item)
  return (
    <li id={`fix-${item.id}`} className="gl-card scroll-mt-28 p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 font-display text-sm font-bold text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={priority.tone}>{priority.label}</Pill>
            <span title={conf.hint}><Pill tone={conf.tone}>{conf.label}</Pill></span>
            <span className="text-[12px] font-semibold text-slate-500">{moduleLabel(item.module)}</span>
            {item.upTo > 0 ? <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-emerald-700 ring-1 ring-emerald-200">up to +{item.upTo} pts</span> : null}
          </div>
          <h3 className="mt-2 font-display text-[16px] font-semibold leading-snug text-slate-950">{item.title}</h3>
          <p className="mt-1 text-[14px] leading-6 text-slate-600">{item.problem}</p>
          {item.evidence?.length ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">What we measured</p>
              <ul className="mt-1.5 space-y-1 text-[13px] leading-5 text-slate-700">{item.evidence.map((e) => <li key={e} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" /><span>{e}</span></li>)}</ul>
            </div>
          ) : null}
          <div className="mt-3 rounded-xl bg-emerald-50/70 p-3.5 ring-1 ring-emerald-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Solution: how to fix it</p>
            <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-[14px] leading-6 text-slate-700">{steps.map((st) => <li key={st}>{st}</li>)}</ol>
          </div>
          {item.snippet ? <CopyBlock snippet={item.snippet} /> : null}
          {item.verify ? <p className="mt-3 break-words text-[12.5px] leading-5 text-slate-500"><span className="font-semibold text-slate-600">Check it worked:</span> <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-700">{item.verify}</code></p> : null}
          <FixPromptRow item={item} report={report} number={index + 1} />
        </div>
      </div>
    </li>
  )
}


const FILE_TYPES = { text: 'text/plain', markdown: 'text/markdown', html: 'text/html' }

/** Files built from the audited page: pick one, copy it or download it. */
function FixPackPanel({ pack }) {
  const files = Array.isArray(pack?.files) ? pack.files.filter((f) => f && typeof f.code === 'string') : []
  const [active, setActive] = useState(() => (files.find((f) => f.needed) || files[0] || {}).id)
  if (!files.length) return null
  const file = files.find((f) => f.id === active) || files[0]
  const needed = files.filter((f) => f.needed).length
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([file.code], { type: `${FILE_TYPES[file.lang] || 'text/plain'};charset=utf-8` }))
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename || 'geolint-fix.txt'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { /* download is a convenience; copy still works */ }
  }
  return (
    <div className="gl-card overflow-hidden">
      <div role="tablist" aria-label="Fix Pack files" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2">
        {files.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={f.id === file.id} onClick={() => setActive(f.id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${f.id === file.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-white'}`}>
            {f.label}
            {f.needed ? <span className={`h-2 w-2 rounded-full ${f.id === file.id ? 'bg-amber-300' : 'bg-amber-500'}`} title="Needed on this page" /> : null}
          </button>
        ))}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={file.needed ? 'amber' : 'emerald'}>{file.needed ? 'Needed on this page' : 'Already in place or optional'}</Pill>
          <span className="text-[12.5px] font-semibold text-slate-500">{file.where}</span>
        </div>
        <p className="mt-2 text-[14px] leading-6 text-slate-600">{file.note}</p>
        <CopyBlock snippet={{ label: file.filename, code: file.code }} />
        <button type="button" onClick={download} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-4 text-[13.5px] font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Download {file.filename}</button>
        <p className="mt-3 text-[12.5px] leading-5 text-slate-500">{needed ? `${needed} of ${files.length} files are needed on this page.` : 'Nothing here is required for this page.'} Review each file before you publish it: it is built from what this page says, not from your private data.</p>
      </div>
    </div>
  )
}

const TILE_TEXT = { emerald: 'text-emerald-600', amber: 'text-amber-600', orange: 'text-orange-600', rose: 'text-rose-600', slate: 'text-slate-950' }

function DomainCard({ domain }) {
  const tiles = domainTiles(domain)
  if (!tiles.length) return null
  const reg = domain.registration || {}
  const extra = [
    reg.nameServers?.length ? `Name servers: ${reg.nameServers.join(', ')}` : '',
    reg.state === 'ok' && reg.dnssec !== null ? `DNSSEC ${reg.dnssec ? 'on' : 'off'}` : '',
  ].filter(Boolean)
  return (
    <div className="gl-card p-5">
      <p className="text-[13px] leading-5 text-slate-500">Facts about <span className="font-semibold text-slate-700">{domain.domain}</span>. Information only: these never change the score.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${TILE_TEXT[t.tone] || TILE_TEXT.slate}`}>{t.value}</p>
            {t.sub ? <p className="mt-0.5 text-[12px] leading-5 text-slate-500">{t.sub}</p> : null}
          </div>
        ))}
      </div>
      {extra.length ? <p className="mt-3 break-words text-[12.5px] leading-5 text-slate-500">{extra.join(' · ')}</p> : null}
      {domain.notes?.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[12.5px] leading-5 text-slate-500">{domain.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      ) : null}
    </div>
  )
}

function TrustPanel({ report, check }) {
  const [open, setOpen] = useState(false)
  const conf = report.confidence
  const level = LEVEL_LABELS[conf?.level]
  const serverOk = report.integrity ? report.integrity.verified : null
  const allOk = check.verified && serverOk !== false
  return (
    <div className="gl-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${allOk ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden="true">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{allOk ? <path d="M4.5 10.5l3.5 3.5 7.5-8" /> : <path d="M6 6l8 8M14 6l-8 8" />}</svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-semibold text-slate-950">{allOk ? 'Calculation verified' : 'Calculation check failed'}</p>
          <p className="text-[13px] leading-5 text-slate-500">
            {allOk
              ? `${check.checked} arithmetic checks passed, run once on our server and again in your browser from the numbers in this report.`
              : `${check.failed} of ${check.checked} checks do not add up. Treat the total with care and run the audit again.`}
          </p>
        </div>
        {level ? <Pill tone={level.tone}>{level.label}</Pill> : null}
      </div>
      {conf?.reasons?.length ? (
        <ul className="mt-3 space-y-1 text-[13px] leading-5 text-amber-800">{conf.reasons.map((r) => <li key={r} className="flex gap-2"><span aria-hidden="true">!</span><span>{r}</span></li>)}</ul>
      ) : null}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-3 text-[13px] font-semibold text-sky-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">{open ? 'Hide the checks' : 'Show every check'}</button>
      {open ? (
        <ul className="mt-3 space-y-1.5">
          {check.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-[13px] leading-5">
              <span className={`mt-0.5 font-bold ${c.ok ? 'text-emerald-600' : 'text-rose-600'}`} aria-label={c.ok ? 'passed' : 'failed'}>{c.ok ? '✓' : '✗'}</span>
              <span className="text-slate-700">{c.label}<span className="block break-words font-mono text-[12px] text-slate-500">{c.detail}</span></span>
            </li>
          ))}
        </ul>
      ) : null}
      {conf?.limitations?.length ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">What this audit cannot tell you</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-5 text-slate-600">{conf.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      ) : null}
    </div>
  )
}

function OverviewPanel({ report }) {
  const o = buildOverview(report)
  const jump = (id) => {
    const el = document.getElementById(`fix-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    el.focus?.({ preventScroll: true })
  }
  const botsTotal = o.bots ? o.bots.reduce((sum, b) => sum + b.value, 0) : 0
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ChartCard title="Issues by priority" hint="Every problem found, grouped by how urgent it is.">
        {o.issueTotal ? <DonutChart segments={o.issues} centerValue={o.issueTotal} centerLabel={o.issueTotal === 1 ? 'issue' : 'issues'} label={`${o.issueTotal} issues by priority`} /> : <p className="text-[14px] leading-6 text-slate-600">No problems found on this page.</p>}
      </ChartCard>
      <ChartCard title="Score by area" hint="Points earned and points lost in each check." className="lg:col-span-2">
        {o.areas.length ? <ScoreBars rows={o.areas} /> : <p className="text-[14px] text-slate-600">No area could be scored.</p>}
      </ChartCard>
      {o.headings ? (
        <ChartCard title="Answer-first headings" hint="How many headings open with a direct answer.">
          <DonutChart segments={o.headings} centerValue={o.headings.reduce((sum, h) => sum + h.value, 0)} centerLabel="headings" label="Headings by answer-first result" />
        </ChartCard>
      ) : null}
      {o.bots ? (
        <ChartCard title="Search bot access" hint="Can each search bot fetch this page?" className="lg:col-span-2">
          <SegmentBar segments={o.bots} rows={o.botList} label={`${botsTotal} search bots by reachability`} />
        </ChartCard>
      ) : null}
      {o.winBack.length ? (
        <ChartCard title="Biggest wins" hint="The fixes that win back the most points. Click one to see the solution." className="lg:col-span-3">
          <WinBackBars items={o.winBack} onJump={jump} />
        </ChartCard>
      ) : null}
    </div>
  )
}

function ReportBody({ report }) {
  const speedTest = useSpeedTest(report.url || '')
  const speedRef = useRef(speedTest)
  useEffect(() => { speedRef.current = speedTest })
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [showAll, setShowAll] = useState(false)
  const modules = report.modules || {}
  const grade = gradeFor(report.score?.earned, report.score?.evaluatedMax)
  const findings = collectFindings(report, 12)
  const remediation = Array.isArray(report.remediation) ? report.remediation : []
  const pageHealth = report.pageHealth && Array.isArray(report.pageHealth.categories) && report.pageHealth.categories.length ? report.pageHealth : null
  const fixPack = report.fixPack && Array.isArray(report.fixPack.files) && report.fixPack.files.length ? report.fixPack : null
  const check = verifyReportClient(report)
  const js = modules.jsDifferential
  const bluf = modules.bluf
  const facts = modules.facts
  const headings = bluf?.headings || []
  const shownHeadings = showAll ? headings : headings.slice(0, 10)
  const when = report.auditedAt ? new Date(report.auditedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : ''
  const glow = grade.tone === 'emerald' ? 'gl-glow-emerald' : grade.tone === 'rose' ? 'gl-glow-rose' : 'gl-glow-amber'

  const download = useCallback(async (kind) => {
    setBusy(kind)
    setNotice('')
    try {
      const mod = await import('../../../lib/geolintPdf.js')
      if (kind === 'pdf') {
        // the speed result is part of the PDF: if the test is still running, wait for it (up to about 70 s)
        for (let i = 0; i < 140 && speedRef.current.status === 'loading'; i += 1) await new Promise((r) => setTimeout(r, 500))
        const sp = speedRef.current.speed
        await mod.downloadGeoLintPdf(sp ? { ...report, speed: sp } : report)
      }
      else mod.downloadGeoLintJson(report)
    } catch {
      setNotice('The download could not be created. Please try again.')
    } finally {
      setBusy('')
    }
  }, [report])

  const btn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-60'

  return (
    <>
      <section className="gl-hero relative overflow-hidden px-4 pb-14 pt-24 text-white sm:px-6 sm:pt-28">
        <div aria-hidden="true" className="gl-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">GeoLint report</p>
          <h1 className="mt-2 break-words font-display text-2xl font-bold tracking-tight sm:text-4xl">{hostLabel(report.url)}</h1>
          <p className="mt-1 text-[13px] text-slate-400">Audited {when}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={Boolean(busy)} onClick={() => download('pdf')} className={`${btn} bg-white text-slate-950 hover:bg-sky-50`}>
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true"><path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {busy === 'pdf' ? 'Preparing PDF…' : 'Download PDF report'}
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={() => download('json')} className={`${btn} border border-white/25 text-white hover:bg-white/10`}>Download JSON</button>
            <Link to={wordpressGuidePath(report.url)} className={`${btn} bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 text-white hover:brightness-110`}>
              <WpMark tone="white" className="h-5 w-5" />
              Fix with WordPress
            </Link>
            <Link to={GEOLINT_PATH} className={`${btn} border border-white/25 text-white hover:bg-white/10`}>Audit another page</Link>
          </div>
          {notice ? <p role="alert" className="mt-3 text-[13px] text-rose-300">{notice}</p> : null}

          <div className="mt-10 grid items-center gap-8 lg:grid-cols-[auto_1fr]">
            <div className={`gl-reveal mx-auto flex flex-col items-center rounded-[2rem] gl-card-dark p-6 ${glow}`}>
              <ScoreRing earned={report.score.earned} max={report.score.evaluatedMax} tone={grade.tone} />
              <div className="mt-4 flex items-center gap-3">
                <span className={`font-display text-4xl font-bold ${toneText(grade.tone)}`}>{grade.letter}</span>
                <span className="text-sm font-semibold text-slate-300">{grade.label}</span>
              </div>
            </div>
            <div className="gl-reveal" style={{ '--d': '.15s' }}>
              <p className="text-xl font-semibold leading-8 text-white sm:text-2xl">{summarizeReport(report)}</p>
              {report.partial ? <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-[14px] text-amber-200">Some checks could not run, so the score covers {report.score.evaluatedMax} of {report.score.totalMax} points.</p> : null}
              <p className="mt-4 text-[14px] leading-6 text-slate-400">This shows whether AI crawlers can reach and read this one page. It does not predict whether AI tools will cite you.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-slate-50 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULE_KEYS.filter((k) => modules[k]).map((k, i) => <ModuleCard key={k} id={k} mod={modules[k]} index={i} excluded={(report.score?.excludedModules || []).includes(k)} />)}
          </ul>

          {report.url ? <SpeedCard test={speedTest} /> : null}

          <Section title="Overview" hint="The result at a glance: what is wrong, where the points went and what to fix first." delay={0.12}>
            <OverviewPanel report={report} />
          </Section>

          {report.url ? (
            <Section id={SPEED_SECTION_ID} title="Website speed" hint="Google PageSpeed on a phone and a desktop: how fast the page loads and what slows it down. Test again after your fixes to see the difference." delay={0.14}>
              <SpeedPanel test={speedTest} />
            </Section>
          ) : null}

          {report.domain ? (
            <Section title="Domain and reach" hint="Age, popularity and authority of the domain, from free public sources." delay={0.16}>
              <DomainCard domain={report.domain} />
            </Section>
          ) : null}

          <Section title="Is this report correct?" hint="Every total is re-added from its parts. A failed check would show here instead of a confident score." delay={0.18}>
            <TrustPanel report={report} check={check} />
          </Section>

          <Section title="Fix these first" hint={remediation.length ? 'Ordered by urgency, then by how many points each fix can win back. Each fix shows what we measured.' : 'Most important first. Fix bot access, then rendering, then content.'} delay={0.2}>
            {remediation.length ? (
              <>
                <div className="mb-4"><FixAllPromptPanel report={report} /></div>
                <ol className="space-y-3">{remediation.map((item, i) => <FixCard key={item.id} item={item} index={i} report={report} />)}</ol>
              </>
            ) : findings.length ? (
              <ol className="space-y-2.5">
                {findings.map((f, i) => (
                  <li key={`${f.module}:${f.message}`} className="gl-card flex gap-4 p-4">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white ${f.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`}>{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><Pill tone={f.severity === 'error' ? 'rose' : 'amber'}>{f.severity === 'error' ? 'Fix' : 'Improve'}</Pill><span className="text-[12px] font-semibold text-slate-500">{moduleLabel(f.module)}</span></div>
                      <p className="mt-1.5 text-[14px] leading-6 text-slate-700">{f.message}</p>
                      <div className="mt-2.5 rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-200">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Solution: how to fix it</p>
                        <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13.5px] leading-6 text-slate-700">{solutionSteps({ module: f.module }).map((st) => <li key={st}>{st}</li>)}</ol>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="gl-card p-5 text-[15px] text-slate-700">No problems found on this page.</p>}
          </Section>

          {fixPack ? (
            <Section title="Your Fix Pack" hint="Ready-to-publish files built from this page: a robots.txt block, an llms.txt guide and JSON-LD. Copy or download the ones marked needed." delay={0.22}>
              <FixPackPanel pack={fixPack} />
            </Section>
          ) : null}

          <Section title="Fix it on WordPress" hint="Using WordPress? Install our free plugin and apply these fixes without editing code." delay={0.225}>
            <WordPressFixPanel auditedUrl={report.url} />
          </Section>

          {pageHealth ? (
            <Section title="Page health" hint="Everyday SEO and technical checks next to your GEO score: metrics, content, indexability, structured data, social tags, images, HTTP headers and outgoing links. They do not change the score." delay={0.23}>
              <PageHealthPanel health={pageHealth} />
            </Section>
          ) : null}

          {GEOLINT_API_URL ? (
            <CitationPanel report={report} wrap={(panel) => (
              <Section title="Does AI cite you?" hint="A real AI answer engine gets your customers' questions. We check whether your site is one of its sources." delay={0.235}>{panel}</Section>
            )} />
          ) : null}

          {GEOLINT_API_URL ? (
            <Section title="Watch this page weekly" hint="Free monitoring: we re-audit every week and email you only when something important changes." delay={0.238}>
              <WatchPanel report={report} />
            </Section>
          ) : null}

          {GEOLINT_API_URL ? (
            <Section title="Audit the whole website" hint="Every page from the sitemap and the site's own links, scored and grouped into fixes." delay={0.24}>
              <SiteAuditPanel url={report.url} />
            </Section>
          ) : null}

          {report.id && GEOLINT_API_URL ? (
            <Section title="Show your score" hint="A small badge for your website, README or email signature." delay={0.26}>
              <BadgePanel report={report} />
            </Section>
          ) : null}

          {modules.botAccess?.bots?.length ? (
            <Section title="Bot access" hint="Search bots decide your score. Training bots are shown for information only." delay={0.25}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.botAccess.bots.map((b) => <BotCard key={b.bot} bot={b} />)}</ul>
              {modules.botAccess.controls?.length ? (
                <p className="mt-3 text-[13px] leading-6 text-slate-500">Opt-out tokens (robots.txt only): {modules.botAccess.controls.map((c) => `${c.name} ${c.allowed ? 'allowed' : 'blocked'}`).join(', ')}.</p>
              ) : null}
              {modules.botAccess.otherCrawlers?.length ? (
                <p className="mt-2 text-[13px] leading-6 text-slate-500">Also read from robots.txt, not scored: {modules.botAccess.otherCrawlers.map((c) => `${c.name} ${c.allowed ? 'allowed' : 'blocked'}`).join(', ')}.</p>
              ) : null}
            </Section>
          ) : null}

          {js?.metrics ? (
            <Section title="JavaScript dependence" hint="AI crawlers often read only the HTML. Compare what they get with what a browser shows." delay={0.3}>
              <div className="gl-card p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Visible without JavaScript" value={js.metrics.visibleWithoutJsPercent != null ? `${js.metrics.visibleWithoutJsPercent}%` : 'n/a'} sub={js.isCsr ? 'Client-side rendered' : 'Not client-side rendered'} />
                  <Stat label="Words in raw HTML" value={js.metrics.staticWords} />
                  <Stat label="Words after rendering" value={js.metrics.renderedWords} />
                </div>
                <div className="mt-5 space-y-3">
                  <div><div className="mb-1 flex justify-between text-[12px] text-slate-500"><span>Raw HTML</span><span>{js.metrics.staticWords} words</span></div><GrowBar ratio={js.metrics.renderedWords ? js.metrics.staticWords / js.metrics.renderedWords : 0} tone={js.isCsr ? 'rose' : 'emerald'} className="h-2.5" /></div>
                  <div><div className="mb-1 flex justify-between text-[12px] text-slate-500"><span>Rendered page</span><span>{js.metrics.renderedWords} words</span></div><GrowBar ratio={1} tone="slate" delay={0.15} className="h-2.5" /></div>
                </div>
              </div>
            </Section>
          ) : null}

          {headings.length ? (
            <Section title="Answer-first structure" hint="How well each heading opens with a direct answer. A writing heuristic, not a proven ranking rule." delay={0.35}>
              {bluf.summary ? (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Headings" value={bluf.summary.headings} />
                  <Stat label="Passed" value={bluf.summary.passed} />
                  <Stat label="Partial" value={bluf.summary.partial} />
                  <Stat label="Failed" value={bluf.summary.failed} />
                </div>
              ) : null}
              <ul className="space-y-2">{shownHeadings.map((h, i) => <HeadingRow key={`${h.text}-${i}`} h={h} />)}</ul>
              {headings.length > 10 ? (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-[14px] font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-800">{showAll ? 'Show fewer headings' : `Show all ${headings.length} headings`}</button>
              ) : null}
            </Section>
          ) : null}

          {facts?.breakdown ? (
            <Section title="Facts, sources and structured data" delay={0.4}>
              <div className="gl-card p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Numeric facts" value={facts.breakdown.density.per100Words} sub={`per 100 words (${facts.breakdown.density.facts} in ${facts.breakdown.density.words})`} />
                  <Stat label="Outside source links" value={facts.breakdown.sources.externalLinks} sub="3 or more earns full points" />
                  <Stat label="llms.txt" value={facts.breakdown.llmsTxt.found ? 'Found' : 'Not found'} sub="Optional file" />
                </div>
                <p className="mt-5 text-[13px] font-semibold text-slate-600">Schema types found</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{facts.breakdown.schema.types.length ? facts.breakdown.schema.types.map((t) => <Pill key={t} tone="emerald">{t}</Pill>) : <Pill tone="rose">None found</Pill>}</div>
                {facts.extras ? (
                  <p className="mt-4 text-[13px] leading-6 text-slate-500">
                    {facts.extras.noindex ? 'This page has a noindex tag. ' : ''}
                    {facts.extras.canonical ? `Canonical: ${facts.extras.canonical}. ` : 'No canonical URL found. '}
                    {facts.extras.hasFaqSchema ? 'FAQ schema present. ' : ''}
                    {facts.extras.lastUpdated ? `Last updated date: ${facts.extras.lastUpdated}.` : ''}
                  </p>
                ) : null}
              </div>
            </Section>
          ) : null}

          <div className="gl-reveal mt-12 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0b1f3a_0%,#10306b_55%,#312e81_100%)] p-8 text-white sm:p-10" style={{ '--d': '.45s' }}>
            <h2 className="font-display text-2xl font-bold tracking-tight">Want these fixed for you?</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-blue-100">Nexora Solution builds fast, server-rendered websites and business software. Send us this report and we will tell you what to fix first.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/contact" className="inline-flex min-h-[46px] items-center rounded-full bg-white px-6 text-[15px] font-semibold text-slate-950 hover:bg-blue-50">Talk to Nexora</Link>
              <Link to={GEOLINT_PATH} className="inline-flex min-h-[46px] items-center rounded-full border border-white/30 px-6 text-[15px] font-semibold text-white hover:bg-white/10">Run another audit</Link>
            </div>
          </div>
          <p className="mt-6 text-[12px] leading-5 text-slate-500">GeoLint tests one page with crawler user-agents. Firewalls that verify bots by IP address cannot be simulated, so only your server logs show what the real crawlers receive.</p>
        </div>
      </div>
      <FixFloat report={report} />
    </>
  )
}

function EmptyState() {
  return (
    <section className="gl-hero relative overflow-hidden px-4 pb-24 pt-28 text-center text-white sm:px-6">
      <div aria-hidden="true" className="gl-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">No audit report to show</h1>
        <p className="mt-4 text-[16px] leading-7 text-slate-300">Reports are shown right after an audit and are kept only in this browser tab. Run an audit to see yours.</p>
        <Link to={GEOLINT_PATH} className="mt-7 inline-flex min-h-[48px] items-center rounded-xl bg-white px-7 text-[15px] font-semibold text-slate-950 hover:bg-sky-50">Run a free audit</Link>
      </div>
    </section>
  )
}

/** The audit result page (/tools/geo-audit/report/): reads the report the audit page just saved. */
export default function GeoAuditReportPage() {
  const seo = getSeoForPath(GEOLINT_REPORT_PATH)
  const location = useLocation()
  // Server render and hydration see "no report"; the browser then reads the saved one.
  const report = useSyncExternalStore(
    subscribeNever,
    () => (isValidReport(location.state?.report) ? location.state.report : loadReport()),
    () => null,
  )
  return (
    <PublicPageShell>
      <PageSeo title={seo.title} description={seo.description} canonical={seo.canonical} path={GEOLINT_REPORT_PATH} robots={seo.robots} ogLocale="en_US" ogLocaleAlternates={false} defaultSchemas={false} />
      {report ? <GeoLintGate report={report}><ReportBody report={report} /></GeoLintGate> : <EmptyState />}
    </PublicPageShell>
  )
}
