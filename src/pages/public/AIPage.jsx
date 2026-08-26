import { Link } from 'react-router-dom'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import {
  HiOutlineArrowRight,
  HiOutlineChartBar,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCloudArrowUp,
  HiOutlineCpuChip,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineLightBulb,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
  HiOutlineShoppingBag,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from 'react-icons/hi2'

const seo = {
  title: 'Nexora AI — AI-Powered Business Software | AI POS, AI CRM, AI Restaurant',
  description: 'Nexora AI is an intelligent AI platform deeply integrated into every business module — Restaurant POS, Retail POS, CRM, Inventory, Reports and more. AI menu import, AI sales insights, AI customer support.',
}

const modules = [
  { name: 'Restaurant POS', icon: '🍽️', ai: 'AI Menu Import — upload a menu photo, AI extracts all items instantly. AI predicts daily sales and optimizes inventory.' },
  { name: 'Retail POS', icon: '🛍️', ai: 'AI barcode scanning, smart stock reordering, and customer purchase pattern analysis.' },
  { name: 'Pharmacy POS', icon: '💊', ai: 'AI medicine recognition, expiry alerts, alternative suggestions, and batch tracking.' },
  { name: 'CRM', icon: '📊', ai: 'AI lead scoring, sales pipeline predictions, and automated follow-up reminders.' },
  { name: 'Inventory', icon: '📦', ai: 'AI stock predictions, low-stock alerts, and automatic purchase recommendations based on sales velocity.' },
  { name: 'Billing', icon: '🧾', ai: 'AI-powered invoice generation, tax compliance, and payment reconciliation.' },
  { name: 'HR & Payroll', icon: '👥', ai: 'AI attendance tracking, payroll calculations, and staff scheduling optimization.' },
  { name: 'Reports', icon: '📈', ai: 'AI generates detailed business reports with insights you might miss. Export-ready in seconds.' },
  { name: 'Marketing', icon: '📣', ai: 'AI email campaigns, customer segmentation, and WhatsApp broadcast optimization.' },
]

const features = [
  {
    icon: HiOutlineCloudArrowUp,
    title: 'AI Menu Import',
    desc: 'Upload a photo or PDF of any menu. Nexora AI reads it, extracts every item with prices, categories, and descriptions, then imports them into your menu — all in seconds.',
    tag: 'Popular',
  },
  {
    icon: HiOutlineChatBubbleLeftRight,
    title: 'AI Business Assistant',
    desc: 'Ask anything about your business in English or Urdu. "What sold best last week?" "Show me low stock items." Get instant answers from your own data.',
    tag: '24/7',
  },
  {
    icon: HiOutlineChartBar,
    title: 'AI Sales Insights',
    desc: 'AI analyzes your sales history, spots trends, predicts demand, and tells you exactly what to stock up on — before you run out.',
  },
  {
    icon: HiOutlineCube,
    title: 'AI Inventory Intelligence',
    desc: 'Real-time stock tracking with smart reorder alerts. AI learns your sales patterns and prevents both overstocking and stockouts.',
  },
  {
    icon: HiOutlineDocumentText,
    title: 'AI Reports',
    desc: 'Generate profit & loss, sales summaries, inventory valuation, and tax reports instantly. AI highlights the insights that matter.',
  },
  {
    icon: HiOutlineLightBulb,
    title: 'AI Customer Support',
    desc: 'Nexora AI chatbot handles customer queries 24/7 — takes orders, answers questions, and routes complex issues to your team.',
    tag: 'New',
  },
]

const workflow = [
  { step: '01', title: 'Upload or Ask', desc: 'Upload a menu photo, ask a question, or let AI monitor your data automatically.' },
  { step: '02', title: 'Nexora AI Understands', desc: 'Our AI reads, analyzes, and extracts meaning from your data using advanced language and vision models.' },
  { step: '03', title: 'AI Organizes & Predicts', desc: 'Data is structured, categorized, validated, and matched. AI finds patterns and makes predictions.' },
  { step: '04', title: 'You Take Action', desc: 'Review insights, approve imports, or let AI handle it automatically. One click and you\'re done.' },
]

export default function AIPage() {
  return (
    <PublicPageShell>
      <PageSeo {...seo} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_50%,#f8fbff_100%)] pb-16 pt-20 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2">
          <div className="h-[500px] w-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,rgba(168,85,247,0.04)_40%,transparent_70%)] blur-3xl" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700 shadow-[0_0_24px_-4px_rgba(139,92,246,0.15)] backdrop-blur-xl">
            <HiOutlineSparkles className="h-3.5 w-3.5 text-violet-500" />
            Nexora AI Platform
          </span>
          <h1 className="mx-auto mt-5 max-w-5xl text-[2.5rem] font-black leading-[1.06] tracking-[-0.02em] text-slate-950 sm:text-[3.5rem] lg:text-[4.2rem]">
            AI-Powered Business{' '}
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              Software.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            One intelligent AI deeply integrated across every Nexora module. It reads your menus, analyzes your sales, manages your inventory, and answers your questions — all in plain English or Urdu.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 min-[390px]:flex-row">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_24px_-4px_rgba(139,92,246,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(139,92,246,0.5)] active:scale-[0.97]">
              Start Free Trial <HiOutlineArrowRight className="text-lg" />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-white/80 px-6 py-3 text-sm font-bold text-violet-700 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 active:scale-[0.97]">
              Book Live Demo <HiOutlinePlayCircle className="text-xl text-violet-500" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── AI Features ── */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-[-0.02em] text-slate-950 sm:text-5xl">
              AI Features <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Built for Business.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Every Nexora module comes with embedded AI. No plugins, no setup — it just works.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group relative overflow-hidden rounded-[1.35rem] border border-violet-100/60 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(139,92,246,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_16px_44px_-16px_rgba(139,92,246,0.18)]">
                <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-violet-50 to-purple-50 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-70" />
                <div className="relative flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-[0_4px_12px_-2px_rgba(139,92,246,0.3)]">
                    <f.icon className="h-5 w-5" />
                  </div>
                  {f.tag && (
                    <span className="rounded-full border border-violet-200/60 bg-violet-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-violet-600">
                      {f.tag}
                    </span>
                  )}
                </div>
                <h3 className="relative mt-4 text-lg font-black text-slate-950">{f.title}</h3>
                <p className="relative mt-2 text-[13px] leading-[1.65] text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-[-0.02em] text-slate-950 sm:text-5xl">
              How Nexora AI <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Works.</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item, idx) => (
              <div key={item.step} className="group relative text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-xl font-black text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.3)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_32px_-8px_rgba(139,92,246,0.4)]">
                  {item.step}
                </div>
                {idx < 3 && (
                  <div className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-px w-[calc(100%-5rem)] bg-gradient-to-r from-violet-300 to-transparent lg:block" />
                )}
                <p className="mt-4 text-lg font-black text-slate-950">{item.title}</p>
                <p className="mt-1.5 text-[13px] leading-[1.6] text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI in Every Module ── */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-600 shadow-sm">
              <HiOutlineCpuChip className="h-3.5 w-3.5" />
              AI-Powered Modules
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.02em] text-slate-950 sm:text-5xl">
              AI is embedded in <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">every module.</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div key={m.name} className="flex gap-4 rounded-[1.35rem] border border-violet-100/50 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(139,92,246,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-12px_rgba(139,92,246,0.12)]">
                <span className="text-2xl shrink-0">{m.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-950">{m.name}</p>
                    <span className="shrink-0 rounded-full border border-violet-200/60 bg-violet-50 px-1.5 py-0.5 text-[9px] font-extrabold text-violet-600">AI</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-[1.6] text-slate-500">{m.ai}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / Stats ── */}
      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-violet-100/60 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_58%,#f5f3ff_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(139,92,246,0.25)] sm:p-8">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              { value: '500+', label: 'Businesses Trust Nexora' },
              { value: '9', label: 'AI-Powered Modules' },
              { value: '24/7', label: 'AI Assistant Available' },
              { value: 'Urdu + EN', label: 'Bilingual AI Support' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center justify-center rounded-[1.5rem] border border-violet-100/50 bg-white p-5 text-center shadow-sm">
                <p className="text-3xl font-black text-violet-600 sm:text-4xl">{s.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-violet-100/60 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 shadow-[0_30px_90px_-40px_rgba(139,92,246,0.5)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div className="text-white">
            <p className="text-2xl font-black tracking-[-0.02em] sm:text-4xl">Ready to experience Nexora AI?</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">Start your 1-month free trial today. No credit card, no setup fees — full access to every AI-powered module.</p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row lg:flex-col xl:flex-row">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-violet-700 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.2)] active:scale-[0.97]">
              Start Free Trial <HiOutlineArrowRight className="text-lg" />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.97]">
              Book Live Demo
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
