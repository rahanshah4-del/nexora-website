import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import { MEMBERSHIP_TIERS } from '../../lib/loyaltyCalculations.js'
import { TierBadge } from './LoyaltyTierCard.jsx'

export default function LoyaltyEnrollModal({ open, onClose, onEnroll, existingCustomers = [] }) {
  const [draft, setDraft] = useState({
    customerId: '', customerName: '', customerEmail: '', customerPhone: '',
    dateOfBirth: '', enrollmentSource: 'manual',
  })
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function selectCustomer(customer) {
    setDraft({
      customerId: customer.id || customer.customerId || '',
      customerName: customer.name || customer.customerName || '',
      customerEmail: customer.email || customer.customerEmail || '',
      customerPhone: customer.phone || customer.customerPhone || '',
      dateOfBirth: customer.dateOfBirth || customer.dob || '',
      enrollmentSource: 'manual',
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    await onEnroll(draft)
    setSubmitting(false)
    setDraft({ customerId: '', customerName: '', customerEmail: '', customerPhone: '', dateOfBirth: '', enrollmentSource: 'manual' })
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
        >
          <motion.form
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Loyalty Program</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Enroll Member</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Enroll a customer in the loyalty program</p>
              </div>
              <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>

            {existingCustomers.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-slate-500">Quick select existing customer:</p>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {existingCustomers.slice(0, 10).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full rounded-xl border border-slate-100 px-3 py-2 text-left text-sm hover:border-sky-200 hover:bg-sky-50"
                    >
                      <span className="font-semibold text-slate-950">{c.name || c.customerName}</span>
                      <span className="ml-2 text-slate-500">{c.email || c.customerEmail || c.phone || c.customerPhone}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Customer ID</span>
                <Input value={draft.customerId} onChange={(e) => update('customerId', e.target.value)} placeholder="Firestore customer ID" required />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Customer Name *</span>
                  <Input value={draft.customerName} onChange={(e) => update('customerName', e.target.value)} required />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Email</span>
                  <Input type="email" value={draft.customerEmail} onChange={(e) => update('customerEmail', e.target.value)} />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Phone</span>
                  <Input value={draft.customerPhone} onChange={(e) => update('customerPhone', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Date of Birth</span>
                  <Input type="date" value={draft.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Enrollment Source</span>
                <select
                  value={draft.enrollmentSource}
                  onChange={(e) => update('enrollmentSource', e.target.value)}
                  className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="manual">Manual</option>
                  <option value="pos">POS</option>
                  <option value="online">Online</option>
                  <option value="referral">Referral</option>
                  <option value="import">Import</option>
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4">
              <p className="text-xs font-semibold text-sky-700">New members start at:</p>
              <div className="mt-2 flex items-center gap-2">
                <TierBadge tierId="bronze" />
                <span className="text-sm text-slate-600">Bronze tier with {100} signup bonus points</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="subtle" className="rounded-2xl" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="rounded-2xl" disabled={submitting}>
                {submitting ? 'Enrolling...' : 'Enroll Member'}
              </Button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
