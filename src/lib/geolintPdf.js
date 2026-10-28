/**
 * GeoLint report as a PDF (jsPDF + autotable, loaded only when the visitor
 * clicks Download). Built from the engine's report object alone, so the PDF
 * and the report page can never disagree. Text is reduced to Latin-1 because
 * the built-in Helvetica cannot draw anything else.
 */
import { buildOverview, domainTiles, gradeFor, solutionSteps, verifyReportClient, hostLabel, issueLabel, reportFileBase, strengthOf, summarizeReport, verdictInfo } from './geolintReport.js'
import { DEVICES, SPEED_METRICS, formatMetric, hasSpeed, speedGain, speedGrade } from './geolintSpeed.js'
import { GOOGLE_G_PNG, NEXORA_LOGO_PNG } from './geolintPdfAssets.js'
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

  const pageH = doc.internal.pageSize.getHeight()
  const gradeTone = grade.letter === 'A' ? 'emerald' : grade.letter === 'B' ? 'emerald' : grade.letter === 'C' ? 'amber' : grade.letter === 'D' ? 'orange' : 'rose'
  const card = (x, yy, w, h, fill = [245, 245, 247]) => { doc.setFillColor(...fill); doc.roundedRect(x, yy, w, h, 10, 10, 'F') }
  const chip = (text, x, yy, tone) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    const w = doc.getTextWidth(text) + 14
    const c = TONES[tone] || TONES.slate
    doc.setFillColor(Math.round(c[0] + (255 - c[0]) * 0.86), Math.round(c[1] + (255 - c[1]) * 0.86), Math.round(c[2] + (255 - c[2]) * 0.86))
    doc.roundedRect(x, yy - 9, w, 14, 7, 7, 'F')
    doc.setTextColor(...c)
    doc.text(text, x + 7, yy + 1)
    doc.setFont('helvetica', 'normal')
    return w
  }

  // Header (light, Apple-style): brand, title, score ring
  try { doc.addImage(NEXORA_LOGO_PNG, 'PNG', M, 30, 22, 22) } catch { /* logo is optional */ }
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('GeoLint', M + 30, 45)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(134, 134, 139)
  doc.text('by Nexora Solution', M + 30 + doc.getTextWidth('GeoLint  ') + 2, 45)
  const when = report.auditedAt ? new Date(report.auditedAt).toUTCString().replace(' GMT', ' UTC') : ''
  doc.setFontSize(9)
  doc.text(pdfSafe(when), W - M, 45, { align: 'right' })

  doc.setTextColor(29, 29, 31)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('GEO Audit Report', M, 100)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...BLUE)
  doc.text(pdfSafe(hostLabel(report.url)).slice(0, 60), M, 120)
  const gradeText = `Grade ${grade.letter} - ${grade.label}`
  chip(pdfSafe(gradeText), M, 148, gradeTone)

  const ringX = W - M - 46
  const ringY = 108
  const ratio = report.score?.evaluatedMax ? Math.max(0, Math.min(1, (report.score.earned || 0) / report.score.evaluatedMax)) : 0
  ringSegment(doc, ringX, ringY, 46, 36, 0, Math.PI * 2 - 0.001, [229, 229, 234])
  if (ratio > 0) ringSegment(doc, ringX, ringY, 46, 36, 0, Math.max(0.05, ratio * (Math.PI * 2 - 0.001)), TONES[gradeTone])
  doc.setTextColor(29, 29, 31)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text(String(report.score?.earned ?? '-'), ringX, ringY + 6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(134, 134, 139)
  doc.text(`out of ${report.score?.evaluatedMax ?? 100}`, ringX, ringY + 19, { align: 'center' })

  // The four score cards
  let y = 176
  const keys = ['botAccess', 'jsDifferential', 'bluf', 'facts'].filter((k) => modules[k])
  if (keys.length) {
    const gap = 10
    const cw = (W - M * 2 - gap * (keys.length - 1)) / keys.length
    keys.forEach((k, i) => {
      const m = modules[k]
      const x = M + i * (cw + gap)
      const st = strengthOf(m.score, m.maxScore, m.status)
      const c = TONES[st.tone] || TONES.slate
      card(x, y, cw, 78)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 105)
      doc.text(pdfSafe(moduleLabel(k)), x + 12, y + 18)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(29, 29, 31)
      const sc = m.status === 'unavailable' ? 'n/a' : fmtPts(m.score)
      doc.text(sc, x + 12, y + 44)
      if (m.status !== 'unavailable') {
        const sw = doc.getTextWidth(sc)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(134, 134, 139)
        doc.text(`/ ${m.maxScore}`, x + 14 + sw, y + 44)
        drawBar(doc, x + 12, y + 58, cw - 24, 5, m.maxScore ? m.score / m.maxScore : 0, c, [229, 229, 234])
      }
    })
    y += 78 + 14
  }

  // Google PageSpeed card (same data as the card on the report page)
  if (hasSpeed(report.speed)) {
    const sp = report.speed
    const devs = DEVICES.filter((d) => typeof sp.after?.[d.id]?.score === 'number')
    if (devs.length) {
      const h = 78
      card(M, y, W - M * 2, h, [255, 255, 255])
      doc.setDrawColor(229, 229, 234)
      doc.setLineWidth(0.8)
      doc.roundedRect(M, y, W - M * 2, h, 10, 10, 'S')
      try { doc.addImage(GOOGLE_G_PNG, 'PNG', M + 14, y + 18, 30, 30) } catch { /* logo is optional */ }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(29, 29, 31)
      doc.text('Website speed', M + 54, y + 33)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(134, 134, 139)
      doc.text('Tested with Google PageSpeed', M + 54, y + 47)
      const left = M + 190
      const gap = 10
      const tw = (W - M - left - 12 - gap * (devs.length - 1)) / devs.length
      devs.forEach((d, i) => {
        const x = left + i * (tw + gap)
        const score = sp.after[d.id].score
        const g = speedGrade(score)
        const c = TONES[g.tone] || TONES.slate
        card(x, y + 10, tw, h - 20)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 105)
        doc.text(d.label, x + 10, y + 26)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(20)
        doc.setTextColor(...c)
        doc.text(String(score), x + 10, y + 49)
        const nw = doc.getTextWidth(String(score))
        chip(g.word, x + 16 + nw, y + 47, g.tone)
        drawBar(doc, x + 10, y + 56, tw - 20, 4, score / 100, c, [229, 229, 234])
      })
      y += h + 14
    }
  }

  y += 4
  doc.setFont('helvetica', 'normal')
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
    doc.setFillColor(...BLUE)
    doc.roundedRect(M, y - 11, 3.5, 14, 1.7, 1.7, 'F')
    doc.setTextColor(29, 29, 31)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(text, M + 11, y)
    doc.setFont('helvetica', 'normal')
    y += 8
  }
  const after = () => { y = doc.lastAutoTable.finalY + 22 }
  const base = { theme: 'striped', margin: { left: M, right: M }, styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: [29, 29, 31], lineWidth: 0 }, headStyles: { fillColor: [29, 29, 31], textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [247, 247, 249] } }

  // Overview charts (same data as the on-screen Overview)
  const ov = buildOverview(report)
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
    ensure(120)
    heading('Website speed (Google PageSpeed)')
    y += 8
    const devs = DEVICES.filter((d) => sp.before?.[d.id] || sp.after?.[d.id])
    try { doc.addImage(GOOGLE_G_PNG, 'PNG', M, y, 24, 24) } catch { /* optional */ }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(134, 134, 139)
    doc.text('Lab test with Google PageSpeed Insights (Lighthouse). 90+ is fast, 50-89 needs work, below 50 is slow.', M + 32, y + 15)
    y += 36
    const gapC = 12
    const cwid = (W - M * 2 - gapC * (devs.length - 1)) / devs.length
    devs.forEach((d, i) => {
      const x = M + i * (cwid + gapC)
      const score = sp.after?.[d.id]?.score
      const g = speedGrade(score)
      const c = TONES[g.tone] || TONES.slate
      card(x, y, cwid, 84)
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 105)
      doc.text(d.label, x + 14, y + 20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(30)
      doc.setTextColor(...c)
      doc.text(typeof score === 'number' ? String(score) : '-', x + 14, y + 52)
      const sw = doc.getTextWidth(typeof score === 'number' ? String(score) : '-')
      chip(g.word, x + 22 + sw, y + 48, g.tone)
      const gain = speedGain(sp, d.id)
      if (gain !== null) {
        doc.setFontSize(9)
        doc.setTextColor(...(gain >= 0 ? TONES.emerald : TONES.rose))
        doc.text(`${gain >= 0 ? '+' : ''}${gain} since the previous test`, x + cwid - 14, y + 20, { align: 'right' })
      }
      if (typeof score === 'number') drawBar(doc, x + 14, y + 64, cwid - 28, 6, score / 100, c, [229, 229, 234])
    })
    y += 84 + 18
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
      autoTable(doc, {
        ...base,
        startY: y,
        head: [['Measure', 'Value', 'Rating']],
        body: rows,
        columnStyles: { 1: { halign: 'right', cellWidth: 70 }, 2: { cellWidth: 80, fontStyle: 'bold' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const tone = { Good: 'emerald', 'Needs work': 'amber', Poor: 'rose' }[data.cell.raw]
            if (tone) data.cell.styles.textColor = TONES[tone]
          }
        },
      })
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
