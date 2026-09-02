import { NavLink } from 'react-router-dom'
import {
  HiOutlineCog6Tooth,
  HiOutlineDocumentChartBar,
  HiOutlinePresentationChartBar,
  HiOutlineReceiptPercent,
  HiOutlineUsers,
} from 'react-icons/hi2'
import { cn } from '../../utils/cn.js'

// Primary mobile navigation — a compact 5-item bottom bar shown only below the
// `md` breakpoint (phones). The full module list stays in the sidebar (hamburger).
const items = [
  { label: 'Home', to: '/app/dashboard', icon: HiOutlinePresentationChartBar },
  { label: 'Customers', to: '/app/customers', icon: HiOutlineUsers },
  { label: 'Invoices', to: '/app/invoices', icon: HiOutlineReceiptPercent },
  { label: 'Reports', to: '/app/reports', icon: HiOutlineDocumentChartBar },
  { label: 'Settings', to: '/app/settings', icon: HiOutlineCog6Tooth },
]

export default function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/95 backdrop-blur-md print:hidden md:hidden dark:border-slate-800 dark:bg-slate-950/90"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'focus-ring flex min-w-0 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors duration-150',
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-7 w-12 place-items-center rounded-full transition-colors duration-150',
                      isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
