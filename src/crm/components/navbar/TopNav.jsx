import { HiOutlineMagnifyingGlass, HiOutlineMoon, HiOutlineSquares2X2, HiOutlineSun } from 'react-icons/hi2'
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

export default function TopNav({ onOpenSidebar, onSwitchProduct }) {
  const { theme, toggleTheme } = useTheme()
  const { notifications, profile } = usePreferences()
  const { logout, busy } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  return (
    <>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
      <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-5 lg:px-6">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1440px] min-w-0 items-center gap-3 rounded-[1.35rem] border border-white/70 bg-white/[0.86] px-3 py-2.5 shadow-[0_20px_70px_-52px_rgba(15,23,42,0.52)] backdrop-blur-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/90 sm:px-4">
          <button
            type="button"
            className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <span className="block h-4 w-5">
              <span className="block h-0.5 w-5 rounded bg-current" />
              <span className="mt-1.5 block h-0.5 w-5 rounded bg-current opacity-80" />
              <span className="mt-1.5 block h-0.5 w-5 rounded bg-current opacity-70" />
            </span>
          </button>

          <div className="hidden min-w-0 flex-1 md:block">
            <GlobalSearch />
          </div>

          <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <div className="hidden shrink-0 items-center gap-2 2xl:flex">
              <OfflineStatus />
              <BranchSwitcher />
            </div>
            <Button
              variant="subtle"
              className="hidden h-10 shrink-0 rounded-2xl px-3 text-xs xl:inline-flex"
              onClick={onSwitchProduct}
              type="button"
            >
              <HiOutlineSquares2X2 className="h-4 w-4" />
              Switch Product
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-10 shrink-0 rounded-2xl p-0"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === 'dark' ? <HiOutlineSun className="text-xl" /> : <HiOutlineMoon className="text-xl" />}
            </Button>

            <NotificationBell enabled={notifications.enabled} />

            <Dropdown
              trigger={() => (
                <button className="focus-ring inline-flex min-w-0 items-center gap-2 rounded-2xl border border-transparent px-1.5 py-1.5 transition hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:bg-white/10 sm:px-2">
                  {profile.avatarDataUrl ? (
                    <img src={profile.avatarDataUrl} alt="" className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-sm" />
                  ) : (
                    <Avatar name={profile.ownerName || 'Admin User'} className="h-9 w-9 shrink-0 rounded-2xl" />
                  )}
                  <div className="hidden max-w-[10rem] min-w-0 text-left xl:block">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {profile.ownerName || 'Admin'}
                    </p>
                    <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-300">
                      {profile.companyName || 'nexora.solutions'}
                    </p>
                  </div>
                </button>
              )}
            >
              {({ close }) => (
                <div className="py-1">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {profile.ownerName || 'Admin User'}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-300">
                      {profile.email || 'admin@nexora.solutions'}
                    </p>
                  </div>
                  <div className="my-1 h-px bg-slate-200/70 dark:bg-white/10" />
                  <button
                    className="focus-ring w-full rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
                    onClick={close}
                  >
                    Profile
                  </button>
                  <button
                    className="focus-ring w-full rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-white/40 dark:text-slate-100 dark:hover:bg-white/10"
                    onClick={() => {
                      close()
                      onSwitchProduct?.()
                    }}
                  >
                    Switch Product
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

        <div className="mx-auto w-full max-w-[1440px] px-0 pb-3 pt-2 md:hidden">
          <div className="relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <Input className="h-11 rounded-2xl pl-10" placeholder="Search..." />
          </div>
        </div>
      </header>
    </>
  )
}
