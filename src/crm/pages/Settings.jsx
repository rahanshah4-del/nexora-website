import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  HiOutlineBell,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineLockClosed,
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
import { useStaffPermissions } from '../hooks/useStaffPermissions.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-200">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function SettingToggle({ label, description, checked, disabled, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-3 shadow-sm transition hover:bg-white">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 shrink-0 rounded border-slate-300 bg-white text-sky-600 disabled:opacity-50"
      />
    </label>
  )
}

function PermissionSwitch({ label, checked, disabled, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/75 bg-white/75 px-3 py-2 shadow-sm">
      <span className="truncate text-xs font-semibold text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 disabled:opacity-50"
      />
    </label>
  )
}

function TeamPermissionsPanel() {
  const staffApi = useStaffPermissions()
  const [draft, setDraft] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    status: 'active',
    permissions: {},
  })
  const [status, setStatus] = useState(null)

  function showStatus(tone, message) {
    setStatus({ tone, message })
    window.setTimeout(() => setStatus(null), 1800)
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Team & Permissions</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
            Create staff IDs and control workspace permissions per staff user.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status ? <Badge variant={status.tone === 'success' ? 'success' : 'danger'}>{status.message}</Badge> : null}
          <Badge variant={staffApi.canManage ? 'success' : 'warning'}>
            {staffApi.canManage ? 'Owner/Admin Control' : 'Restricted'}
          </Badge>
        </div>
      </div>

      {!staffApi.canManage ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Settings Access permission is required to manage staff permissions.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-950">Create staff ID/account</p>
            <div className="mt-4 grid gap-3">
              <Field label="Staff name">
                <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label="Staff email">
                <Input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
              </Field>
              <Field label="Username optional">
                <Input value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Password">
                  <Input type="password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} />
                </Field>
                <Field label="Confirm Password">
                  <Input type="password" value={draft.confirmPassword} onChange={(event) => setDraft((current) => ({ ...current, confirmPassword: event.target.value }))} />
                </Field>
              </div>
              <Field label="Staff role">
                <Select value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="accountant">Accountant</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
              <div className="grid gap-2">
                <p className="text-xs font-semibold text-slate-600">Permissions</p>
                <div className="grid gap-2">
                  {staffApi.permissionKeys.map((permission) => (
                    <PermissionSwitch
                      key={permission.key}
                      label={permission.label}
                      checked={Boolean(draft.permissions[permission.key])}
                      onChange={(checked) =>
                        setDraft((current) => ({
                          ...current,
                          permissions: { ...current.permissions, [permission.key]: checked },
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
              <Button
                type="button"
                className="rounded-2xl"
                onClick={async () => {
                  const res = await staffApi.createStaff(draft)
                  if (res.ok) {
                    setDraft({
                      name: '',
                      email: '',
                      username: '',
                      password: '',
                      confirmPassword: '',
                      role: 'staff',
                      status: 'active',
                      permissions: {},
                    })
                    showStatus('success', res.message || 'Staff saved')
                  } else {
                    showStatus('error', res.error || 'Failed')
                  }
                }}
              >
                Create Staff
              </Button>
              <p className="text-xs leading-5 text-slate-500">
                Staff account saved. Use admin backend/cloud function for production user creation if Firebase blocks local secondary-user creation.
              </p>
            </div>
          </div>

          <div className="min-w-0">
            {staffApi.loading ? (
              <div className="grid min-h-[14rem] place-items-center rounded-[1.25rem] border border-slate-200/80 bg-white/70 text-sm text-slate-500">
                Loading staff permissions…
              </div>
            ) : staffApi.staff.length ? (
              <div className="space-y-3">
                {staffApi.staff.map((staff) => {
                  const rowPermissions = staffApi.permissions[staff.id] || {}
                  return (
                    <div key={staff.id} className="rounded-[1.25rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{staff.name || 'Staff User'}</p>
                          <p className="truncate text-xs text-slate-500">{staff.email || staff.id}</p>
                        </div>
                        <Badge variant={staff.role === 'admin' ? 'purple' : 'default'}>{staff.role || 'staff'}</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {staffApi.permissionKeys.map((permission) => (
                          <PermissionSwitch
                            key={permission.key}
                            label={permission.label}
                            checked={Boolean(rowPermissions[permission.key])}
                            disabled={!staffApi.canManage}
                            onChange={async (checked) => {
                              const res = await staffApi.setStaffPermission(staff.id, permission.key, checked)
                              if (!res.ok) showStatus('error', res.error || 'Failed')
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid min-h-[14rem] place-items-center rounded-[1.25rem] border border-dashed border-slate-200 bg-white/70 p-5 text-center">
                <div>
                  <p className="text-sm font-semibold text-slate-950">No staff accounts yet</p>
                  <p className="mt-1 text-sm text-slate-500">Create a staff ID to start assigning permissions.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function SettingsPage() {
  const { plan, userId, workspaceId, userDoc, firebaseUser } = useUser()
  const { currency, setCurrency, profile, setProfile, notifications, setNotifications } = usePreferences()
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const target = document.querySelector(location.hash)
    if (target) {
      window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [location.hash])

  function onSaveProfile() {
    setProfile(draft)
    logActivity({
      workspaceId,
      userId,
      ...userActivityInfo(userDoc, firebaseUser),
      action: 'Settings/profile updated',
      module: 'Settings',
      description: 'Profile and business settings were updated.',
      targetId: userId || '',
      targetName: draft.companyName || draft.ownerName || 'Profile',
      metadata: { companyName: draft.companyName || '', ownerName: draft.ownerName || '', currency },
    }).catch(() => {})
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  function onAvatarChange(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDraft((current) => ({ ...current, avatarDataUrl: String(reader.result || '') }))
    reader.readAsDataURL(file)
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
        subtitle="Profile, business identity, security, notifications, and workspace preferences."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {saved ? <Badge variant="success">Saved</Badge> : null}
            <Button variant="subtle" className="rounded-2xl" onClick={() => setDraft(profile)} type="button">
              Reset
            </Button>
            <Button className="rounded-2xl" onClick={onSaveProfile} type="button">
              Save changes
            </Button>
          </div>
        }
      />

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
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">Profile identity</p>
                    {saved ? <HiOutlineCheckCircle className="text-lg text-emerald-500" /> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                    Owner and contact details used across your workspace.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="subtle" className="rounded-2xl" onClick={() => fileRef.current?.click()} type="button">
                  Upload image
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setDraft((current) => ({ ...current, avatarDataUrl: '' }))}
                  type="button"
                >
                  Remove
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => onAvatarChange(event.target.files?.[0])}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Owner Name">
                <Input
                  value={draft.ownerName}
                  onChange={(event) => setDraft((current) => ({ ...current, ownerName: event.target.value }))}
                  placeholder="Owner name"
                />
              </Field>
              <Field label="Phone Number">
                <Input
                  value={draft.phone}
                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+92..."
                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <Input
                  value={draft.email}
                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email"
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
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Business setup</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Company details for invoices and reports.</p>
                </div>
              </div>
              <Badge variant={plan === 'Business' ? 'success' : plan === 'Starter' ? 'info' : 'default'}>{plan}</Badge>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Company Name" className="sm:col-span-2">
                <Input
                  value={draft.companyName}
                  onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))}
                  placeholder="Company name"
                />
              </Field>
              <Field label="Business Type">
                <Input
                  value={draft.businessType}
                  onChange={(event) => setDraft((current) => ({ ...current, businessType: event.target.value }))}
                  placeholder="SaaS / Agency / Retail..."
                />
              </Field>
              <Field label="Currency">
                <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
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
                />
              </Field>
              <Field label="Country">
                <Input
                  value={draft.country}
                  onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}
                  placeholder="Country"
                />
              </Field>
              <Field label="City">
                <Input
                  value={draft.city}
                  onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                  placeholder="City"
                />
              </Field>
            </div>
          </Card>

          <div id="team-permissions" className="scroll-mt-28">
            <TeamPermissionsPanel />
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <Card id="security" className="scroll-mt-28 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-50 text-violet-700">
                <HiOutlineLockClosed className="text-xl" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Security</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Password and active sessions.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">Password policy</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Keep credentials fresh and review sessions regularly.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Button className="rounded-2xl" type="button">Update password</Button>
                <Button variant="subtle" className="rounded-2xl" type="button">Manage sessions</Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                  <HiOutlineBell className="text-xl" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Notifications</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Alert channels and workspace updates.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                Enabled
                <input
                  type="checkbox"
                  checked={notifications.enabled}
                  onChange={(event) => setNotifications({ ...notifications, enabled: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3">
              <SettingToggle
                label="Email notifications"
                description="Send critical updates to your inbox."
                checked={notifications.email}
                disabled={!notifications.enabled}
                onChange={(event) => setNotifications({ ...notifications, email: event.target.checked })}
              />
              <SettingToggle
                label="Sales alerts"
                description="Notify when revenue or payment activity changes."
                checked={notifications.salesAlerts}
                disabled={!notifications.enabled}
                onChange={(event) => setNotifications({ ...notifications, salesAlerts: event.target.checked })}
              />
              <SettingToggle
                label="Report alerts"
                description="Reminders for generated reports and summaries."
                checked={notifications.reportAlerts}
                disabled={!notifications.enabled}
                onChange={(event) => setNotifications({ ...notifications, reportAlerts: event.target.checked })}
              />
              <SettingToggle
                label="Team activity"
                description="See important staff updates in real time."
                checked={notifications.teamActivity}
                disabled={!notifications.enabled}
                onChange={(event) => setNotifications({ ...notifications, teamActivity: event.target.checked })}
              />
              <SettingToggle
                label="System updates"
                description="Product and workspace health notifications."
                checked={notifications.systemUpdates}
                disabled={!notifications.enabled}
                onChange={(event) => setNotifications({ ...notifications, systemUpdates: event.target.checked })}
              />
            </div>
          </Card>

          <AuditLogPanel />
        </div>
      </div>
    </motion.div>
  )
}
