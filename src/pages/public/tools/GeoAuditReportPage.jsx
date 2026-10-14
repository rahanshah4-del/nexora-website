import { useCallback, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import Link from '../../../components/AppLink.jsx'
import PageSeo from '../../../components/PageSeo.jsx'
import { getSeoForPath } from '../../../lib/seoMetadata.js'
import { collectFindings, moduleLabel } from '../../../lib/geolint.js'
import { GEOLINT_PATH, GEOLINT_REPORT_PATH } from '../../../lib/geolintLaunch.js'
import { CONFIDENCE_LABELS, LEVEL_LABELS, PRIORITY_LABELS, gradeFor, hostLabel, isValidReport, issueLabel, loadReport, strengthOf, summarizeReport, verdictInfo, verifyReportClient } from '../../../lib/geolintReport.js'
import PublicPageShell from '../PublicPageShell.jsx'
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

function Section({ title, hint, children, delay = 0 }) {
  return (
    <section className="gl-reveal mt-10" style={{ '--d': `${delay}s` }}>
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
        <h3 className="font-display text-[15px] font-semibold text-slate-900">{moduleLabel(id)}</h3>
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
      <pre className="max-h-64 overflow-auto p-3 text-[12px] leading-5 text-slate-100"><code>{snippet.code}</code></pre>
    </div>
  )
}

function FixCard({ item, index }) {
  const priority = PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.medium
  const conf = CONFIDENCE_LABELS[item.confidence] || CONFIDENCE_LABELS.heuristic
  return (
    <li className="gl-card p-5">
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
          {item.steps?.length ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">How to fix it</p>
              <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-[14px] leading-6 text-slate-700">{item.steps.map((st) => <li key={st}>{st}</li>)}</ol>
            </div>
          ) : null}
          {item.snippet ? <CopyBlock snippet={item.snippet} /> : null}
          {item.verify ? <p className="mt-3 break-words text-[12.5px] leading-5 text-slate-500"><span className="font-semibold text-slate-600">Check it worked:</span> <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-700">{item.verify}</code></p> : null}
        </div>
      </div>
    </li>
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

function ReportBody({ report }) {
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [showAll, setShowAll] = useState(false)
  const modules = report.modules || {}
  const grade = gradeFor(report.score?.earned, report.score?.evaluatedMax)
  const findings = collectFindings(report, 12)
  const remediation = Array.isArray(report.remediation) ? report.remediation : []
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
      if (kind === 'pdf') await mod.downloadGeoLintPdf(report)
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

          <Section title="Is this report correct?" hint="Every total is re-added from its parts. A failed check would show here instead of a confident score." delay={0.18}>
            <TrustPanel report={report} check={check} />
          </Section>

          <Section title="Fix these first" hint={remediation.length ? 'Ordered by urgency, then by how many points each fix can win back. Each fix shows what we measured.' : 'Most important first. Fix bot access, then rendering, then content.'} delay={0.2}>
            {remediation.length ? (
              <ol className="space-y-3">{remediation.map((item, i) => <FixCard key={item.id} item={item} index={i} />)}</ol>
            ) : findings.length ? (
              <ol className="space-y-2.5">
                {findings.map((f, i) => (
                  <li key={`${f.module}:${f.message}`} className="gl-card flex gap-4 p-4">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white ${f.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`}>{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><Pill tone={f.severity === 'error' ? 'rose' : 'amber'}>{f.severity === 'error' ? 'Fix' : 'Improve'}</Pill><span className="text-[12px] font-semibold text-slate-500">{moduleLabel(f.module)}</span></div>
                      <p className="mt-1.5 text-[14px] leading-6 text-slate-700">{f.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="gl-card p-5 text-[15px] text-slate-700">No problems found on this page.</p>}
          </Section>

          {modules.botAccess?.bots?.length ? (
            <Section title="Bot access" hint="Search bots decide your score. Training bots are shown for information only." delay={0.25}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.botAccess.bots.map((b) => <BotCard key={b.bot} bot={b} />)}</ul>
              {modules.botAccess.controls?.length ? (
                <p className="mt-3 text-[13px] leading-6 text-slate-500">Opt-out tokens (robots.txt only): {modules.botAccess.controls.map((c) => `${c.name} ${c.allowed ? 'allowed' : 'blocked'}`).join(', ')}.</p>
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
      {report ? <ReportBody report={report} /> : <EmptyState />}
    </PublicPageShell>
  )
}
