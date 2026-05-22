import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { navItems } from '../../data/navigation.js'
import { cn } from '../../utils/cn.js'
import Badge from '../ui/Badge.jsx'
import PricingModal from '../billing/PricingModal.jsx'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../hooks/useUser.js'

function Brand() {
  const [logoError, setLogoError] = useState(false)

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!logoError ? (
          <img
            src="/nexora-logo.png"
            alt="Nexora Solutions"
            className="h-10 w-10 rounded-2xl object-cover"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="text-sm font-bold uppercase tracking-tight text-slate-900">N</span>
        )}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-slate-900">NEXORA SOLUTIONS</p>
        <p className="text-[11px] text-slate-500">CRM Admin</p>
      </div>
    </div>
  )
}

export default function Sidebar({ mobile = false, onNavigate }) {
  const [pricingOpen, setPricingOpen] = useState(false)
  const navigate = useNavigate()
  const { plan } = useUser()
  const isBusiness = plan === 'Business'
  const content = (
    <div className="flex h-full flex-col">
      <Brand />
      <div className="mt-2 px-2">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          CRM Panel
        </p>
      </div>
      <nav className="mt-2 flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'focus-ring group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 text-white shadow-glow'
                    : 'text-slate-800 hover:bg-indigo-100 hover:text-slate-950',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'text-lg transition',
                      isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-950',
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3">
        <div className="glass-muted rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">Upgrade to Business</p>
            {isBusiness ? (
              <Badge variant="success">Business Active</Badge>
            ) : plan === 'Starter' ? (
              <Badge variant="info">Starter Plan</Badge>
            ) : (
              <Badge variant="default">Free Plan</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Unlock advanced reports and team permissions.
          </p>
          <button
            className="focus-ring mt-3 w-full rounded-xl bg-nexora-gradient px-3 py-2 text-xs font-semibold text-white shadow-glow disabled:opacity-70"
            onClick={() => navigate('/upgrade-business')}
            disabled={isBusiness}
            type="button"
          >
            {isBusiness ? 'Business Active' : 'Upgrade Now'}
          </button>
          <button
            type="button"
            className="focus-ring mt-2 w-full rounded-xl px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-300"
            onClick={() => setPricingOpen(true)}
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  )

  if (!mobile) {
    return (
      <>
        <aside className="glass hidden h-full w-72 shrink-0 rounded-3xl p-2 lg:block">{content}</aside>
        <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
      </>
    )
  }

  return (
    <>
      <motion.aside
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -40, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="glass h-full w-[18rem] rounded-3xl p-2"
      >
        {content}
      </motion.aside>
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </>
  )
}
