import { AnimatePresence, motion } from 'framer-motion'
import {
  HiOutlineArrowPath,
  HiOutlineArrowRight,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineUserCircle,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import logoUrl from '../../../assets/logo/nexora-logo.svg'
import { cn } from '../../utils/cn.js'
import { formatSessionTime, isValidWorkspace, workspaceLabel } from '../../lib/workspaceSession.js'

const products = [
  {
    id: 'restaurant-pos',
    title: 'Nexora Restaurant POS',
    button: 'Open Restaurant POS',
    icon: HiOutlineSquares2X2,
    accent: 'from-cyan-500 to-sky-600',
    comingSoon: true,
    features: [
      'Billing & cashier system',
      'Table management',
      'Kitchen order tickets / KOT',
      'Menu management',
      'Inventory tracking',
      'Daily sales reports',
      'Staff roles',
      'Restaurant dashboard',
    ],
  },
  {
    id: 'crm',
    title: 'Nexora CRM',
    button: 'Open CRM Dashboard',
    icon: HiOutlineUserGroup,
    accent: 'from-indigo-500 to-violet-600',
    features: [
      'Customers management',
      'Leads management',
      'Follow-up automation',
      'Invoices & payments',
      'Support tickets',
      'Analytics dashboard',
      'Team management',
      'Business reports',
    ],
  },
]

function SessionPill({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/75 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{value || 'No data yet'}</p>
    </div>
  )
}

function ProductCard({ product, onSelect }) {
  const Icon = product.icon
  const disabled = Boolean(product.comingSoon)

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onSelect(product.id)
      }}
      disabled={disabled}
      className={cn(
        'focus-ring group relative min-w-0 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/[0.94] p-4 text-left shadow-[0_16px_48px_-42px_rgba(15,23,42,0.45)] transition-colors duration-200 dark:border-white/10 dark:bg-slate-950/85 sm:p-5',
        disabled
          ? 'cursor-not-allowed opacity-85'
          : 'hover:border-sky-200 hover:bg-white dark:hover:bg-slate-950',
      )}
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
          <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-300">
            {disabled ? 'Restaurant POS module is coming soon.' : 'Choose your workspace'}
          </span>
        </span>
        {disabled ? (
          <span className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
            Coming Soon
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {product.features.map((feature) => (
          <span key={feature} className="flex min-w-0 items-center gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r', product.accent)} />
            <span className="min-w-0 truncate">{feature}</span>
          </span>
        ))}
      </div>

      <span
        className={cn(
          'mt-5 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-[0_16px_38px_-22px_rgba(15,23,42,0.8)] transition',
          disabled ? 'bg-slate-100 text-slate-500' : 'bg-slate-950 text-white group-hover:bg-sky-700',
        )}
      >
        {disabled ? 'Coming Soon' : product.button}
        {!disabled ? <HiOutlineArrowRight className="h-4 w-4" /> : null}
      </span>
    </button>
  )
}

export default function ProductSelectionModal({ open, session, selectedWorkspace, onSelect, onContinueLast, onClose }) {
  const hasLastWorkspace = isValidWorkspace(selectedWorkspace) && selectedWorkspace !== 'restaurant-pos'
  const selectedStatus = hasLastWorkspace ? workspaceLabel(selectedWorkspace) : 'Not selected'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/40 p-3 sm:p-4 sm:backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
        >
          <motion.div
            className="crm-modal-panel crm-modal-panel-wide relative border border-white/75 bg-white/[0.96] p-4 shadow-[0_26px_84px_-52px_rgba(15,23,42,0.62)] dark:border-white/10 dark:bg-slate-950/[0.94] sm:p-6 sm:backdrop-blur-sm"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-selection-title"
          >
            <div className="pointer-events-none absolute -left-24 -top-24 hidden h-52 w-52 rounded-full bg-cyan-200/25 blur-2xl sm:block" />
            <div className="pointer-events-none absolute -right-24 top-4 hidden h-56 w-56 rounded-full bg-violet-200/25 blur-2xl sm:block" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-1.5 shadow-lg shadow-slate-950/15">
                  <img src={logoUrl} alt="Nexora logo" className="h-full w-full object-contain" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                    Choose your workspace
                  </p>
                  <h2 id="workspace-selection-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                    Welcome to Nexora Workspace
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    Choose the system you want to use today.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-lg font-semibold text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                aria-label="Close workspace selector"
              >
                ×
              </button>
            </div>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <SessionPill icon={HiOutlineUserCircle} label="Client" value={session?.clientName || session?.email} />
              <SessionPill icon={HiOutlineEnvelope} label="Email" value={session?.email} />
              <SessionPill icon={HiOutlineClock} label="Login time" value={formatSessionTime(session?.loginTime)} />
              <SessionPill icon={HiOutlineClock} label="Current session" value={formatSessionTime(session?.sessionStartTime)} />
              <SessionPill icon={HiOutlineArrowPath} label="Workspace status" value={selectedStatus} />
              <SessionPill icon={HiOutlineSparkles} label="Plan / Trial" value={`${session?.planType || 'Free'} / ${session?.trialStatus || 'trial'}`} />
            </div>

            {hasLastWorkspace ? (
              <div className="relative mt-4 flex flex-col gap-3 rounded-[1.25rem] border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-3 dark:border-white/10 dark:from-sky-500/10 dark:via-white/5 dark:to-violet-500/10 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Continue to last workspace</p>
                  <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{workspaceLabel(selectedWorkspace)}</p>
                </div>
                <button
                  type="button"
                  onClick={onContinueLast}
                  className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-sky-700"
                >
                  Continue
                  <HiOutlineArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <div className="relative mt-5 grid gap-4 lg:grid-cols-2">
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
