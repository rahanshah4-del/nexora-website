/**
 * GeoLint report as a PDF (jsPDF + autotable, loaded only when the visitor
 * clicks Download). Built from the engine's report object alone, so the PDF
 * and the report page can never disagree. Text is reduced to Latin-1 because
 * the built-in Helvetica cannot draw anything else.
 */
import { buildOverview, domainTiles, gradeFor, solutionSteps, verifyReportClient, hostLabel, issueLabel, reportFileBase, strengthOf, summarizeReport, verdictInfo } from './geolintReport.js'
import { DEVICES, SPEED_METRICS, formatMetric, hasSpeed, speedGain } from './geolintSpeed.js'
import { collectFindings, moduleLabel } from './geolint.js'

const NAVY = [11, 31, 58]
const BLUE = [37, 99, 235]
const SLATE = [71, 85, 105]
const TONES = { emerald: [5, 150, 105], amber: [217, 119, 6], orange: [234, 88, 12], rose: [225, 29, 72], slate: [100, 116, 139] }

/** Replaces characters Helvetica cannot draw. */
export function pdfSafe(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E¡-ÿ]/g, '')
    .trim()
}

const fmtPts = (n) => (Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1))

/** Filled ring segment (angles in radians, 0 = 12 o'clock, clockwise), drawn as one polygon. */
function ringSegment(doc, cx, cy, ro, ri, a0, a1, color) {
  const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 72))
  const pt = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)]
  const pts = []
  for (let i = 0; i <= steps; i += 1) pts.push(pt(ro, a0 + ((a1 - a0) * i) / steps))
  for (let i = steps; i >= 0; i -= 1) pts.push(pt(ri, a0 + ((a1 - a0) * i) / steps))
  const lines = pts.slice(1).map((q, i) => [q[0] - pts[i][0], q[1] - pts[i][1]])
  doc.setFillColor(...color)
  doc.lines(lines, pts[0][0], pts[0][1], [1, 1], 'F', true)
}

/** Donut with a centre number and a legend (label, count, share) on its right. */
function drawDonut(doc, x, y, segments, centerValue, centerLabel) {
  const cx = x + 36
  const cy = y + 36
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let angle = 0
  if (total <= 0) ringSegment(doc, cx, cy, 34, 22, 0, Math.PI * 2 - 0.001, [226, 232, 240])
  segments.filter((s) => s.value > 0).forEach((s) => {
    const sweep = (s.value / total) * Math.PI * 2
    ringSegment(doc, cx, cy, 34, 22, angle, angle + (segments.filter((q) => q.value > 0).length === 1 ? sweep - 0.001 : sweep), TONES[s.tone] || TONES.slate)
    angle += sweep
  })
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(String(centerValue), cx, cy + 3, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...SLATE)
  doc.text(pdfSafe(centerLabel), cx, cy + 12, { align: 'center' })
  segments.forEach((s, i) => {
    const ly = y + 14 + i * 15
    doc.setFillColor(...(TONES[s.tone] || TONES.slate))
    doc.circle(x + 90, ly - 3, 3, 'F')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text(`${pdfSafe(s.label)}: ${s.value} (${total ? Math.round((s.value / total) * 100) : 0}%)`, x + 99, ly)
  })
}

/** Horizontal bar: `ratio` (0-1) of the width filled in colour on a light track. */
function drawBar(doc, x, y, w, h, ratio, color, track = [226, 232, 240]) {
  doc.setFillColor(...track)
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F')
  const fillW = Math.max(0, Math.min(1, ratio)) * w
  if (fillW > 0) {
    doc.setFillColor(...color)
    doc.roundedRect(x, y, Math.max(fillW, h), h, h / 2, h / 2, 'F')
  }
}

async function loadPdfDeps() {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  return { jsPDF, autoTable: autoTableModule.default }
}

