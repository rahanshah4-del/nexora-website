/**
 * Draws the daily report (from dailyReportLogic.buildDailyReport) as an A4 PDF
 * with PDFKit's built-in Helvetica, so no font files are needed.
 */
import PDFDocument from 'pdfkit'
import { PKT_OFFSET_MS } from './dailyReportLogic.js'

const C = {
  navy: '#0f172a', ink: '#1e293b', mute: '#64748b', faint: '#94a3b8', line: '#e2e8f0', soft: '#f1f5f9', card: '#f8fafc',
  brand: '#4f46e5', blue: '#2563eb', sky: '#0ea5e9', green: '#16a34a', amber: '#d97706', red: '#dc2626', white: '#ffffff',
}
const SEV = { high: C.red, medium: C.amber, low: C.faint }
const STATUS = { good: ['All good today', C.green], watch: ['A few things to watch', C.amber], attention: ['Needs your attention', C.red] }

/** Built-in PDF fonts only cover Latin-1; replace everything else. */
export function pdfText(value) {
  return String(value ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[^\x20-\x7e\xa0-\xff\n]/g, '')
}
const fmt = (n) => (n === null || n === undefined ? '-' : Number(n).toLocaleString('en-US'))
const pct = (v) => (v === null || v === undefined ? '' : `${v >= 0 ? '+' : ''}${v}%`)
const pktTime = (ms) => {
  const d = new Date(ms + PKT_OFFSET_MS)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} PKT`
}

export function renderReportPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: `Nexora daily report - ${report.period.label}`, Author: 'Nexora Sentinel' } })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    try {
      draw(doc, report)
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

function draw(doc, r) {
  const W = doc.page.width
  const H = doc.page.height
  const L = 40
  const R = W - 40
  const CW = R - L
  let y = 0

  const text = (t, x, yy, opts = {}) => doc.text(pdfText(t), x, yy, { lineBreak: false, ...opts })
  const font = (bold, size, color = C.ink) => doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color)

  function pageHeader(title) {
    doc.rect(0, 0, W, 54).fill(C.navy)
    font(true, 9, '#93c5fd'); text('NEXORA DAILY REPORT', L, 16, { characterSpacing: 1.5 })
    font(true, 15, C.white); text(title, L, 28)
    font(false, 9, '#cbd5e1'); text(r.period.label, L, 20, { width: CW, align: 'right' })
    y = 74
  }
  function newPage(title) { doc.addPage(); pageHeader(title) }
  // A new part starts on a fresh page unless the current page is mostly empty.
  function startPart(title) { if (y > H * 0.42) newPage(title); else y += 10 }
  function ensure(h, title) { if (y + h > H - 60) newPage(`${title} (continued)`) }
  function section(title, sub) {
    ensure(40, title)
    font(true, 13, C.navy); text(title, L, y)
    if (sub) { font(false, 8.5, C.mute); text(sub, L, y + 2, { width: CW, align: 'right' }) }
    y += 18
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.6).strokeColor(C.line).stroke()
    y += 10
  }
  function card(x, yy, w, h, fill = C.card) {
    doc.roundedRect(x, yy, w, h, 8).fillAndStroke(fill, C.line)
  }
  function barList(items, x, yy, w, color, max = 6) {
    const list = items.slice(0, max)
    const peak = Math.max(1, ...list.map((i) => i.count))
    list.forEach((item, i) => {
      const rowY = yy + i * 18
      font(false, 8.5, C.ink); text(item.label, x, rowY, { width: w * 0.55, ellipsis: true })
      const bx = x + w * 0.57
      const bw = (w * 0.3) * (item.count / peak)
      doc.roundedRect(bx, rowY + 1, Math.max(2, bw), 8, 3).fill(color)
      font(true, 8.5, C.ink); text(fmt(item.count), x, rowY, { width: w, align: 'right' })
    })
    if (!list.length) { font(false, 8.5, C.faint); text('No data', x, yy) }
    return yy + Math.max(1, list.length) * 18
  }

  // ---------------------------------------------------------------- page 1: overview
  doc.rect(0, 0, W, 132).fill(C.navy)
  doc.rect(0, 128, W, 4).fill(C.brand)
  font(true, 10, '#93c5fd'); text('NEXORA SOLUTION', L, 30, { characterSpacing: 2 })
  font(true, 24, C.white); text('Daily Report', L, 46)
  font(false, 11, '#cbd5e1'); text(r.period.label, L, 78)
  font(false, 8.5, C.faint); text(`Last 24 hours, compared with the day before. Generated ${pktTime(r.generatedAt)}.`, L, 96)
  const [statusText, statusColor] = STATUS[r.status]
  font(true, 10, C.white)
  const pillW = doc.widthOfString(statusText) + 26
  doc.roundedRect(R - pillW, 46, pillW, 24, 12).fill(statusColor)
  font(true, 10, C.white); text(statusText, R - pillW, 53, { width: pillW, align: 'center' })
  y = 152

  const kpis = [
    ['Visitors', fmt(r.traffic.visitors), r.changes.visitors],
    ['Page views', fmt(r.traffic.pageViews), r.changes.pageViews],
    ['Sessions', fmt(r.traffic.sessions), r.changes.sessions],
    ['Signups', fmt(r.traffic.funnel.signupCompleted), null],
  ]
  const kw = (CW - 30) / 4
  kpis.forEach(([label, value, delta], i) => {
    const x = L + i * (kw + 10)
    card(x, y, kw, 70, C.white)
    font(false, 8.5, C.mute); text(label, x + 12, y + 12)
    font(true, 22, C.navy); text(value, x + 12, y + 27)
    if (delta !== null && delta !== undefined) { font(true, 9, delta >= 0 ? C.green : C.red); text(`${pct(delta)} vs yesterday`, x + 12, y + 53) }
  })
  y += 88

  // highlights
  const hl = r.highlights.slice(0, 7)
  const hlH = 28 + hl.length * 15
  card(L, y, CW, hlH, '#eef2ff')
  font(true, 11, C.brand); text('Highlights', L + 14, y + 10)
  hl.forEach((h, i) => {
    doc.circle(L + 18, y + 33 + i * 15, 2).fill(C.brand)
    font(false, 9.5, C.ink); text(h, L + 26, y + 28 + i * 15, { width: CW - 40, ellipsis: true })
  })
  y += hlH + 18

  // problems
  section('Problems and what to do', `${r.problems.length} item(s)`)
  if (!r.problems.length) {
    card(L, y, CW, 40, '#f0fdf4')
    font(true, 10.5, C.green); text('No problems found in the last 24 hours.', L + 14, y + 14)
    y += 52
  }
  for (const p of r.problems) {
    font(false, 8.5, C.mute)
    const detailH = p.detail ? doc.heightOfString(pdfText(p.detail), { width: CW - 40 }) : 0
    const h = 30 + detailH + (p.action ? 13 : 0)
    ensure(h + 8, 'Problems and what to do')
    card(L, y, CW, h, C.white)
    doc.rect(L, y, 4, h).fill(SEV[p.severity])
    font(true, 7.5, SEV[p.severity]); text(p.severity.toUpperCase(), L + 14, y + 9)
    font(true, 10, C.navy); text(p.title, L + 60, y + 8, { width: CW - 74, ellipsis: true })
    let yy = y + 23
    if (p.detail) { font(false, 8.5, C.mute); doc.text(pdfText(p.detail), L + 14, yy, { width: CW - 40 }); yy += detailH }
    if (p.action) { font(true, 8.5, C.blue); text(`What to do: ${p.action}`, L + 14, yy + 2, { width: CW - 28, ellipsis: true }) }
    y += h + 8
  }

  // ---------------------------------------------------------------- page 2: traffic
  startPart('Website traffic')
  section('Visitors by hour (Pakistan time)', `${fmt(r.traffic.pageViews)} page views`)
  const chartH = 120
  card(L, y, CW, chartH + 34, C.white)
  const peak = Math.max(1, ...r.traffic.hourly)
  const bw = (CW - 40) / 24
  r.traffic.hourly.forEach((v, h) => {
    const bh = (v / peak) * chartH
    const x = L + 20 + h * bw
    doc.roundedRect(x + 2, y + 12 + chartH - bh, bw - 4, Math.max(1, bh), 2).fill(v === peak && v > 0 ? C.brand : '#a5b4fc')
    if (h % 3 === 0) { font(false, 7, C.mute); text(String(h).padStart(2, '0'), x, y + chartH + 17, { width: bw, align: 'center' }) }
  })
  y += chartH + 50

  section('Most visited pages')
  const pages = r.traffic.topPages
  card(L, y, CW, 20 + Math.max(1, pages.length) * 17, C.white)
  font(true, 8, C.mute); text('PAGE', L + 12, y + 8); text('VIEWS', L, y + 8, { width: CW - 12, align: 'right' })
  pages.forEach((p, i) => {
    const ry = y + 24 + i * 17
    if (i % 2) doc.rect(L + 1, ry - 4, CW - 2, 17).fill(C.card)
    font(false, 9, C.ink); text(p.label, L + 12, ry, { width: CW - 90, ellipsis: true })
    font(true, 9, C.ink); text(fmt(p.count), L, ry, { width: CW - 12, align: 'right' })
  })
  if (!pages.length) { font(false, 9, C.faint); text('No page views recorded.', L + 12, y + 24) }
  y += 40 + Math.max(1, pages.length) * 17

  const colW = (CW - 16) / 2
  ensure(140, 'Website traffic')
  section('Where visitors came from')
  const topY = y
  font(true, 9.5, C.navy); text('Sources', L, y)
  const leftEnd = barList(r.traffic.referrers, L, y + 16, colW, C.blue)
  font(true, 9.5, C.navy); text('Countries', L + colW + 16, topY)
  const rightEnd = barList(r.traffic.countries, L + colW + 16, topY + 16, colW, C.sky)
  y = Math.max(leftEnd, rightEnd) + 14
  ensure(110, 'Website traffic')
  const y2 = y
  font(true, 9.5, C.navy); text('Devices', L, y)
  const e1 = barList(r.traffic.devices, L, y + 16, colW, C.brand, 4)
  font(true, 9.5, C.navy); text('Browsers', L + colW + 16, y2)
  const e2 = barList(r.traffic.browsers, L + colW + 16, y2 + 16, colW, C.faint, 5)
  y = Math.max(e1, e2) + 14

  ensure(70, 'Website traffic')
  section('Signup and login funnel')
  const f = r.traffic.funnel
  const fItems = [['Signup started', f.signupStarted], ['Signup completed', f.signupCompleted], ['Onboarding done', f.onboardingCompleted], ['Logins', f.loginCompleted], ['Failed logins', f.loginFailed], ['Upgrade requests', f.upgradeRequests]]
  const fw = (CW - 50) / 6
  fItems.forEach(([label, v], i) => {
    const x = L + i * (fw + 10)
    card(x, y, fw, 48, C.white)
    font(false, 7.5, C.mute); text(label, x + 8, y + 9, { width: fw - 12, ellipsis: true })
    font(true, 15, label === 'Failed logins' && v >= 10 ? C.red : C.navy); text(fmt(v), x + 8, y + 23)
  })
  y += 62

  // ---------------------------------------------------------------- page 3: tools and business
  startPart('Free tools and business')
  section('Free tools ranking', 'by visitors, last 24 hours')
  const tools = r.tools.slice(0, 14)
  card(L, y, CW, 24 + Math.max(1, tools.length) * 20, C.white)
  font(true, 8, C.mute)
  text('#', L + 12, y + 9); text('TOOL', L + 30, y + 9); text('VISITORS', L + 250, y + 9); text('VIEWS', L + 320, y + 9); text('VS YESTERDAY', L + 380, y + 9)
  const tPeak = Math.max(1, ...tools.map((t) => t.visitors))
  tools.forEach((t, i) => {
    const ry = y + 28 + i * 20
    if (i === 0 && t.visitors > 0) doc.rect(L + 1, ry - 5, CW - 2, 20).fill('#eef2ff')
    font(true, 9, i === 0 ? C.brand : C.mute); text(String(i + 1), L + 12, ry)
    font(i === 0 ? true : false, 9, C.ink); text(t.label, L + 30, ry, { width: 200, ellipsis: true })
    doc.roundedRect(L + 272, ry + 2, Math.max(2, 40 * (t.visitors / tPeak)), 6, 3).fill(C.brand)
    font(true, 9, C.ink); text(fmt(t.visitors), L + 250, ry)
    font(false, 9, C.ink); text(fmt(t.views), L + 320, ry)
    font(true, 9, t.change === null ? C.faint : t.change >= 0 ? C.green : C.red); text(t.change === null ? (t.visitors ? 'new' : '-') : pct(t.change), L + 380, ry)
  })
  if (!tools.length) { font(false, 9, C.faint); text('No tool visits recorded.', L + 30, y + 28) }
  y += 44 + Math.max(1, tools.length) * 20

  section('Business', 'from Firestore')
  const b = r.business
  const bItems = b ? [
    ['New users', b.newUsers], ['New workspaces', b.newWorkspaces], ['New leads', b.newLeads], ['Leads not contacted', b.uncontactedLeads],
    ['Upgrade requests (new)', b.newUpgrades], ['Upgrades waiting', b.pendingUpgrades], ['Open tickets', b.openTickets], ['Service requests (new)', b.newServiceRequests],
    ['Comments to approve', b.pendingComments], ['Trials ending in 3 days', b.trialsEndingSoon],
  ] : []
  if (!b) { font(false, 9, C.faint); text('Business data could not be read.', L, y); y += 20 }
  const bw4 = (CW - 30) / 4
  bItems.forEach(([label, v], i) => {
    const x = L + (i % 4) * (bw4 + 10)
    const yy = y + Math.floor(i / 4) * 56
    const warn = (label.startsWith('Upgrades waiting') || label.startsWith('Open tickets') || label.startsWith('Leads not')) && v > 0
    card(x, yy, bw4, 46, warn ? '#fff7ed' : C.white)
    font(false, 7.5, C.mute); text(label, x + 10, yy + 8, { width: bw4 - 16, ellipsis: true })
    font(true, 15, warn ? C.amber : C.navy); text(v === null || v === undefined ? 'n/a' : fmt(v), x + 10, yy + 22)
  })
  y += Math.ceil(bItems.length / 4) * 56 + 8

  if (r.tempMail) {
    ensure(150, 'Free tools and business')
    section('Temp Mail tool', 'UTC days')
    const rows = [['Addresses created', 'created'], ['Mails received', 'mail_received'], ['Codes detected', 'codes_found'], ['Bots blocked', 'verdict_bot'], ['Bans', 'bans'], ['Rate limited', 'rate_limited'], ['Captcha failed', 'captcha_failed']]
    card(L, y, CW, 22 + rows.length * 16, C.white)
    font(true, 8, C.mute); text('METRIC', L + 12, y + 8); text('TODAY', L + 260, y + 8); text('YESTERDAY', L + 340, y + 8); text('7 DAYS', L + 430, y + 8)
    rows.forEach(([label, key], i) => {
      const ry = y + 24 + i * 16
      font(false, 9, C.ink); text(label, L + 12, ry)
      font(true, 9, C.ink); text(fmt(r.tempMail.today[key] || 0), L + 260, ry)
      font(false, 9, C.ink); text(fmt(r.tempMail.yesterday[key] || 0), L + 340, ry); text(fmt(r.tempMail.week[key] || 0), L + 430, ry)
    })
    y += 32 + rows.length * 16
  }

  // ---------------------------------------------------------------- page 4: system health
  startPart('System health')
  const h = r.health
  if (!h) {
    font(false, 10, C.mute); text('The Sentinel could not be reached, so system health is missing from this report.', L, y, { width: CW, lineBreak: true })
    y += 30
  } else {
    section('Live checks', `overall: ${h.overall}`)
    card(L, y, CW, 22 + Math.max(1, h.checks.length) * 16, C.white)
    font(true, 8, C.mute); text('SERVICE', L + 24, y + 8); text('GROUP', L + 230, y + 8); text('UPTIME', L + 340, y + 8); text('SPEED', L + 410, y + 8)
    h.checks.forEach((c, i) => {
      const ry = y + 24 + i * 16
      doc.circle(L + 14, ry + 4, 3.5).fill(!c.ok ? C.red : c.slow ? C.amber : C.green)
      font(false, 9, C.ink); text(c.label, L + 24, ry, { width: 200, ellipsis: true })
      font(false, 8.5, C.mute); text(c.group, L + 230, ry)
      font(true, 9, c.uptime !== null && c.uptime < 95 ? C.amber : C.ink); text(c.uptime === null ? '-' : `${c.uptime}%`, L + 340, ry)
      font(false, 9, C.ink); text(c.ms ? `${c.ms} ms` : '-', L + 410, ry)
    })
    y += 42 + Math.max(1, h.checks.length) * 16

    section('Outages in the last 24 hours')
    if (!h.incidents.length) { font(false, 9.5, C.green); text('None.', L, y); y += 20 }
    h.incidents.forEach((i) => {
      ensure(20, 'System health')
      const mins = i.resolvedAt ? Math.max(1, Math.round((i.resolvedAt - i.openedAt) / 60000)) : null
      doc.circle(L + 4, y + 4, 3).fill(i.resolvedAt ? C.amber : C.red)
      font(true, 9, C.ink); text(i.label, L + 14, y)
      font(false, 8.5, C.mute); text(`${i.resolvedAt ? `down ${mins} min, recovered` : 'STILL DOWN'} - ${i.lastError}`, L + 170, y, { width: CW - 170, ellipsis: true })
      y += 16
    })
    y += 6

    section('Automatic fixes')
    if (!h.fixes.length) { font(false, 9.5, C.mute); text('Nothing needed fixing.', L, y); y += 20 }
    h.fixes.slice(0, 10).forEach((fx) => {
      ensure(18, 'System health')
      font(true, 9, fx.recovered ? C.green : C.amber); text(fx.recovered ? 'FIXED' : 'NOT FIXED', L, y)
      font(false, 8.5, C.ink); text(`${fx.label}: ${(fx.actions || []).join('; ')}`, L + 70, y, { width: CW - 70, ellipsis: true })
      y += 16
    })
    y += 6
  }

  const ferr = r.traffic.frontendErrors
  const berr = h?.browserErrors || []
  section('Errors visitors hit', `${ferr.reduce((n, e) => n + e.count, 0)} in analytics`)
  if (!ferr.length && !berr.length) { font(false, 9.5, C.green); text('No browser errors reported.', L, y); y += 20 }
  ;[...ferr.map((e) => ({ message: e.message, page: e.page, count: e.count })), ...berr.map((e) => ({ message: e.message, page: e.page, count: e.count }))].slice(0, 12).forEach((e) => {
    ensure(28, 'System health')
    font(true, 8.5, C.red); text(`${fmt(e.count)}x`, L, y)
    font(false, 8.5, C.ink); text(e.message, L + 40, y, { width: CW - 40, ellipsis: true })
    font(false, 7.5, C.mute); text(e.page, L + 40, y + 11, { width: CW - 40, ellipsis: true })
    y += 26
  })

  // ---------------------------------------------------------------- footers
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    doc.page.margins.bottom = 0
    doc.moveTo(L, H - 36).lineTo(R, H - 36).lineWidth(0.5).strokeColor(C.line).stroke()
    font(false, 7.5, C.faint)
    text('Nexora Solution - automatic daily report by Nexora Sentinel', L, H - 28)
    text(`Page ${i + 1} of ${range.count}`, L, H - 28, { width: CW, align: 'right' })
  }
}
