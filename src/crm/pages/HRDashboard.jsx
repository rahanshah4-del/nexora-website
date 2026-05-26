import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineBriefcase,
  HiOutlineCalendarDays,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineLockClosed,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { useUser } from '../hooks/useUser.js'
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess.js'

const modules = [
  { label: 'Employees overview', detail: 'Active employees, teams, and contracts.', icon: HiOutlineUserGroup },
  { label: 'Attendance tracking', detail: 'Daily attendance and shift visibility.', icon: HiOutlineCalendarDays },
  { label: 'Leave requests', detail: 'Review requests and approvals.', icon: HiOutlineDocumentText },
  { label: 'Payroll summary', detail: 'Salary totals and payout overview.', icon: HiOutlineCurrencyDollar },
  { label: 'Departments', detail: 'Organize staff by department.', icon: HiOutlineBriefcase },
  { label: 'Staff performance', detail: 'Performance scores and activity.', icon: HiOutlineUserGroup },
  { label: 'HR reports', detail: 'Export-ready HR summaries.', icon: HiOutlineDocumentText },
  { label: 'Employee documents', detail: 'Documents placeholder for secure records.', icon: HiOutlineLockClosed },
]

function isPaidPlan(plan) {
  return ['business', 'enterprise'].includes(String(plan || '').toLowerCase())
}

export default function HRDashboardPage() {
  const { plan, role } = useUser()
  const access = useWorkspaceAccess()
  const navigate = useNavigate()
  const allowed = isPaidPlan(plan) && access.canAccessHr

  if (!allowed) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card className="relative overflow-hidden rounded-[1.7rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl" />
          <div className="relative mx-auto max-w-2xl text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
              <HiOutlineLockClosed className="h-7 w-7" />
            </div>
            <Badge variant="warning" className="mt-5">Premium Feature</Badge>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              HR Management is available in Business Plan.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Current plan: {plan || 'Free'} · Role: {role || 'owner'}
            </p>
            {!access.canAccessHr ? (
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                Staff users also need the HR Dashboard permission enabled by the owner/admin.
              </p>
            ) : null}
            <div className="mt-6 flex justify-center">
              <Button className="rounded-2xl" type="button" onClick={() => navigate('/upgrade-business')}>
                Upgrade Plan
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div className="min-w-0 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="success">Business/Premium</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">HR Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
            Employees, attendance, payroll, departments, documents, and HR reports.
          </p>
        </div>
        <Badge variant="purple">Role summary: {role}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon
          return (
            <Card key={module.label} className="rounded-[1.5rem] p-5">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">{module.label}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{module.detail}</p>
            </Card>
          )
        })}
      </div>

      <Card className="rounded-[1.5rem] p-5">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Role / permission summary</p>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">
          HR data is stored under your authenticated workspace path and remains isolated per client workspace.
        </p>
      </Card>
    </motion.div>
  )
}
