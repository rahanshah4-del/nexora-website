import { Link } from 'react-router-dom'
import { useState } from 'react'
import { HiOutlineArrowRight, HiOutlineArrowLeft, HiOutlineUserGroup, HiOutlineCheckCircle, HiOutlineChartBar, HiOutlineChatBubbleLeftRight, HiOutlineCog8Tooth, HiOutlineDevicePhoneMobile, HiOutlineRocketLaunch, HiOutlineShieldCheck, HiOutlineChevronDown } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const features = [
  { icon: HiOutlineUserGroup, title: 'Lead Management', desc: 'Capture leads from WhatsApp, email, forms, and calls. Auto-score, assign, and track every lead through your custom sales pipeline.' },
  { icon: HiOutlineChartBar, title: 'Visual Pipeline', desc: 'Drag-and-drop Kanban pipeline. Deals move through stages automatically. See exactly where every deal stands at a glance.' },
  { icon: HiOutlineChatBubbleLeftRight, title: 'Communication Hub', desc: 'All customer conversations — WhatsApp, email, SMS, calls — in one timeline. Never lose context between team members.' },
  { icon: HiOutlineRocketLaunch, title: 'Automation', desc: 'Auto-assign leads, send follow-up reminders, trigger WhatsApp messages, create tasks — all based on rules you define.' },
  { icon: HiOutlineCog8Tooth, title: 'Custom Workflows', desc: 'Every business is unique. We build your CRM around YOUR sales process — not the other way around.' },
  { icon: HiOutlineDevicePhoneMobile, title: 'Mobile CRM', desc: 'Full CRM access on your phone. Update deals, call customers, check pipeline — from anywhere.' },
  { icon: HiOutlineShieldCheck, title: 'Permissions', desc: 'Granular role-based access. Sales reps see their leads. Managers see their team. Owners see everything.' },
  { icon: HiOutlineChartBar, title: 'Reports & Forecasting', desc: 'Sales forecasts, team performance, conversion rates, revenue projections. AI-powered insights to grow faster.' },
]

const faqs = [
  { q: 'Why build a custom CRM instead of using Zoho/HubSpot?', a: 'Off-the-shelf CRMs force you to adapt to their workflow. A custom CRM adapts to YOUR workflow. Result: higher team adoption, less training, and features that match your exact sales process. Plus — no monthly per-user fees that scale with your team.' },
  { q: 'How much does a custom CRM cost?', a: 'A custom CRM starts at PKR 150,000 for a basic setup and can go to PKR 800,000+ for complex, multi-department systems. You own the software outright — no recurring license fees. We offer flexible payment plans.' },
  { q: 'Can you integrate with WhatsApp?', a: 'Yes — WhatsApp integration is our specialty. Auto-capture leads from WhatsApp, send templates, track conversations, and automate follow-ups. All WhatsApp chats appear inside the CRM next to the contact profile.' },
  { q: 'How long does CRM development take?', a: 'Basic CRM: 4-6 weeks. Full-featured CRM with automation: 8-14 weeks. Enterprise CRM with custom integrations: 12-20 weeks. We deliver working software every 2 weeks.' },
  { q: 'Can you migrate data from our existing CRM?', a: 'Yes. We migrate contacts, deals, notes, attachments, and history from any CRM that supports data export (Zoho, HubSpot, Salesforce, Excel). Zero data loss guaranteed.' },
  { q: 'Is my sales data secure?', a: 'Enterprise-grade security — encrypted at rest and in transit, role-based access, audit logs, daily backups, and optional on-premise deployment for maximum data control.' },
]

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.08)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}><h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">{faq.q}</h3><HiOutlineChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} /></button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}><div className="overflow-hidden"><p className="px-5 pb-5 text-[13px] leading-[1.7] text-slate-500">{faq.a}</p></div></div>
    </article>
  )
}

export default function CRMDevelopmentPage() {
  const seo = getSeoForPath('/crm-development')
  const [openFaq, setOpenFaq] = useState(0)
  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="Custom CRM" badgeIcon={HiOutlineUserGroup}>
      <PageSeo {...seo} faqItems={faqs.map(f => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only"><Link to="/">Home</Link><span> / </span><Link to="/software-development">Software Development</Link><span> / </span><span aria-current="page">Custom CRM Development</span></nav>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#eef2ff_64%,#f1f5f9_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          
          <p className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-indigo-700 shadow-sm backdrop-blur-xl"><HiOutlineUserGroup className="h-3.5 w-3.5" />Custom CRM Development</p>
          <h1 className="mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">Custom <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 bg-clip-text text-transparent">CRM</span> Development</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">A CRM built around YOUR sales process. Lead tracking, visual pipeline, WhatsApp integration, automation — everything your sales team needs to close more deals.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]">Build Your CRM <HiOutlineArrowRight className="text-lg" /></a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium text-slate-500 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"><FaWhatsapp className="text-base text-emerald-500" />WhatsApp Us</a>
          </div>
        </div>
      </section>
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8"><div className="text-center"><h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">CRM <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 bg-clip-text text-transparent">Features</span></h2></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(f => (
            <article key={f.title} className="group flex flex-col rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_-16px_rgba(15,23,42,0.16)]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100/80 text-indigo-700 ring-1 ring-indigo-200/60 transition-transform duration-300 group-hover:scale-110"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-3 text-[14px] font-semibold text-slate-900">{f.title}</h3><p className="mt-2 flex-1 text-[12px] leading-[1.6] text-slate-500">{f.desc}</p>
            </article>
          ))}</div>
        </div>
      </section>
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8"><div className="text-center"><h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">CRM <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 bg-clip-text text-transparent">FAQs</span></h2></div>
          <div className="mt-10 grid gap-3">{faqs.map((f, i) => <FaqItem key={f.q} faq={f} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />)}</div>
        </div>
      </section>
      <section data-reveal className="px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-indigo-200/60 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_58%,#e0e7ff_100%)] p-6 shadow-md sm:p-8 lg:grid-cols-[1fr_auto]">
          <div><h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Ready for a CRM That Fits Your Business?</h2><p className="mt-3 text-sm leading-7 text-slate-500">Free consultation — we design your ideal CRM workflow before writing a single line of code.</p></div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-indigo-600 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(99,102,241,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 active:scale-[0.97]">Get Free Quote <HiOutlineArrowRight className="text-lg" /></a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium text-slate-500 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"><FaWhatsapp className="text-base text-emerald-500" />WhatsApp</a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
