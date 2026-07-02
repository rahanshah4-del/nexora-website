import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  HiOutlineBolt,
  HiOutlineClipboardDocument,
  HiOutlinePencilSquare,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
  HiOutlineTag,
} from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { retailPosDiscountTips, retailPosPromoCodes } from '../data/retailPosPromos.js'
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'

function promoValue(promo) {
  if (promo.type === 'percent') return `${promo.value}%`
  return `PKR ${Number(promo.value || 0).toLocaleString()}`
}

function copyCode(code) {
  navigator.clipboard?.writeText(code).catch(() => {})
}

function generatePromoCode() {
  return `POS${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

function promoRowsFromObject(promos = {}) {
  return Object.entries(promos || {}).map(([code, promo]) => ({
    code,
    type: promo.type || 'percent',
    value: Number(promo.value || 0),
    label: promo.label || '',
    active: promo.active !== false,
  }))
}

function promoObjectFromRows(rows = []) {
  return rows.reduce((acc, row) => {
    const code = String(row.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32)
    const value = Number(row.value || 0)
    if (!code || value <= 0 || row.active === false) return acc
    acc[code] = {
      type: row.type === 'flat' ? 'flat' : 'percent',
      value,
      label: row.label || (row.type === 'flat' ? `PKR ${value} off` : `${value}% promo`),
      active: true,
    }
    return acc
  }, {})
}

export default function RetailPOSDiscountsPage() {
  const { settings, saveSettings, canManageSettings } = useBusinessSettings()
  const savedPromos = settings?.retailPosPromos || retailPosPromoCodes
  const [promoRows, setPromoRows] = useState(() => promoRowsFromObject(savedPromos))
  const [taxDraft, setTaxDraft] = useState({
    defaultPosTaxRate: Number(settings?.defaultPosTaxRate || 0),
    defaultInvoiceTaxRate: Number(settings?.defaultInvoiceTaxRate || 0),
  })
  const [message, setMessage] = useState('')
  const promos = useMemo(() => promoRows.filter((row) => row.active !== false && row.code && Number(row.value) > 0), [promoRows])

  useEffect(() => {
    setPromoRows(promoRowsFromObject(settings?.retailPosPromos || retailPosPromoCodes))
    setTaxDraft({
      defaultPosTaxRate: Number(settings?.defaultPosTaxRate || 0),
      defaultInvoiceTaxRate: Number(settings?.defaultInvoiceTaxRate || 0),
    })
  }, [settings?.defaultInvoiceTaxRate, settings?.defaultPosTaxRate, settings?.retailPosPromos])

  function updatePromo(index, patch) {
    setPromoRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  function addPromo() {
    setPromoRows((current) => [
      { code: generatePromoCode(), type: 'percent', value: 5, label: 'New POS promo', active: true },
      ...current,
    ])
  }

  async function savePromoSettings() {
    if (!canManageSettings) {
      setMessage('You have view access only. Contact admin to update promo settings.')
      return
    }
    const nextPromos = promoObjectFromRows(promoRows)
    const res = await saveSettings({
      retailPosPromos: nextPromos,
      defaultPosTaxRate: Math.max(0, Number(taxDraft.defaultPosTaxRate || 0)),
      defaultInvoiceTaxRate: Math.max(0, Number(taxDraft.defaultInvoiceTaxRate || 0)),
    })
    setMessage(res?.ok ? 'Promo and tax settings saved.' : res?.error || 'Settings save nahi ho sakin.')
  }

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <PageHeader
        title="Tax & Promo"
        subtitle="Manage POS promo codes, default POS tax, and invoice tax from one place."
        right={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="subtle" className="rounded-2xl" onClick={addPromo} disabled={!canManageSettings}>
              <HiOutlineTag className="h-4 w-4" /> New Promo
            </Button>
            <Button type="button" className="rounded-2xl" onClick={() => window.open('/app/pos', '_blank', 'noopener,noreferrer')}>
              <HiOutlineBolt className="h-4 w-4" /> Open POS Billing
            </Button>
          </div>
        }
      />
      {message ? <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.4rem] border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-slate-950">Active Promo Codes</p>
              <p className="text-sm font-semibold text-slate-500">Use these inside POS Billing under Tax & Promo.</p>
            </div>
            <Badge variant="info">{promos.length} active</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {promoRows.map((promo, index) => (
              <div key={`${promo.code}-${index}`} className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
                    <HiOutlineTag className="h-5 w-5" />
                  </div>
                  <Badge variant={promo.active === false ? 'warning' : 'success'}>{promo.active === false ? 'Disabled' : 'Active'}</Badge>
                </div>
                <div className="mt-4 grid gap-2">
                  <Input value={promo.code} onChange={(event) => updatePromo(index, { code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} placeholder="PROMO-CODE" readOnly={!canManageSettings} />
                  <Input value={promo.label} onChange={(event) => updatePromo(index, { label: event.target.value })} placeholder="Promo label" readOnly={!canManageSettings} />
                  <div className="grid grid-cols-[1fr_110px] gap-2">
                    <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800" value={promo.type} onChange={(event) => updatePromo(index, { type: event.target.value })} disabled={!canManageSettings}>
                      <option value="percent">Percent</option>
                      <option value="flat">Fixed PKR</option>
                    </select>
                    <Input type="number" min="0" value={promo.value} onChange={(event) => updatePromo(index, { value: event.target.value })} readOnly={!canManageSettings} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Current</span>
                  <span className="text-sm font-black text-slate-950">{promoValue(promo)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => copyCode(promo.code)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-50">
                    <HiOutlineClipboardDocument className="h-4 w-4" /> Copy
                  </button>
                  <button type="button" onClick={() => updatePromo(index, { active: promo.active === false })} disabled={!canManageSettings} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                    <HiOutlinePencilSquare className="h-4 w-4" /> {promo.active === false ? 'Enable' : 'Disable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" className="mt-4 w-full rounded-2xl" onClick={savePromoSettings} disabled={!canManageSettings}>
            Save Promo Settings
          </Button>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[1.4rem] border-slate-200 bg-white p-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <HiOutlineReceiptPercent className="h-6 w-6" />
            </div>
            <p className="mt-4 text-lg font-black text-slate-950">Tax Defaults</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              POS aur invoice ke default tax rates yahan se set honge. Product-specific tax ho to woh apni value use karega.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                POS tax %
                <Input className="mt-1" type="number" min="0" value={taxDraft.defaultPosTaxRate} onChange={(event) => setTaxDraft((current) => ({ ...current, defaultPosTaxRate: event.target.value }))} readOnly={!canManageSettings} />
              </label>
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Invoice tax %
                <Input className="mt-1" type="number" min="0" value={taxDraft.defaultInvoiceTaxRate} onChange={(event) => setTaxDraft((current) => ({ ...current, defaultInvoiceTaxRate: event.target.value }))} readOnly={!canManageSettings} />
              </label>
              <Button type="button" variant="subtle" className="rounded-2xl border-emerald-100 text-emerald-700" onClick={savePromoSettings} disabled={!canManageSettings}>
                Save Tax Defaults
              </Button>
            </div>
          </Card>

          <Card className="rounded-[1.4rem] border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <HiOutlineSparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-slate-950">How it works</p>
                <p className="text-xs font-semibold text-slate-500">Fast till-safe discount rules</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {retailPosDiscountTips.map((tip) => (
                <div key={tip} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                  {tip}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
