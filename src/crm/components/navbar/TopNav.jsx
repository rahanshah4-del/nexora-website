import { HiOutlineMagnifyingGlass, HiOutlineMoon, HiOutlineSun } from 'react-icons/hi2'
import Avatar from '../ui/Avatar.jsx'
import Dropdown from '../ui/Dropdown.jsx'
import Input from '../ui/Input.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import Button from '../ui/Button.jsx'
import { useState } from 'react'
import { usePreferences } from '../../hooks/usePreferences.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useNavigate } from 'react-router-dom'
import NotificationBell from '../notifications/NotificationBell.jsx'
import BranchSwitcher from '../system/BranchSwitcher.jsx'
import OfflineStatus from '../system/OfflineStatus.jsx'
import GlobalSearch from '../system/GlobalSearch.jsx'

function Toast({ message, onClose }) {
  return (
    <div className="glass fixed right-4 top-4 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{message}</p>
        <button
          type="button"
          className="focus-ring rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function TopNav({ onOpenSidebar }) {
  const { theme, toggleTheme } = useTheme()
  const { notifications } = usePreferences()
  const { logout, busy } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  return (
    <>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
      <header className="glass sticky top-0 z-30 min-h-[88px] rounded-3xl border border-slate-200 bg-white/95 shadow-soft px-3 py-3 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10 lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <span className="block h-4 w-5">
            <span className="block h-0.5 w-5 rounded bg-current" />
            <span className="mt-1.5 block h-0.5 w-5 rounded bg-current opacity-80" />
            <span className="mt-1.5 block h-0.5 w-5 rounded bg-current opacity-70" />
          </span>
        </button>

        <div className="relative hidden flex-1 min-w-0 md:block">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <OfflineStatus />
            <BranchSwitcher />
          </div>
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-2xl p-0"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <HiOutlineSun className="text-xl" /> : <HiOutlineMoon className="text-xl" />}
          </Button>

          <NotificationBell enabled={notifications.enabled} />

          <Dropdown
            trigger={() => (
              <button className="focus-ring inline-flex items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-slate-900/5 dark:hover:bg-white/10">
                <Avatar name="Admin User" />
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Admin</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">nexora.solutions</p>
                </div>
              </button>
            )}
          >
            {({ close }) => (
              <div className="py-1">
                <button
                  className="focus-ring w-full rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
                  onClick={close}
                >
                  Profile
                </button>
                <button
                  className="focus-ring w-full rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
                  onClick={close}
                >
                  Team Settings
                </button>
                <div className="my-1 h-px bg-white/30 dark:bg-white/10" />
                <button
                  className="focus-ring w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                  onClick={async () => {
                    if (busy) return
                    const ok = await logout()
                    close()
                    if (ok) {
                      setToast('Logged out successfully')
                      window.setTimeout(() => setToast(null), 1800)
                      navigate('/login', { replace: true })
                    }
                  }}
                  disabled={busy}
                >
                  Sign out
                </button>
              </div>
            )}
          </Dropdown>
        </div>
      </div>

      <div className="mt-3 md:hidden">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <Input className="pl-10" placeholder="Search..." />
        </div>
      </div>
      </header>
    </>
  )
}
