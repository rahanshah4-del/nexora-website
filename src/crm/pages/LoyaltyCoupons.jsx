import { motion } from 'framer-motion'
import { useState } from 'react'
import { HiOutlinePlus, HiOutlineArrowLeft } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import LoyaltyCouponCard from '../components/loyalty/LoyaltyCouponCard.jsx'
import { useLoyaltyCoupons } from '../hooks/useLoyaltyCoupons.js'
import { confirmAction } from '../components/ui/dialogActions.js'

export default function LoyaltyCouponsPage() {
  const api = useLoyaltyCoupons()
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState(null)
  const [draft, setDraft] = useState({ name: '', code: '', description: '', discountType: 'percentage', discountValue: 10, maxDiscount: 0, minOrderAmount: 0, usageLimit: 0, active: true, type: 'discount', freeProductName: '', expiresAt: '' })

  function show(tone, msg) { setToast({ tone, message: msg }); setTimeout(() => setToast(null), 1800) }
  const update = (f, v) => setDraft((p) => ({ ...p, [f]: v }))

  async function handleCreate() {
    if (!draft.name.trim()) return show('error', 'Coupon name is required')
    const res = await api.createCoupon(draft)
    if (res.ok) { show('success', `Coupon ${res.code} created`); setShowCreate(false); setDraft({ name: '', code: '', description: '', discountType: 'percentage', discountValue: 10, maxDiscount: 0, minOrderAmount: 0, usageLimit: 0, active: true, type: 'discount', freeProductName: '', expiresAt: '' }) }
    else show('error', res.error)
  }

  async function handleDelete(id) {
    if (!await confirmAction({ title: 'Delete coupon?', message: 'This action cannot be undone.', confirmLabel: 'Delete' })) return
    const res = await api.deleteCoupon(id)
    if (res.ok) show('success', 'Coupon deleted'); else show('error', res.error)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Coupon Management" subtitle="Create single-use, multi-use, QR, and barcode coupons."
        right={
          <>
            <Link to="/app/loyalty"><Button variant="subtle" className="rounded-2xl"><HiOutlineArrowLeft /> Back</Button></Link>
            <Button className="rounded-2xl" onClick={() => setShowCreate(true)}><HiOutlinePlus /> Create Coupon</Button>
          </>
        } />
      <div className="space-y-4">
        {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading coupons...</div>
          : api.coupons.length ? api.coupons.map((c) => <LoyaltyCouponCard key={c.id} coupon={c} onDelete={handleDelete} />)
          : <EmptyState title="No coupons yet" description="Create discount coupons for your loyalty members." actionLabel="Create Coupon" onAction={() => setShowCreate(true)} />}
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Coupons</p><h2 className="mt-1 text-2xl font-black text-slate-950">Create Coupon</h2></div>
              <button type="button" onClick={() => setShowCreate(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Coupon Name *</span>
                <input value={draft.name} onChange={(e) => update('name', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Code (leave empty for auto-generate)</span>
                <input value={draft.code} onChange={(e) => update('code', e.target.value.toUpperCase())} placeholder="LOY-AUTO-GENERATED" className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-mono font-bold shadow-sm outline-none focus:border-blue-400" /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Discount Type</span>
                  <select value={draft.discountType} onChange={(e) => update('discountType', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                    <option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount</option>
                  </select></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Discount Value</span>
                  <input type="number" min="0" value={draft.discountValue} onChange={(e) => update('discountValue', Number(e.target.value))} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Max Discount (0 = no limit)</span>
                  <input type="number" min="0" value={draft.maxDiscount} onChange={(e) => update('maxDiscount', Number(e.target.value))} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Min Order Amount</span>
                  <input type="number" min="0" value={draft.minOrderAmount} onChange={(e) => update('minOrderAmount', Number(e.target.value))} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
              </div>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Usage Limit (0 = unlimited)</span>
                <input type="number" min="0" value={draft.usageLimit} onChange={(e) => update('usageLimit', Number(e.target.value))} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Expires At</span>
                <input type="date" value={draft.expiresAt} onChange={(e) => update('expiresAt', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="subtle" className="rounded-2xl" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="rounded-2xl" onClick={handleCreate}>Create Coupon</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
