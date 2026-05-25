import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/sidebar/Sidebar.jsx'
import TopNav from '../components/navbar/TopNav.jsx'

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const toggleCollapse = () => setCollapsed((c) => !c)

  return (
    <div className="nexora-bg min-h-screen overflow-x-hidden">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      <div
        className={`relative z-10 flex min-h-screen min-w-0 flex-col transition-all duration-300 ${
          collapsed ? 'lg:ml-[88px]' : 'lg:ml-[280px]'
        }`}
      >
        <TopNav collapsed={collapsed} onOpenSidebar={() => setMobileOpen(true)} />

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 transition-all duration-300 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto w-full max-w-[1500px] min-w-0">
            <Outlet />
          </div>
        </main>

        <footer className="min-w-0 px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1500px]">
            © {new Date().getFullYear()} NEXORA SOLUTIONS — CRM Admin Dashboard
          </div>
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
