import { motion } from 'framer-motion'
import { useState } from 'react'
import { HiOutlineArrowLeft } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import { useLoyaltySettings } from '../hooks/useLoyaltySettings.js'
import { LOYALTY_SETTINGS_DEFAULTS } from '../lib/loyaltyCalculations.js'

export default function LoyaltySettingsPage() {
  const { settings, loading, saveSettings } = useLoyaltySettings()
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const current = draft || settings
  const update = (f, v) => setDraft((p) => ({ ...(p || settings), [f]: v }))
  const updateNested = (parent, f, v) => setDraft((p) => ({ ...(p || settings), [parent]: { ...((p || settings)[parent] || {}), [f]: v } }))

  async function handleSave() {
    setSaving(true)
    const res = await saveSettings(draft || settings)
    setSaving(false)
    if (res.ok) { setDraft(null); setToast({ tone: 'success', message: 'Settings saved' }); setTimeout(() => setToast(null), 1800) }
    else { setToast({ tone: 'error', message: res.error }); setTimeout(() => setToast(null), 2400) }
  }

  if (loading) return <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading settings...</div>

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Loyalty Settings" subtitle="Configure points engine, auto-enrollment, birthday automation, and more."
        right={
          <>
            <Link to="/app/loyalty"><Button variant="subtle" className="rounded-2xl"><HiOutlineArrowLeft /> Back</Button></Link>
            <Button className="rounded-2xl" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
          </>
        } />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">General Settings</p>
          <div className="mt-4 space-y-4">
            <Toggle label="Auto-enroll Customers" value={current.autoEnrollCustomers} onChange={(v) => update('autoEnrollCustomers', v)} />
            <Toggle label="Enable Points Engine" value={current.enablePointsEngine} onChange={(v) => update('enablePointsEngine', v)} />
            <Toggle label="Enable Rewards Engine" value={current.enableRewardsEngine} onChange={(v) => update('enableRewardsEngine', v)} />
            <Toggle label="Enable Coupon System" value={current.enableCouponSystem} onChange={(v) => update('enableCouponSystem', v)} />
            <Toggle label="Enable Referral System" value={current.enableReferralSystem} onChange={(v) => update('enableReferralSystem', v)} />
            <Toggle label="Enable Birthday Automation" value={current.enableBirthdayAutomation} onChange={(v) => update('enableBirthdayAutomation', v)} />
            <Toggle label="Enable Customer Wallet" value={current.enableWallet} onChange={(v) => update('enableWallet', v)} />
            <Toggle label="Enable Campaigns" value={current.enableCampaigns} onChange={(v) => update('enableCampaigns', v)} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">Points Engine</p>
          <div className="mt-4 space-y-4">
            <Field label="Points per amount spent (currency)" value={current.pointEarningRules?.perAmountSpent || 10}
              onChange={(v) => updateNested('pointEarningRules', 'perAmountSpent', Number(v))} />
            <Field label="Birthday bonus points" value={current.pointEarningRules?.birthdayBonusPoints || 500}
              onChange={(v) => updateNested('pointEarningRules', 'birthdayBonusPoints', Number(v))} />
            <Field label="Referral bonus points" value={current.pointEarningRules?.referralBonusPoints || 200}
              onChange={(v) => updateNested('pointEarningRules', 'referralBonusPoints', Number(v))} />
            <Field label="Signup bonus points" value={current.pointEarningRules?.signupBonusPoints || 100}
              onChange={(v) => updateNested('pointEarningRules', 'signupBonusPoints', Number(v))} />
            <Field label="Point value in currency" value={current.pointEarningRules?.pointValueInCurrency || 0.5}
              onChange={(v) => updateNested('pointEarningRules', 'pointValueInCurrency', Number(v))} />
            <Field label="Max points per transaction" value={current.pointEarningRules?.maxPointsPerTransaction || 10000}
              onChange={(v) => updateNested('pointEarningRules', 'maxPointsPerTransaction', Number(v))} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">Birthday Automation</p>
          <div className="mt-4 space-y-4">
            <Field label="Days before birthday to send coupon" value={current.birthdayCouponDaysBefore || 3}
              onChange={(v) => update('birthdayCouponDaysBefore', Number(v))} />
            <Field label="Coupon valid days" value={current.birthdayCouponValidDays || 14}
              onChange={(v) => update('birthdayCouponValidDays', Number(v))} />
            <Field label="Birthday discount percentage" value={current.birthdayCouponDiscountValue || 10}
              onChange={(v) => update('birthdayCouponDiscountValue', Number(v))} />
            <Field label="Max discount amount" value={current.birthdayCouponMaxDiscount || 500}
              onChange={(v) => update('birthdayCouponMaxDiscount', Number(v))} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">Referral Settings</p>
          <div className="mt-4 space-y-4">
            <Field label="Referral discount percentage" value={current.referralCouponDiscountValue || 5}
              onChange={(v) => update('referralCouponDiscountValue', Number(v))} />
            <Field label="Referral coupon valid days" value={current.referralCouponValidDays || 30}
              onChange={(v) => update('referralCouponValidDays', Number(v))} />
          </div>
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-800">Auto-downgrade after {current.autoDowngradeAfterDays || 180} days of inactivity</p>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button type="button" onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full transition-colors ${value ? 'bg-slate-950' : 'bg-slate-200'}`}>
        <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  )
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
