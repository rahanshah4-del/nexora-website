import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCurrencyMeta, listCurrencies } from '../docs-studio/engine/currency.js'
import { downloadJson, readFileText } from '../docs-studio/io/files.js'
import { ACCENT_PRESETS, onAccentColor } from '../docs-studio/templates/color.js'
import {
  DOCUMENT_TITLES, FREQUENCIES, LIMITS, PAPER_SIZES, STORAGE_KEY, TEMPLATE_IDS,
  calculatePayStub, createContribution, createDeduction, createEarning, createPayStub,
  hasErrors, normalizeStub, periodForFrequency, samplePayStub, stubFileName,
} from './engine.js'
import { browserLayout, downloadPdf, downloadPng, downloadXlsx, printStub, shareStub } from './exporters.js'
import { ACCEPTED_IMAGES, prepareImage } from './image.js'
import { TEMPLATES, layoutToSvg } from './layout.js'

/* ── Small pieces ──────────────────────────────────────────────────────── */

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'

function Field({ label, children, className = '', hint }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}

function Text({ value, onChange, maxLength = LIMITS.text, ...rest }) {
  return <input className={INPUT} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} {...rest} />
}

function Money({ value, onChange, placeholder = '0.00', ...rest }) {
  return <input className={INPUT} inputMode="decimal" autoComplete="off" value={value} placeholder={placeholder} maxLength={24} onChange={(e) => onChange(e.target.value)} {...rest} />
}

