import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import PageSearch from '../components/ui/PageSearch.jsx'
import TeamMembersTable from '../components/team/TeamMembersTable.jsx'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import { useTeamPermissions } from '../hooks/useTeamPermissions.js'
import { useStaffPermissions } from '../hooks/useStaffPermissions.js'
import { useActivityLogs } from '../hooks/useActivityLogs.js'
import { usePreferences } from '../hooks/usePreferences.js'
import { useUser } from '../hooks/useUser.js'
import ActivityTimeline from '../components/activity/ActivityTimeline.jsx'
import { clientSafeMessage } from '../utils/messages.js'
import { modulePermissionActionLabels, modulePermissionActions, permissionModuleDefinitions } from '../data/moduleAccess.js'
import { showGlobalToast } from '../lib/globalToast.js'

const roleCards = [
  { name: 'Owner', summary: 'Full workspace access. Owner permissions are always enabled.' },
  { name: 'Admin', summary: 'Manage team, settings, approvals, and operational modules.' },
  { name: 'Manager', summary: 'Lead daily operations, team tasks, and module visibility.' },
  { name: 'Sales Staff', summary: 'Work with leads, deals, customers, and follow-ups.' },
  { name: 'Support Agent', summary: 'Handle customer support and service activity.' },
  { name: 'Accountant', summary: 'Manage finance workflows, invoices, payments, and reports.' },
  { name: 'Custom Role', summary: 'Use the permission matrix to shape a custom access profile.' },
]

const actionPermissions = modulePermissionActions.map((action) => modulePermissionActionLabels[action])

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
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
        onChange={(event) => onChange?.(event.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 disabled:opacity-50"
      />
    </label>
  )
}

function groupPermissionKeys(permissionKeys = []) {
  const groups = []
  const byModule = new Map()
  permissionKeys.forEach((permission) => {
    const moduleKey = permission.moduleKey || 'general'
    if (!byModule.has(moduleKey)) {
      const group = {
        key: moduleKey,
        label: permission.moduleLabel || permission.label,
        route: permission.route,
        comingSoon: permission.comingSoon,
        permissions: [],
      }
      byModule.set(moduleKey, group)
      groups.push(group)
    }
    byModule.get(moduleKey).permissions.push(permission)
  })
  return groups
}

