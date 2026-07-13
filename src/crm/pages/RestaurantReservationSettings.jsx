import { motion } from 'framer-motion'
import { useState } from 'react'
import { HiOutlineArrowLeft } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Toast from '../components/ui/Toast.jsx'
import { useRestaurantReservationSettings } from '../hooks/useRestaurantReservationSettings.js'

export default function RestaurantReservationSettingsPage() {
  const { settings, loading, saveSettings } = useRestaurantReservationSettings()
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
      <PageHeader title="Reservation Settings" subtitle="Configure booking rules, waitlist, notifications, and availability."
        right={<><Link to="/app/reservations"><Button variant="subtle" className="rounded-2xl"><HiOutlineArrowLeft /> Back</Button></Link>
        <Button className="rounded-2xl" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button></>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">Features</p>
          <div className="mt-4 space-y-4">
            <Toggle label="Online Reservations" value={current.enableOnlineReservations} onChange={(v) => update('enableOnlineReservations', v)} />
            <Toggle label="Waitlist Management" value={current.enableWaitlist} onChange={(v) => update('enableWaitlist', v)} />
            <Toggle label="Auto Assign Tables" value={current.enableAutoAssign} onChange={(v) => update('enableAutoAssign', v)} />
            <Toggle label="Conflict Detection" value={current.enableConflictDetection} onChange={(v) => update('enableConflictDetection', v)} />
            <Toggle label="Double Booking Prevention" value={current.enableDoubleBookingPrevention} onChange={(v) => update('enableDoubleBookingPrevention', v)} />
            <Toggle label="Birthday Highlight" value={current.enableBirthdayHighlight} onChange={(v) => update('enableBirthdayHighlight', v)} />
            <Toggle label="Anniversary Highlight" value={current.enableAnniversaryHighlight} onChange={(v) => update('enableAnniversaryHighlight', v)} />
            <Toggle label="Arrival Reminders" value={current.enableArrivalReminders} onChange={(v) => update('enableArrivalReminders', v)} />
            <Toggle label="Late Arrival Detection" value={current.enableLateArrivalDetection} onChange={(v) => update('enableLateArrivalDetection', v)} />
            <Toggle label="Auto No-Show" value={current.enableAutoNoShow} onChange={(v) => update('enableAutoNoShow', v)} />
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-bold text-slate-950">Business Hours</p>
          <div className="mt-4 space-y-4">
            <Field label="Opening Time" value={current.openTime} type="time" onChange={(v) => update('openTime', v)} />
            <Field label="Closing Time" value={current.closeTime} type="time" onChange={(v) => update('closeTime', v)} />
            <Field label="Default Duration (min)" value={current.defaultDuration} onChange={(v) => update('defaultDuration', Number(v))} />
            <Field label="Slot Interval (min)" value={current.slotInterval} onChange={(v) => update('slotInterval', Number(v))} />
          </div>
          <div className="mt-6">
            <p className="text-sm font-bold text-slate-950">Guest Policy</p>
            <div className="mt-4 space-y-4">
              <Field label="Max Advance Booking (days)" value={current.maxAdvanceDays} onChange={(v) => update('maxAdvanceDays', Number(v))} />
              <Field label="Max Party Size" value={current.maxPartySize} onChange={(v) => update('maxPartySize', Number(v))} />
              <Field label="Late Arrival Threshold (min)" value={current.lateArrivalMinutes} onChange={(v) => update('lateArrivalMinutes', Number(v))} />
              <Field label="No-Show Threshold (min)" value={current.noShowMinutes} onChange={(v) => update('noShowMinutes', Number(v))} />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-sm font-bold text-slate-950">Deposit</p>
            <div className="mt-4 space-y-4">
              <Toggle label="Require Deposit" value={current.depositRequired} onChange={(v) => update('depositRequired', v)} />
              {current.depositRequired && <Field label="Deposit Amount" value={current.depositAmount} onChange={(v) => update('depositAmount', Number(v))} />}
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-bold text-slate-950">Notifications</p>
          <div className="mt-4 flex flex-wrap gap-6">
            <Toggle label="SMS Notifications" value={current.smsEnabled} onChange={(v) => update('smsEnabled', v)} />
            <Toggle label="WhatsApp Notifications" value={current.whatsappEnabled} onChange={(v) => update('whatsappEnabled', v)} />
            <Toggle label="Auto-Confirm" value={current.autoConfirmEnabled} onChange={(v) => update('autoConfirmEnabled', v)} />
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Cancellation Policy</p>
            <p className="mt-1 text-xs text-slate-500">{current.cancellationPolicy}</p>
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

function Field({ label, value, onChange, type = 'number' }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>
}
