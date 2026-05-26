import { useMemo, useState } from 'react'
import {
  HiOutlineArrowDownTray,
  HiOutlinePlus,
  HiOutlineShieldCheck,
} from 'react-icons/hi2'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePreferences } from '../../hooks/usePreferences.js'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Input from '../ui/Input.jsx'
import ProgressBar from '../ui/ProgressBar.jsx'
import Select from '../ui/Select.jsx'
import LockedFeatureCard from './LockedFeatureCard.jsx'
import { formatPercent } from '../../utils/format.js'
import { useUser } from '../../hooks/useUser.js'

const permissionRows = [
  { role: 'Admin', perms: ['Manage users', 'Billing', 'All reports'] },
  { role: 'Manager', perms: ['Team access', 'Sales reports', 'Exports'] },
  { role: 'Staff', perms: ['Customer updates', 'Lead tracking'] },
  { role: 'Viewer', perms: ['Read-only access'] },
]

const seedMembers = [
  { id: 'TM-01', name: 'Ayesha Khan', email: 'ayesha@skylineretail.com', role: 'Manager' },
  { id: 'TM-02', name: 'Omar Ali', email: 'omar@novalogistics.io', role: 'Staff' },
  { id: 'TM-03', name: 'Fatima Noor', email: 'fatima@brightlabs.ai', role: 'Viewer' },
]

function SectionHeader({ title, subtitle, badge }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
      </div>
      {badge ? <div className="flex items-center gap-2">{badge}</div> : null}
    </div>
  )
}