function RolePermissionTable({ title, description, rows, roles, matrix, onToggle }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <Badge variant="purple">RBAC</Badge>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[58rem] w-full text-left text-sm">
          <thead className="bg-white/50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold">Permission</th>
              {roles.map((role) => (
                <th key={role} className="px-4 py-3 font-semibold">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15 bg-white/30 dark:divide-white/10 dark:bg-slate-900/25">
            {rows.map((permission) => (
              <tr key={permission} className="hover:bg-white/40 dark:hover:bg-white/5">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{permission}</td>
                {roles.map((role) => {
                  const owner = role === 'Owner'
                  return (
                    <td key={role} className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={owner || Boolean(matrix?.[role]?.[permission])}
                        disabled={owner}
                        onChange={() => onToggle?.(role, permission)}
                        className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/40"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function RolesTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {roleCards.map((role) => (
        <Card key={role.name} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-950 dark:text-white">{role.name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{role.summary}</p>
            </div>
            <Badge variant={role.name === 'Owner' ? 'success' : role.name === 'Custom Role' ? 'info' : 'purple'}>
              {role.name === 'Owner' ? 'Full' : 'Role'}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  )
}

function PermissionsTab({ perms, modulePermissions, onToast }) {
  return (
    <div className="space-y-4">
      {perms.error ? (
        <Card className="p-5">
          <p className="text-sm text-rose-700 dark:text-rose-200">{perms.error}</p>
        </Card>
      ) : null}

      {perms.loading ? (
        <Card className="p-5">
          <div className="grid min-h-[16rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
            Loading permissions…
          </div>
        </Card>
      ) : !perms.exists ? (
        <EmptyState
          title="Permissions not set up yet"
          description="Initialize the permission matrix to manage role access across the team."
          actionLabel="Initialize Permissions"
          onAction={async () => {
            const res = await perms.initializeTemplate()
            if (res?.ok) onToast('success', 'Permissions initialized')
            else if (res?.error) onToast('error', res.error)
          }}
        />
      ) : (
        <>
          <RolePermissionTable
            title="Module permissions"
            description="Frontend module visibility for staff where the CRM already supports it. Backend security rules are unchanged."
            rows={modulePermissions}
            roles={perms.roles}
            matrix={perms.matrix}
            onToggle={perms.toggle}
          />
          <RolePermissionTable
            title="Action permissions"
            description="Action-level controls for team workflows. Owner remains fully enabled."
            rows={actionPermissions}
            roles={perms.roles}
            matrix={perms.matrix}
            onToggle={perms.toggle}
          />
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Save permission matrix</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Stored under the existing workspace teamPermissions document.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="rounded-2xl"
                  disabled={perms.loading}
                  onClick={async () => {
                    const res = await perms.save()
                    if (res?.ok) onToast('success', 'Permissions saved successfully')
                    else if (res?.error) onToast('error', res.error)
                  }}
                >
                  Save Permissions
                </Button>
                <Button
                  type="button"
                  className="rounded-2xl"
                  variant="subtle"
                  disabled={perms.loading}
                  onClick={async () => {
                    const res = await perms.initializeTemplate()
                    if (res?.ok) onToast('success', 'Permissions template applied')
                    else if (res?.error) onToast('error', res.error)
                  }}
                >
                  Reset Template
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

const rolePresets = {
  admin: {
    label: 'Admin',
    description: 'Full workspace management except owner protection.',
    allowActions: ['view', 'create', 'edit', 'delete', 'export', 'approve'],
  },
  manager: {
    label: 'Manager',
    description: 'Daily operations, reports, exports, and approvals.',
    allowActions: ['view', 'create', 'edit', 'export', 'approve'],
  },
  accountant: {
    label: 'Accountant',
    description: 'Finance, invoices, expenses, accounts, reports, and approvals.',
    financeOnly: true,
    allowActions: ['view', 'create', 'edit', 'export', 'approve'],
  },
  sales: {
    label: 'Sales Staff',
    description: 'Customers, leads, POS/orders, invoices, and follow-ups.',
    salesOnly: true,
    allowActions: ['view', 'create', 'edit'],
  },
  support: {
    label: 'Support Agent',
    description: 'Customers, support, WhatsApp inbox, notifications, and follow-ups.',
    supportOnly: true,
    allowActions: ['view', 'create', 'edit'],
  },
  staff: {
    label: 'Custom Staff',
    description: 'Start limited, then choose modules and actions.',
    allowActions: ['view'],
  },
}

const financeModules = new Set(['dashboard', 'invoices', 'payments', 'expenses', 'accounts', 'accountStatements', 'reports', 'approvals'])
const salesModules = new Set(['dashboard', 'customers', 'leads', 'salesPipeline', 'deals', 'followUps', 'products', 'inventory', 'pos', 'posOrders', 'orders', 'invoices', 'reports'])
const supportModules = new Set(['dashboard', 'customers', 'support', 'whatsappInbox', 'whatsappLeads', 'whatsappFollowUps', 'notifications', 'reports'])
const extraPermissionActions = ['create', 'edit', 'delete', 'export', 'approve']

function permissionGroups(permissionKeys = []) {
  return groupPermissionKeys(permissionKeys).filter((group) => !group.comingSoon)
}

function roleLabel(role) {
  return rolePresets[role]?.label || rolePresets.staff.label
}

function moduleAllowedForPreset(moduleKey, preset) {
  if (preset.financeOnly) return financeModules.has(moduleKey)
  if (preset.salesOnly) return salesModules.has(moduleKey)
  if (preset.supportOnly) return supportModules.has(moduleKey)
  return true
}

function buildRolePermissions(role, permissionKeys = []) {
  const preset = rolePresets[role] || rolePresets.staff
  return Object.fromEntries(permissionKeys.map((permission) => {
    const allowedModule = moduleAllowedForPreset(permission.moduleKey, preset)
    const allowedAction = preset.allowActions.includes(permission.action)
    return [permission.key, Boolean(allowedModule && allowedAction)]
  }))
}

function setModulePermissions(current, group, enabled) {
  const next = { ...current }
  group.permissions.forEach((permission) => {
    if (permission.action === 'view') next[permission.key] = Boolean(enabled)
    else if (!enabled) next[permission.key] = false
  })
  return next
}

function hasViewPermission(rowPermissions = {}, permissionKeys = []) {
  return permissionKeys.some((permission) => permission.action === 'view' && Boolean(rowPermissions?.[permission.key]))
}

function permissionsFromEnabledModules(staff = {}, permissionKeys = []) {
  const enabled = new Set(Array.isArray(staff.enabledModules) ? staff.enabledModules : [])
  if (!enabled.size) return {}
  return Object.fromEntries(
    permissionKeys
      .filter((permission) => permission.action === 'view' && enabled.has(permission.moduleKey))
      .map((permission) => [permission.key, true]),
  )
}

function displayPermissionsForStaff(staff = {}, rowPermissions = {}, permissionKeys = []) {
  return hasViewPermission(rowPermissions, permissionKeys)
    ? rowPermissions
    : { ...rowPermissions, ...permissionsFromEnabledModules(staff, permissionKeys) }
}

function inviteStageState(draft, selectedModules, selfEmailBlocked) {
  const hasMember = Boolean(String(draft.name || '').trim() && String(draft.email || '').trim())
  const hasPassword = Boolean(draft.password && draft.confirmPassword && draft.password === draft.confirmPassword && draft.password.length >= 6)
  return [
    { key: 'member', label: 'Member', helper: hasMember ? 'Ready' : 'Name + email', done: hasMember && !selfEmailBlocked, active: !hasMember || selfEmailBlocked },
    { key: 'role', label: 'Role', helper: roleLabel(draft.role), done: Boolean(draft.role), active: hasMember && !draft.role },
    { key: 'modules', label: 'Modules', helper: `${selectedModules.length} selected`, done: selectedModules.length > 0, active: hasMember && selectedModules.length === 0 },
    { key: 'invite', label: 'Send Invite', helper: hasPassword ? 'Ready' : 'Password needed', done: hasMember && selectedModules.length > 0 && hasPassword && !selfEmailBlocked, active: hasMember && selectedModules.length > 0 && !hasPassword },
  ]
}

function InviteTimeline({ stages, pulse }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        {stages.map((stage, index) => (
          <div key={stage.key} className="relative min-w-0">
            {index ? <div className="absolute left-0 top-5 hidden h-0.5 w-full -translate-x-1/2 bg-slate-200 md:block" /> : null}
            <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
              <motion.span
                animate={stage.done || pulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black ${stage.done ? 'bg-emerald-600 text-white' : stage.active ? 'bg-sky-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
              >
                {stage.done ? '✓' : index + 1}
              </motion.span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-900">{stage.label}</p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{stage.helper}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SegmentedToggle({ value, options, onChange }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-xl px-3 py-2 text-left transition ${value === option.value ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <span className="block text-xs font-black">{option.label}</span>
          <span className={`mt-0.5 block text-[11px] ${value === option.value ? 'text-white/75' : 'text-slate-400'}`}>{option.helper}</span>
        </button>
      ))}
    </div>
  )
}

function InviteSuccessPanel({ invite }) {
  if (!invite) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
    >
      <p className="font-black">Invite sent</p>
      <p className="mt-1 text-xs font-semibold">{invite.email} is ready to log in as {roleLabel(invite.role)}. Timeline will switch to accepted after first login.</p>
    </motion.div>
  )
}

function StaffAccessCard({ staff, rowPermissions, permissionKeys, canManage, onStatus, onPermission, onResendEmail, onToast }) {
  const [resendBusy, setResendBusy] = useState(false)
  const blocked = ['blocked', 'disabled', 'inactive'].includes(String(staff.status || '').toLowerCase())
  const accepted = String(staff.inviteStatus || '').toLowerCase() === 'accepted' || Boolean(staff.acceptedAt || staff.lastLoginAt)
  const emailFailed = String(staff.inviteEmailStatus || '').toLowerCase() === 'failed'
  const emailSent = String(staff.inviteEmailStatus || '').toLowerCase() === 'sent'
  const groups = permissionGroups(permissionKeys)
  const enabledModules = groups.filter((group) => group.permissions.some((permission) => permission.action === 'view' && rowPermissions?.[permission.key]))

  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-950">{staff.name || 'Staff User'}</p>
            <Badge variant={blocked ? 'danger' : 'success'}>{blocked ? 'Blocked' : staff.status || 'active'}</Badge>
            <Badge variant={accepted ? 'success' : 'warning'}>{accepted ? 'Accepted' : 'Invite sent'}</Badge>
            {emailFailed ? <Badge variant="danger">Email failed</Badge> : emailSent ? <Badge variant="info">Email sent</Badge> : null}
            <Badge variant="purple">{roleLabel(staff.role)}</Badge>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{staff.email || staff.id}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {enabledModules.length ? `${enabledModules.length} modules allowed: ${enabledModules.slice(0, 5).map((item) => item.label).join(', ')}${enabledModules.length > 5 ? '...' : ''}` : 'No module access selected'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="subtle"
            className={`rounded-xl px-3 py-2 text-xs ${resendBusy ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-100' : ''}`}
            type="button"
            disabled={!canManage || resendBusy}
            onClick={async () => {
              setResendBusy(true)
              onToast('info', `Resending invite to ${staff.email || staff.id}...`)
              try {
                const res = await onResendEmail(staff.id)
                if (res?.ok) onToast('success', res.message || 'Invite email resent')
                else onToast('error', res?.error || 'Invite email resend failed')
              } catch (error) {
                onToast('error', clientSafeMessage(error, 'Invite email resend failed.'))
              } finally {
                setResendBusy(false)
              }
            }}
          >
            {resendBusy ? 'Sending...' : 'Resend email'}
          </Button>
          <Button
            variant={blocked ? 'subtle' : 'ghost'}
            className={blocked ? 'rounded-xl px-3 py-2 text-xs' : 'rounded-xl px-3 py-2 text-xs text-rose-700 hover:bg-rose-50'}
            type="button"
            disabled={!canManage}
            onClick={async () => {
              const res = await onStatus(staff.id, blocked ? 'active' : 'blocked')
              if (res?.ok) onToast('success', blocked ? 'Staff activated' : 'Staff blocked. They will be logged out automatically.')
              else if (res?.error) onToast('error', res.error)
            }}
          >
            {blocked ? 'Activate user' : 'Block user'}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          ['Invite', true],
          ['Accepted', accepted],
          ['Allowed Modules', enabledModules.length > 0],
        ].map(([label, done]) => (
          <div key={label} className={`rounded-2xl border px-3 py-2 text-xs font-black ${done ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
            {done ? '✓ ' : ''}{label}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const viewPermission = group.permissions.find((permission) => permission.action === 'view')
          const checked = Boolean(viewPermission && rowPermissions?.[viewPermission.key])
          return (
            <PermissionSwitch
              key={group.key}
              label={group.label}
              checked={checked}
              disabled={!canManage}
              onChange={async (value) => {
                for (const permission of group.permissions) {
                  if (permission.action === 'view' || !value) {
                    const res = await onPermission(staff.id, permission.key, permission.action === 'view' ? value : false)
                    if (!res?.ok) {
                      onToast('error', res?.error || 'Failed to update permission')
                      return
                    }
                  }
                }
                onToast('success', `${group.label} access ${value ? 'enabled' : 'disabled'}`)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function AccessControlTab({ staffApi, members, onToast, currentUserEmail, currentUserId, ownerId }) {
  const { usage } = usePreferences()
  const [invitePulse, setInvitePulse] = useState(null)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'sales',
    status: 'active',
    permissions: buildRolePermissions('sales', staffApi.permissionKeys),
  })
  const staffLimit = Number(usage?.teamMembersLimit || 0)
  const groups = useMemo(() => permissionGroups(staffApi.permissionKeys), [staffApi.permissionKeys])
  const selectedModules = useMemo(
    () => groups.filter((group) => group.permissions.some((permission) => permission.action === 'view' && draft.permissions?.[permission.key])),
    [draft.permissions, groups],
  )
  const selectedModuleKeys = useMemo(() => new Set(selectedModules.map((group) => group.key)), [selectedModules])
  const activeActionCount = staffApi.permissionKeys.filter((permission) => permission.action !== 'view' && draft.permissions?.[permission.key]).length
  const draftEmail = String(draft.email || '').trim().toLowerCase()
  const ownerEmail = String(currentUserEmail || '').trim().toLowerCase()
  const selfEmailBlocked = Boolean(draftEmail && ownerEmail && draftEmail === ownerEmail)
  const passwordReady = Boolean(draft.password && draft.confirmPassword && draft.password === draft.confirmPassword && draft.password.length >= 6)
  const canSendInvite = Boolean(draft.name.trim() && draftEmail && passwordReady && selectedModules.length > 0 && !selfEmailBlocked && !staffApi.loading && !inviteBusy)
  const inviteBlockReason =
    !draft.name.trim() ? 'Staff name add karein.'
      : !draftEmail ? 'Staff email add karein.'
        : selfEmailBlocked ? 'Owner/admin wali email staff invite me use nahi ho sakti.'
          : !draft.password ? 'Password add karein.'
            : draft.password.length < 6 ? 'Password kam az kam 6 characters ka hona chahiye.'
              : draft.password !== draft.confirmPassword ? 'Password aur confirm password match nahi kar rahe.'
                : selectedModules.length === 0 ? 'Kam az kam ek module select karein.'
                  : staffApi.loading ? 'Staff permissions load ho rahi hain, ek second wait karein.'
                    : ''
  const stages = inviteStageState(draft, selectedModules, selfEmailBlocked)
  const visibleStaff = useMemo(
    () => {
      const memberEmails = new Set(members.map((member) => String(member.email || '').trim().toLowerCase()).filter(Boolean))
      const memberIds = new Set(members.flatMap((member) => [member.id, member.uid, member.userId, member.staffId]).filter(Boolean).map(String))
      return staffApi.staff.filter((staff) => {
        const role = String(staff.role || '').trim().toLowerCase()
        const email = String(staff.email || '').trim().toLowerCase()
        const id = String(staff.id || staff.uid || staff.userId || staff.staffId || '')
        if (role === 'owner') return false
        if (ownerId && id === String(ownerId)) return false
        if (currentUserId && id === String(currentUserId)) return false
        if (ownerEmail && email === ownerEmail) return false
        if (!memberIds.has(id) && !memberEmails.has(email)) return false
        return true
      })
    },
    [currentUserId, members, ownerEmail, ownerId, staffApi.staff],
  )
  const staffUsed = visibleStaff.length || members.filter((member) => {
    const role = String(member.role || '').trim().toLowerCase()
    const email = String(member.email || '').trim().toLowerCase()
    const id = String(member.id || member.uid || member.userId || member.staffId || '')
    if (role === 'owner') return false
    if (ownerId && id === String(ownerId)) return false
    if (currentUserId && id === String(currentUserId)) return false
    if (ownerEmail && email === ownerEmail) return false
    return true
  }).length

  useEffect(() => {
    Promise.resolve().then(() => {
      setDraft((current) => ({
        ...current,
        permissions: Object.keys(current.permissions || {}).length ? current.permissions : buildRolePermissions(current.role, staffApi.permissionKeys),
      }))
    })
  }, [staffApi.permissionKeys])

  function updateRole(role) {
    setDraft((current) => ({
      ...current,
      role,
      permissions: buildRolePermissions(role, staffApi.permissionKeys),
    }))
  }

  function resetDraft() {
    setDraft({
      name: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'sales',
      status: 'active',
      permissions: buildRolePermissions('sales', staffApi.permissionKeys),
    })
  }

  return (
    <div className="space-y-4">
      <InviteTimeline stages={stages} pulse={Boolean(invitePulse)} />
      <InviteSuccessPanel invite={invitePulse} />

      {!staffApi.canManage ? (
        <Card className="p-5">
          <p className="text-sm text-amber-800">Only the workspace owner or an admin can manage staff access.</p>
        </Card>
      ) : (
        <>
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200/80 bg-slate-950 px-5 py-4 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-black">Staff onboarding</p>
                <p className="mt-1 text-xs font-semibold text-white/65">Owner/admin creates a separate staff login, assigns role, modules, and sensitive actions.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success" className="border-white/20 bg-white/10 text-white">{staffLimit ? `${staffUsed}/${staffLimit} seats` : `${staffUsed} staff`}</Badge>
                <Badge variant="info" className="border-white/20 bg-white/10 text-white">Direct URL protected</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[0.9fr_1.25fr_0.85fr]">
            <div className="border-b border-slate-200/80 bg-white p-5 xl:border-b-0 xl:border-r">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Step 1</p>
                <p className="mt-1 text-sm font-black text-slate-950">Member details</p>
              </div>
              <div className="grid gap-3">
                <Field label="Staff name">
                  <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                </Field>
                <Field label="Staff email">
                  <Input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
                </Field>
                {selfEmailBlocked ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    Owner/admin ki login email staff ke liye use nahi ho sakti. Separate staff email add karein.
                  </div>
                ) : null}
                <Field label="Username optional">
                  <Input value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <Field label="Password">
                    <Input type="password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} />
                  </Field>
                  <Field label="Confirm Password">
                    <Input type="password" value={draft.confirmPassword} onChange={(event) => setDraft((current) => ({ ...current, confirmPassword: event.target.value }))} />
                  </Field>
                </div>
                <Field label="Start access">
                  <SegmentedToggle
                    value={draft.status}
                    onChange={(status) => setDraft((current) => ({ ...current, status }))}
                    options={[
                      { value: 'active', label: 'Active', helper: 'Can login after invite' },
                      { value: 'blocked', label: 'Blocked', helper: 'Prepare only' },
                    ]}
                  />
                </Field>
              </div>
            </div>

            <div className="border-b border-slate-200/80 bg-slate-50/70 p-5 xl:border-b-0 xl:border-r">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Step 2</p>
                  <p className="mt-1 text-sm font-black text-slate-950">Role and modules</p>
                </div>
                <Badge variant="purple">{roleLabel(draft.role)}</Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(rolePresets).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateRole(key)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${draft.role === key ? 'border-sky-300 bg-white text-sky-900 shadow-sm ring-2 ring-sky-100' : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300'}`}
                  >
                    <span className="block text-xs font-black">{preset.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">{preset.description}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-[1.1rem] border border-white bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-800">Allowed modules</p>
                    <p className="mt-1 text-[11px] text-slate-500">Selected modules show in sidebar and pass direct URL checks.</p>
                  </div>
                  <Badge variant="info">{selectedModules.length} selected</Badge>
                </div>
                <div className="mt-3 grid max-h-[18rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {groups.map((group) => (
                    <PermissionSwitch
                      key={group.key}
                      label={group.label}
                      checked={selectedModuleKeys.has(group.key)}
                      onChange={(checked) =>
                        setDraft((current) => ({
                          ...current,
                          permissions: setModulePermissions(current.permissions, group, checked),
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[1.1rem] border border-white bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-800">Sensitive actions</p>
                    <p className="mt-1 text-[11px] text-slate-500">Delete, approval and export stay off unless explicitly enabled.</p>
                  </div>
                  <Badge variant="warning">{activeActionCount} enabled</Badge>
                </div>
                <div className="mt-3 space-y-3">
                  {selectedModules.length ? selectedModules.map((group) => (
                    <details key={group.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3" open={draft.role === 'admin' || draft.role === 'manager'}>
                      <summary className="cursor-pointer text-xs font-black text-slate-700">{group.label}</summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {group.permissions.filter((permission) => extraPermissionActions.includes(permission.action)).map((permission) => (
                          <PermissionSwitch
                            key={permission.key}
                            label={permission.actionLabel}
                            checked={Boolean(draft.permissions?.[permission.key])}
                            onChange={(checked) => setDraft((current) => ({ ...current, permissions: { ...current.permissions, [permission.key]: checked } }))}
                          />
                        ))}
                      </div>
                    </details>
                  )) : (
                    <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-500">Select at least one module first.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-5">
              <div className="sticky top-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Step 3</p>
                <p className="mt-1 text-sm font-black text-slate-950">Review invite</p>
                <div className="mt-4 space-y-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Staff</p>
                    <p className="mt-1 break-words text-sm font-black text-slate-950">{draft.name || 'New staff member'}</p>
                    <p className="mt-0.5 break-words text-xs font-semibold text-slate-500">{draft.email || 'email required'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="font-black text-slate-900">{roleLabel(draft.role)}</p>
                      <p className="mt-1 text-slate-500">Role</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="font-black text-slate-900">{selectedModules.length}</p>
                      <p className="mt-1 text-slate-500">Modules</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="font-black text-slate-900">{activeActionCount}</p>
                      <p className="mt-1 text-slate-500">Actions</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="font-black text-slate-900 capitalize">{draft.status}</p>
                      <p className="mt-1 text-slate-500">Login</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                    Audit log, staff record, permissions record, and Firebase login are created together.
                  </div>
                  <Button
                    type="button"
                    className={`min-h-12 w-full rounded-2xl text-base font-black shadow-lg transition ${
                      canSendInvite
                        ? 'bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-500 text-white shadow-sky-500/25 hover:from-sky-500 hover:via-indigo-500 hover:to-emerald-400'
                        : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-950 text-white shadow-slate-900/20 hover:from-rose-600 hover:via-orange-500 hover:to-amber-400'
                    }`}
                    disabled={staffApi.loading || inviteBusy}
                    onClick={async () => {
                      if (!canSendInvite) {
                        const message = inviteBlockReason || 'Invite details complete karein.'
                        showGlobalToast('error', message, 3200)
                        return
                      }
                      const invite = { email: draft.email, role: draft.role }
                      setInviteBusy(true)
                      showGlobalToast('info', `Sending invite to ${draft.email}...`, 3000)
                      try {
                        const res = await staffApi.createStaff(draft)
                        if (res.ok) {
                          setInvitePulse(invite)
                          window.setTimeout(() => setInvitePulse(null), 5000)
                          resetDraft()
                          if (res.emailSent === false) {
                            const message = `${res.message || 'Staff login created, but email was not sent.'}${res.emailError ? ` ${res.emailError}` : ''}`
                            showGlobalToast('warning', message, 5000)
                          } else {
                            const message = res.message || 'Invite email sent and staff login created.'
                            showGlobalToast('success', message, 3200)
                          }
                        } else {
                          const message = res.error || 'Failed to create staff'
                          showGlobalToast('error', message, 4200)
                        }
                      } finally {
                        setInviteBusy(false)
                      }
                    }}
                  >
                    {inviteBusy ? 'Sending Invite...' : canSendInvite ? 'Send Invite' : 'Check & Send Invite'}
                  </Button>
                  {!canSendInvite ? (
                    <p className="text-center text-[11px] font-semibold text-slate-500">{inviteBlockReason || 'Complete member, password, modules, and email checks to send.'}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">Staff access board</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Track sent invites, accepted staff, blocked users, and module access.</p>
            </div>
            <Badge variant="success">Live permissions</Badge>
          </div>
          {staffApi.loading ? (
            <div className="grid min-h-[14rem] place-items-center rounded-[1.25rem] border border-slate-200/80 bg-white/70 text-sm text-slate-500">
              Loading access controls…
            </div>
          ) : visibleStaff.length ? (
            <div className="space-y-3">
              {visibleStaff.map((staff) => {
                const rowPermissions = displayPermissionsForStaff(staff, staffApi.permissions[staff.id] || {}, staffApi.permissionKeys)
                return (
                  <StaffAccessCard
                    key={staff.id}
                    staff={staff}
                    rowPermissions={rowPermissions}
                    permissionKeys={staffApi.permissionKeys}
                    canManage={staffApi.canManage}
                    onStatus={staffApi.setStaffStatus}
                    onPermission={staffApi.setStaffPermission}
                    onResendEmail={staffApi.resendStaffInvite}
                    onToast={onToast}
                  />
                )
              })}
            </div>
          ) : (
            <div className="grid min-h-[14rem] place-items-center rounded-[1.25rem] border border-dashed border-slate-200 bg-white/70 p-5 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-950">No staff login accounts yet</p>
                <p className="mt-1 text-sm text-slate-500">New invited staff will appear here. Owner account is hidden from this board.</p>
              </div>
            </div>
          )}
        </Card>
        </>
      )}
    </div>
  )
}

export default function TeamPage() {
  const { userId, businessType, accessPlan, workspaceId, workspaceDoc, firebaseUser, userDoc } = useUser()
  const { members, loading, source, error, permissionKeys, addMember, updateMember, deleteMember } = useTeamMembers()
  const [toast, setToast] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState('members')
  const [memberSearch, setMemberSearch] = useState('')
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return members
    return members.filter((member) =>
      [member.name, member.email, member.role, member.status, member.username].some((value) =>
        String(value || '').toLowerCase().includes(q),
      ),
    )
  }, [members, memberSearch])
  const modulePermissions = useMemo(
    () =>
      permissionModuleDefinitions({
        businessType,
        plan: accessPlan,
        developerOverride: false,
        teamOverride: true,
        onboardingCompleted: true,
      }).map((module) => module.label),
    [accessPlan, businessType],
  )
  const matrixPermissionKeys = useMemo(() => [...modulePermissions, ...actionPermissions], [modulePermissions])
  const perms = useTeamPermissions({ permissionKeys: matrixPermissionKeys })
  const staffApi = useStaffPermissions()
  const activity = useActivityLogs()

  const showToast = (tone, message, timeout = 2200) => {
    setToast({ tone, message })
    window.setTimeout(() => setToast(null), timeout)
  }

  const teamActivityItems = (activity.logs || []).filter((l) => {
    const module = String(l.module || '')
    const action = String(l.action || '')
    if (module === 'Team' || module === 'Auth') return true
    if (action.toLowerCase().includes('role')) return true
    if (action.toLowerCase().includes('permission')) return true
    if (action.toLowerCase().includes('login') || action.toLowerCase().includes('logout')) return true
    return false
  })

  const tabs = [
    { key: 'members', label: 'Team Members' },
    { key: 'roles', label: 'Roles' },
    { key: 'permissions', label: 'Permissions' },
    { key: 'access', label: 'Access Control' },
    { key: 'activity', label: 'Activity Logs' },
  ].filter(Boolean)

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab && tabs.some((item) => item.key === requestedTab)) {
      Promise.resolve().then(() => setTab(requestedTab))
    }
  }, [searchParams, tabs])

  const selectTab = (nextTab) => {
    setTab(nextTab)
    const params = new URLSearchParams(searchParams)
    if (nextTab === 'members') params.delete('tab')
    else params.set('tab', nextTab)
    setSearchParams(params, { replace: true })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Team Management"
        subtitle="Single place for team members, roles, permissions, access control, and audit logs."
        right={
          <Badge variant={source === 'firestore' ? 'success' : 'default'}>
            {loading ? 'Loading…' : source === 'firestore' ? 'Live Sync' : 'No data yet'}
          </Badge>
        }
      />

      {error ? (
        <Card className="p-5">
          <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
        </Card>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            type="button"
            variant={tab === t.key ? 'subtle' : 'ghost'}
            className="rounded-2xl px-3 py-2 text-xs"
            onClick={() => selectTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'members' ? (
          loading ? (
            <Card className="p-5">
              <div className="grid min-h-[16rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                Loading team…
              </div>
            </Card>
          ) : members.length === 0 ? (
            <Card className="p-5">
              <TeamMembersTable
                members={members}
                permissionKeys={permissionKeys}
                ownerId={workspaceDoc?.ownerId || workspaceId || userId}
                currentUserId={userId}
                currentUserEmail={firebaseUser?.email || userDoc?.email || ''}
                onAdd={async (m) => {
                  const res = await addMember(m)
                  if (res?.ok) showToast('success', 'Team member added successfully')
                  else if (res?.error) showToast('error', res.error)
                }}
                onUpdate={async (id, m) => {
                  try {
                    const res = await updateMember(id, m)
                    if (res?.error) showToast('error', res.error)
                    else showToast('success', res?.message || 'Team member updated')
                  } catch (e) {
                    showToast('error', clientSafeMessage(e, 'Unable to update team member.'))
                  }
                }}
                onDelete={async (id) => {
                  const res = await deleteMember(id)
                  if (res?.ok) showToast('success', 'Team member deleted')
                  else if (res?.error) showToast('error', res.error)
                }}
              />
            </Card>
          ) : (
            <Card className="p-5">
              <div className="mb-4">
                <PageSearch
                  className="sm:max-w-md"
                  value={memberSearch}
                  onChange={setMemberSearch}
                  placeholder="Search team by name, email, role..."
                  resultCount={filteredMembers.length}
                  totalCount={members.length}
                />
              </div>
              <TeamMembersTable
                members={filteredMembers}
                permissionKeys={permissionKeys}
                ownerId={workspaceDoc?.ownerId || workspaceId || userId}
                currentUserId={userId}
                currentUserEmail={firebaseUser?.email || userDoc?.email || ''}
                onAdd={async (m) => {
                  const res = await addMember(m)
                  if (res?.ok) showToast('success', 'Team member added successfully')
                  else if (res?.error) showToast('error', res.error)
                }}
                onUpdate={async (id, m) => {
                  try {
                    const res = await updateMember(id, m)
                    if (res?.error) showToast('error', res.error)
                    else showToast('success', res?.message || 'Team member updated')
                  } catch (e) {
                    showToast('error', clientSafeMessage(e, 'Unable to update team member.'))
                  }
                }}
                onDelete={async (id) => {
                  const res = await deleteMember(id)
                  if (res?.ok) showToast('success', 'Team member deleted')
                  else if (res?.error) showToast('error', res.error)
                }}
              />
            </Card>
          )
        ) : null}

        {tab === 'roles' ? <RolesTab /> : null}

        {tab === 'permissions' ? <PermissionsTab perms={perms} modulePermissions={modulePermissions} onToast={showToast} /> : null}

        {tab === 'access' ? (
          <AccessControlTab
            staffApi={staffApi}
            members={members}
            onToast={showToast}
            currentUserEmail={firebaseUser?.email || userDoc?.email || ''}
            currentUserId={userId}
            ownerId={workspaceDoc?.ownerId || workspaceId || userId}
          />
        ) : null}

        {tab === 'activity' ? (
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Team activity timeline</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Role changes, logins, and permission updates</p>
              </div>
              <Badge variant={activity.source === 'firestore' ? 'success' : 'default'}>
                {activity.loading ? 'Loading…' : activity.source === 'firestore' ? 'Live Sync' : 'No data yet'}
              </Badge>
            </div>

            {activity.error ? (
              <p className="mt-3 text-sm text-rose-700 dark:text-rose-200">{activity.error}</p>
            ) : null}

            <div className="mt-4">
              {activity.loading ? (
                <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600 dark:text-slate-300">
                  Loading activity…
                </div>
              ) : teamActivityItems.length === 0 ? (
                <div className="p-1">
                  <EmptyState
                    title="No team activity yet"
                    description="Once team members log in, roles change, or permissions update, you'll see it here."
                  />
                </div>
              ) : (
                <ActivityTimeline items={teamActivityItems.slice(0, 18)} />
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </motion.div>
  )
}
