import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineArrowLeft } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useLoyaltyRewards } from '../hooks/useLoyaltyRewards.js'
import { REWARD_TYPES, calculateRequiredPointsForReward } from '../lib/loyaltyCalculations.js'
import { confirmAction } from '../components/ui/dialogActions.js'

export default function LoyaltyRewardsPage() {
  const api = useLoyaltyRewards()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [draft, setDraft] = useState({ name: '', type: 'pct_discount', description: '', pointsCost: 100, discountValue: 10, requiredTier: 'any', maxRedemptions: 0, active: true })

  function show(tone, msg) { setToast({ tone, message: msg }); setTimeout(() => setToast(null), 1800) }

  async function handleSave(payload) {
    const res = editing ? await api.updateReward(editing.id, payload) : await api.createReward(payload)
    if (res.ok) { show('success', `Reward ${editing ? 'updated' : 'created'}`); setShowCreate(false); setEditing(null) }
    else show('error', res.error)
  }

  async function handleDelete(id) {
    if (!await confirmAction({ title: 'Delete reward?', message: 'This will permanently remove this reward.', confirmLabel: 'Delete' })) return
    const res = await api.deleteReward(id)
    if (res.ok) show('success', 'Reward deleted'); else show('error', res.error)
  }

  const columns = [
    { key: 'name', header: 'Reward', cell: (r) => <span className="font-semibold text-slate-950">{r.name}</span> },
    { key: 'type', header: 'Type', cell: (r) => { const t = REWARD_TYPES.find((x) => x.id === r.type); return <Badge variant="info">{t?.label || r.type}</Badge> } },
    { key: 'pointsCost', header: 'Points', cell: (r) => <span className="font-bold">{calculateRequiredPointsForReward(r).toLocaleString()}</span> },
    { key: 'discountValue', header: 'Value', cell: (r) => r.discountValue ? (r.type === 'pct_discount' ? `${r.discountValue}%` : `Rs ${r.discountValue}`) : '—' },
    { key: 'requiredTier', header: 'Tier', cell: (r) => r.requiredTier === 'any' ? <Badge variant="default">All</Badge> : <Badge variant="purple">{r.requiredTier}</Badge> },
    { key: 'active', header: 'Status', cell: (r) => <Badge variant={r.active !== false ? 'success' : 'danger'}>{r.active !== false ? 'Active' : 'Disabled'}</Badge> },
    { key: 'currentRedemptions', header: 'Redeemed', cell: (r) => r.currentRedemptions || 0 },
    { key: 'actions', header: '', cell: (r) => (
      <div className="flex justify-end gap-2">
        <Button variant="subtle" className="h-8 rounded-xl px-3 text-xs" onClick={() => { setEditing(r); setDraft(r); setShowCreate(true) }}>
          <HiOutlinePencilSquare className="h-4 w-4" /> Edit
        </Button>
        <Button variant="subtle" className="h-8 rounded-xl px-3 text-xs text-rose-700" onClick={() => handleDelete(r.id)}>
          <HiOutlineTrash className="h-4 w-4" /> Delete
        </Button>
      </div>
    )},
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Rewards Management" subtitle="Create and manage rewards that members can redeem with points."
        right={
          <>
            <Link to="/app/loyalty"><Button variant="subtle" className="rounded-2xl"><HiOutlineArrowLeft /> Back</Button></Link>
            <Button className="rounded-2xl" onClick={() => { setEditing(null); setDraft({ name: '', type: 'pct_discount', description: '', pointsCost: 100, discountValue: 10, requiredTier: 'any', maxRedemptions: 0, active: true }); setShowCreate(true) }}>
              <HiOutlinePlus /> Add Reward
            </Button>
          </>
        } />
      <Card className="p-5">
        {api.loading ? <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading rewards...</div>
          : api.rewards.length ? <Table columns={columns} rows={api.rewards} />
          : <EmptyState title="No rewards yet" description="Create rewards like discounts, free products, or cashback." actionLabel="Add Reward" onAction={() => setShowCreate(true)} />}
      </Card>

      {showCreate ? (
        <RewardFormModal title={editing ? 'Edit Reward' : 'Create Reward'} draft={draft} onChange={setDraft}
          onClose={() => { setShowCreate(false); setEditing(null) }}
          onSave={() => handleSave(draft)} />
      ) : null}
    </motion.div>
  )
}

function RewardFormModal({ title, draft, onChange, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  const update = (f, v) => onChange((prev) => ({ ...prev, [f]: v }))
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Rewards</p><h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Reward Name *</span>
            <Input value={draft.name} onChange={(e) => update('name', e.target.value)} required /></label>
          <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Type</span>
            <select value={draft.type} onChange={(e) => update('type', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
              {REWARD_TYPES.map((rt) => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
            </select></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Points Cost</span>
              <Input type="number" min="1" value={draft.pointsCost} onChange={(e) => update('pointsCost', Number(e.target.value))} /></label>
            <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Discount Value</span>
              <Input type="number" min="0" value={draft.discountValue} onChange={(e) => update('discountValue', Number(e.target.value))} /></label>
          </div>
          <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Description</span>
            <textarea value={draft.description} onChange={(e) => update('description', e.target.value)} className="mt-1 min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Required Tier</span>
              <select value={draft.requiredTier} onChange={(e) => update('requiredTier', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                <option value="any">All Tiers</option>
                <option value="bronze">Bronze+</option>
                <option value="silver">Silver+</option>
                <option value="gold">Gold+</option>
                <option value="platinum">Platinum+</option>
                <option value="vip">VIP Only</option>
              </select></label>
            <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Max Redemptions (0 = unlimited)</span>
              <Input type="number" min="0" value={draft.maxRedemptions} onChange={(e) => update('maxRedemptions', Number(e.target.value))} /></label>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="subtle" className="rounded-2xl" onClick={onClose}>Cancel</Button>
          <Button className="rounded-2xl" disabled={saving} onClick={async () => { setSaving(true); await onSave(); setSaving(false) }}>{saving ? 'Saving...' : 'Save Reward'}</Button>
        </div>
      </div>
    </div>
  )
}
