/**
 * Pay Stub / Payslip engine (pure ESM, no DOM): state shape, defaults, the
 * pay-period helpers and calculatePayStub().
 *
 * Money is integer minor units (cents, fils, yen…) and every product is done in
 * BigInt through the Docs Studio money helpers, so net pay is exact. The tool
 * hard-codes NO country's tax rules: every deduction is typed by the user as a
 * fixed amount or as a percentage of gross pay, which is why it works anywhere.
 */

import { currencyExponent, formatMoney, formatQuantity, parseMoneyInput } from '../docs-studio/engine/currency.js'
import { addDays, isIsoDate, isoParts, todayIso } from '../docs-studio/engine/dates.js'
import { QTY_SCALE, RATE_ONE, parseScaledDecimal, percentToMicro, quantityToMilli, roundDiv } from '../docs-studio/engine/money.js'
import { amountInWords } from '../docs-studio/engine/words.js'

export const STORAGE_KEY = 'nexora-pay-stub-v1'

export const FREQUENCIES = Object.freeze([
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
])

export const DOCUMENT_TITLES = Object.freeze(['Pay Stub', 'Payslip', 'Salary Slip', 'Earnings Statement', 'Wage Statement'])

export const PAPER_SIZES = Object.freeze({
  A4: { label: 'A4', w: 210, h: 297 },
  Letter: { label: 'US Letter', w: 215.9, h: 279.4 },
})

export const TEMPLATE_IDS = Object.freeze(['classic', 'modern', 'minimal', 'compact'])

export const LIMITS = Object.freeze({ lines: 20, text: 200, address: 400, notes: 600 })

