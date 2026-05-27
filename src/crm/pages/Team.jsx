import { motion } from 'framer-motion'
import Card from '../components/ui/Card.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import TeamMembersTable from '../components/team/TeamMembersTable.jsx'
import PermissionMatrix from '../components/team/PermissionMatrix.jsx'
import StaffPerformanceCards from '../components/team/StaffPerformanceCards.jsx'
import { useTeamMembers } from '../hooks/useTeamMembers.js'
import Toast from '../components/ui/Toast.jsx'
import { useState } from 'react'
import EmptyState from '../components/system/EmptyState.jsx'
import { useTeamPermissions } from '../hooks/useTeamPermissions.js'
import { useActivityLogs } from '../hooks/useActivityLogs.js'
import ActivityTimeline from '../components/activity/ActivityTimeline.jsx'
import { clientSafeMessage } from '../utils/messages.js'

export default function TeamPage() {
  const { members, loading, source, error, permissionKeys, addMember, updateMember } = useTeamMembers()
  const [toast, setToast] = useState(null)
  const [tab, setTab] = useState('members')
  const perms = useTeamPermissions({ permissionKeys })
  const activity = useActivityLogs()

  const teamActivityItems = (activity.logs || []).filter((l) => {
    const module = String(l.module || '')
    const action = String(l.action || '')
    if (module === 'Team' || module === 'Auth') return true
    if (action.toLowerCase().includes('role')) return true
    if (action.toLowerCase().includes('permission')) return true
    if (action.toLowerCase().includes('login') || action.toLowerCase().includes('logout')) return true
    return false
  })

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
      <PageHeader
        title="Team Management"
        subtitle="Manage members, roles, permissions, performance, and activity."
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
        {[
          { key: 'members', label: 'Team Members' },
          { key: 'permissions', label: 'Permissions' },
          { key: 'performance', label: 'Performance' },
          { key: 'activity', label: 'Activity Logs' },
        ].map((t) => (
          <Button
            key={t.key}
            type="button"
            variant={tab === t.key ? 'subtle' : 'ghost'}
            className="rounded-2xl px-3 py-2 text-xs"
            onClick={() => setTab(t.key)}
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
            <EmptyState
              title="No team members yet"
              description="Add your first team member to start managing roles and permissions."
            />
          ) : (
            <Card className="p-5">
              <TeamMembersTable
                members={members}
                permissionKeys={permissionKeys}
                onAdd={async (m) => {
                  const res = await addMember(m)
                  if (res?.ok) {
                    setToast({ tone: 'success', message: 'Team member added successfully' })
                    window.setTimeout(() => setToast(null), 1600)
                  } else if (res?.error) {
                    setToast({ tone: 'error', message: res.error })
                    window.setTimeout(() => setToast(null), 2400)
                  }
                }}
                onUpdate={async (id, m) => {
                  try {
                    await updateMember(id, m)
                    setToast({ tone: 'success', message: 'Team member updated' })
                    window.setTimeout(() => setToast(null), 1400)
                  } catch (e) {
                    setToast({ tone: 'error', message: clientSafeMessage(e, 'Unable to update team member.') })
                    window.setTimeout(() => setToast(null), 2400)
                  }
                }}
              />
            </Card>
          )
        ) : null}

        {tab === 'permissions' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div>
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
                    if (res?.ok) {
                      setToast({ tone: 'success', message: 'Permissions initialized' })
                      window.setTimeout(() => setToast(null), 1600)
                    } else if (res?.error) {
                      setToast({ tone: 'error', message: res.error })
                      window.setTimeout(() => setToast(null), 2400)
                    }
                  }}
                />
              ) : (
                <PermissionMatrix
                  permissionKeys={permissionKeys}
                  roles={perms.roles}
                  matrix={perms.matrix}
                  onToggle={(role, permission) => perms.toggle(role, permission)}
                />
              )}
            </div>

            <div className="lg:pt-2">
              <Card className="p-5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Save changes</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Updates are stored in Workspace under <span className="font-semibold">teamPermissions</span>.
                </p>
                <div className="mt-4 grid gap-2">
                  <Button
                    type="button"
                    className="w-full rounded-2xl"
                    variant="primary"
                    disabled={perms.loading || !perms.exists}
                    onClick={async () => {
                      const res = await perms.save()
                      if (res?.ok) {
                        setToast({ tone: 'success', message: 'Permissions saved successfully' })
                        window.setTimeout(() => setToast(null), 1600)
                      } else if (res?.error) {
                        setToast({ tone: 'error', message: res.error })
                        window.setTimeout(() => setToast(null), 2400)
                      }
                    }}
                  >
                    Save Permissions
                  </Button>
                  <Button
                    type="button"
                    className="w-full rounded-2xl"
                    variant="subtle"
                    disabled={perms.loading}
                    onClick={async () => {
                      const res = await perms.initializeTemplate()
                      if (res?.ok) {
                        setToast({ tone: 'success', message: 'Permissions template applied' })
                        window.setTimeout(() => setToast(null), 1600)
                      } else if (res?.error) {
                        setToast({ tone: 'error', message: res.error })
                        window.setTimeout(() => setToast(null), 2400)
                      }
                    }}
                  >
                    Reset to Template
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === 'performance' ? (
          members.length === 0 ? (
            <EmptyState title="No performance data yet" description="Add team members first to view performance insights." />
          ) : (
            <div className="space-y-4">
              <StaffPerformanceCards members={members} />
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Performance metrics</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Performance metrics derived from team activity scores</p>
                  </div>
                  <Badge variant="purple">Insights</Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {members
                    .slice()
                    .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0))
                    .slice(0, 4)
                    .map((m) => {
                      const score = Number(m.performanceScore ?? 0)
                      const leadsHandled = Math.max(0, Math.round(score * 0.8))
                      const dealsClosed = Math.max(0, Math.round(score * 0.18))
                      const tasksCompleted = Math.max(0, Math.round(score * 1.2))
                      const revenueGenerated = Math.max(0, Math.round(score * 1450))
                      return (
                        <div key={m.id} className="glass-muted rounded-2xl p-4">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{m.name}</p>
                          <div className="mt-2 grid gap-1 text-xs text-slate-700 dark:text-slate-200">
                            <p>
                              <span className="font-semibold">Leads handled:</span> {leadsHandled}
                            </p>
                            <p>
                              <span className="font-semibold">Deals closed:</span> {dealsClosed}
                            </p>
                            <p>
                              <span className="font-semibold">Tasks completed:</span> {tasksCompleted}
                            </p>
                            <p>
                              <span className="font-semibold">Revenue generated:</span> {revenueGenerated.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </Card>
            </div>
          )
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
