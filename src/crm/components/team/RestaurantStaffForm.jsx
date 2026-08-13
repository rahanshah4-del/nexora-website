import { motion } from 'framer-motion'
import { memo, useEffect, useState } from 'react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import Input from '../ui/Input.jsx'
import Select from '../ui/Select.jsx'
import Badge from '../ui/Badge.jsx'
import { useTeamMembers } from '../../hooks/useTeamMembers.js'
import { useStaffPermissions } from '../../hooks/useStaffPermissions.js'
import { useUser } from '../../hooks/useUser.js'
import {
  RESTAURANT_ROLES,
  buildRestaurantPermissions,
  canUseDesktopPOS,
  normalizeRestaurantRole,
  restaurantRoleLabel,
} from '../../data/restaurantRoles.js'
import { clientSafeMessage } from '../../utils/messages.js'

const STATUS_OPTIONS = ['Active', 'Disabled']

// Creatable roles for this form. The workspace Owner already exists (created
// at workspace setup) and must never be re-created via this form, so we exclude
// it from the selectable list while keeping it in RESTAURANT_ROLES for
// permission-checking elsewhere in the app.
const CREATABLE_ROLES = RESTAURANT_ROLES.filter((role) => role.key !== 'owner')

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function CredentialCard({ workspaceCode, staffLoginId }) {
  if (!workspaceCode && !staffLoginId) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm"
    >
      <p className="font-black text-emerald-900">Cashier till credentials ready</p>
      <p className="mt-1 text-xs font-semibold text-emerald-700">
        Give these to your cashier to log into the till terminal.
      </p>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {workspaceCode ? (
          <div className="rounded-xl bg-white/75 px-3 py-2">
            <span className="text-slate-500">Login Code</span>
            <p className="mt-0.5 font-black text-slate-900">{workspaceCode}</p>
          </div>
        ) : null}
        {staffLoginId ? (
          <div className="rounded-xl bg-white/75 px-3 py-2">
            <span className="text-slate-500">Cashier ID</span>
            <p className="mt-0.5 font-black text-slate-900">{staffLoginId}</p>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] font-semibold text-emerald-600">
        A 6-digit PIN has been emailed to the cashier. They will need all three to log into the till.
      </p>
    </motion.div>
  )
}

