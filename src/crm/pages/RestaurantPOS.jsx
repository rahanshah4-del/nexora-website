import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineCalculator,
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
  { label: 'POS Till', path: '/app/orders', icon: HiOutlineCalculator, desc: 'Fast restaurant checkout, billing & payment', badge: 'Active' },
  { label: 'Menu Management', path: '/app/menu-management', icon: HiOutlineSquaresPlus, desc: 'Create & manage menu items, categories, pricing', badge: 'Active' },
  { label: 'Tables / Floor View', path: '/app/tables', icon: GiRoundTable, desc: 'Visual floor plan with table status & occupancy', badge: 'Active' },
  { label: 'Orders/KOT', path: '/app/orders-kot', icon: HiOutlineClipboardDocumentList, desc: 'Kitchen order tickets & status tracking', badge: 'Active' },
  { label: 'Kitchen Display', path: '/app/kitchen-display', icon: HiOutlineComputerDesktop, desc: 'Real-time kitchen order display system', badge: 'Active' },
  { label: 'Reservations', path: '/app/reservations', icon: HiOutlineCalendarDays, desc: 'Reservation dashboard, calendar & waitlist', badge: 'Active' },
  { label: 'Kitchen Production', path: '/app/kitchen-production', icon: HiOutlineFire, desc: 'Batches, prep sheets, waste & inventory', badge: 'Active' },
  { label: 'Loyalty & Rewards', path: '/app/loyalty', icon: HiOutlineStar, desc: 'Points, coupons, wallet & campaigns', badge: 'Active' },
  { label: 'Delivery', path: '/app/delivery', icon: HiOutlineTruck, desc: 'Online orders, drivers, zones & tracking', badge: 'Active' },
  { label: 'Inventory Intelligence', path: '/app/inventory', icon: HiOutlineCube, desc: 'Recipe ingredients, stock levels & waste', badge: 'Active' },
  { label: 'Reports & BI', path: '/app/reports', icon: HiOutlineChartBarSquare, desc: 'Sales, payments, operations & business intelligence', badge: 'Active' },
  { label: 'Prod. Waste', path: '/app/kitchen-production/waste', icon: HiOutlineExclamationTriangle, desc: 'Track ingredient waste & spoilage', badge: 'Active' },
]

export default function RestaurantPOSPage() {
  const navigate = useNavigate()

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
        <div className="relative max-w-3xl">
          <Badge variant="info">Nexora Restaurant POS</Badge>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Restaurant operations workspace
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            Billing, orders, kitchen display, table management, inventory, and reports — all in one place.
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
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-sky-600">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{mod.label}</p>
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