export default function BusinessFeatures({ onUpgrade }) {
  const { plan } = useUser()
  const { usage } = usePreferences()
  const isBusiness = plan === 'Business'
  const [permissions, setPermissions] = useState(() => ({
    Admin: true,
    Manager: true,
    Staff: true,
    Viewer: false,
  }))
  const [members, setMembers] = useState(seedMembers)

  const usageStats = useMemo(() => {
    const storagePct = (usage.storageUsedGb / usage.storageLimitGb) * 100
    const teamPct = (usage.teamMembersUsed / usage.teamMembersLimit) * 100
    const reportsPct = (usage.reportsGenerated / usage.reportsLimit) * 100
    const apiPct = (usage.apiRequests / usage.apiRequestsLimit) * 100
    return { storagePct, teamPct, reportsPct, apiPct }
  }, [usage])

  if (!isBusiness) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <LockedFeatureCard
          title="Advanced Reports"
          description="Revenue, sales, and customer reports with downloads."
          onUpgrade={onUpgrade}
        />
        <LockedFeatureCard
          title="Team Permissions"
          description="Role-based access control and permission toggles."
          onUpgrade={onUpgrade}
        />
        <LockedFeatureCard
          title="Multi-user Access"
          description="Invite team members and manage roles."
          onUpgrade={onUpgrade}
        />
        <LockedFeatureCard
          title="Export Reports"
          description="Export PDF, Excel, and CSV reports."
          onUpgrade={onUpgrade}
        />
        <LockedFeatureCard
          title="Priority Support"
          description="Priority tickets, fast responses, and support tools."
          onUpgrade={onUpgrade}
        />
        <LockedFeatureCard
          title="Usage Analytics"
          description="Usage chart, quotas, progress bars, and warnings."
          onUpgrade={onUpgrade}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <SectionHeader
          title="Advanced Reports"
          subtitle="Revenue report, sales report, customer report."
          badge={<Badge variant="success">Business Active</Badge>}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {['Revenue report', 'Sales report', 'Customer report'].map((t) => (
            <div key={t} className="glass-muted rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{t}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Updated today</p>
              <Button className="mt-3 w-full rounded-2xl" type="button">
                <HiOutlineArrowDownTray className="text-lg" /> Download
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Team Permissions"
          subtitle="Admin, Manager, Staff, Viewer - toggle access."
          badge={<Badge variant="purple">RBAC</Badge>}
        />
        <div className="space-y-3">
          {permissionRows.map((r) => (
            <div key={r.role} className="glass-muted rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.role}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{r.perms.join(' • ')}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <span className="text-xs font-semibold">Enabled</span>
                  <input
                    type="checkbox"
                    checked={!!permissions[r.role]}
                    onChange={(e) => setPermissions((p) => ({ ...p, [r.role]: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/30 bg-white/40 text-indigo-600 dark:border-white/10 dark:bg-slate-900/40"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <SectionHeader
          title="Multi-user Access"
          subtitle="Add team members and select roles."
          badge={<Badge variant="info">{members.length} members</Badge>}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <Input placeholder="Search members..." />
          </div>
          <Button
            className="rounded-2xl"
            type="button"
            onClick={() =>
              setMembers((m) => [
                ...m,
                {
                  id: `TM-0${m.length + 1}`,
                  name: 'New Member',
                  email: 'new@company.com',
                  role: 'Viewer',
                },
              ])
            }
          >
            <HiOutlinePlus className="text-lg" /> Add team member
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/20 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15 bg-white/30 dark:divide-white/10 dark:bg-slate-900/25">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-white/40 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{m.name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{m.email}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={m.role}
                        onChange={(e) =>
                          setMembers((arr) =>
                            arr.map((x) => (x.id === m.id ? { ...x, role: e.target.value } : x)),
                          )
                        }
                        className="h-9 rounded-xl"
                      >
                        {['Admin', 'Manager', 'Staff', 'Viewer'].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Export Reports"
          subtitle="Export PDF, Excel, and CSV."
          badge={<Badge variant="purple">Exports</Badge>}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <Button className="rounded-2xl" type="button">
            Export PDF
          </Button>
          <Button variant="subtle" className="rounded-2xl" type="button">
            Export Excel
          </Button>
          <Button variant="ghost" className="rounded-2xl" type="button">
            Export CSV
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Priority Support"
          subtitle="Create a priority ticket."
          badge={<Badge variant="warning">Priority</Badge>}
        />
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Subject</label>
            <Input className="mt-1" placeholder="Issue subject..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Message</label>
            <textarea className="focus-ring mt-1 h-24 w-full rounded-xl border border-white/30 bg-white/40 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100" placeholder="Describe your issue..." />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-2xl" type="button">
              <HiOutlineShieldCheck className="text-lg" /> Submit ticket
            </Button>
            <Button variant="subtle" className="rounded-2xl" type="button">
              Contact support
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <SectionHeader
          title="Usage Analytics"
          subtitle="Storage usage, reports generated, team users, monthly usage."
          badge={<Badge variant="success">Business Active</Badge>}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-muted rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Storage used</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {usage.storageUsedGb}GB / {usage.storageLimitGb}GB
            </p>
          </div>
          <div className="glass-muted rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reports generated</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {usage.reportsGenerated} / {usage.reportsLimit}
            </p>
          </div>
          <div className="glass-muted rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Team users</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {usage.teamMembersUsed} / {usage.teamMembersLimit}
            </p>
          </div>
          <div className="glass-muted rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">API requests</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {usage.apiRequests.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Storage usage</span>
                <span>{formatPercent(usageStats.storagePct / 100)}</span>
              </div>
              <ProgressBar value={usageStats.storagePct} tone="indigo" className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Team users</span>
                <span>{formatPercent(usageStats.teamPct / 100)}</span>
              </div>
              <ProgressBar value={usageStats.teamPct} tone="emerald" className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Reports generated</span>
                <span>{formatPercent(usageStats.reportsPct / 100)}</span>
              </div>
              <ProgressBar value={usageStats.reportsPct} tone="amber" className="mt-2" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">API requests</span>
                <span>{formatPercent(usageStats.apiPct / 100)}</span>
              </div>
              <ProgressBar value={usageStats.apiPct} tone="rose" className="mt-2" />
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usage.monthlyUsage} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const val = payload[0]?.value ?? 0
                    return (
                      <div className="glass rounded-xl px-3 py-2 text-xs">
                        <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                        <p className="text-slate-600 dark:text-slate-300">
                          API: <span className="font-semibold">{Number(val).toLocaleString()}</span>
                        </p>
                      </div>
                    )
                  }}
                />
                <Line type="monotone" dataKey="api" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  )
}