let counter = 0
export function newId(prefix = 'l') {
  counter += 1
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`
}

export function createEarning(patch = {}) {
  return { id: newId('e'), label: '', type: 'fixed', amount: '', hours: '', rate: '', multiplier: '1', ytd: '', ...patch }
}

export function createDeduction(patch = {}) {
  return { id: newId('d'), label: '', mode: 'fixed', value: '', ytd: '', ...patch }
}

export function createContribution(patch = {}) {
  return { id: newId('c'), label: '', mode: 'fixed', value: '', ...patch }
}

/** A fresh, nearly empty pay stub. */
export function createPayStub({ today = todayIso() } = {}) {
  const period = periodForFrequency('monthly', today)
  return {
    version: 1,
    docTitle: 'Pay Stub',
    currency: 'USD',
    locale: 'en',
    company: { name: '', address: '', email: '', phone: '', taxId: '', logo: null },
    employee: { name: '', id: '', title: '', department: '', address: '', email: '', taxId: '' },
    period: { frequency: 'monthly', start: period.start, end: period.end, payDate: period.end },
    earnings: [createEarning({ label: 'Regular pay', type: 'hourly' }), createEarning({ label: 'Bonus' })],
    deductions: [createDeduction({ label: 'Income tax', mode: 'percent' }), createDeduction({ label: 'Health insurance' })],
    employer: [],
    notes: '',
    signature: null,
    options: { showYtd: false, showEmployer: false, showWords: true, showSignature: true, showComputerNote: false },
    appearance: { template: 'modern', accent: '#0071e3', paper: 'A4' },
  }
}

/** Fully filled, clearly fictional example. */
export function samplePayStub({ today = todayIso() } = {}) {
  const base = createPayStub({ today })
  const p = periodForFrequency('monthly', today)
  return {
    ...base,
    company: { ...base.company, name: 'Northwind Studio Ltd', address: '12 Harbour Road\nSample City 10001', email: 'payroll@northwind.example', phone: '+1 555 0100', taxId: 'EIN 00-0000000', logo: null },
    employee: { name: 'Alex Morgan', id: 'EMP-0042', title: 'Senior Designer', department: 'Creative', address: '48 Elm Street\nSample City 10002', email: '', taxId: 'XXX-XX-1234' },
    period: { frequency: 'monthly', start: p.start, end: p.end, payDate: p.end },
    earnings: [
      createEarning({ label: 'Regular pay', type: 'hourly', hours: '160', rate: '28.00', ytd: '' }),
      createEarning({ label: 'Overtime', type: 'hourly', hours: '8', rate: '28.00', multiplier: '1.5' }),
      createEarning({ label: 'Project bonus', amount: '350.00' }),
    ],
    deductions: [
      createDeduction({ label: 'Income tax withholding', mode: 'percent', value: '14' }),
      createDeduction({ label: 'Social security', mode: 'percent', value: '6.2' }),
      createDeduction({ label: 'Health insurance', value: '120.00' }),
      createDeduction({ label: 'Pension contribution', mode: 'percent', value: '3' }),
    ],
    employer: [createContribution({ label: 'Employer pension match', mode: 'percent', value: '3' })],
    notes: 'Thank you for your work this month.',
  }
}

/* ── Pay periods ───────────────────────────────────────────────────────── */

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const pad = (n) => String(n).padStart(2, '0')

/** { start, end } for a pay frequency, given any ISO date inside/at the start of the period. */
export function periodForFrequency(frequency, anchor = todayIso()) {
  const p = isoParts(anchor) || isoParts(todayIso())
  const iso = `${p.year}-${pad(p.month)}-${pad(p.day)}`
  if (frequency === 'weekly') return { start: iso, end: addDays(iso, 6) }
  if (frequency === 'biweekly') return { start: iso, end: addDays(iso, 13) }
  const last = lastDayOfMonth(p.year, p.month)
  if (frequency === 'semimonthly') {
    return p.day <= 15
      ? { start: `${p.year}-${pad(p.month)}-01`, end: `${p.year}-${pad(p.month)}-15` }
      : { start: `${p.year}-${pad(p.month)}-16`, end: `${p.year}-${pad(p.month)}-${pad(last)}` }
  }
  return { start: `${p.year}-${pad(p.month)}-01`, end: `${p.year}-${pad(p.month)}-${pad(last)}` }
}

/* ── Calculation ───────────────────────────────────────────────────────── */

/** Blank → 0. Otherwise parses money typed by the user; null when invalid or negative. */
export function parseAmount(input, currency, locale = 'en') {
  const text = String(input ?? '').trim()
  if (text === '') return 0
  const parsed = parseMoneyInput(text, currency, locale)
  if (!parsed.ok || parsed.minor < 0) return null
  return parsed.minor
}

function parseHours(input) {
  const text = String(input ?? '').trim()
  if (text === '') return 0
  const milli = quantityToMilli(text)
  return milli === null || milli < 0 ? null : milli
}

function parseMultiplier(input) {
  const text = String(input ?? '').trim()
  if (text === '') return RATE_ONE
  const micro = parseScaledDecimal(text, 6)
  return micro === null || micro < 0n ? null : micro
}

function parsePercent(input) {
  const text = String(input ?? '').trim()
  if (text === '') return 0
  const micro = percentToMicro(text)
  return micro === null || micro < 0 ? null : micro
}

const MAX_MINOR = 9_000_000_000_000_00 // keeps every sum an exact JS integer

function clamp(minor) {
  return Math.min(Math.max(minor, 0), MAX_MINOR)
}

/**
 * Works out every line, the totals and the validation issues.
 * @returns {{
 *  currency: string, exponent: number, earnings: object[], deductions: object[], employer: object[],
 *  gross: number, totalDeductions: number, net: number, employerTotal: number,
 *  ytd: { gross: number, deductions: number, net: number, hasYtd: boolean },
 *  issues: { id: string, severity: 'error' | 'warn', message: string }[], netWords: string,
 * }}
 */
export function calculatePayStub(state) {
  const currency = String(state.currency || 'USD').toUpperCase()
  const locale = state.locale || 'en'
  const issues = []
  const bad = (id, message, severity = 'error') => issues.push({ id, severity, message })
  const money = (minor) => formatMoney(minor, currency, locale)

  const earnings = (state.earnings || []).map((line) => {
    const label = String(line.label || '').trim() || 'Earnings'
    let amount = 0
    let detail = ''
    if (line.type === 'hourly') {
      const rate = parseAmount(line.rate, currency, locale)
      const hours = parseHours(line.hours)
      const mult = parseMultiplier(line.multiplier)
      if (rate === null) bad(line.id, `${label}: the hourly rate is not a valid amount.`)
      if (hours === null) bad(line.id, `${label}: the hours are not a valid number.`)
      if (mult === null) bad(line.id, `${label}: the multiplier is not a valid number.`)
      if (rate !== null && hours !== null && mult !== null) {
        amount = clamp(Number(roundDiv(BigInt(rate) * BigInt(hours) * mult, QTY_SCALE * RATE_ONE)))
        const multiplierText = mult === RATE_ONE ? '' : ` × ${trimNumber(Number(mult) / 1e6)}`
        detail = hours || rate ? `${formatQuantity(hours, locale)} hrs × ${money(rate)}${multiplierText}` : ''
      }
    } else {
      const fixed = parseAmount(line.amount, currency, locale)
      if (fixed === null) bad(line.id, `${label}: the amount is not valid.`)
      else amount = clamp(fixed)
    }
    return { id: line.id, label, detail, amount, ytd: ytdOf(line, currency, locale, bad, label) }
  })

  const gross = earnings.reduce((sum, l) => sum + l.amount, 0)

  const priced = (line, fallbackLabel, withYtd) => {
    const label = String(line.label || '').trim() || fallbackLabel
    let amount = 0
    let detail = ''
    if (line.mode === 'percent') {
      const micro = parsePercent(line.value)
      if (micro === null) bad(line.id, `${label}: the percentage is not valid.`)
      else {
        amount = clamp(Number(roundDiv(BigInt(gross) * BigInt(micro), RATE_ONE)))
        detail = micro ? `${trimNumber(micro / 10_000)}% of gross` : ''
      }
    } else {
      const fixed = parseAmount(line.value, currency, locale)
      if (fixed === null) bad(line.id, `${label}: the amount is not valid.`)
      else amount = clamp(fixed)
    }
    return { id: line.id, label, detail, amount, ytd: withYtd ? ytdOf(line, currency, locale, bad, label) : 0 }
  }

  const deductions = (state.deductions || []).map((l) => priced(l, 'Deduction', true))
  const employer = (state.employer || []).map((l) => priced(l, 'Employer contribution', false))

  const totalDeductions = deductions.reduce((sum, l) => sum + l.amount, 0)
  const employerTotal = employer.reduce((sum, l) => sum + l.amount, 0)
  const net = gross - totalDeductions
  if (net < 0) bad('net', 'Deductions are larger than gross pay, so net pay would be negative.')

  if (!String(state.company?.name || '').trim()) bad('company', 'Add the employer or company name.', 'warn')
  if (!String(state.employee?.name || '').trim()) bad('employee', 'Add the employee name.', 'warn')
  const { start, end, payDate } = state.period || {}
  if (!isIsoDate(start) || !isIsoDate(end)) bad('period', 'Pick the pay period start and end dates.', 'warn')
  else if (start > end) bad('period', 'The pay period ends before it starts.', 'error')
  if (!isIsoDate(payDate)) bad('payDate', 'Pick the pay date.', 'warn')

  const ytdGross = earnings.reduce((s, l) => s + l.ytd, 0)
  const ytdDeductions = deductions.reduce((s, l) => s + l.ytd, 0)
  const hasYtd = [...(state.earnings || []), ...(state.deductions || [])].some((l) => String(l.ytd ?? '').trim() !== '')

  return {
    currency,
    exponent: currencyExponent(currency),
    earnings,
    deductions,
    employer,
    gross,
    totalDeductions,
    net,
    employerTotal,
    ytd: { gross: ytdGross, deductions: ytdDeductions, net: ytdGross - ytdDeductions, hasYtd },
    issues,
    netWords: net >= 0 ? amountInWords(net, currency, { lang: 'en', only: true }) : '',
  }
}

function ytdOf(line, currency, locale, bad, label) {
  const value = parseAmount(line.ytd, currency, locale)
  if (value === null) {
    bad(line.id, `${label}: the year-to-date amount is not valid.`)
    return 0
  }
  return clamp(value)
}

function trimNumber(value) {
  return String(Number(value.toFixed(4)))
}

export function hasErrors(calc) {
  return calc.issues.some((i) => i.severity === 'error')
}

/** File name part: "pay-stub-alex-morgan-2026-10-31". */
export function stubFileName(state, extension) {
  const slug = (value) => String(value || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  const title = slug(state.docTitle) || 'pay-stub'
  const parts = [title, slug(state.employee?.name), isIsoDate(state.period?.payDate) ? state.period.payDate : ''].filter(Boolean)
  return `${parts.join('-')}.${extension}`
}

/* ── Saved draft (this browser only) ───────────────────────────────────── */

/** Restores a saved draft; anything unexpected falls back to a fresh stub. */
export function normalizeStub(input) {
  const base = createPayStub()
  if (!input || typeof input !== 'object') return base
  const text = (v, max = LIMITS.text) => String(v ?? '').slice(0, max)
  const lines = (list, make, pick) => (Array.isArray(list) ? list.slice(0, LIMITS.lines).map((l) => make(pick(l || {}))) : [])
  const image = (v) => (v && typeof v.dataUrl === 'string' && v.dataUrl.startsWith('data:image/') && v.width > 0 && v.height > 0 ? { dataUrl: v.dataUrl, width: Number(v.width), height: Number(v.height) } : null)
  const company = input.company || {}
  const employee = input.employee || {}
  const period = input.period || {}
  const options = input.options || {}
  const appearance = input.appearance || {}
  const freq = FREQUENCIES.some((f) => f.value === period.frequency) ? period.frequency : base.period.frequency
  return {
    ...base,
    docTitle: DOCUMENT_TITLES.includes(input.docTitle) ? input.docTitle : base.docTitle,
    currency: /^[A-Z]{3}$/.test(String(input.currency || '')) ? input.currency : base.currency,
    company: { name: text(company.name), address: text(company.address, LIMITS.address), email: text(company.email), phone: text(company.phone), taxId: text(company.taxId), logo: image(company.logo) },
    employee: { name: text(employee.name), id: text(employee.id), title: text(employee.title), department: text(employee.department), address: text(employee.address, LIMITS.address), email: text(employee.email), taxId: text(employee.taxId) },
    period: {
      frequency: freq,
      start: isIsoDate(period.start) ? period.start : base.period.start,
      end: isIsoDate(period.end) ? period.end : base.period.end,
      payDate: isIsoDate(period.payDate) ? period.payDate : base.period.payDate,
    },
    earnings: lines(input.earnings, createEarning, (l) => ({ id: text(l.id, 40) || undefined, label: text(l.label, 80), type: l.type === 'hourly' ? 'hourly' : 'fixed', amount: text(l.amount, 24), hours: text(l.hours, 12), rate: text(l.rate, 24), multiplier: text(l.multiplier, 8) || '1', ytd: text(l.ytd, 24) })),
    deductions: lines(input.deductions, createDeduction, (l) => ({ id: text(l.id, 40) || undefined, label: text(l.label, 80), mode: l.mode === 'percent' ? 'percent' : 'fixed', value: text(l.value, 24), ytd: text(l.ytd, 24) })),
    employer: lines(input.employer, createContribution, (l) => ({ id: text(l.id, 40) || undefined, label: text(l.label, 80), mode: l.mode === 'percent' ? 'percent' : 'fixed', value: text(l.value, 24) })),
    notes: text(input.notes, LIMITS.notes),
    signature: image(input.signature),
    options: {
      showYtd: Boolean(options.showYtd), showEmployer: Boolean(options.showEmployer), showWords: options.showWords !== false,
      showSignature: options.showSignature !== false, showComputerNote: Boolean(options.showComputerNote),
    },
    appearance: {
      template: TEMPLATE_IDS.includes(appearance.template) ? appearance.template : base.appearance.template,
      accent: /^#[0-9a-f]{6}$/i.test(String(appearance.accent || '')) ? appearance.accent : base.appearance.accent,
      paper: Object.hasOwn(PAPER_SIZES, appearance.paper) ? appearance.paper : base.appearance.paper,
    },
  }
}
