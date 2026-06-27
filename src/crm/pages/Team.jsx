import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import PageSearch from '../components/ui/PageSearch.jsx'
import Select from '../components/ui/Select.jsx'
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

function PermissionModuleGrid({ permissionKeys, values, disabled, onChange }) {
  const groups = useMemo(() => groupPermissionKeys(permissionKeys), [permissionKeys])

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.key} className="rounded-[1.1rem] border border-slate-200/80 bg-white/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs font-bold text-slate-800">{group.label}</p>
            {group.comingSoon ? <Badge variant="warning">Coming Soon</Badge> : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.permissions.map((permission) => (
              <PermissionSwitch
                key={permission.key}
                label={permission.actionLabel || permission.label}
                checked={Boolean(values?.[permission.key])}
                disabled={disabled}
                onChange={(checked) => onChange?.(permission.key, checked)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
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

function AccessControlTab({ staffApi, members, onToast }) {
  const { usage } = usePreferences()
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
  const staffLimit = Number(usage?.teamMembersLimit || 0)
  const staffUsed = staffApi.staff.length || members.length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Login access</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Create staff IDs and control whether staff are active or blocked.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Staff limit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            {staffLimit ? `${staffUsed} / ${staffLimit}` : `${staffUsed}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">Based on available plan usage data.</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Device/session access</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            No backend session enforcement is connected here yet, so this panel stays informational.
          </p>
        </Card>
      </div>

      {!staffApi.canManage ? (
        <Card className="p-5">
          <p className="text-sm text-amber-800">Only the workspace owner or an admin can manage staff access.</p>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Create staff login</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
                Uses existing staff, teamMembers, permissions, and users records. No collection names changed.
              </p>
            </div>
            <Badge variant="success">Owner/Admin Control</Badge>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="grid gap-3">
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
                    <option value="sales">Sales Staff</option>
                    <option value="support">Support Agent</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </Select>
                </Field>
                <div className="grid gap-2">
                  <p className="text-xs font-semibold text-slate-600">Restrict module access</p>
                  <PermissionModuleGrid
                    permissionKeys={staffApi.permissionKeys}
                    values={draft.permissions}
                    onChange={(key, checked) =>
                      setDraft((current) => ({
                        ...current,
                        permissions: { ...current.permissions, [key]: checked },
                      }))
                    }
                  />
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
                      onToast('success', res.message || 'Staff saved')
                    } else {
                      onToast('error', res.error || 'Failed to create staff')
                    }
                  }}
                >
                  Create Staff
                </Button>
              </div>
            </div>

            <div className="min-w-0">
              {staffApi.loading ? (
                <div className="grid min-h-[14rem] place-items-center rounded-[1.25rem] border border-slate-200/80 bg-white/70 text-sm text-slate-500">
                  Loading access controls…
                </div>
              ) : staffApi.staff.length ? (
                <div className="space-y-3">
                  {staffApi.staff.map((staff) => {
                    const rowPermissions = staffApi.permissions[staff.id] || {}
                    const blocked = String(staff.status || '').toLowerCase() === 'blocked'
                    return (
                      <div key={staff.id} className="rounded-[1.25rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{staff.name || 'Staff User'}</p>
                            <p className="truncate text-xs text-slate-500">{staff.email || staff.id}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={blocked ? 'danger' : 'success'}>{blocked ? 'Blocked' : staff.status || 'active'}</Badge>
                            <Button
                              variant="subtle"
                              className="rounded-xl px-3 py-2 text-xs"
                              type="button"
                              onClick={async () => {
                                const res = await staffApi.setStaffStatus(staff.id, blocked ? 'active' : 'blocked')
                                if (res?.ok) onToast('success', blocked ? 'Staff unblocked' : 'Staff blocked')
                                else if (res?.error) onToast('error', res.error)
                              }}
                            >
                              {blocked ? 'Unblock user' : 'Block user'}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <PermissionModuleGrid
                            permissionKeys={staffApi.permissionKeys}
                            values={rowPermissions}
                            disabled={!staffApi.canManage}
                            onChange={async (key, checked) => {
                              const res = await staffApi.setStaffPermission(staff.id, key, checked)
                              if (!res.ok) onToast('error', res.error || 'Failed to update permission')
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid min-h-[14rem] place-items-center rounded-[1.25rem] border border-dashed border-slate-200 bg-white/70 p-5 text-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">No staff login accounts yet</p>
                    <p className="mt-1 text-sm text-slate-500">Create a staff ID to start assigning access control.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
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
  const currency = userDoc?.currency || workspaceDoc?.currency || 'PKR'
  const workspaceName = workspaceDoc?.companyName || workspaceDoc?.schoolName || userDoc?.companyName || 'Nexora School'

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
      setTab(requestedTab)
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

        {tab === 'access' ? <AccessControlTab staffApi={staffApi} members={members} onToast={showToast} /> : null}

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
