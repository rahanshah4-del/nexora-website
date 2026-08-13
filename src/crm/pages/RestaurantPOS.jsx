import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineClipboardDocumentList,
  HiOutlineComputerDesktop,
  HiOutlineSquaresPlus,
  HiOutlineCalendarDays,
  HiOutlineFire,
  HiOutlineTruck,
  HiOutlineStar,
  HiOutlineChartBarSquare,
  HiOutlineCube,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'
import { GiRoundTable } from 'react-icons/gi'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'

const modules = [
  { label: 'Menu Management', path: '/app/menu-management', icon: HiOutlineSquaresPlus, desc: 'AI-powered menu import, items, categories & pricing', badge: 'Active', ai: true },
  { label: 'Tables / Floor View', path: '/app/tables', icon: GiRoundTable, desc: 'Visual floor plan with table status & occupancy', badge: 'Active' },
  { label: 'Orders/KOT', path: '/app/orders-kot', icon: HiOutlineClipboardDocumentList, desc: 'Kitchen order tickets & status tracking', badge: 'Active' },
  { label: 'Kitchen Display', path: '/app/kitchen-display', icon: HiOutlineComputerDesktop, desc: 'Real-time kitchen order display system', badge: 'Active' },
  { label: 'Reservations', path: '/app/reservations', icon: HiOutlineCalendarDays, desc: 'Reservation dashboard, calendar & waitlist', badge: 'Active' },
  { label: 'Kitchen Production', path: '/app/kitchen-production', icon: HiOutlineFire, desc: 'Batches, prep sheets, waste & inventory', badge: 'Active' },
  { label: 'Loyalty & Rewards', path: '/app/loyalty', icon: HiOutlineStar, desc: 'Points, coupons, wallet & campaigns', badge: 'Active' },
  { label: 'Inventory Intelligence', path: '/app/inventory', icon: HiOutlineCube, desc: 'AI recipe ingredients, stock levels & waste tracking', badge: 'Active', ai: true },
  { label: 'Reports & BI', path: '/app/reports', icon: HiOutlineChartBarSquare, desc: 'AI-powered sales, payments & business intelligence', badge: 'Active', ai: true },
  { label: 'Prod. Waste', path: '/app/kitchen-production/waste', icon: HiOutlineExclamationTriangle, desc: 'Track ingredient waste & spoilage', badge: 'Active' },
]

export default function RestaurantPOSPage() {
  const navigate = useNavigate()

  /* Heartbeat — lets sidebar (in the dashboard tab) know this tab is open.
     localStorage, not sessionStorage: the sidebar lives in another tab and
     sessionStorage is per-tab, so it would never see this heartbeat. */
  useEffect(() => {
    const beat = () => { try { localStorage.setItem('nexora:posTill:open', String(Date.now())) } catch { /* quota — ignore */ } }
    beat()
    const pulse = setInterval(beat, 3000)
    return () => { clearInterval(pulse); try { localStorage.removeItem('nexora:posTill:open') } catch { /* ignore */ } }
  }, [])

  return (
    <motion.div
      className="min-w-0 space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="relative overflow-hidden rounded-[1.7rem] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />
        {/* AI glow orb */}
        <div className="pointer-events-none absolute right-10 top-10 h-48 w-48 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12)_0%,transparent_70%)] blur-2xl" />
        <div className="relative max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Nexora Restaurant POS</Badge>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/60 bg-violet-50/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-violet-600 shadow-[0_0_12px_-2px_rgba(139,92,246,0.15)] backdrop-blur-sm">
              <svg className="h-3 w-3 text-violet-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
              Powered by Nexora AI
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            AI-Powered restaurant workspace
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            AI menu import, smart billing, orders, kitchen display, table management, inventory, and reports — all in one place.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((mod) => {
          const Icon = mod.icon
          return (
            <button
              key={mod.label}
              type="button"
              onClick={() => navigate(mod.path)}
              className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600"
            >
              <div className={`grid h-11 w-11 place-items-center rounded-2xl text-white shadow-lg ${mod.ai ? 'bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-violet-500/25' : 'bg-slate-950 shadow-slate-950/15 dark:bg-sky-600'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{mod.label}</p>
                {mod.ai && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-violet-200/60 bg-violet-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-violet-600">AI</span>
                )}
                <Badge variant="success" className="text-[10px]">{mod.badge}</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{mod.desc}</p>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
