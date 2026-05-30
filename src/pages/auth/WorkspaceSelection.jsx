import { motion } from 'framer-motion'
import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentChartBar,
  HiOutlineHomeModern,
  HiOutlineMagnifyingGlass,
  HiOutlineSquares2X2,
  HiOutlineShoppingBag,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import { useNavigate } from 'react-router-dom'
import NexoraLogo from '../../components/brand/NexoraLogo.jsx'

const modules = [
  {
    name: 'CRM',
    status: 'Active',
    description: 'Manage leads, customers, deals, follow-ups, and sales activity.',
    icon: HiOutlineChartBarSquare,
    active: true,
    path: '/app/dashboard',
  },
  {
    name: 'School ERP',
    status: 'Coming Soon',
    description: 'Student records, classes, fees, attendance, and parent updates.',
    icon: HiOutlineAcademicCap,
  },
  {
    name: 'Property ERP',
    status: 'Coming Soon',
    description: 'Listings, tenants, leases, maintenance, and property reporting.',
    icon: HiOutlineHomeModern,
  },
  {
    name: 'POS',
    status: 'Coming Soon',
    description: 'Retail sales, billing, inventory, counters, and shift reports.',
    icon: HiOutlineShoppingBag,
  },
  {
    name: 'WhatsApp CRM',
    status: 'Coming Soon',
    description: 'Team inbox, lead capture, replies, and customer conversations.',
    icon: HiOutlineChatBubbleLeftRight,
  },
  {
    name: 'Reports',
    status: 'Coming Soon',
    description: 'Business insights, performance summaries, and analytics views.',
    icon: HiOutlineDocumentChartBar,
  },
  {
    name: 'HRM',
    status: 'Coming Soon',
    description: 'Employee profiles, payroll workflows, leaves, and attendance.',
    icon: HiOutlineUserGroup,
  },
  {
    name: 'Accounting',
    status: 'Coming Soon',
    description: 'Ledgers, payments, reconciliations, and financial records.',
    icon: HiOutlineBanknotes,
  },
]

export default function WorkspaceSelection() {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-80">
          <div className="flex h-full min-h-full flex-col gap-6 px-5 py-6">
            <NexoraLogo
              compact
              className="text-white"
              textClassName="[&_p:first-child]:text-white [&_p:last-child]:text-slate-400"
            />

            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-sm font-bold text-white">
                  NS
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">Nexora User</p>
                  <p className="truncate text-xs text-slate-400">Business Suite Access</p>
                </div>
              </div>
            </div>

            <nav className="space-y-6">
              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Menu
                </p>
                <div className="mt-3 rounded-2xl bg-sky-500/15 p-2">
                  <div className="flex items-center gap-3 rounded-xl bg-sky-500 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/20">
                    <HiOutlineSquares2X2 className="h-5 w-5" />
                    Enter Workspace
                  </div>
                </div>
              </div>

              <div>
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Module Access
                </p>
                <div className="mt-3 space-y-1">
                  {modules.map((module) => {
                    const Icon = module.icon

                    return (
                      <div
                        key={module.name}
                        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ${
                          module.active
                            ? 'bg-white/10 text-white'
                            : 'text-slate-500'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{module.name}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                            module.active
                              ? 'bg-emerald-400/15 text-emerald-300'
                              : 'bg-white/5 text-slate-500'
                          }`}
                        >
                          {module.active ? 'Active' : 'Soon'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:ml-80">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Nexora Business Suite
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Enter Workspace
                </h1>
              </div>

              <label className="relative block w-full sm:max-w-sm">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search workspaces"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            </header>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mt-6 overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/40 sm:p-8"
            >
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Welcome back
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Choose a workspace to continue managing your business.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  CRM is ready to use today. Additional Nexora modules are listed here for upcoming
                  access as they become available.
                </p>
              </div>
            </motion.div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((module, index) => {
                const Icon = module.icon

                return (
                  <motion.article
                    key={module.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' }}
                    className={`flex min-h-64 flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                      module.active
                        ? 'border-sky-200'
                        : 'border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                          module.active
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          module.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {module.status}
                      </span>
                    </div>

                    <div className="mt-5 flex-1">
                      <h2 className="text-lg font-semibold text-slate-950">{module.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
                    </div>

                    <button
                      type="button"
                      disabled={!module.active}
                      onClick={() => {
                        if (module.path) navigate(module.path)
                      }}
                      className={`mt-5 h-11 rounded-xl px-4 text-sm font-semibold transition ${
                        module.active
                          ? 'bg-sky-600 text-white hover:bg-sky-700'
                          : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      {module.active ? 'Enter Workspace' : 'Coming Soon'}
                    </button>
                  </motion.article>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
