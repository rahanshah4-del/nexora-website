import { motion } from 'framer-motion'
import {
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentList,
  HiOutlineCube,
  HiOutlineQueueList,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'

const modules = [
  { label: 'Billing', detail: 'Fast restaurant checkout', icon: HiOutlineClipboardDocumentList },
  { label: 'Orders', detail: 'Dine-in, takeaway, delivery', icon: HiOutlineQueueList },
  { label: 'Inventory', detail: 'Recipe and stock control', icon: HiOutlineCube },
  { label: 'Reports', detail: 'Sales and shift summaries', icon: HiOutlineChartBarSquare },
]

export default function RestaurantPOSPage() {
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
            Billing, orders, kitchen display, table management, inventory, and reports will live here.
          </p>
          <p className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm font-medium text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
            Restaurant POS module is coming soon.
          </p>
        </div>
      </Card>

      <div className="crm-auto-grid gap-4">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Product preview</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              This module stays separate from CRM account data.
            </p>
          </div>
          <Badge variant="purple" className="self-start sm:self-auto">
            <HiOutlineSparkles className="mr-1 h-3.5 w-3.5" />
            Coming soon
          </Badge>
        </div>
      </Card>
    </motion.div>
  )
}
