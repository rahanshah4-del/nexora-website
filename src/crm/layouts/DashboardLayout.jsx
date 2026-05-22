import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/sidebar/Sidebar.jsx'
import TopNav from '../components/navbar/TopNav.jsx'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="nexora-bg overflow-x-hidden">
      <div className="relative mx-auto flex min-h-screen max-w-[1440px] w-full gap-4 p-4 lg:p-6">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TopNav onOpenSidebar={() => setMobileOpen(true)} />

          <main className="min-w-0 flex-1 overflow-hidden px-1 pb-4 sm:px-2">
            <div className="mx-auto w-full max-w-full">
              <Outlet />
            </div>
          </main>

          <footer className="px-2 pb-2 text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} NEXORA SOLUTIONS — CRM Admin Dashboard
          </footer>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            >
              <div className="h-full p-4" onClick={(e) => e.stopPropagation()}>
                <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
