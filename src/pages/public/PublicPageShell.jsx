import { useEffect, useMemo } from 'react'
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2'
import Header from '../../components/Header.jsx'
import { MaintenanceBlock } from '../../components/MaintenanceMode.jsx'
import usePlatformMaintenance from '../../hooks/usePlatformMaintenance.js'
import PublicFooter from './PublicFooter.jsx'
import TawkChat from './TawkChat.jsx'

const whatsappLink = 'https://wa.me/923194329754'
const whatsappLeadLink = `${whatsappLink}?text=${encodeURIComponent(
  'Assalam o Alaikum, I want a free demo of Nexora Business Suite.',
)}`

export default function PublicPageShell({ children }) {
  const maintenanceContext = useMemo(() => ({ surface: 'website' }), [])
  const maintenance = usePlatformMaintenance(maintenanceContext)

  useEffect(() => {
    document.documentElement.classList.add('public-website')
    document.body.classList.add('public-website')

    return () => {
      document.documentElement.classList.remove('public-website')
      document.body.classList.remove('public-website')
    }
  }, [])

  return (
    <div className="marketing-page min-h-screen overflow-x-hidden bg-white text-slate-950">
      {maintenance.active ? <MaintenanceBlock state={maintenance} /> : null}
      {maintenance.active ? null : (
        <>
          <Header />
          <main>{children}</main>
          <PublicFooter />

          <a
            href={whatsappLeadLink}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with Nexora on WhatsApp"
            className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_18px_38px_-22px_rgba(37,211,102,0.9)] hover:bg-[#20bd5a]"
          >
            <HiOutlineChatBubbleLeftRight className="text-3xl" />
          </a>
          <TawkChat />
        </>
      )}
    </div>
  )
}
