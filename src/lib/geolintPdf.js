/**
 * GeoLint report as a PDF (jsPDF + autotable, loaded only when the visitor
 * clicks Download). Built from the engine's report object alone, so the PDF
 * and the report page can never disagree. Text is reduced to Latin-1 because
 * the built-in Helvetica cannot draw anything else.
 */
import { domainTiles, gradeFor, verifyReportClient, hostLabel, issueLabel, reportFileBase, strengthOf, summarizeReport, verdictInfo } from './geolintReport.js'
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
  heading('Fix these first')
  if (fixes.length) {
    autoTable(doc, {
      ...base,
      startY: y,
      head: [['#', 'What to fix, and how', 'Up to']],
      body: fixes.map((f, i) => [
        String(i + 1),
        pdfSafe([
          `${String(f.priority || '').toUpperCase()} - ${f.title}`,
          f.evidence?.length ? `Measured: ${f.evidence.join('; ')}` : '',
          ...(f.steps || []).map((st, n) => `${n + 1}. ${st}`),
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
    doc.text('Free GEO audit by Nexora Solution - nexorasolution.online/tools/geo-audit/', M, doc.internal.pageSize.getHeight() - 24)
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
