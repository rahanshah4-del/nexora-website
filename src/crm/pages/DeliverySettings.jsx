import { motion } from 'framer-motion'
import { useState } from 'react'
import { HiOutlineArrowLeft } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import { useDeliverySettings } from '../hooks/useDeliverySettings.js'

export default function DeliverySettingsPage() {
  const { settings, loading, saveSettings } = useDeliverySettings()
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const current = draft || settings
  const update = (f, v) => setDraft((p) => ({ ...(p || settings), [f]: v }))

  async function handleSave() {
    setSaving(true)
    const res = await saveSettings(draft || settings)
    setSaving(false)
    if (res.ok) { setDraft(null); setToast({ tone: 'success', message: 'Settings saved' }); setTimeout(() => setToast(null), 1800) }
    else { setToast({ tone: 'error', message: res.error }); setTimeout(() => setToast(null), 2400) }
  }

  if (loading) return <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading...</div>

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      <PageHeader title="Delivery Settings" subtitle="Configure online ordering, delivery, driver, and notification settings."
        right={<><Link to="/app/delivery"><Button variant="subtle" className="rounded-2xl"><HiOutlineArrowLeft /> Back</Button></Link>
        <Button className="rounded-2xl" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button></>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">Features</p>
          <div className="mt-4 space-y-4">
            <Toggle label="Enable Online Ordering" value={current.enableOnlineOrdering} onChange={(v) => update('enableOnlineOrdering', v)} />
            <Toggle label="Enable Delivery" value={current.enableDelivery} onChange={(v) => update('enableDelivery', v)} />
            <Toggle label="Enable Pickup" value={current.enablePickup} onChange={(v) => update('enablePickup', v)} />
            <Toggle label="Enable Scheduled Orders" value={current.enableScheduledOrders} onChange={(v) => update('enableScheduledOrders', v)} />
            <Toggle label="Enable Guest Checkout" value={current.enableGuestCheckout} onChange={(v) => update('enableGuestCheckout', v)} />
            <Toggle label="Enable Customer Login" value={current.enableCustomerLogin} onChange={(v) => update('enableCustomerLogin', v)} />
            <Toggle label="Enable Driver Module" value={current.enableDriverModule} onChange={(v) => update('enableDriverModule', v)} />
            <Toggle label="Enable Proof of Delivery" value={current.enableProofOfDelivery} onChange={(v) => update('enableProofOfDelivery', v)} />
            <Toggle label="Enable OTP Verification" value={current.enableOTPVerification} onChange={(v) => update('enableOTPVerification', v)} />
            <Toggle label="Auto-assign Drivers" value={current.autoAssignDrivers} onChange={(v) => update('autoAssignDrivers', v)} />
            <Toggle label="Customer Tracking" value={current.customerTrackingEnabled} onChange={(v) => update('customerTrackingEnabled', v)} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">Time & Distance</p>
          <div className="mt-4 space-y-4">
            <Field label="Default Avg Speed (km/h)" value={current.defaultAvgSpeedKmph} onChange={(v) => update('defaultAvgSpeedKmph', Number(v))} />
            <Field label="Driver Assignment Time (min)" value={current.driverAssignmentMinutes} onChange={(v) => update('driverAssignmentMinutes', Number(v))} />
            <Field label="Default Prep Time (min)" value={current.defaultPrepTimeMinutes} onChange={(v) => update('defaultPrepTimeMinutes', Number(v))} />
            <Field label="Max Driver Load" value={current.maxDriverLoad} onChange={(v) => update('maxDriverLoad', Number(v))} />
            <Field label="Default Commission %" value={current.defaultCommissionRate} onChange={(v) => update('defaultCommissionRate', Number(v))} />
            <Field label="Free Delivery Threshold" value={current.freeDeliveryThreshold} onChange={(v) => update('freeDeliveryThreshold', Number(v))} />
          </div>
          <div className="mt-6">
            <p className="text-sm font-bold text-slate-950">Schedule</p>
            <div className="mt-4 space-y-4">
              <Field label="Schedule Lead Time (min)" value={current.scheduleLeadTimeMinutes} onChange={(v) => update('scheduleLeadTimeMinutes', Number(v))} />
              <Field label="Max Schedule Days Ahead" value={current.maxScheduleDaysAhead} onChange={(v) => update('maxScheduleDaysAhead', Number(v))} />
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-bold text-slate-950">Notifications</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Toggle label="Order Accepted" value={current.orderAcceptedNotification} onChange={(v) => update('orderAcceptedNotification', v)} />
            <Toggle label="Order Ready" value={current.orderReadyNotification} onChange={(v) => update('orderReadyNotification', v)} />
            <Toggle label="On Route" value={current.orderOnRouteNotification} onChange={(v) => update('orderOnRouteNotification', v)} />
            <Toggle label="Delivered" value={current.orderDeliveredNotification} onChange={(v) => update('orderDeliveredNotification', v)} />
            <Toggle label="Driver Assigned" value={current.driverAssignedNotification} onChange={(v) => update('driverAssignedNotification', v)} />
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
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span><Input type="number" value={value} onChange={(e) => onChange(e.target.value)} /></label>
}