function RestaurantStaffForm({ onToast }) {
  const { businessType, workspaceId, userId, firebaseUser, userDoc, workspaceDoc } = useUser()
  const teamApi = useTeamMembers()
  const staffApi = useStaffPermissions()

  const isRestaurant = businessType === 'Restaurant POS'

  const [draft, setDraft] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cashier',
    status: 'Active',
  })
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  // Reset when business type changes
  useEffect(() => {
    setDraft({ name: '', email: '', phone: '', role: 'cashier', status: 'Active' })
    setCredentials(null)
    setSubmitted(false)
  }, [businessType])

  if (!isRestaurant) return null

  const ownerEmail = String(firebaseUser?.email || userDoc?.email || '').trim().toLowerCase()
  const draftEmail = String(draft.email || '').trim().toLowerCase()
  const selfEmailBlocked = Boolean(draftEmail && ownerEmail && draftEmail === ownerEmail)
  const canSave = Boolean(
    draft.name.trim() && draftEmail && !selfEmailBlocked && !saving,
  )
  const selectedRole = RESTAURANT_ROLES.find((r) => r.key === draft.role)
  const isCashier = draft.role === 'cashier'

  const saveBlockReason = !draft.name.trim()
    ? 'Staff name is required.'
    : !draftEmail
      ? 'Staff email is required.'
      : selfEmailBlocked
        ? 'Owner email cannot be used for staff.'
        : ''

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setSubmitted(true)
    onToast?.('info', `Saving ${draft.name || 'staff member'}...`)

    // Safety timeout: automatically clear the spinner and show an error
    // after 45 seconds if the save hasn't completed. This guards against
    // Cloud Function unavailability, network hangs, and Firestore timeouts.
    const safetyTimer = window.setTimeout(() => {
      setSaving(false)
      onToast?.('error', 'Save is taking longer than expected. The till login service may be temporarily unavailable. Your staff member has been saved — they may need till credentials set up once the service is back.')
    }, 45000)

    try {
      if (isCashier) {
        // Single writer: createStaff creates BOTH the staff record AND the
        // teamMembers record (with credentials) atomically in the Cloud Function.
        // No separate addMember call — this eliminates the orphan document.
        const perms = buildRestaurantPermissions('cashier')
        const staffResult = await staffApi.createStaff({
          name: draft.name.trim(),
          email: draftEmail,
          username: '',
          role: 'cashier',
          status: draft.status.toLowerCase(),
          permissions: perms,
        })

        window.clearTimeout(safetyTimer)

        if (!staffResult?.ok) {
          onToast?.('error', staffResult?.error || 'Failed to create cashier.')
          return
        }

        setCredentials({
          workspaceCode: staffResult.workspaceCode,
          staffLoginId: staffResult.staffLoginId,
        })
        onToast?.(
          'success',
          staffResult.emailSent
            ? `Cashier created. Login credentials emailed to ${draftEmail}.`
            : 'Cashier created but invite email could not be sent.',
        )
      } else {
        // Single writer: non-Cashier roles are website-only — no credentials,
        // no Cloud Function. Just a normal team member record.
        const memberResult = await teamApi.addMember({
          name: draft.name.trim(),
          email: draftEmail,
          phone: String(draft.phone || '').trim(),
          role: draft.role,
          status: draft.status,
          permissions: [],
        })

        window.clearTimeout(safetyTimer)

        if (memberResult?.error) {
          onToast?.('error', memberResult.error)
          return
        }

        onToast?.('success', `${selectedRole.label} added successfully.`)
      }

      // Reset form on success only
      setDraft({ name: '', email: '', phone: '', role: 'cashier', status: 'Active' })
      setSubmitted(false)
    } catch (err) {
      window.clearTimeout(safetyTimer)
      onToast?.('error', clientSafeMessage(err, 'Failed to save staff member.'))
    } finally {
      window.clearTimeout(safetyTimer)
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200/80 bg-slate-950 px-5 py-4 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-base font-black">Add Restaurant Staff</p>
            <p className="mt-1 text-xs font-semibold text-white/65">
              One simple form — role determines what they can access. Cashiers get till login credentials automatically.
            </p>
          </div>
          <Badge variant="success" className="border-white/20 bg-white/10 text-white">
            Restaurant POS
          </Badge>
        </div>
      </div>

      {/* Form body */}
      <div className="grid gap-0 xl:grid-cols-[1fr_0.7fr]">
        {/* Left: Basic fields */}
        <div className="border-b border-slate-200/80 bg-white p-5 xl:border-b-0 xl:border-r">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Staff Details</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Full Name">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Ali Khan"
                />
              </Field>
            </div>
            <Field label="Email">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="staff@restaurant.com"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                placeholder="03XX-XXXXXXX"
              />
            </Field>
            {selfEmailBlocked ? (
              <div className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                Owner email cannot be used for staff. Use a separate email address.
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: Role + Status */}
        <div className="bg-slate-50/70 p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Role &amp; Access</p>
          </div>

          {/* Role cards */}
          <div className="grid gap-2">
            {CREATABLE_ROLES.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, role: role.key }))}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  draft.role === role.key
                    ? 'border-sky-300 bg-white text-sky-900 shadow-sm ring-2 ring-sky-100'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black">{role.label}</span>
                  {role.canUseDesktopPOS ? (
                    <Badge variant="success" className="text-[10px]">Till Login</Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px]">Website Only</Badge>
                  )}
                </div>
                <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                  {role.description}
                </span>
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="mt-4">
            <Field label="Status">
              <Select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Summary */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Access Summary</p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Role</span>
                <span className="font-black text-slate-900">{selectedRole?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Modules</span>
                <span className="font-black text-slate-900">{selectedRole?.modules?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Till Login</span>
                <span className={`font-black ${isCashier ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {isCashier ? 'Yes — credentials will be generated' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Save button */}
          <Button
            type="button"
            className={`mt-4 min-h-12 w-full rounded-2xl text-base font-black shadow-lg transition ${
              canSave
                ? isCashier
                  ? 'bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 text-white shadow-emerald-500/25 hover:from-emerald-500 hover:via-sky-500 hover:to-indigo-500'
                  : 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sky-500/25 hover:from-sky-500 hover:to-indigo-500'
                : 'bg-slate-400 text-slate-100 shadow-slate-900/20'
            }`}
            disabled={!canSave}
            onClick={handleSave}
          >
            {saving
              ? 'Saving...'
              : canSave
                ? isCashier
                  ? 'Add Cashier & Generate Till Login'
                  : `Add ${selectedRole?.label}`
                : submitted
                  ? 'Fill Required Fields'
                  : `Add ${selectedRole?.label}`}
          </Button>
          {submitted && saveBlockReason ? (
            <p className="mt-2 text-center text-[11px] font-semibold text-rose-600">{saveBlockReason}</p>
          ) : null}
        </div>
      </div>

      {/* Credentials reveal */}
      {credentials ? (
        <div className="border-t border-slate-200/80 bg-white px-5 py-4">
          <CredentialCard workspaceCode={credentials.workspaceCode} staffLoginId={credentials.staffLoginId} />
        </div>
      ) : null}
    </Card>
  )
}

export default memo(RestaurantStaffForm)
