import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
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
import { useBusinessSettings } from '../hooks/useBusinessSettings.js'
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess.js'
import { useUser } from '../hooks/useUser.js'
import { useAuth } from '../hooks/useAuth.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { packageNameForPlan } from '../data/moduleAccess.js'

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { plan, userId, workspaceId, userDoc, firebaseUser } = useUser()
  const { logout, busy } = useAuth()
  const { currency, setCurrency, profile, setProfile } = usePreferences()
  const { settings, businessType, saveSettings } = useBusinessSettings()
  const access = useWorkspaceAccess()
  const [draft, setDraft] = useState({ ...profile, ...settings })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const packageName = packageNameForPlan(plan)
  const canManageSettings = access.canManageSettings
  const viewOnlyMessage = 'You have view access only. Contact your workspace administrator to modify settings.'

  useEffect(() => {
    setDraft((current) => ({ ...current, ...profile, ...settings }))
  }, [profile, settings])

  async function onSaveProfile() {
    if (!canManageSettings) {
      setError(viewOnlyMessage)
      return
    }
    const businessPatch = {
      businessName: draft.businessName || draft.companyName || '',
      logoUrl: draft.logoUrl || draft.avatarDataUrl || '',
      address: draft.address || '',
      phone: draft.phone || '',
      email: draft.email || '',
      taxNumber: draft.taxNumber || draft.taxId || '',
      currency,
      invoicePrefix: draft.invoicePrefix || '',
      reportPrefix: draft.reportPrefix || '',
      receiptFooter: draft.receiptFooter || '',
      signatureUrl: draft.signatureUrl || '',
      themeColor: draft.themeColor || '#2563eb',
    }
    const res = await saveSettings(businessPatch)
    if (!res.ok) {
      setError(res.error || 'Unable to save business settings.')
      return
    }
    setError('')
    setProfile(draft)
    logActivity({
      workspaceId,
      userId,
      ...userActivityInfo(userDoc, firebaseUser),
      action: 'Settings/profile updated',
      module: 'Settings',
      description: `${businessType} profile and business settings were updated.`,
      targetId: userId || '',
      targetName: draft.businessName || draft.companyName || draft.ownerName || 'Profile',
      metadata: { businessName: businessPatch.businessName, businessType, ownerName: draft.ownerName || '', currency },
    }).catch(() => {})
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  function onAvatarChange(file) {
    if (!canManageSettings || !file) return
    const reader = new FileReader()
    reader.onload = () => setDraft((current) => ({ ...current, avatarDataUrl: String(reader.result || ''), logoUrl: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  async function handleLogout() {
    console.warn('[AUTO LOGOUT TRACE]', {
      file: 'src/crm/pages/Settings.jsx',
      function: 'handleLogout',
      reason: 'user_clicked_settings_logout',
      route: window.location.pathname,
      uid: firebaseUser?.uid,
      email: firebaseUser?.email,
      time: new Date().toISOString(),
      stack: new Error().stack,
    })
    const ok = await logout()
    if (ok) navigate('/login', { replace: true })
  }

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageHeader
        title="Settings"
        subtitle="Profile, company/workspace information, and logout."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {saved ? <Badge variant="success">Saved</Badge> : null}
            {error ? <Badge variant="danger">{error}</Badge> : null}
            <Button variant="subtle" className="rounded-2xl" onClick={() => setDraft({ ...profile, ...settings })} type="button" disabled={!canManageSettings}>
              Reset
            </Button>
            <Button className="rounded-2xl" onClick={onSaveProfile} type="button" disabled={!canManageSettings}>
              Save changes
            </Button>
          </div>
        }
      />

      {!canManageSettings ? (
        <Card className="border-amber-100 bg-amber-50/80 p-4 text-sm font-semibold text-amber-900">
          {viewOnlyMessage}
        </Card>
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="min-w-0 space-y-5">
          <Card id="profile-settings" className="scroll-mt-28 p-5 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {draft.avatarDataUrl ? (
                  <img src={draft.avatarDataUrl} alt="Profile" className="h-16 w-16 rounded-3xl object-cover shadow-sm" />
                ) : (
                  <Avatar name={draft.ownerName || 'Owner'} className="h-16 w-16 rounded-3xl text-base" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">Profile</p>
                    {saved ? <HiOutlineCheckCircle className="text-lg text-emerald-500" /> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                    Owner and contact details for the current {businessType} module.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="subtle" className="rounded-2xl" onClick={() => fileRef.current?.click()} type="button" disabled={!canManageSettings}>
                  Upload image
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setDraft((current) => ({ ...current, avatarDataUrl: '', logoUrl: '' }))}
                  type="button"
                  disabled={!canManageSettings}
                >
                  Remove
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => onAvatarChange(event.target.files?.[0])}
                  disabled={!canManageSettings}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Owner Name">
                <Input
	                  value={draft.ownerName}
	                  onChange={(event) => setDraft((current) => ({ ...current, ownerName: event.target.value }))}
	                  placeholder="Owner name"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Phone Number">
                <Input
	                  value={draft.phone}
	                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
	                  placeholder="+92..."
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <Input
	                  value={draft.email}
	                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
	                  placeholder="Email"
	                  readOnly={!canManageSettings}
	                />
              </Field>
            </div>
          </Card>

          <Card id="business-profile" className="scroll-mt-28 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                  <HiOutlineBuildingOffice2 className="text-xl" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Company / Workspace info</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Module-isolated company details for invoices and reports.</p>
                </div>
              </div>
              <Badge variant={plan === 'Business' ? 'success' : 'default'}>{packageName}</Badge>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Company Name" className="sm:col-span-2">
                <Input
	                  value={draft.businessName || draft.companyName || ''}
	                  onChange={(event) => setDraft((current) => ({ ...current, businessName: event.target.value, companyName: event.target.value }))}
	                  placeholder="Company name"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Business Type">
                <Input
                  value={businessType}
                  disabled
                  placeholder="Current module"
                />
              </Field>
              <Field label="Currency">
                <Select value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={!canManageSettings}>
                  {supportedCurrencies.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input
	                  value={draft.address || ''}
	                  onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))}
	                  placeholder="Business address for printable reports"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Tax Number">
                <Input
	                  value={draft.taxNumber || ''}
	                  onChange={(event) => setDraft((current) => ({ ...current, taxNumber: event.target.value }))}
	                  placeholder="NTN / Tax ID"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Invoice Prefix">
                <Input
	                  value={draft.invoicePrefix || ''}
	                  onChange={(event) => setDraft((current) => ({ ...current, invoicePrefix: event.target.value }))}
	                  placeholder="INV"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Report Prefix">
                <Input
	                  value={draft.reportPrefix || ''}
	                  onChange={(event) => setDraft((current) => ({ ...current, reportPrefix: event.target.value }))}
	                  placeholder="RPT"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Theme Color">
                <Input
	                  type="color"
	                  value={draft.themeColor || '#2563eb'}
	                  onChange={(event) => setDraft((current) => ({ ...current, themeColor: event.target.value }))}
	                  disabled={!canManageSettings}
	                />
              </Field>
              <Field label="Receipt Footer" className="sm:col-span-2">
                <Input
	                  value={draft.receiptFooter || ''}
	                  onChange={(event) => setDraft((current) => ({ ...current, receiptFooter: event.target.value }))}
	                  placeholder="Thank you for your business"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="Country">
                <Input
	                  value={draft.country}
	                  onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}
	                  placeholder="Country"
	                  readOnly={!canManageSettings}
	                />
              </Field>
              <Field label="City">
                <Input
	                  value={draft.city}
	                  onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
	                  placeholder="City"
	                  readOnly={!canManageSettings}
	                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-700">
                <HiOutlineArrowRightOnRectangle className="text-xl" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Logout</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                  End this CRM session and return to login.
                </p>
              </div>
            </div>
            <Button
              variant="subtle"
              className="mt-5 w-full rounded-2xl text-rose-700 hover:bg-rose-50"
              type="button"
              disabled={busy}
              onClick={handleLogout}
            >
              {busy ? 'Logging out…' : 'Logout'}
            </Button>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
