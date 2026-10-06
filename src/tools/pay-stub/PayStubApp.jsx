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
  fuchsia: { bar: 'from-fuchsia-600 to-pink-500', chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100', seg: 'bg-fuchsia-600 text-white' },
  indigo: { bar: 'from-indigo-600 to-blue-500', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-100', seg: 'bg-indigo-600 text-white' },
}

function Group({ title, subtitle, tone, children, aside }) {
  const t = TONES[tone] || TONES.indigo
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-5 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${t.bar}`} aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-slate-950">{title}</h3>
          {subtitle ? <span className="hidden truncate text-xs text-slate-500 sm:inline">· {subtitle}</span> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function QuickChips({ items, onPick, tone }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick add">
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
    <button type="button" onClick={onClick} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
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
  const [tab, setTab] = useState('details')
  const [menuOpen, setMenuOpen] = useState(false)
  const formRef = useRef(null)
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

  const lineCalc = (list, id) => calc[list].find((l) => l.id === id)?.amount || 0
  const SEL = `${INPUT} !py-2 !text-sm`
  const SMALL = `${INPUT} !py-2 !text-sm`

  const detailsTab = (
    <div className="space-y-4">
      <Group tone="blue" title="Employer" subtitle="Who is paying">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company name" className="sm:col-span-2"><Text value={state.company.name} onChange={(v) => setIn('company', { name: v })} placeholder="Northwind Studio Ltd" autoComplete="organization" /></Field>
          <Field label="Address" className="sm:col-span-2"><textarea className={`${INPUT} min-h-[60px]`} rows={2} maxLength={LIMITS.address} value={state.company.address} onChange={(e) => setIn('company', { address: e.target.value })} placeholder={'12 Harbour Road\nSample City 10001'} /></Field>
          <Field label="Email"><Text type="email" value={state.company.email} onChange={(v) => setIn('company', { email: v })} placeholder="payroll@company.com" /></Field>
          <Field label="Phone"><Text type="tel" value={state.company.phone} onChange={(v) => setIn('company', { phone: v })} placeholder="+1 555 0100" /></Field>
          <Field label="Tax / registration no."><Text value={state.company.taxId} onChange={(v) => setIn('company', { taxId: v })} placeholder="EIN, VAT or company no. (optional)" /></Field>
          <ImagePicker label="Logo" image={state.company.logo} onPick={(f) => pickImage('logo', f, 480)} onClear={() => setIn('company', { logo: null })} />
        </div>
      </Group>
      <Group tone="violet" title="Employee" subtitle="Who is being paid">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2"><Text value={state.employee.name} onChange={(v) => setIn('employee', { name: v })} placeholder="Alex Morgan" autoComplete="off" /></Field>
          <Field label="Employee ID"><Text value={state.employee.id} onChange={(v) => setIn('employee', { id: v })} placeholder="EMP-0042" /></Field>
          <Field label="Job title"><Text value={state.employee.title} onChange={(v) => setIn('employee', { title: v })} placeholder="Senior Designer" /></Field>
          <Field label="Department"><Text value={state.employee.department} onChange={(v) => setIn('employee', { department: v })} placeholder="Creative" /></Field>
          <Field label="Email"><Text type="email" value={state.employee.email} onChange={(v) => setIn('employee', { email: v })} placeholder="alex@email.com" /></Field>
          <Field label="Tax ID (optional)" hint="Show only the last 4 digits of any national ID."><Text value={state.employee.taxId} onChange={(v) => setIn('employee', { taxId: v })} placeholder="XXX-XX-1234" autoComplete="off" /></Field>
          <Field label="Address"><textarea className={`${INPUT} min-h-[60px]`} rows={2} maxLength={LIMITS.address} value={state.employee.address} onChange={(e) => setIn('employee', { address: e.target.value })} /></Field>
        </div>
      </Group>
    </div>
  )

  const payTab = (
    <div className="space-y-4">
      <Group tone="amber" title="Pay period" subtitle="Frequency and dates">
        <div className="mb-3 overflow-x-auto"><Segmented label="Pay frequency" tone={TONES.amber.seg} value={state.period.frequency} onChange={setFrequency} options={FREQUENCIES} /></div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <Field label="Period start"><input type="date" className={INPUT} value={state.period.start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Period end"><input type="date" className={INPUT} value={state.period.end} onChange={(e) => setIn('period', { end: e.target.value })} /></Field>
          <Field label="Pay date"><input type="date" className={INPUT} value={state.period.payDate} onChange={(e) => setIn('period', { payDate: e.target.value })} /></Field>
        </div>
      </Group>

      <Group tone="emerald" title="Earnings" subtitle="Salary, hourly pay, overtime, bonuses" aside={<Segmented label="Year-to-date column" tone={TONES.emerald.seg} value={showYtd ? 'on' : 'off'} onChange={(v) => setIn('options', { showYtd: v === 'on' })} options={[{ value: 'off', label: 'No YTD' }, { value: 'on', label: 'YTD' }]} />}>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {state.earnings.map((line) => (
            <li key={line.id} className="p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <input aria-label="Earning description" className={`${SMALL} col-span-2 sm:col-span-1`} value={line.label} maxLength={80} placeholder="Regular pay" onChange={(e) => patchLine('earnings', line.id, { label: e.target.value })} />
                  <select aria-label="Paid as" className={SEL} value={line.type} onChange={(e) => patchLine('earnings', line.id, { type: e.target.value })}>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hrs × rate</option>
                  </select>
                  {line.type === 'hourly' ? (
                    <p className="flex min-h-[40px] items-center justify-end rounded-xl bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">{money(lineCalc('earnings', line.id))}</p>
                  ) : (
                    <input aria-label="Amount" className={SMALL} inputMode="decimal" autoComplete="off" value={line.amount} maxLength={24} placeholder="Amount" onChange={(e) => patchLine('earnings', line.id, { amount: e.target.value })} />
                  )}
                  {line.type === 'hourly' || showYtd ? (
                    <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-3">
                      {line.type === 'hourly' ? (
                        <>
                          <label className="block"><span className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Hours</span><input aria-label="Hours" className={SMALL} inputMode="decimal" value={line.hours} maxLength={12} placeholder="160" onChange={(e) => patchLine('earnings', line.id, { hours: e.target.value })} /></label>
                          <label className="block"><span className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Rate / hour</span><input aria-label="Hourly rate" className={SMALL} inputMode="decimal" value={line.rate} maxLength={24} placeholder="0.00" onChange={(e) => patchLine('earnings', line.id, { rate: e.target.value })} /></label>
                          <label className="block"><span className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500" title="1 = normal, 1.5 = time and a half">Multiplier</span><input aria-label="Rate multiplier" title="1 = normal, 1.5 = time and a half" className={SMALL} inputMode="decimal" value={line.multiplier} maxLength={8} placeholder="1" onChange={(e) => patchLine('earnings', line.id, { multiplier: e.target.value })} /></label>
                        </>
                      ) : null}
                      {showYtd ? <label className="block"><span className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Year to date</span><input aria-label="Year to date" className={SMALL} inputMode="decimal" value={line.ytd} maxLength={24} placeholder="0.00" onChange={(e) => patchLine('earnings', line.id, { ytd: e.target.value })} /></label> : null}
                    </div>
                  ) : null}
                </div>
                <RemoveButton label={line.label || 'earning line'} onClick={() => removeLine('earnings', line.id)} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AddButton onClick={() => addLine('earnings', createEarning)}>Add earning</AddButton>
          <QuickChips tone="emerald" items={EARNING_PRESETS} onPick={(p) => addLine('earnings', createEarning, p.patch)} />
        </div>
      </Group>

      <Group tone="rose" title="Deductions" subtitle="Tax, insurance, pension, loans">
        <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">No tax rules are built in. Type the rate or amount your payroll uses; % is worked out on gross pay.</p>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {state.deductions.map((line) => (
            <li key={line.id} className="p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <input aria-label="Deduction description" className={`${SMALL} col-span-2 sm:col-span-1`} value={line.label} maxLength={80} placeholder="Income tax" onChange={(e) => patchLine('deductions', line.id, { label: e.target.value })} />
                  <select aria-label="Taken as" className={SEL} value={line.mode} onChange={(e) => patchLine('deductions', line.id, { mode: e.target.value })}>
                    <option value="fixed">Fixed</option>
                    <option value="percent">% of gross</option>
                  </select>
                  <input aria-label={line.mode === 'percent' ? 'Percentage' : 'Amount'} className={SMALL} inputMode="decimal" autoComplete="off" value={line.value} maxLength={24} placeholder={line.mode === 'percent' ? '% rate' : 'Amount'} onChange={(e) => patchLine('deductions', line.id, { value: e.target.value })} />
                  {showYtd ? <label className="col-span-2 block sm:col-span-1"><span className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Year to date</span><input aria-label="Year to date" className={SMALL} inputMode="decimal" value={line.ytd} maxLength={24} placeholder="0.00" onChange={(e) => patchLine('deductions', line.id, { ytd: e.target.value })} /></label> : null}
                </div>
                <RemoveButton label={line.label || 'deduction'} onClick={() => removeLine('deductions', line.id)} />
              </div>
              {line.mode === 'percent' ? <p className="mt-1 pr-11 text-right text-xs font-semibold text-rose-700">= − {money(lineCalc('deductions', line.id))}</p> : null}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AddButton onClick={() => addLine('deductions', createDeduction)}>Add deduction</AddButton>
          <QuickChips tone="rose" items={DEDUCTION_PRESETS} onPick={(p) => addLine('deductions', createDeduction, p.patch)} />
        </div>
      </Group>
    </div>
  )

  const extrasTab = (
    <div className="space-y-4">
      <Group tone="slate" title="Employer contributions" subtitle="Optional. Paid by the employer, not taken from pay" aside={<Segmented label="Show employer contributions" tone={TONES.slate.seg} value={state.options.showEmployer ? 'on' : 'off'} onChange={(v) => setIn('options', { showEmployer: v === 'on' })} options={[{ value: 'off', label: 'Hide' }, { value: 'on', label: 'Show' }]} />}>
        {state.employer.length ? (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {state.employer.map((line) => (
              <li key={line.id} className="p-2.5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <input aria-label="Contribution description" className={`${SMALL} col-span-2 sm:col-span-1`} value={line.label} maxLength={80} placeholder="Employer pension match" onChange={(e) => patchLine('employer', line.id, { label: e.target.value })} />
                    <select aria-label="Paid as" className={SEL} value={line.mode} onChange={(e) => patchLine('employer', line.id, { mode: e.target.value })}>
                      <option value="fixed">Fixed</option>
                      <option value="percent">% of gross</option>
                    </select>
                    <input aria-label={line.mode === 'percent' ? 'Percentage' : 'Amount'} className={SMALL} inputMode="decimal" autoComplete="off" value={line.value} maxLength={24} placeholder={line.mode === 'percent' ? '% rate' : 'Amount'} onChange={(e) => patchLine('employer', line.id, { value: e.target.value })} />
                  </div>
                  <RemoveButton label={line.label || 'contribution'} onClick={() => removeLine('employer', line.id)} />
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">None added. Skip this unless your payslip lists employer costs.</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AddButton onClick={() => { addLine('employer', createContribution); setIn('options', { showEmployer: true }) }}>Add contribution</AddButton>
          <QuickChips tone="slate" items={EMPLOYER_PRESETS} onPick={(p) => { addLine('employer', createContribution, p.patch); setIn('options', { showEmployer: true }) }} />
        </div>
      </Group>
      <Group tone="indigo" title="Finishing touches" subtitle="Notes, signature and what to show">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Notes" className="sm:col-span-2"><textarea className={`${INPUT} min-h-[60px]`} rows={2} maxLength={LIMITS.notes} value={state.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Payment method, leave balance or a thank-you line" /></Field>
          <div className="sm:col-span-2"><ImagePicker label="Signature image" image={state.signature} onPick={(f) => pickImage('signature', f, 420)} onClear={() => set({ signature: null })} hint="Optional. Sign on white paper, photograph it and upload." /></div>
        </div>
        <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
          <Toggle checked={state.options.showWords} onChange={(v) => setIn('options', { showWords: v })}>Show net pay in words</Toggle>
          <Toggle checked={state.options.showSignature} onChange={(v) => setIn('options', { showSignature: v })}>Show signature line</Toggle>
          <Toggle checked={state.options.showComputerNote} onChange={(v) => setIn('options', { showComputerNote: v })}>Add “computer-generated” note</Toggle>
        </div>
      </Group>
    </div>
  )

  const designTab = (
    <Group tone="fuchsia" title="Design" subtitle="Template, brand colour, paper and currency">
      <div className="space-y-4">
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
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Paper"><Segmented label="Paper size" value={state.appearance.paper} onChange={(paper) => setIn('appearance', { paper })} options={Object.entries(PAPER_SIZES).map(([value, p]) => ({ value, label: p.label }))} /></Field>
          <Field label="Document name">
            <select className={`${INPUT} !py-2`} value={state.docTitle} onChange={(e) => set({ docTitle: e.target.value })}>
              {DOCUMENT_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Currency">
            <select className={`${INPUT} !py-2`} value={state.currency} onChange={(e) => set({ currency: e.target.value })}>
              {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </Group>
  )

  const TABS = [
    { id: 'details', label: 'People', long: 'Employer & employee', tone: 'blue', node: detailsTab },
    { id: 'pay', label: 'Pay', long: 'Period, earnings, deductions', tone: 'emerald', node: payTab },
    { id: 'extras', label: 'Extras', long: 'Contributions & notes', tone: 'indigo', node: extrasTab },
    { id: 'design', label: 'Design', long: 'Template & colour', tone: 'fuchsia', node: designTab },
  ]
  const tabIndex = Math.max(0, TABS.findIndex((t) => t.id === tab))
  const goTab = (id) => { setTab(id); formRef.current?.scrollTo?.({ top: 0 }) }

  const edit = (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-1.5" role="tablist" aria-label="Pay stub sections">
        {TABS.map((t, i) => {
          const active = t.id === tab
          return (
            <button key={t.id} type="button" role="tab" id={`ps-tab-${t.id}`} aria-selected={active} aria-controls="ps-panel" onClick={() => goTab(t.id)} className={`flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? `bg-gradient-to-br ${TONES[t.tone].bar} text-white shadow` : 'text-slate-600 hover:bg-white'}`}>
              <span className={`hidden h-5 w-5 shrink-0 min-[480px]:flex items-center justify-center rounded-full text-[11px] ${active ? 'bg-white/25' : 'bg-slate-200 text-slate-600'}`} aria-hidden="true">{i + 1}</span>
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>
      <div ref={formRef} id="ps-panel" role="tabpanel" aria-labelledby={`ps-tab-${TABS[tabIndex].id}`} className="max-h-none p-3 sm:p-4 lg:max-h-[680px] lg:overflow-y-auto">
        <p className="mb-3 text-xs text-slate-500">Step {tabIndex + 1} of {TABS.length} · {TABS[tabIndex].long}</p>
        {TABS[tabIndex].node}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-2.5">
        <button type="button" disabled={tabIndex === 0} onClick={() => goTab(TABS[tabIndex - 1].id)} className="min-h-[40px] rounded-full bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">← Back</button>
        {tabIndex < TABS.length - 1 ? (
          <button type="button" onClick={() => goTab(TABS[tabIndex + 1].id)} className="min-h-[40px] rounded-full px-5 text-sm font-semibold shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" style={{ background: accent, color: onAccent }}>Next: {TABS[tabIndex + 1].label} →</button>
        ) : (
          <button type="button" onClick={() => setView('preview')} className="min-h-[40px] rounded-full px-5 text-sm font-semibold shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden" style={{ background: accent, color: onAccent }}>See my pay stub →</button>
        )}
      </div>
    </div>
  )

  const btn = 'inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-60'
  const icon = (d) => <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  const bar = (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Download and share">
      <button type="button" disabled={Boolean(busy)} onClick={actions.pdf} className={`${btn} col-span-3 !min-h-[48px] !text-base`} style={{ background: accent, color: onAccent }}>{icon('M12 3v12m0 0-4-4m4 4 4-4M5 21h14')}{busy === 'pdf' ? 'Making PDF…' : 'Download PDF'}</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.png} className={`${btn} bg-indigo-600 text-white`}>{icon('M4 5h16v14H4zM8 14l3-3 4 4 2-2 3 3')}{busy === 'png' ? 'Making…' : 'PNG image'}</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.excel} className={`${btn} bg-emerald-600 text-white`}>{icon('M4 4h16v16H4zM4 10h16M10 4v16')}Excel</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.print} className={`${btn} bg-slate-800 text-white`}>{icon('M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z')}Print</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.whatsapp} className={`${btn} col-span-1 bg-green-600 text-white`}>{icon('M4 20l1.3-4A8 8 0 1 1 8 18.7z')}{busy === 'whatsapp' ? 'Preparing…' : 'WhatsApp'}</button>
      <button type="button" disabled={Boolean(busy)} onClick={actions.email} className={`${btn} col-span-1 bg-sky-600 text-white`}>{icon('M4 6h16v12H4zM4 7l8 6 8-6')}{busy === 'email' ? 'Preparing…' : 'Email'}</button>
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
    <div className="space-y-3 lg:sticky lg:top-3">
      {totals}
      {visibleIssues.length ? (
        <ul className="space-y-1.5" aria-label="Checks">
          {visibleIssues.map((issue, i) => (
            <li key={`${issue.id}${i}`} className={`rounded-xl px-3 py-2 text-xs leading-5 ${issue.severity === 'error' ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'}`}>{issue.severity === 'error' ? 'Fix: ' : 'Tip: '}{issue.message}</li>
          ))}
        </ul>
      ) : null}
      {bar}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-200/60 p-2 shadow-inner lg:max-h-[440px] lg:overflow-y-auto sm:p-3">
        <div className="mx-auto overflow-hidden rounded bg-white shadow-[0_24px_50px_-24px_rgba(15,23,42,0.5)] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label={`${state.docTitle} preview`} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <p className="text-xs leading-5 text-slate-500">Use this tool for genuine payroll records only. Nothing you type is sent to Nexora; the draft is kept in this browser until you reset it.</p>
    </div>
  )

  const menuItem = 'block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none'
  return (
    <div className="p-3 pb-0 sm:p-5 sm:pb-0 lg:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm lg:hidden" role="tablist" aria-label="Editor view">
          {[['edit', 'Edit'], ['preview', 'Preview']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`min-h-[38px] rounded-full px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <div className="relative ml-auto flex items-center gap-2">
          <button type="button" onClick={loadExample} className="min-h-[38px] whitespace-nowrap rounded-full bg-violet-50 px-4 text-sm font-semibold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">Load example</button>
          <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="min-h-[38px] whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">More ▾</button>
          {menuOpen ? (
            <>
              <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
                <button type="button" role="menuitem" className={menuItem} onClick={() => { setMenuOpen(false); backup() }}>Backup (JSON)</button>
                <button type="button" role="menuitem" className={menuItem} onClick={() => { setMenuOpen(false); restoreRef.current?.click() }}>Restore backup</button>
                <button type="button" role="menuitem" className={`${menuItem} text-rose-600`} onClick={() => { setMenuOpen(false); reset() }}>New / reset</button>
              </div>
            </>
          ) : null}
          <input ref={restoreRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Restore a pay stub backup" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) restore(f) }} />
        </div>
      </div>
      <div className="grid gap-4 pb-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-5">
        <div className={view === 'edit' ? '' : 'hidden lg:block'}>{edit}</div>
        <div className={view === 'preview' ? '' : 'hidden lg:block'}>{preview}</div>
      </div>
      <div className="sticky bottom-0 -mx-3 flex items-center gap-3 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:-mx-5 sm:px-5 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Net pay</p>
          <p className="truncate font-display text-lg font-bold text-slate-950">{money(calc.net)}</p>
        </div>
        {view === 'edit' ? (
          <button type="button" onClick={() => setView('preview')} className="min-h-[44px] rounded-full px-6 text-sm font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" style={{ background: accent, color: onAccent }}>Preview</button>
        ) : (
          <>
            <button type="button" onClick={() => setView('edit')} className="min-h-[44px] rounded-full bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Edit</button>
            <button type="button" disabled={Boolean(busy)} onClick={actions.pdf} className="min-h-[44px] rounded-full px-5 text-sm font-semibold shadow-sm disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" style={{ background: accent, color: onAccent }}>{busy === 'pdf' ? 'Making…' : 'PDF'}</button>
          </>
        )}
      </div>
      {toast ? (
        <div role="status" className={`fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl lg:bottom-4 ${toast.tone === 'error' ? 'bg-rose-600 text-white' : toast.tone === 'ok' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>{toast.message}</div>
      ) : null}
    </div>
  )
}