/** Builds the report PDF and returns the jsPDF document. */
export async function buildGeoLintPdf(report) {
  const { jsPDF, autoTable } = await loadPdfDeps()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40
  const modules = report.modules || {}
  const grade = gradeFor(report.score?.earned, report.score?.evaluatedMax)

  // Header band
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 118, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('GEOLINT BY NEXORA SOLUTION', M, 38)
  doc.setFontSize(20)
  doc.text('GEO Audit Report', M, 66)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(pdfSafe(hostLabel(report.url)).slice(0, 80), M, 88)
  const when = report.auditedAt ? new Date(report.auditedAt).toUTCString().replace(' GMT', ' UTC') : ''
  doc.text(pdfSafe(when), M, 104)

  // Score block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(40)
  doc.text(String(report.score?.earned ?? '-'), W - M, 66, { align: 'right' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`out of ${report.score?.evaluatedMax ?? 100}   Grade ${grade.letter} (${grade.label})`, W - M, 90, { align: 'right' })

  let y = 146
  doc.setTextColor(...SLATE)
  doc.setFontSize(10.5)
  const summary = doc.splitTextToSize(pdfSafe(summarizeReport(report)), W - M * 2)
  doc.text(summary, M, y)
  y += summary.length * 14 + 4
  if (report.partial) {
    doc.setTextColor(...TONES.amber)
    doc.text('Some checks could not run and are left out of the score.', M, y)
    y += 16
  }
  const check = verifyReportClient(report)
  doc.setTextColor(...(check.verified ? TONES.emerald : TONES.rose))
  doc.setFont('helvetica', 'bold')
  doc.text(check.verified ? `Calculation verified: ${check.checked} arithmetic checks passed.` : `Calculation check failed: ${check.failed} of ${check.checked} checks do not add up.`, M, y)
  doc.setFont('helvetica', 'normal')
  y += 16
  const levelText = { high: 'High', medium: 'Medium', low: 'Low' }[report.confidence?.level]
  if (levelText) {
    doc.setTextColor(...SLATE)
    doc.text(`Confidence: ${levelText}. Each crawler test uses that crawler's user-agent from our server; only this one URL was audited.`, M, y)
    y += 16
  }
  y += 6

  const heading = (text) => {
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(text, M, y)
    doc.setFont('helvetica', 'normal')
    y += 8
  }
  const after = () => { y = doc.lastAutoTable.finalY + 22 }
  const base = { theme: 'grid', margin: { left: M, right: M }, styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, textColor: [30, 41, 59] }, headStyles: { fillColor: BLUE, textColor: 255 } }

  // Overview charts (same data as the on-screen Overview)
  const ov = buildOverview(report)
  const pageH = doc.internal.pageSize.getHeight()
  const ensure = (need) => { if (y + need > pageH - 50) { doc.addPage(); y = 50 } }
  heading('Overview')
  y += 6
  const colW = (W - M * 2) / 2
  if (ov.issueTotal > 0) {
    ensure(100)
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text('ISSUES BY PRIORITY', M, y)
    if (ov.headings) doc.text('ANSWER-FIRST HEADINGS', M + colW, y)
    drawDonut(doc, M, y + 6, ov.issues, ov.issueTotal, ov.issueTotal === 1 ? 'issue' : 'issues')
    if (ov.headings) drawDonut(doc, M + colW, y + 6, ov.headings, ov.headings.reduce((n, r) => n + r.value, 0), 'headings')
    y += 96
  } else if (ov.headings) {
    ensure(100)
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text('ANSWER-FIRST HEADINGS', M, y)
    drawDonut(doc, M, y + 6, ov.headings, ov.headings.reduce((n, r) => n + r.value, 0), 'headings')
    y += 96
  }
  if (ov.areas.length) {
    ensure(26 + ov.areas.length * 28)
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text('SCORE BY AREA (points earned / lost)', M, y)
    y += 14
    ov.areas.forEach((a) => {
      doc.setFontSize(9)
      doc.setTextColor(30, 41, 59)
      doc.text(pdfSafe(moduleLabel(a.id)), M, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${fmtPts(a.earned)} / ${fmtPts(a.max)}${a.lost > 0 ? `   -${fmtPts(a.lost)}` : ''}`, W - M, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      drawBar(doc, M, y + 4, W - M * 2, 7, a.max > 0 ? a.earned / a.max : 0, TONES[a.tone] || TONES.slate, [254, 226, 226])
      y += 26
    })
    y += 4
  }
  if (ov.bots && ov.botList.length) {
    ensure(40 + ov.botList.length * 14)
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text('SEARCH BOT ACCESS', M, y)
    y += 8
    const botTotal = ov.bots.reduce((n, r) => n + r.value, 0)
    let bx = M
    ov.bots.filter((r) => r.value > 0).forEach((r) => {
      const w = ((W - M * 2) * r.value) / botTotal
      doc.setFillColor(...(TONES[r.tone] || TONES.slate))
      doc.rect(bx, y, w, 9, 'F')
      bx += w
    })
    y += 22
    ov.botList.forEach((b) => {
      doc.setFillColor(...(TONES[b.tone] || TONES.slate))
      doc.circle(M + 3, y - 3, 3, 'F')
      doc.setFontSize(9)
      doc.setTextColor(30, 41, 59)
      doc.text(pdfSafe(b.name), M + 12, y)
      doc.setTextColor(...(TONES[b.tone] || TONES.slate))
      doc.text(pdfSafe(b.label), W - M, y, { align: 'right' })
      y += 14
    })
    y += 8
  }
  if (ov.winBack.length) {
    ensure(26 + ov.winBack.length * 28)
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text('BIGGEST WINS (points you can win back)', M, y)
    y += 14
    const top = Math.max(...ov.winBack.map((i) => i.upTo), 1)
    ov.winBack.forEach((item, i) => {
      doc.setFontSize(9)
      doc.setTextColor(30, 41, 59)
      doc.text(pdfSafe(`${i + 1}. ${item.title}`).slice(0, 90), M, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TONES.emerald)
      doc.text(`+${fmtPts(item.upTo)} ${item.upTo === 1 ? 'pt' : 'pts'}`, W - M, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      drawBar(doc, M, y + 4, W - M * 2, 6, item.upTo / top, TONES.emerald)
      y += 26
    })
    y += 4
  }

  ensure(60)
  heading('Score by check')
  autoTable(doc, {
    ...base,
    startY: y,
    head: [['Check', 'Score', 'Result']],
    body: ['botAccess', 'jsDifferential', 'bluf', 'facts'].filter((k) => modules[k]).map((k) => {
      const m = modules[k]
      const s = strengthOf(m.score, m.maxScore, m.status)
      return [moduleLabel(k), m.status === 'unavailable' ? 'n/a' : `${m.score} / ${m.maxScore}`, s.label]
    }),
  })
  after()

  const tiles = domainTiles(report.domain)
  if (tiles.length) {
    heading('Domain and reach')
    autoTable(doc, {
      ...base,
      startY: y,
      head: [['Fact', 'Value', 'Detail']],
      body: tiles.map((t) => [pdfSafe(t.label), pdfSafe(t.value), pdfSafe(t.sub || '')]),
    })
    after()
  }

  const findings = collectFindings(report, 20)
  const fixes = Array.isArray(report.remediation) ? report.remediation : []
  ensure(90)
  heading('Fix these first')
  if (fixes.length) {
    autoTable(doc, {
      ...base,
      startY: y,
      head: [['#', 'What to fix, and the solution', 'Up to']],
      body: fixes.map((f, i) => [
        String(i + 1),
        pdfSafe([
          `${String(f.priority || '').toUpperCase()} - ${f.title}`,
          f.evidence?.length ? `Measured: ${f.evidence.join('; ')}` : '',
          'Solution:',
          ...solutionSteps(f).map((st, n) => `${n + 1}. ${st}`),
        ].filter(Boolean).join('\n')),
        f.upTo > 0 ? `+${f.upTo}` : '-',
      ]),
      columnStyles: { 0: { cellWidth: 24 }, 2: { cellWidth: 40 } },
    })
    after()
  } else if (findings.length) {
    autoTable(doc, {
      ...base,
      startY: y,
      head: [['', 'Check', 'What to fix']],
      body: findings.map((f) => [f.severity === 'error' ? 'Fix' : 'Improve', moduleLabel(f.module), pdfSafe(f.message)]),
      columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 90 } },
    })
    after()
  } else {
    doc.setTextColor(...SLATE)
    doc.setFontSize(10)
    doc.text('No problems found on this page.', M, y + 14)
    y += 36
  }

  const bots = modules.botAccess?.bots || []
  if (bots.length) {
    heading('Bot access')
    autoTable(doc, {
      ...base,
      startY: y,
      head: [['Bot', 'Type', 'robots.txt', 'Live request']],
      body: bots.map((b) => [b.bot, b.scored ? 'Search (scored)' : 'Training (not scored)', b.robots?.allowed ? 'Allowed' : 'Blocked', `${verdictInfo(b.http?.verdict).label}${b.http?.status ? ` (${b.http.status})` : ''}`]),
    })
    after()
  }

  const js = modules.jsDifferential
  if (js?.metrics) {
    heading('JavaScript dependence')
    autoTable(doc, {
      ...base,
      startY: y,
      body: [
        ['Text visible without JavaScript', js.metrics.visibleWithoutJsPercent != null ? `${js.metrics.visibleWithoutJsPercent}%` : 'n/a'],
        ['Words in raw HTML', String(js.metrics.staticWords)],
        ['Words after rendering', String(js.metrics.renderedWords)],
        ['Client-side rendered', js.isCsr == null ? 'n/a' : js.isCsr ? 'Yes' : 'No'],
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 200 } },
    })
    after()
  }

  const headings = modules.bluf?.headings || []
  if (headings.length) {
    heading('Answer-first structure (heuristic)')
    autoTable(doc, {
      ...base,
      startY: y,
      head: [['Heading', 'Opening words', 'Score', 'Issues']],
      body: headings.map((h) => [`H${h.level} ${pdfSafe(h.text).slice(0, 70)}`, h.block === 'paragraph' ? String(h.words) : h.block, `${Math.round(h.points * 100)}%`, (h.issues || []).map(issueLabel).join('; ') || '-']),
      columnStyles: { 0: { cellWidth: 190 }, 1: { cellWidth: 70 }, 2: { cellWidth: 48 } },
    })
    after()
  }

  const facts = modules.facts
  if (facts?.breakdown) {
    const b = facts.breakdown
    heading('Facts, sources and structured data')
    autoTable(doc, {
      ...base,
      startY: y,
      body: [
        ['Numeric facts', `${b.density.facts} in ${b.density.words} words (${b.density.per100Words} per 100 words)`],
        ['Outside source links', String(b.sources.externalLinks)],
        ['Schema types', b.schema.types.join(', ') || 'none found'],
        ['llms.txt', b.llmsTxt.found ? 'Found' : 'Not found'],
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 140 } },
    })
    after()
  }

  if (hasSpeed(report.speed)) {
    const sp = report.speed
    heading('Website speed (Google PageSpeed)')
    const devs = DEVICES.filter((d) => sp.before?.[d.id] || sp.after?.[d.id])
    const show = (v) => (typeof v === 'number' ? String(v) : '-')
    autoTable(doc, {
      ...base,
      startY: y,
      head: [['', ...devs.map((d) => d.label)]],
      body: [
        ...(sp.before ? [['Previous test', ...devs.map((d) => show(sp.before[d.id]?.score))]] : []),
        ['This test', ...devs.map((d) => show(sp.after?.[d.id]?.score))],
        ...(sp.before ? [['Change', ...devs.map((d) => { const g = speedGain(sp, d.id); return g === null ? '-' : `${g >= 0 ? '+' : ''}${g}` })]] : []),
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 120 } },
    })
    after()
    const rows = []
    for (const m of SPEED_METRICS) {
      for (const d of devs) {
        const run = sp.after?.[d.id]
        const v = run?.metrics?.[m.key]
        if (v === null || v === undefined) continue
        const r = run.ratings?.[m.key]
        rows.push([`${m.label} (${d.label})`, formatMetric(m.key, v), r ? { good: 'Good', 'needs-improvement': 'Needs work', poor: 'Poor' }[r] : '-'])
      }
    }
    if (rows.length) {
      autoTable(doc, { ...base, startY: y, head: [['Measure', 'Value', 'Rating']], body: rows, columnStyles: { 1: { halign: 'right', cellWidth: 70 }, 2: { cellWidth: 80 } } })
      after()
    }
    const opps = (sp.after?.mobile || sp.after?.desktop)?.opportunities || []
    if (opps.length) {
      heading('What slows the page down')
      autoTable(doc, { ...base, startY: y, head: [['Finding', 'Could save']], body: opps.map((o) => [pdfSafe(o.title), [o.savingsMs ? formatMetric('lcpMs', o.savingsMs) : '', o.savingsKb ? `${o.savingsKb} KB` : ''].filter(Boolean).join(' / ') || '-']), columnStyles: { 1: { halign: 'right', cellWidth: 100 } } })
      after()
    }
  }

  const health = report.pageHealth
  if (health && Array.isArray(health.categories)) {
    heading('Page health (not part of the score)')
    autoTable(doc, {
      ...base,
      startY: y,
      head: [['Group', 'Result']],
      body: health.categories.map((c) => [c.label, c.score === null ? 'Information only' : `${c.score}/100 - ${c.checks.filter((k) => k.status === 'fail').length} to fix, ${c.checks.filter((k) => k.status === 'warn').length} to improve`]),
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 140 } },
    })
    after()
    const problems = health.categories.flatMap((c) => c.checks.filter((k) => k.status === 'fail' || k.status === 'warn').map((k) => ({ group: c.label, ...k })))
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'fail' ? -1 : 1))
    if (problems.length) {
      autoTable(doc, {
        ...base,
        startY: y,
        head: [['Group', 'Problem, fix and copy-paste code']],
        body: problems.map((k) => [
          k.group,
          pdfSafe([
            `${k.status === 'fail' ? 'FIX' : 'IMPROVE'} - ${k.label}: ${k.detail}`,
            ...(k.fix?.steps || []).map((st, n) => `${n + 1}. ${st}`),
            k.fix?.snippet ? `Code (${k.fix.snippet.label}):\n${k.fix.snippet.code.slice(0, 600)}` : '',
          ].filter(Boolean).join('\n')),
        ]),
        columnStyles: { 0: { cellWidth: 80 } },
        styles: { ...base.styles, fontSize: 8 },
      })
      after()
    }
  }

  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  const note = doc.splitTextToSize(pdfSafe('GeoLint tests one page with crawler user-agents. A high score shows AI crawlers can reach and read the page; it does not mean AI tools will cite you. The answer-first check is a heuristic, not a proven rule. IP-verified firewall rules cannot be simulated.'), W - M * 2)
  if (y + note.length * 10 > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 50 }
  doc.text(note, M, y)

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...SLATE)
    doc.text('Free GEO audit by Nexora Solution - nexorasolution.us/tools/geo-audit/', M, doc.internal.pageSize.getHeight() - 24)
    doc.text(`Page ${i} of ${pages}`, W - M, doc.internal.pageSize.getHeight() - 24, { align: 'right' })
  }
  return doc
}

/** Builds and saves the PDF in the browser. */
export async function downloadGeoLintPdf(report) {
  const doc = await buildGeoLintPdf(report)
  doc.save(`${reportFileBase(report)}.pdf`)
}

/** Saves the raw report as JSON in the browser. */
export function downloadGeoLintJson(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${reportFileBase(report)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
