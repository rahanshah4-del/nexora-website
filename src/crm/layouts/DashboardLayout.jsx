import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/sidebar/Sidebar.jsx'
import TopNav from '../components/navbar/TopNav.jsx'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="nexora-bg min-h-screen overflow-x-hidden">
      <Sidebar />

      <div className="min-h-screen lg:ml-[300px] lg:w-[calc(100%-300px)]">
        <TopNav onOpenSidebar={() => setMobileOpen(true)} />

        <main className="w-full pt-6 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="w-full">
            <Outlet />
          </div>
        </main>

        <footer className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} NEXORA SOLUTIONS — CRM Admin Dashboard
        </footer>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden"
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
  )
}
