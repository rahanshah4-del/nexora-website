import { AnimatePresence, motion } from 'framer-motion'
import {
  HiOutlineArrowRight,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import logoUrl from '../../../assets/logo/nexora-logo.svg'
import { cn } from '../../utils/cn.js'

const products = [
  {
    id: 'restaurant-pos',
    title: 'Nexora Restaurant POS',
    description: 'Restaurant billing, orders, kitchen display, table management, inventory, and reports.',
    button: 'Open Restaurant POS',
    icon: HiOutlineSquares2X2,
    accent: 'from-cyan-500 to-sky-600',
  },
  {
    id: 'crm',
    title: 'Nexora CRM',
    description: 'Customers, leads, invoices, follow-ups, analytics, and business automation.',
    button: 'Open CRM Dashboard',
    icon: HiOutlineUserGroup,
    accent: 'from-indigo-500 to-violet-600',
  },
]

function ProductCard({ product, onSelect }) {
  const Icon = product.icon

  return (
    <button
      type="button"
      onClick={() => onSelect(product.id)}
      className="focus-ring group relative min-w-0 overflow-hidden rounded-[1.45rem] border border-white/70 bg-white/[0.88] p-4 text-left shadow-[0_22px_70px_-52px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-[0_28px_90px_-52px_rgba(14,165,233,0.55)] dark:border-white/10 dark:bg-slate-950/85 dark:hover:bg-slate-950"
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', product.accent)} />
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg', product.accent)}>
          <Icon className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold tracking-tight text-slate-950 dark:text-white">
            {product.title}
          </span>
          <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-300">
            {product.description}
          </span>
        </span>
      </div>
      <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-[0_16px_38px_-22px_rgba(15,23,42,0.8)] transition group-hover:bg-sky-700">
        {product.button}
        <HiOutlineArrowRight className="h-4 w-4" />
      </span>
    </button>
  )
}

export default function ProductSelectionModal({ open, onSelect, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 px-3 py-6 backdrop-blur-xl sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
        >
          <motion.div
            className="relative w-full max-w-4xl overflow-hidden rounded-[1.8rem] border border-white/75 bg-white/[0.92] p-4 shadow-[0_34px_120px_-56px_rgba(15,23,42,0.72)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/[0.94] sm:p-6"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-selection-title"
          >
            <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-4 h-56 w-56 rounded-full bg-violet-300/25 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-1.5 shadow-lg shadow-slate-950/15">
                  <img src={logoUrl} alt="Nexora logo" className="h-full w-full object-contain" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                    Choose your workspace
                  </p>
                  <h2 id="product-selection-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                    What do you want to manage today?
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-lg font-semibold text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                aria-label="Continue to dashboard"
              >
                ×
              </button>
            </div>

            <div className="relative mt-6 grid gap-4 md:grid-cols-2">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onSelect={onSelect} />
              ))}
            </div>

            <div className="relative mt-5 flex flex-col gap-3 border-t border-slate-200/70 pt-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2">
                <HiOutlineSparkles className="h-4 w-4 text-sky-600" />
                Powered by Nexora Solutions
              </span>
              <button
                type="button"
                className="focus-ring self-start rounded-full px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 sm:self-auto"
                onClick={onClose}
              >
                Continue to Dashboard
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