function Segmented({ value, options, onChange, label, tone = 'bg-slate-900 text-white' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[34px] rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${value === o.value ? `${tone} shadow-sm` : 'text-slate-600 hover:text-slate-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const TONES = {
  blue: { bar: 'from-blue-600 to-sky-500', chip: 'bg-blue-50 text-blue-700 ring-blue-100', seg: 'bg-blue-600 text-white' },
  violet: { bar: 'from-violet-600 to-fuchsia-500', chip: 'bg-violet-50 text-violet-700 ring-violet-100', seg: 'bg-violet-600 text-white' },
  amber: { bar: 'from-amber-500 to-orange-500', chip: 'bg-amber-50 text-amber-700 ring-amber-100', seg: 'bg-amber-600 text-white' },
  emerald: { bar: 'from-emerald-600 to-teal-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', seg: 'bg-emerald-600 text-white' },
  rose: { bar: 'from-rose-600 to-pink-500', chip: 'bg-rose-50 text-rose-700 ring-rose-100', seg: 'bg-rose-600 text-white' },
  slate: { bar: 'from-slate-700 to-slate-500', chip: 'bg-slate-100 text-slate-700 ring-slate-200', seg: 'bg-slate-700 text-white' },
  indigo: { bar: 'from-indigo-600 to-blue-500', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-100', seg: 'bg-indigo-600 text-white' },
}

function Card({ step, title, subtitle, tone, children, aside }) {
  const t = TONES[tone]
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
      <div className={`h-1.5 bg-gradient-to-r ${t.bar}`} aria-hidden="true" />
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.bar} font-display text-sm font-bold text-white`} aria-hidden="true">{step}</span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-slate-950">{title}</h3>
              {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
            </div>
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  )
}

function QuickChips({ items, onPick, tone }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick add">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onPick(item)}
          className={`min-h-[32px] rounded-full px-3 text-xs font-semibold ring-1 transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${TONES[tone].chip}`}
        >
          + {item.label}
        </button>
      ))}
    </div>
  )
}

function RemoveButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Remove ${label}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
  )
}

function AddButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <span aria-hidden="true">+</span>{children}
    </button>
  )
}

function ImagePicker({ label, image, onPick, onClear, hint }) {
  const ref = useRef(null)
  return (
    <div>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2.5">
        {image ? <img src={image.dataUrl} alt="" className="h-10 w-16 rounded bg-white object-contain ring-1 ring-slate-200" /> : <span className="flex h-10 w-16 items-center justify-center rounded bg-white text-[10px] text-slate-400 ring-1 ring-slate-200">none</span>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => ref.current?.click()} className="min-h-[34px] rounded-full bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{image ? 'Replace' : 'Upload'}</button>
          {image ? <button type="button" onClick={onClear} className="min-h-[34px] rounded-full px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">Remove</button> : null}
        </div>
        <input ref={ref} type="file" accept={ACCEPTED_IMAGES} className="sr-only" tabIndex={-1} aria-label={label} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f) }} />
      </div>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </div>
  )
}

function Toggle({ checked, onChange, children }) {
  return (
    <label className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-xl px-1 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
      <span>{children}</span>
    </label>
  )
}

/* ── Quick-add presets ─────────────────────────────────────────────────── */

const EARNING_PRESETS = [
  { label: 'Overtime', patch: { label: 'Overtime', type: 'hourly', multiplier: '1.5' } },
  { label: 'Bonus', patch: { label: 'Bonus' } },
  { label: 'Commission', patch: { label: 'Commission' } },
  { label: 'Allowance', patch: { label: 'Allowance' } },
  { label: 'Tips', patch: { label: 'Tips' } },
  { label: 'Holiday pay', patch: { label: 'Holiday pay' } },
]
const DEDUCTION_PRESETS = [
  { label: 'Income tax', patch: { label: 'Income tax', mode: 'percent' } },
  { label: 'Social security', patch: { label: 'Social security', mode: 'percent' } },
  { label: 'Pension', patch: { label: 'Pension contribution', mode: 'percent' } },
  { label: 'Health insurance', patch: { label: 'Health insurance' } },
  { label: 'Loan repayment', patch: { label: 'Loan repayment' } },
  { label: 'Union dues', patch: { label: 'Union dues' } },
]
const EMPLOYER_PRESETS = [
  { label: 'Pension match', patch: { label: 'Employer pension match', mode: 'percent' } },
  { label: 'Social security', patch: { label: 'Employer social security', mode: 'percent' } },
  { label: 'Health insurance', patch: { label: 'Employer health insurance' } },
]

/* ── Draft storage (this browser only) ─────────────────────────────────── */

function loadDraft() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeStub(JSON.parse(raw))
  } catch { /* private window or blocked storage */ }
  return createPayStub()
}

function saveDraft(state) {
  try {
    const json = JSON.stringify(state)
    if (json.length < 4_000_000) window.localStorage.setItem(STORAGE_KEY, json)
  } catch { /* quota or blocked storage: the editor still works */ }
}

const CURRENCY_OPTIONS = (() => {
  const names = (code) => { try { return getCurrencyMeta(code).name } catch { return code } }
  return listCurrencies().map((code) => ({ code, name: names(code) }))
})()

/* ── The editor ────────────────────────────────────────────────────────── */

export default function PayStubApp() {
  const [state, setState] = useState(() => loadDraft())
  const [view, setView] = useState('edit')
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState(null)
  const [fontTick, setFontTick] = useState(0)
  const toastTimer = useRef(null)

  const calc = useMemo(() => calculatePayStub(state), [state])
  const layout = useMemo(() => {
    void fontTick // re-measure once the page font has loaded
    return browserLayout(state, calc)
  }, [state, calc, fontTick])
  const svg = useMemo(() => layoutToSvg(layout), [layout])

  useEffect(() => {
    const id = setTimeout(() => saveDraft(state), 400)
    return () => clearTimeout(id)
  }, [state])

  // Measure again once the page font has loaded, so the preview wraps exactly as the PNG does.
  useEffect(() => {
    let alive = true
    document.fonts?.ready?.then(() => { if (alive) setFontTick((n) => n + 1) })
    return () => { alive = false }
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const say = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  /* state helpers */
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  const setIn = (section, patch) => setState((s) => ({ ...s, [section]: { ...s[section], ...patch } }))
  const patchLine = (list, id, patch) => setState((s) => ({ ...s, [list]: s[list].map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
  const addLine = (list, make, patch = {}) => setState((s) => (s[list].length >= LIMITS.lines ? s : { ...s, [list]: [...s[list], make(patch)] }))
  const removeLine = (list, id) => setState((s) => ({ ...s, [list]: s[list].filter((l) => l.id !== id) }))

  const setFrequency = (frequency) => setState((s) => {
    const p = periodForFrequency(frequency, s.period.start)
    const followEnd = !s.period.payDate || s.period.payDate === s.period.end
    return { ...s, period: { frequency, start: p.start, end: p.end, payDate: followEnd ? p.end : s.period.payDate } }
  })
  const setStart = (start) => setState((s) => {
    const p = periodForFrequency(s.period.frequency, start || s.period.start)
    const followEnd = !s.period.payDate || s.period.payDate === s.period.end
    return { ...s, period: { ...s.period, start: start || s.period.start, end: start ? p.end : s.period.end, payDate: followEnd && start ? p.end : s.period.payDate } }
  })

  const pickImage = async (key, file, maxSize) => {
    try {
      const image = await prepareImage(file, { maxSize })
      if (key === 'logo') setIn('company', { logo: image })
      else set({ signature: image })
    } catch (error) {
      say(error.message || 'That image could not be read.', 'error')
    }
  }

  const restoreRef = useRef(null)
  const backup = () => {
    downloadJson(stubFileName(state, 'json'), state)
    say('Backup saved. Use Restore to load it again on any device.', 'ok')
  }
  const restore = async (file) => {
    try {
      const parsed = JSON.parse(await readFileText(file, 6 * 1024 * 1024))
      setState(normalizeStub(parsed))
      say('Backup restored.', 'ok')
    } catch {
      say('That file is not a pay stub backup.', 'error')
    }
  }
  const loadExample = () => setState((s) => ({ ...samplePayStub(), appearance: s.appearance, currency: 'USD' }))
  const reset = () => {
    if (window.confirm('Clear everything and start a new pay stub?')) setState((s) => ({ ...createPayStub(), appearance: s.appearance }))
  }

  /* actions */
  const run = async (id, task) => {
    if (hasErrors(calc)) {
      say(calc.issues.find((i) => i.severity === 'error')?.message || 'Fix the highlighted problem first.', 'error')
      return
    }
    setBusy(id)
    try {
      await task()
    } catch (error) {
      say(error?.message || 'Something went wrong. Try Print instead.', 'error')
    } finally {
      setBusy('')
    }
  }
  const complexNote = 'PDF cannot yet include Arabic, Urdu or Hebrew text. Use Print, then choose Save as PDF.'
  const actions = {
    pdf: () => run('pdf', async () => {
      const result = await downloadPdf({ state, calc })
      if (!result.ok) say(complexNote, 'error')
      else say(result.fontFallback ? 'PDF saved. The Unicode font did not load, so symbols were simplified.' : 'PDF downloaded.', 'ok')
    }),
    png: () => run('png', async () => { await downloadPng({ state, calc }); say('PNG image downloaded.', 'ok') }),
    excel: () => run('excel', async () => { downloadXlsx({ state, calc }); say('Excel file downloaded.', 'ok') }),
    print: () => run('print', async () => { printStub({ state, calc }) }),
    whatsapp: () => run('whatsapp', async () => {
      const r = await shareStub({ state, calc, channel: 'whatsapp' })
      say(r.mode === 'blocked' ? complexNote : r.mode === 'opened' ? 'PDF saved. Attach it to the WhatsApp message that just opened.' : 'Shared.', r.mode === 'blocked' ? 'error' : 'ok')
    }),
    email: () => run('email', async () => {
      const r = await shareStub({ state, calc, channel: 'email' })
      say(r.mode === 'blocked' ? complexNote : r.mode === 'opened' ? 'PDF saved. Attach it to the email that just opened.' : 'Shared.', r.mode === 'blocked' ? 'error' : 'ok')
    }),
  }

  const accent = state.appearance.accent
  const onAccent = onAccentColor(accent)
  const money = (minor) => {
    try { return new Intl.NumberFormat(state.locale || 'en', { style: 'currency', currency: calc.currency, minimumFractionDigits: calc.exponent, maximumFractionDigits: calc.exponent }).format(minor / 10 ** calc.exponent) } catch { return `${calc.currency} ${(minor / 10 ** calc.exponent).toFixed(calc.exponent)}` }
  }
  const visibleIssues = calc.issues.slice(0, 3)
  const showYtd = state.options.showYtd

  const edit = (
    <div className="space-y-4">
      {/* Look & feel */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
        <div className="h-1.5 bg-gradient-to-r from-fuchsia-500 via-blue-500 to-emerald-500" aria-hidden="true" />
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-950">Design</h3>
            <p className="text-xs text-slate-500">Pick a template and your brand colour. The preview updates instantly.</p>
          </div>
          <div role="radiogroup" aria-label="Template" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEMPLATE_IDS.map((id) => {
              const active = state.appearance.template === id
              return (
                <button key={id} type="button" role="radio" aria-checked={active} onClick={() => setIn('appearance', { template: id })} className={`rounded-xl border p-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? 'border-transparent shadow-md ring-2' : 'border-slate-200 hover:border-slate-300'}`} style={active ? { '--tw-ring-color': accent } : undefined}>
                  <span className="mb-2 block h-12 rounded-md border border-slate-200 bg-white p-1.5" aria-hidden="true">
                    <span className="block h-1.5 w-2/3 rounded-sm" style={{ background: id === 'minimal' ? '#94a3b8' : accent }} />
                    <span className="mt-1 block h-1 w-full rounded-sm bg-slate-200" />
                    <span className="mt-1 block h-1 w-5/6 rounded-sm bg-slate-200" />
                    <span className="mt-1 block h-2 w-1/2 rounded-sm" style={{ background: id === 'minimal' ? '#e2e8f0' : accent, opacity: id === 'minimal' ? 1 : 0.85 }} />
                  </span>
                  <span className="block text-sm font-semibold text-slate-900">{TEMPLATES[id].label}</span>
                  <span className="block text-[11px] leading-4 text-slate-500">{TEMPLATES[id].hint}</span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Colour</span>
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Accent colour">
                {ACCENT_PRESETS.map((c) => (
                  <button key={c.value} type="button" role="radio" aria-checked={accent.toLowerCase() === c.value} aria-label={c.name} title={c.name} onClick={() => setIn('appearance', { accent: c.value })} className={`h-8 w-8 rounded-full ring-offset-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${accent.toLowerCase() === c.value ? 'ring-2 ring-slate-900' : 'hover:scale-110'}`} style={{ background: c.value }} />
                ))}
                <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-300" title="Custom colour">
                  <span className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" aria-hidden="true" />
                  <input type="color" value={accent} onChange={(e) => setIn('appearance', { accent: e.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Custom accent colour" />
                </label>
              </div>
            </div>
            <Field label="Paper"><Segmented label="Paper size" value={state.appearance.paper} onChange={(paper) => setIn('appearance', { paper })} options={Object.entries(PAPER_SIZES).map(([value, p]) => ({ value, label: p.label }))} /></Field>
            <Field label="Document name">
              <select className={`${INPUT} !py-2`} value={state.docTitle} onChange={(e) => set({ docTitle: e.target.value })}>
                {DOCUMENT_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Currency">
              <select className={`${INPUT} !py-2 max-w-[15rem]`} value={state.currency} onChange={(e) => set({ currency: e.target.value })}>
                {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </section>

      <Card step="1" tone="blue" title="Employer" subtitle="Who is paying">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company name" className="sm:col-span-2"><Text value={state.company.name} onChange={(v) => setIn('company', { name: v })} placeholder="Northwind Studio Ltd" autoComplete="organization" /></Field>
          <Field label="Address" className="sm:col-span-2"><textarea className={`${INPUT} min-h-[72px]`} maxLength={LIMITS.address} value={state.company.address} onChange={(e) => setIn('company', { address: e.target.value })} placeholder={'12 Harbour Road\nSample City 10001'} /></Field>
          <Field label="Email"><Text type="email" value={state.company.email} onChange={(v) => setIn('company', { email: v })} placeholder="payroll@company.com" /></Field>
          <Field label="Phone"><Text type="tel" value={state.company.phone} onChange={(v) => setIn('company', { phone: v })} placeholder="+1 555 0100" /></Field>
          <Field label="Tax / registration no." className="sm:col-span-2"><Text value={state.company.taxId} onChange={(v) => setIn('company', { taxId: v })} placeholder="EIN, VAT or company number (optional)" /></Field>
          <div className="sm:col-span-2"><ImagePicker label="Logo" image={state.company.logo} onPick={(f) => pickImage('logo', f, 480)} onClear={() => setIn('company', { logo: null })} hint="Stays in this browser. PNG, JPG, WebP or GIF." /></div>
        </div>
      </Card>

      <Card step="2" tone="violet" title="Employee" subtitle="Who is being paid">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2"><Text value={state.employee.name} onChange={(v) => setIn('employee', { name: v })} placeholder="Alex Morgan" autoComplete="off" /></Field>
          <Field label="Employee ID"><Text value={state.employee.id} onChange={(v) => setIn('employee', { id: v })} placeholder="EMP-0042" /></Field>
          <Field label="Job title"><Text value={state.employee.title} onChange={(v) => setIn('employee', { title: v })} placeholder="Senior Designer" /></Field>
          <Field label="Department"><Text value={state.employee.department} onChange={(v) => setIn('employee', { department: v })} placeholder="Creative" /></Field>
          <Field label="Email"><Text type="email" value={state.employee.email} onChange={(v) => setIn('employee', { email: v })} placeholder="alex@email.com" /></Field>
          <Field label="Address" className="sm:col-span-2"><textarea className={`${INPUT} min-h-[64px]`} maxLength={LIMITS.address} value={state.employee.address} onChange={(e) => setIn('employee', { address: e.target.value })} /></Field>
          <Field label="Tax ID (optional)" className="sm:col-span-2" hint="Show only the last 4 digits of any national ID or social security number."><Text value={state.employee.taxId} onChange={(v) => setIn('employee', { taxId: v })} placeholder="XXX-XX-1234" autoComplete="off" /></Field>
        </div>
      </Card>

      <Card step="3" tone="amber" title="Pay period" subtitle="Frequency, dates and pay date">
        <div className="mb-3"><Segmented label="Pay frequency" tone={TONES.amber.seg} value={state.period.frequency} onChange={setFrequency} options={FREQUENCIES} /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Period start"><input type="date" className={INPUT} value={state.period.start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Period end"><input type="date" className={INPUT} value={state.period.end} onChange={(e) => setIn('period', { end: e.target.value })} /></Field>
          <Field label="Pay date"><input type="date" className={INPUT} value={state.period.payDate} onChange={(e) => setIn('period', { payDate: e.target.value })} /></Field>
        </div>
      </Card>

      <Card step="4" tone="emerald" title="Earnings" subtitle="Salary, hourly pay, overtime, bonuses" aside={<Segmented label="Year-to-date column" tone={TONES.emerald.seg} value={showYtd ? 'on' : 'off'} onChange={(v) => setIn('options', { showYtd: v === 'on' })} options={[{ value: 'off', label: 'No YTD' }, { value: 'on', label: 'Show YTD' }]} />}>
        <ul className="space-y-3">
          {state.earnings.map((line) => (
            <li key={line.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-start gap-2">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Field label="Description"><Text value={line.label} onChange={(v) => patchLine('earnings', line.id, { label: v })} maxLength={80} placeholder="Regular pay" /></Field>
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Paid as</span>
                    <Segmented label="Earning type" tone={TONES.emerald.seg} value={line.type} onChange={(type) => patchLine('earnings', line.id, { type })} options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'hourly', label: 'Hours × rate' }]} />
                  </div>
                  {line.type === 'hourly' ? (
                    <>
                      <Field label="Hours"><input className={INPUT} inputMode="decimal" value={line.hours} maxLength={12} placeholder="160" onChange={(e) => patchLine('earnings', line.id, { hours: e.target.value })} /></Field>
                      <Field label="Hourly rate"><Money value={line.rate} onChange={(v) => patchLine('earnings', line.id, { rate: v })} /></Field>
                      <Field label="Rate multiplier" hint="1 = normal, 1.5 = time and a half"><input className={INPUT} inputMode="decimal" value={line.multiplier} maxLength={8} onChange={(e) => patchLine('earnings', line.id, { multiplier: e.target.value })} /></Field>
                    </>
                  ) : (
                    <Field label="Amount"><Money value={line.amount} onChange={(v) => patchLine('earnings', line.id, { amount: v })} /></Field>
                  )}
                  {showYtd ? <Field label="Year to date"><Money value={line.ytd} onChange={(v) => patchLine('earnings', line.id, { ytd: v })} /></Field> : null}
                </div>
                <RemoveButton label={line.label || 'earning line'} onClick={() => removeLine('earnings', line.id)} />
              </div>
              <p className="mt-2 text-right text-sm font-semibold text-emerald-700">{money(calc.earnings.find((l) => l.id === line.id)?.amount || 0)}</p>
            </li>
          ))}
        </ul>
        <AddButton onClick={() => addLine('earnings', createEarning)}>Add earning</AddButton>
        <QuickChips tone="emerald" items={EARNING_PRESETS} onPick={(p) => addLine('earnings', createEarning, p.patch)} />
      </Card>

      <Card step="5" tone="rose" title="Deductions" subtitle="Tax, insurance, pension and other amounts taken from pay">
        <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">No tax rules are built in. Type the rate or amount your payroll uses; percentages are worked out on gross pay.</p>
        <ul className="space-y-3">
          {state.deductions.map((line) => (
            <li key={line.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-start gap-2">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Field label="Description"><Text value={line.label} onChange={(v) => patchLine('deductions', line.id, { label: v })} maxLength={80} placeholder="Income tax" /></Field>
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Taken as</span>
                    <Segmented label="Deduction type" tone={TONES.rose.seg} value={line.mode} onChange={(mode) => patchLine('deductions', line.id, { mode })} options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'percent', label: '% of gross' }]} />
                  </div>
                  <Field label={line.mode === 'percent' ? 'Percentage' : 'Amount'}><Money value={line.value} placeholder={line.mode === 'percent' ? '0' : '0.00'} onChange={(v) => patchLine('deductions', line.id, { value: v })} /></Field>
                  {showYtd ? <Field label="Year to date"><Money value={line.ytd} onChange={(v) => patchLine('deductions', line.id, { ytd: v })} /></Field> : null}
                </div>
                <RemoveButton label={line.label || 'deduction'} onClick={() => removeLine('deductions', line.id)} />
              </div>
              <p className="mt-2 text-right text-sm font-semibold text-rose-700">− {money(calc.deductions.find((l) => l.id === line.id)?.amount || 0)}</p>
            </li>
          ))}
        </ul>
        <AddButton onClick={() => addLine('deductions', createDeduction)}>Add deduction</AddButton>
        <QuickChips tone="rose" items={DEDUCTION_PRESETS} onPick={(p) => addLine('deductions', createDeduction, p.patch)} />
      </Card>

      <Card step="6" tone="slate" title="Employer contributions" subtitle="Optional. Paid by the employer, not taken from the employee" aside={<Segmented label="Show employer contributions" tone={TONES.slate.seg} value={state.options.showEmployer ? 'on' : 'off'} onChange={(v) => setIn('options', { showEmployer: v === 'on' })} options={[{ value: 'off', label: 'Hide' }, { value: 'on', label: 'Show' }]} />}>
        <ul className="space-y-3">
          {state.employer.map((line) => (
            <li key={line.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-start gap-2">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Field label="Description" className="sm:col-span-2"><Text value={line.label} onChange={(v) => patchLine('employer', line.id, { label: v })} maxLength={80} placeholder="Employer pension match" /></Field>
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Paid as</span>
                    <Segmented label="Contribution type" tone={TONES.slate.seg} value={line.mode} onChange={(mode) => patchLine('employer', line.id, { mode })} options={[{ value: 'fixed', label: 'Amount' }, { value: 'percent', label: '% of gross' }]} />
                  </div>
                  <Field label={line.mode === 'percent' ? 'Percentage' : 'Amount'}><Money value={line.value} placeholder={line.mode === 'percent' ? '0' : '0.00'} onChange={(v) => patchLine('employer', line.id, { value: v })} /></Field>
                </div>
                <RemoveButton label={line.label || 'contribution'} onClick={() => removeLine('employer', line.id)} />
              </div>
            </li>
          ))}
        </ul>
        <AddButton onClick={() => { addLine('employer', createContribution); setIn('options', { showEmployer: true }) }}>Add contribution</AddButton>
        <QuickChips tone="slate" items={EMPLOYER_PRESETS} onPick={(p) => { addLine('employer', createContribution, p.patch); setIn('options', { showEmployer: true }) }} />
      </Card>

      <Card step="7" tone="indigo" title="Finishing touches" subtitle="Notes, signature and what to show">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Notes" className="sm:col-span-2"><textarea className={`${INPUT} min-h-[72px]`} maxLength={LIMITS.notes} value={state.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Payment method, leave balance or a thank-you line" /></Field>
          <div className="sm:col-span-2"><ImagePicker label="Signature image" image={state.signature} onPick={(f) => pickImage('signature', f, 420)} onClear={() => set({ signature: null })} hint="Optional. Sign on white paper, photograph it and upload." /></div>
        </div>
        <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
          <Toggle checked={state.options.showWords} onChange={(v) => setIn('options', { showWords: v })}>Show net pay in words</Toggle>
          <Toggle checked={state.options.showSignature} onChange={(v) => setIn('options', { showSignature: v })}>Show signature line</Toggle>
          <Toggle checked={state.options.showComputerNote} onChange={(v) => setIn('options', { showComputerNote: v })}>Add “computer-generated” note</Toggle>
        </div>
      </Card>
    </div>
  )

  const btn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-60'
  const icon = (d) => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  const bar = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Download and share">
      <button type="button" disabled={Boolean(busy)} onClick={actions.pdf} className={`${btn} col-span-2 sm:col-span-3`} style={{ background: accent, color: onAccent }}>{icon('M12 3v12m0 0-4-4m4 4 4-4M5 21h14')}{busy === 'pdf' ? 'Making PDF…' : 'Download PDF'}</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.png} className={`${btn} bg-indigo-600 text-white`}>{icon('M4 5h16v14H4zM8 14l3-3 4 4 2-2 3 3')}{busy === 'png' ? 'Making…' : 'PNG image'}</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.excel} className={`${btn} bg-emerald-600 text-white`}>{icon('M4 4h16v16H4zM4 10h16M10 4v16')}Excel</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.print} className={`${btn} bg-slate-800 text-white`}>{icon('M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z')}Print</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.whatsapp} className={`${btn} bg-green-600 text-white`}>{icon('M4 20l1.3-4A8 8 0 1 1 8 18.7z')}{busy === 'whatsapp' ? 'Preparing…' : 'WhatsApp'}</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.email} className={`${btn} bg-sky-600 text-white`}>{icon('M4 6h16v12H4zM4 7l8 6 8-6')}{busy === 'email' ? 'Preparing…' : 'Email'}</button>
    </div>
  )

  const totals = (
    <div className="grid grid-cols-3 gap-2" aria-live="polite">
      <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100"><p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Gross pay</p><p className="mt-0.5 break-words font-display text-base font-bold text-emerald-900 sm:text-lg">{money(calc.gross)}</p></div>
      <div className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-100"><p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Deductions</p><p className="mt-0.5 break-words font-display text-base font-bold text-rose-900 sm:text-lg">{money(calc.totalDeductions)}</p></div>
      <div className="rounded-2xl p-3 shadow-md" style={{ background: accent, color: onAccent }}><p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Net pay</p><p className="mt-0.5 break-words font-display text-base font-bold sm:text-lg">{money(calc.net)}</p></div>
    </div>
  )

  const preview = (
    <div className="space-y-3 lg:sticky lg:top-4">
      {totals}
      {visibleIssues.length ? (
        <ul className="space-y-1.5" aria-label="Checks">
          {visibleIssues.map((issue, i) => (
            <li key={`${issue.id}${i}`} className={`rounded-xl px-3 py-2 text-xs leading-5 ${issue.severity === 'error' ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'}`}>{issue.severity === 'error' ? 'Fix: ' : 'Tip: '}{issue.message}</li>
          ))}
        </ul>
      ) : null}
      {bar}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-200/60 p-2 shadow-inner sm:p-3">
        <div className="mx-auto overflow-hidden rounded bg-white shadow-[0_24px_50px_-24px_rgba(15,23,42,0.5)] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label={`${state.docTitle} preview`} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <p className="text-xs leading-5 text-slate-500">Use this tool for genuine payroll records only. Nothing you type is sent to Nexora; the draft is kept in this browser until you reset it.</p>
    </div>
  )

  return (
    <div className="p-3 sm:p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm lg:hidden" role="tablist" aria-label="Editor view">
          {[['edit', 'Edit'], ['preview', 'Preview']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`min-h-[40px] rounded-full px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={loadExample} className="min-h-[40px] rounded-full bg-violet-50 px-4 text-sm font-semibold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">Load example</button>
          <button type="button" onClick={backup} className="min-h-[40px] rounded-full bg-sky-50 px-4 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">Backup (JSON)</button>
          <button type="button" onClick={() => restoreRef.current?.click()} className="min-h-[40px] rounded-full bg-sky-50 px-4 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">Restore</button>
          <input ref={restoreRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Restore a pay stub backup" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) restore(f) }} />
          <button type="button" onClick={reset} className="min-h-[40px] rounded-full bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">New / reset</button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:items-start">
        <div className={view === 'edit' ? '' : 'hidden lg:block'}>{edit}</div>
        <div className={view === 'preview' ? '' : 'hidden lg:block'}>{preview}</div>
      </div>
      {toast ? (
        <div role="status" className={`fixed inset-x-3 bottom-4 z-50 mx-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl ${toast.tone === 'error' ? 'bg-rose-600 text-white' : toast.tone === 'ok' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>{toast.message}</div>
      ) : null}
    </div>
  )
}
