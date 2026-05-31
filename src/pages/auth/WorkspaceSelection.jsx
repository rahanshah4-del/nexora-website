import { motion } from 'framer-motion'
import {
  HiOutlineArrowRight,
  HiOutlineBell,
  HiOutlineBriefcase,
  HiOutlineBuildingLibrary,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineCog6Tooth,
  HiOutlineGlobeAlt,
  HiOutlineHomeModern,
  HiOutlineMagnifyingGlass,
  HiOutlineBars3,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2'
import { FiLogOut } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import logoUrl from '../../assets/logo/nexora-logo.svg'

const moduleAccess = [
  { name: 'CRM', icon: HiOutlineUserGroup, color: 'bg-blue-600', active: true },
  { name: 'School ERP', icon: HiOutlineBuildingLibrary, color: 'bg-emerald-500' },
  { name: 'Property ERP', icon: HiOutlineBuildingOffice2, color: 'bg-violet-600' },
  { name: 'POS', icon: HiOutlineBriefcase, color: 'bg-amber-500' },
  { name: 'WhatsApp CRM', icon: HiOutlineChatBubbleLeftRight, color: 'bg-green-500' },
  { name: 'Reports', icon: HiOutlineChartBarSquare, color: 'bg-cyan-500' },
  { name: 'HRM', icon: HiOutlineUsers, color: 'bg-rose-500' },
  { name: 'Accounting', icon: HiOutlineBuildingOffice2, color: 'bg-sky-500' },
]

const workspaces = [
  {
    name: 'Demo Business (Pvt) Ltd.',
    id: 'WS-0001',
    plan: 'Premium',
    planTone: 'bg-blue-50 text-blue-700',
    members: '12 Members',
    joined: 'Joined 12 Jan, 2024',
    icon: HiOutlineBuildingOffice2,
    iconTone: 'bg-blue-50 text-blue-600',
    active: true,
    route: '/app/dashboard',
  },
  {
    name: 'Al-Noor School System',
    id: 'WS-0002',
    plan: 'Standard',
    planTone: 'bg-emerald-50 text-emerald-700',
    members: '8 Members',
    joined: 'Joined 05 Mar, 2024',
    icon: HiOutlineBuildingLibrary,
    iconTone: 'bg-emerald-50 text-emerald-600',
  },
  {
    name: 'City View Apartments',
    id: 'WS-0003',
    plan: 'Premium',
    planTone: 'bg-violet-50 text-violet-700',
    members: '6 Members',
    joined: 'Joined 22 Feb, 2024',
    icon: HiOutlineHomeModern,
    iconTone: 'bg-violet-50 text-violet-600',
  },
  {
    name: 'Usman Traders',
    id: 'WS-0004',
    plan: 'Basic',
    planTone: 'bg-orange-50 text-orange-600',
    members: '4 Members',
    joined: 'Joined 18 Apr, 2024',
    icon: HiOutlineBriefcase,
    iconTone: 'bg-orange-50 text-orange-500',
  },
  {
    name: 'Green Field Properties',
    id: 'WS-0005',
    plan: 'Standard',
    planTone: 'bg-emerald-50 text-emerald-700',
    members: '5 Members',
    joined: 'Joined 02 May, 2024',
    icon: HiOutlineBuildingOffice2,
    iconTone: 'bg-violet-50 text-violet-600',
  },
]

const featureStrip = [
  {
    title: 'Centralized Access',
    text: 'Access all your workspaces from one place',
    icon: HiOutlineUsers,
  },
  {
    title: 'Secure & Private',
    text: 'Your data is 100% secure and private',
    icon: HiOutlineCog6Tooth,
  },
  {
    title: 'Multiple Modules',
    text: 'Use only the modules you need',
    icon: HiOutlineSquares2X2,
  },
  {
    title: 'Real-time Sync',
    text: 'All data is synced in real-time',
    icon: HiOutlineChartBarSquare,
  },
]

function SidebarItem({ icon: Icon, label, active = false, muted = false }) {
  return (
    <button
      type="button"
      className={`flex h-11 w-full items-center justify-between rounded-lg px-3 text-left text-[13px] font-semibold transition ${
        active
          ? 'bg-blue-600 text-white shadow-[0_10px_24px_-14px_rgba(37,99,235,0.85)]'
          : muted
            ? 'text-slate-300 hover:bg-white/7 hover:text-white'
            : 'text-slate-200 hover:bg-white/7 hover:text-white'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <HiOutlineChevronRight className="h-4 w-4 shrink-0 opacity-80" />
    </button>
  )
}

function WorkspaceCard({ workspace, index }) {
  const navigate = useNavigate()
  const Icon = workspace.icon
  const disabled = !workspace.active

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease: 'easeOut' }}
      className={`rounded-lg border bg-white p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.42)] ${
        workspace.active ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${workspace.iconTone}`}>
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="truncate text-[15px] font-bold leading-5 text-slate-950">{workspace.name}</h2>
            <p className="mt-1 text-xs text-slate-500">Workspace ID: {workspace.id}</p>
            <p className="mt-1 text-xs text-slate-500">
              Plan:{' '}
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${workspace.planTone}`}>
                {workspace.plan}
              </span>
            </p>
          </div>
        </div>
        {workspace.active ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <HiOutlineArrowRight className="h-4 w-4 rotate-[-45deg]" />
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <HiOutlineUsers className="h-4 w-4" />
          {workspace.members}
        </span>
        <span className="flex items-center gap-1.5">
          <HiOutlineCalendarDays className="h-4 w-4" />
          {workspace.joined}
        </span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (workspace.route) navigate(workspace.route)
        }}
        className={`mt-4 flex h-10 w-full items-center justify-center gap-3 rounded-lg border text-[13px] font-bold transition ${
          workspace.active
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'cursor-not-allowed border-slate-200 bg-white text-slate-700 opacity-70'
        }`}
      >
        {workspace.active ? 'Enter Workspace' : 'Coming Soon'}
        <HiOutlineArrowRight className="h-4 w-4" />
      </button>
    </motion.article>
  )
}

