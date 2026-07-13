import { motion } from 'framer-motion'
import { useState } from 'react'
import { HiOutlinePlus, HiOutlineArrowLeft, HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useLoyaltyCampaigns } from '../hooks/useLoyaltyCampaigns.js'
import { isCampaignActive, CAMPAIGN_TYPES } from '../lib/loyaltyCalculations.js'
import { confirmAction } from '../components/ui/dialogActions.js'

function dateStr(value) {
  if (!value) return '—'
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export default function LoyaltyCampaignsPage() {
  const api = useLoyaltyCampaigns()
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState(null)
  const [draft, setDraft] = useState({
    name: '', type: 'double_points_day', description: '', multiplier: 2,
    startsAt: '', endsAt: '', daysOfWeek: [], active: true,
  })

  function show(t, m) { setToast({ tone: t, message: m }); setTimeout(() => setToast(null), 1800) }
  const update = (f, v) => setDraft((p) => ({ ...p, [f]: v }))
  const toggleDay = (d) => setDraft((p) => ({ ...p, daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter((x) => x !== d) : [...p.daysOfWeek, d] }))

  async function handleCreate() {
    if (!draft.name.trim()) return show('error', 'Campaign name is required')
    const res = await api.createCampaign(draft)
    if (res.ok) { show('success', `Campaign "${draft.name}" created`); setShowCreate(false) }
    else show('error', res.error)
  }

  async function handleDelete(id) {
    if (!await confirmAction({ title: 'Delete campaign?', message: 'This action cannot be undone.', confirmLabel: 'Delete' })) return
    const res = await api.deleteCampaign(id)
    if (res.ok) show('success', 'Campaign deleted'); else show('error', res.error)
  }

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Campaign Engine" subtitle="Double points days, weekend bonuses, happy hours, and festival rewards."
        right={
          <>
            <Link to="/app/loyalty"><Button variant="subtle" className="rounded-2xl"><HiOutlineArrowLeft /> Back</Button></Link>
            <Button className="rounded-2xl" onClick={() => setShowCreate(true)}><HiOutlinePlus /> Create Campaign</Button>
          </>
        } />

      {api.activeCampaigns.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-800">Active Campaigns Today</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {api.activeCampaigns.map((c) => (
              <Badge key={c.id} variant="success">{c.name} (×{c.multiplier})</Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {api.loading ? <div className="col-span-full grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading campaigns...</div>
          : api.campaigns.length ? api.campaigns.map((campaign) => {
            const active = isCampaignActive(campaign)
            const ctype = CAMPAIGN_TYPES.find((t) => t.id === campaign.type)
            return (
              <Card key={campaign.id} className={`p-5 ${active ? 'border-emerald-200' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-950">{campaign.name}</h3>
                      <Badge variant={active ? 'success' : 'danger'}>{active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{ctype?.label || campaign.type}</p>
                  </div>
                  <button type="button" onClick={() => handleDelete(campaign.id)} className="rounded-lg p-1 text-rose-500 hover:bg-rose-50">
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
                {campaign.description ? <p className="mt-2 text-xs text-slate-600">{campaign.description}</p> : null}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Multiplier</p>
                    <p className="font-bold text-slate-950">×{campaign.multiplier}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Start</p>
                    <p className="text-xs font-bold text-slate-950">{dateStr(campaign.startsAt)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">End</p>
                    <p className="text-xs font-bold text-slate-950">{dateStr(campaign.endsAt) || '—'}</p>
                  </div>
                </div>
                {Array.isArray(campaign.daysOfWeek) && campaign.daysOfWeek.length > 0 ? (
                  <div className="mt-2 flex gap-1">
                    {DAYS.map((d, i) => (
                      <span key={d} className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${campaign.daysOfWeek.includes(i) ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {d[0]}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Card>
            )
          }) : <div className="col-span-full"><EmptyState title="No campaigns yet" description="Create bonus point campaigns to boost engagement." actionLabel="Create Campaign" onAction={() => setShowCreate(true)} /></div>}
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Campaigns</p><h2 className="mt-1 text-2xl font-black text-slate-950">Create Campaign</h2></div>
              <button type="button" onClick={() => setShowCreate(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-xl font-black text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Campaign Name *</span>
                <input value={draft.name} onChange={(e) => update('name', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Type</span>
                <select value={draft.type} onChange={(e) => update('type', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400">
                  {CAMPAIGN_TYPES.map((ct) => <option key={ct.id} value={ct.id}>{ct.label} (×{ct.multiplier})</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Multiplier</span>
                <input type="number" min="1" step="0.5" value={draft.multiplier} onChange={(e) => update('multiplier', Number(e.target.value))} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Description</span>
                <textarea value={draft.description} onChange={(e) => update('description', e.target.value)} className="mt-1 min-h-16 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Starts At</span>
                  <input type="date" value={draft.startsAt} onChange={(e) => update('startsAt', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ends At</span>
                  <input type="date" value={draft.endsAt} onChange={(e) => update('endsAt', e.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-blue-400" /></label>
              </div>
              <label className="block"><span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Days of Week (optional)</span>
                <div className="mt-2 flex gap-2">
                  {DAYS.map((d, i) => (
                    <button key={d} type="button" onClick={() => toggleDay(i)}
                      className={`h-10 w-10 rounded-xl text-xs font-bold transition ${draft.daysOfWeek.includes(i) ? 'bg-slate-950 text-white' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{d}</button>
                  ))}
                </div></label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="subtle" className="rounded-2xl" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="rounded-2xl" onClick={handleCreate}>Create Campaign</Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
