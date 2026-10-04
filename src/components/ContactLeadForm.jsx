import { useState } from 'react'
import { HiOutlineCheckCircle, HiOutlinePaperAirplane } from 'react-icons/hi2'
import {
  WEBSITE_LEAD_LIMITS,
  WEBSITE_LEAD_MODULES,
  WEBSITE_LEAD_SIZES,
  submitWebsiteLead,
  validateWebsiteLead,
} from '../lib/websiteLeads.js'

const EMPTY = { name: '', businessName: '', phone: '', email: '', module: '', businessSize: '', message: '' }

const inputClass =
  'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200'

function Field({ id, label, error, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {children}
      {error ? <p id={`${id}-error`} className="mt-1 text-[12px] text-rose-600">{error}</p> : null}
    </div>
  )
}

export default function ContactLeadForm() {
  const [values, setValues] = useState(EMPTY)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle') // idle | sending | sent | failed

  const set = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }))

  async function onSubmit(event) {
    event.preventDefault()
    const page = typeof window !== 'undefined' ? window.location.pathname : ''
    const check = validateWebsiteLead({ ...values, page })
    setErrors(check.errors)
    if (Object.keys(check.errors).length) return
    setState('sending')
    try {
      const result = await submitWebsiteLead({ ...values, page }, { honeypot })
      if (!result.ok) {
        setErrors(result.errors || {})
        setState('idle')
        return
      }
      setState('sent')
      setValues(EMPTY)
    } catch (error) {
      console.warn('[contact form] submit failed', error?.code || error?.message || error)
      setState('failed')
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/70 p-6 text-center" role="status">
        <HiOutlineCheckCircle className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
        <p className="mt-3 text-lg font-medium text-slate-900">Thank you — we received your message.</p>
        <p className="mt-1 text-[14px] text-slate-600">Our team will contact you on WhatsApp or email, usually within one business day.</p>
        <button type="button" onClick={() => setState('idle')} className="mt-4 text-[14px] font-medium text-slate-700 underline">
          Send another message
        </button>
      </div>
    )
  }

  const describedBy = (key) => (errors[key] ? `lead-${key}-error` : undefined)

  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-4 sm:grid-cols-2">
      <Field id="lead-name" label="Your name" error={errors.name} required>
        <input id="lead-name" name="name" autoComplete="name" maxLength={WEBSITE_LEAD_LIMITS.name} value={values.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name')} className={inputClass} />
      </Field>
      <Field id="lead-businessName" label="Business name">
        <input id="lead-businessName" name="businessName" autoComplete="organization" maxLength={WEBSITE_LEAD_LIMITS.businessName} value={values.businessName} onChange={set('businessName')} className={inputClass} />
      </Field>
      <Field id="lead-phone" label="WhatsApp / phone" error={errors.phone} required>
        <input id="lead-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+92 300 1234567" maxLength={WEBSITE_LEAD_LIMITS.phone} value={values.phone} onChange={set('phone')} aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy('phone')} className={inputClass} />
      </Field>
      <Field id="lead-email" label="Email" error={errors.email}>
        <input id="lead-email" name="email" type="email" autoComplete="email" maxLength={WEBSITE_LEAD_LIMITS.email} value={values.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} className={inputClass} />
      </Field>
      <Field id="lead-module" label="Interested in">
        <select id="lead-module" name="module" value={values.module} onChange={set('module')} className={inputClass}>
          <option value="">Select a product</option>
          {WEBSITE_LEAD_MODULES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <Field id="lead-businessSize" label="Business size">
        <select id="lead-businessSize" name="businessSize" value={values.businessSize} onChange={set('businessSize')} className={inputClass}>
          <option value="">Select size</option>
          {WEBSITE_LEAD_SIZES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="lead-message" label="How can we help?" error={errors.message} required>
          <textarea id="lead-message" name="message" rows={4} maxLength={WEBSITE_LEAD_LIMITS.message} value={values.message} onChange={set('message')} aria-invalid={Boolean(errors.message)} aria-describedby={describedBy('message')} className={inputClass} />
        </Field>
      </div>
      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="lead-website">Website</label>
        <input id="lead-website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-5 text-slate-500">
          We use these details only to reply to you. See our <a href="/privacy-policy/" className="underline">Privacy Policy</a>.
        </p>
        <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition hover:bg-slate-800 disabled:opacity-60">
          {state === 'sending' ? 'Sending…' : 'Send message'}
          <HiOutlinePaperAirplane className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {state === 'failed' ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 sm:col-span-2" role="alert">
          Sorry, your message could not be sent. Please message us on WhatsApp at +92 319 4329754 instead.
        </p>
      ) : null}
    </form>
  )
}