function CreateWorkspaceCard() {
  return (
    <article className="rounded-lg border border-blue-100 bg-blue-50/35 p-4 shadow-[0_12px_32px_-26px_rgba(15,23,42,0.42)]">
      <div className="flex min-h-[110px] items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <HiOutlinePlus className="h-7 w-7" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold text-slate-950">Create New Workspace</h2>
          <p className="mt-1.5 text-sm leading-5 text-slate-600">Create a new workspace for your business</p>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="mt-4 flex h-10 w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-blue-300 bg-white text-[13px] font-bold text-blue-600 opacity-70"
      >
        Create Workspace
        <HiOutlineArrowRight className="h-4 w-4" />
      </button>
    </article>
  )
}

export default function WorkspaceSelection() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="bg-[#061a35] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-[250px] lg:overflow-y-auto">
          <div className="flex min-h-full flex-col px-4 py-5">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <img src={logoUrl} alt="Nexora" className="h-10 w-10 rounded-xl" />
                  <p className="text-2xl font-extrabold tracking-[0.08em] text-white">NEXORA</p>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-300">
                  Business Suite
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">
                  👨🏻‍💼
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">Muhammad Usman</p>
                  <p className="mt-0.5 truncate text-xs text-slate-300">Administrator</p>
                </div>
                <HiOutlineChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
            </div>

            <nav className="mt-4 space-y-2">
              <SidebarItem icon={HiOutlineSquares2X2} label="Enter Workspace" active />
              <SidebarItem icon={HiOutlineSquares2X2} label="All Workspaces" />
              <button
                type="button"
                disabled
                className="flex h-11 w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold text-slate-200 opacity-80"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-white/15">
                  <HiOutlinePlus className="h-4 w-4" />
                </span>
                Create New Workspace
              </button>
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Your Module Access
              </p>
              <div className="mt-3 space-y-2">
                {moduleAccess.map((module) => {
                  const Icon = module.icon

                  return (
                    <div
                      key={module.name}
                      className={`flex h-9 items-center gap-3 rounded-lg px-2 text-[13px] font-semibold ${
                        module.active ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${module.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                      <span className="truncate">{module.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <SidebarItem icon={HiOutlineCog6Tooth} label="Settings" muted />

            <div className="mt-auto pt-6">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20">
                    <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-slate-200" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white">Need Help?</span>
                    <span className="block truncate text-[11px] text-slate-300">Contact our support team</span>
                  </span>
                </span>
                <HiOutlineChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:ml-[250px]">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-5">
              <button type="button" className="text-slate-700">
                <HiOutlineBars3 className="h-6 w-6" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-6 text-slate-950">Enter Workspace</h1>
                <p className="mt-0.5 truncate text-sm text-slate-500">Select a workspace to continue</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button type="button" className="relative hidden h-10 w-10 items-center justify-center rounded-full text-slate-700 sm:flex">
                <HiOutlineBell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                  5
                </span>
              </button>
              <span className="hidden h-8 w-px bg-slate-200 sm:block" />
              <button type="button" className="hidden items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 md:flex">
                <HiOutlineGlobeAlt className="h-5 w-5" />
                English
                <HiOutlineChevronDown className="h-4 w-4" />
              </button>
              <span className="hidden h-8 w-px bg-slate-200 md:block" />
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700">
                <FiLogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          <div className="px-5 py-5 lg:px-6">
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative min-h-[150px] rounded-lg border border-slate-200 bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 px-7 py-6 shadow-sm"
            >
              <div className="max-w-[520px]">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Welcome back, Muhammad! 👋</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                  Select a workspace to access your business data and modules.
                </p>
              </div>

              <div className="pointer-events-none absolute bottom-0 right-8 hidden h-[145px] w-[360px] lg:block">
                <div className="absolute bottom-2 right-28 h-16 w-16 rounded-full bg-blue-600 shadow-[0_18px_35px_-22px_rgba(37,99,235,0.9)]" />
                <div className="absolute bottom-0 right-0 h-24 w-16 rounded-t-full bg-gradient-to-b from-emerald-200 to-slate-100" />
                <div className="absolute bottom-3 right-36 h-14 w-14 rounded-b-3xl rounded-t-lg bg-gradient-to-b from-blue-700 to-blue-500" />
                <div className="absolute bottom-4 right-40 h-5 w-10 rounded-full border-4 border-blue-700" />
                <div className="absolute bottom-0 right-44 h-4 w-20 rounded-full bg-slate-300/60 blur-sm" />
                <div className="absolute bottom-0 right-3 h-4 w-28 rounded-full bg-slate-300/50 blur-sm" />
                <div className="absolute bottom-5 right-11 h-14 w-12 rounded-b-lg bg-slate-200" />
                <div className="absolute bottom-[70px] right-10 h-16 w-3 rotate-[-18deg] rounded-full bg-emerald-300" />
                <div className="absolute bottom-[72px] right-23 h-16 w-3 rotate-[24deg] rounded-full bg-emerald-300" />
                <div className="absolute bottom-[72px] right-16 h-20 w-3 rounded-full bg-emerald-400" />
                <div className="absolute bottom-6 right-52 h-[110px] w-[150px] rounded-t-lg border-[10px] border-slate-800 bg-white shadow-xl">
                  <div className="grid h-full grid-cols-[42px_1fr] gap-2 bg-slate-50 p-2">
                    <div className="space-y-1.5">
                      <span className="block h-2 rounded bg-slate-200" />
                      <span className="block h-2 rounded bg-blue-100" />
                      <span className="block h-2 rounded bg-slate-200" />
                      <span className="block h-2 rounded bg-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <span className="block h-2 rounded bg-slate-200" />
                      <div className="flex items-end gap-1">
                        <span className="h-8 w-2 rounded bg-blue-500" />
                        <span className="h-12 w-2 rounded bg-blue-600" />
                        <span className="h-6 w-2 rounded bg-blue-300" />
                        <span className="h-10 w-2 rounded bg-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-slate-950">Your Workspaces</h2>
              <div className="flex items-center gap-3">
                <label className="relative block w-full sm:w-[270px]">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search workspace..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <div className="flex h-10 rounded-lg border border-slate-200 bg-white p-0.5">
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-blue-300 text-blue-600">
                    <HiOutlineSquares2X2 className="h-5 w-5" />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500">
                    <HiOutlineBars3 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaces.map((workspace, index) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} index={index} />
              ))}
              <CreateWorkspaceCard />
            </div>

            <section className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
              {featureStrip.map((feature) => {
                const Icon = feature.icon

                return (
                  <div key={feature.title} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-bold text-blue-700">{feature.title}</h3>
                      <p className="mt-1 text-xs leading-4 text-slate-600">{feature.text}</p>
                    </div>
                  </div>
                )
              })}
            </section>

            <footer className="py-6 text-center text-xs font-medium text-slate-500">
              © 2025 Nexora Solutions. All rights reserved.
            </footer>
          </div>
        </section>
      </div>
    </main>
  )
}
