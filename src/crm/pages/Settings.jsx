import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import {
  HiOutlineBell,
  HiOutlineBuildingOffice2,
  HiOutlineLockClosed,
  HiOutlineUserCircle,
} from 'react-icons/hi2'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Select from '../components/ui/Select.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import { supportedCurrencies } from '../data/currency.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { useUser } from '../hooks/useUser.js'
import AuditLogPanel from '../components/system/AuditLogPanel.jsx'

export default function SettingsPage() {
  const { plan } = useUser()
  const { currency, setCurrency, profile, setProfile, notifications, setNotifications } = usePreferences()
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  function onSaveProfile() {
    setProfile(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1200)
  }

  function onAvatarChange(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDraft((d) => ({ ...d, avatarDataUrl: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <PageHeader title="Settings" subtitle="Profile, preferences, and security controls." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <HiOutlineUserCircle className="text-xl text-indigo-600 dark:text-indigo-300" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile Settings</p>
              {saved ? <Badge variant="success">Saved</Badge> : null}
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {draft.avatarDataUrl ? (
                  <img
                    src={draft.avatarDataUrl}
                    alt="Profile"
                    className="h-14 w-14 rounded-2xl object-cover shadow-soft"
                  />
                ) : (
                  <Avatar name={draft.ownerName || 'Owner'} className="h-14 w-14 rounded-2xl text-base" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile image</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Upload a logo or owner photo</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="subtle"
                  className="rounded-2xl"
                  onClick={() => fileRef.current?.click()}
                  type="button"
                >
                  Upload Image
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setDraft((d) => ({ ...d, avatarDataUrl: '' }))}
                  type="button"
                >
                  Remove
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatarChange(e.target.files?.[0])}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Owner Name</label>
                <Input
                  className="mt-1"
                  value={draft.ownerName}
                  onChange={(e) => setDraft((d) => ({ ...d, ownerName: e.target.value }))}
                  placeholder="Owner name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Phone Number</label>
                <Input
                  className="mt-1"
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  placeholder="+92..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email</label>
                <Input
                  className="mt-1"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button variant="subtle" className="rounded-2xl" onClick={() => setDraft(profile)} type="button">
                Cancel
              </Button>
              <Button className="rounded-2xl" onClick={onSaveProfile} type="button">
                Save Profile
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HiOutlineBell className="text-xl text-indigo-600 dark:text-indigo-300" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Notification Settings</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <span className="text-xs font-semibold">On/Off</span>
                <input
                  type="checkbox"
                  checked={notifications.enabled}
                  onChange={(e) => setNotifications({ ...notifications, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 dark:border-white/10 dark:bg-slate-900/40"
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Toggle alert channels for email, sales, reports, team activity and system updates.
            </p>

            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Email notifications</span>
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  disabled={!notifications.enabled}
                  className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/40"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Sales alerts</span>
                <input
                  type="checkbox"
                  checked={notifications.salesAlerts}
                  onChange={(e) => setNotifications({ ...notifications, salesAlerts: e.target.checked })}
                  disabled={!notifications.enabled}
                  className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/40"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Report alerts</span>
                <input
                  type="checkbox"
                  checked={notifications.reportAlerts}
                  onChange={(e) => setNotifications({ ...notifications, reportAlerts: e.target.checked })}
                  disabled={!notifications.enabled}
                  className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/40"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Team activity alerts</span>
                <input
                  type="checkbox"
                  checked={notifications.teamActivity}
                  onChange={(e) => setNotifications({ ...notifications, teamActivity: e.target.checked })}
                  disabled={!notifications.enabled}
                  className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/40"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">System updates</span>
                <input
                  type="checkbox"
                  checked={notifications.systemUpdates}
                  onChange={(e) => setNotifications({ ...notifications, systemUpdates: e.target.checked })}
                  disabled={!notifications.enabled}
                  className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/40"
                />
              </label>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiOutlineBuildingOffice2 className="text-xl text-indigo-600 dark:text-indigo-300" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Currency & Preferences</p>
              </div>
              <Badge variant={plan === 'Business' ? 'success' : plan === 'Starter' ? 'info' : 'default'}>{plan}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Manage your preferred currency and system preferences.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Currency</label>
                <Select className="mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {supportedCurrencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <HiOutlineLockClosed className="text-xl text-indigo-600 dark:text-indigo-300" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Account Security</p>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Configure password policy and session behavior.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="rounded-2xl">Update password</Button>
              <Button variant="subtle" className="rounded-2xl">
                Manage sessions
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <HiOutlineBuildingOffice2 className="text-xl text-indigo-600 dark:text-indigo-300" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Business / Profile Setup</p>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Company details used across invoices, reports, and team.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Company Name</label>
                <Input
                  className="mt-1"
                  value={draft.companyName}
                  onChange={(e) => setDraft((d) => ({ ...d, companyName: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Business Type</label>
                <Input
                  className="mt-1"
                  value={draft.businessType}
                  onChange={(e) => setDraft((d) => ({ ...d, businessType: e.target.value }))}
                  placeholder="SaaS / Agency / Retail..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Country</label>
                <Input
                  className="mt-1"
                  value={draft.country}
                  onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                  placeholder="Country"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">City</label>
                <Input
                  className="mt-1"
                  value={draft.city}
                  onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
            </div>
          </Card>

          <AuditLogPanel />
        </div>
      </div>
    </motion.div>
  )
}
