import { Link } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
} from 'react-icons/hi2'

/* ── Static data (module-level — allocated once, not on every render) ── */

const AI_MODULES = [
  { label: 'Restaurant POS', icon: '🍽️' }, { label: 'Retail POS', icon: '🛍️' }, { label: 'Pharmacy', icon: '💊' },
  { label: 'CRM', icon: '📊' }, { label: 'Inventory', icon: '📦' }, { label: 'Billing', icon: '🧾' },
  { label: 'HR', icon: '👥' }, { label: 'Reports', icon: '📈' }, { label: 'Marketing', icon: '📣' },
]

const AI_FEATURE_CARDS = [
  { title: 'Nexora Solution AI Menu Recognition', desc: 'Upload a photo of any menu — AI extracts items, prices, and categories. Import 100+ items in seconds.', icon: '📸' },
  { title: 'Nexora Solution AI Business Intelligence', desc: 'Ask questions about your business in plain English or Urdu. Get instant answers, reports, and recommendations.', icon: '💬' },
  { title: 'AI Sales Insights', desc: 'AI analyzes your sales patterns and predicts trends. Know what sells, when, and at what price.', icon: '📊' },
  { title: 'AI Inventory Intelligence', desc: 'Smart stock predictions, low-stock alerts, and automatic purchase recommendations based on sales velocity.', icon: '📦' },
  { title: 'Nexora Solution AI Analytics', desc: 'Generate detailed business reports instantly. AI finds insights you might miss in raw data.', icon: '📄' },
  { title: 'AI Customer Support', desc: '24/7 intelligent chatbot that answers customer queries, takes orders, and resolves issues automatically.', icon: '🤖' },
]

const AI_WORKFLOW_STEPS = [
  { step: '01', title: 'Upload', desc: 'Upload your menu photo, inventory list, or sales data. AI handles any format.' },
  { step: '02', title: 'AI Understands', desc: 'Nexora AI reads, analyzes, and extracts structured data using advanced OCR and language models.' },
  { step: '03', title: 'AI Organizes', desc: 'Data is categorized, validated, and matched against your existing records. Duplicates flagged.' },
  { step: '04', title: 'Ready to Use', desc: 'Review the results, make edits if needed, and import everything in one click. Done.' },
]

const AI_SHOWCASE = [
  { label: 'AI Dashboard', desc: 'Real-time AI-powered business overview with smart alerts and predictions', icon: '📊', bg: 'from-amber-50 to-orange-50' },
  { label: 'AI Chat Assistant', desc: '24/7 intelligent assistant in English & Urdu — answers, analyzes, recommends', icon: '💬', bg: 'from-violet-50 to-purple-50' },
  { label: 'AI Menu Import', desc: 'Upload a menu photo — AI extracts 100+ items with prices & categories instantly', icon: '📸', bg: 'from-sky-50 to-blue-50' },
  { label: 'AI Analytics', desc: 'Deep sales pattern analysis with predictive trends and anomaly detection', icon: '📈', bg: 'from-emerald-50 to-green-50' },
  { label: 'AI Reports', desc: 'One-click P&L, inventory valuation, tax summaries — AI finds the insights', icon: '📄', bg: 'from-rose-50 to-pink-50' },
  { label: 'AI Business Insights', desc: 'Daily briefings: what sold, what\'s low, what to reorder, who to follow up with', icon: '💡', bg: 'from-indigo-50 to-blue-50' },
]

const AI_WHY_CHOOSE = [
  { icon: '⚡', title: 'Smart Automation', desc: 'AI handles repetitive tasks so your team can focus on growth.' },
  { icon: '🚀', title: 'Faster Setup', desc: 'AI imports your data — go from signup to operational in minutes.' },
  { icon: '🧠', title: 'AI Decision Support', desc: 'Get recommendations backed by real data, not guesswork.' },
  { icon: '📊', title: 'AI Reports', desc: 'Generate complete business reports with a single click.' },
  { icon: '🔍', title: 'AI Analytics', desc: 'Deep insights into sales, inventory, and customer behavior.' },
  { icon: '💬', title: 'AI Customer Support', desc: '24/7 chatbot handles queries, takes orders, resolves issues.' },
  { icon: '📦', title: 'AI Inventory Intelligence', desc: 'Smart stock predictions and automatic reorder alerts.' },
  { icon: '📸', title: 'AI Menu Recognition', desc: 'Photo-to-menu in seconds — AI reads, extracts, imports.' },
  { icon: '🔐', title: 'Enterprise Security', desc: 'Encrypted data, role-based access, audit logs.' },
  { icon: '☁️', title: 'Cloudflare AI Infra', desc: 'Powered by Cloudflare Workers AI — fast, reliable, global.' },
]

const TRADITIONAL_PAIN_POINTS = [
  { label: 'Manual Setup', desc: 'Hours of data entry, spreadsheets, and configuration' },
  { label: 'Manual Reports', desc: 'Export data, build reports by hand, calculate in Excel' },
  { label: 'Manual Menu Entry', desc: 'Type every item, price, and category one by one' },
  { label: 'Limited Insights', desc: 'What sold? Check 3 different reports to find out' },
  { label: 'Static Dashboards', desc: 'Refresh manually, no predictions, no alerts' },
]

const NEXORA_AI_ADVANTAGES = [
  { label: 'AI Automation', desc: 'AI imports your data, configures settings, and gets you running' },
  { label: 'AI Reports', desc: 'One click — AI generates complete P&L, inventory, and tax reports' },
  { label: 'AI Menu Import', desc: 'Upload a photo — AI extracts 100+ items with prices in seconds' },
  { label: 'AI Insights', desc: 'Daily AI briefings: trends, predictions, and action items' },
  { label: 'AI Business Assistant', desc: 'Ask "What sold best?" or "What\'s low stock?" — get instant answers' },
]

const AI_STATS = [
  { value: '9', label: 'AI-Powered Modules', sub: 'Every module has embedded AI' },
  { value: '100%', label: 'Business Automation', sub: 'Repetitive tasks handled by AI' },
  { value: '10×', label: 'Faster Setup', sub: 'AI imports data in seconds not hours' },
  { value: '24/7', label: 'Smart Insights', sub: 'AI monitors your business around the clock' },
  { value: 'Cloudflare', label: 'Cloud Infrastructure', sub: 'Global edge network, 330+ cities' },
  { value: 'Enterprise', label: 'Security Grade', sub: 'Encrypted, role-based, fully audited' },
]

const AI_EVERYWHERE_ROWS = [
  ['🍽️ Restaurant POS', '🛍️ Retail POS', '💊 Pharmacy'],
  ['📦 Inventory', '📊 CRM', '👥 HR'],
  ['🧾 Billing', '📈 Reports', '📣 Marketing'],
  ['💬 Customer Support', '📋 Business Analytics'],
]

const TRUST_ITEMS = [
  { icon: '☁️', title: 'Cloudflare Infrastructure', desc: 'Global edge network in 330+ cities. 99.99% uptime.' },
  { icon: '🔒', title: 'Secure AI Gateway', desc: 'All AI requests go through encrypted Cloudflare Workers.' },
  { icon: '🔑', title: 'Encrypted API Comms', desc: 'TLS 1.3 encryption on every request. Zero plain-text data.' },
  { icon: '🛡️', title: 'Protected Business Data', desc: 'Firestore security rules, role-based access, audit logs.' },
  { icon: '✅', title: 'Enterprise Reliability', desc: 'Automatic backups, disaster recovery, and 24/7 monitoring.' },
]

/* ── Component ── */

export default function AISections() {
  return (
    <>
      {/* ═══════════════════════════════════════════
          PHASE 1 — AI ANNOUNCEMENT
          ═══════════════════════════════════════════ */}
      <section data-reveal className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,rgba(168,85,247,0.03)_40%,transparent_70%)] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700 shadow-[0_0_24px_-4px_rgba(139,92,246,0.12)] backdrop-blur-xl">
              <svg className="h-3.5 w-3.5 text-violet-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
              Introducing Nexora AI
            </span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              One intelligent AI powering <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">every business module.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-[15px] font-bold leading-relaxed text-slate-700 sm:text-base">
              Nexora Solution is Pakistan&rsquo;s next-generation AI Business Operating System.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Nexora AI is deeply integrated across the entire platform — it understands your menu, inventory, sales, customers, and reports to help you work smarter and faster.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
            {AI_MODULES.map((m) => (
              <div key={m.label} className="flex items-center gap-1.5 rounded-xl border border-violet-100/60 bg-white/80 px-3 py-2.5 text-[11px] font-bold text-slate-600 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-violet-300 hover:shadow-[0_4px_16px_-6px_rgba(139,92,246,0.15)] hover:-translate-y-0.5">
                <span className="text-sm">{m.icon}</span><span className="hidden sm:inline">{m.label}</span><span className="sm:hidden">{m.label.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHASE 1 — AI FEATURE CARDS */}
      <section data-reveal className="bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex rounded-full border border-violet-100 bg-violet-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-600 shadow-sm">AI Features</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Intelligent tools <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">built for business.</span></h2>
          </div>
          <div data-ai="cards" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {AI_FEATURE_CARDS.map((card) => (
              <div key={card.title} className="group relative overflow-hidden rounded-[1.35rem] border border-violet-100/60 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(139,92,246,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_16px_44px_-16px_rgba(139,92,246,0.2)]">
                <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-violet-50 to-purple-50 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-70" />
                <div className="relative"><span className="text-3xl">{card.icon}</span><span className="ml-2 inline-flex rounded-full border border-violet-200/60 bg-violet-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-violet-600">AI</span></div>
                <h3 className="relative mt-3 text-lg font-black text-slate-950">{card.title}</h3>
                <p className="relative mt-2 text-[13px] leading-[1.65] text-slate-500">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHASE 1 — AI WORKFLOW */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex rounded-full border border-violet-100 bg-violet-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-600 shadow-sm">How It Works</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">AI that <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">works for you.</span></h2>
          </div>
          <div  className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {AI_WORKFLOW_STEPS.map((item, idx) => (
              <div key={item.step} className="group relative text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-xl font-black text-white shadow-[0_8px_24px_-6px_rgba(139,92,246,0.3)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_32px_-8px_rgba(139,92,246,0.4)]">{item.step}</div>
                {idx < 3 && (<div className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-px w-[calc(100%-5rem)] bg-gradient-to-r from-violet-300 to-transparent lg:block" />)}
                <p className="mt-4 text-lg font-black text-slate-950">{item.title}</p><p className="mt-1.5 text-[13px] leading-[1.6] text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHASE 1 — AI CTA */}
      <section data-reveal  className="relative overflow-hidden bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[300px] w-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)] blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-violet-100/60 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_48%,#f5f3ff_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(139,92,246,0.3)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur-xl">
              <svg className="h-3.5 w-3.5 text-violet-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>Nexora AI</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Experience Nexora Solution AI <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">Today.</span></h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">Start your 7-day free trial — no credit card required. Or book a live demo and let our experts show you how Nexora AI transforms your business.</p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row lg:flex-col xl:flex-row">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_24px_-4px_rgba(139,92,246,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-6px_rgba(139,92,246,0.5)] active:scale-[0.97]">Start Free Trial <HiOutlineArrowRight className="text-lg" /></Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-white/80 px-6 py-3 text-sm font-bold text-violet-700 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white active:scale-[0.97]">Book Live Demo <HiOutlinePlayCircle className="text-xl text-violet-500" /></Link>
          </div>
        </div>
      </section>

      {/* PHASE 2 — AI SHOWCASE */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700 shadow-[0_0_20px_-4px_rgba(139,92,246,0.1)] backdrop-blur-xl"><HiOutlineSparkles className="h-3.5 w-3.5 text-violet-500" />AI Showcase</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">See Nexora AI <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">in action.</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">Real screens from real modules — every tool is powered by the same intelligent AI engine.</p>
          </div>
          <div  className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AI_SHOWCASE.map((item) => (
              <div key={item.label} className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200/50 bg-white p-6 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.1)]">
                <div className={`flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br ${item.bg} transition-transform duration-300 group-hover:scale-[1.03]`}>
                  <span className="text-5xl transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{item.label}</h3>
                <p className="mt-1.5 text-[12px] leading-[1.55] text-[#86868b]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHASE 2 — WHY BUSINESSES CHOOSE */}
      <section data-reveal className="bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_60%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex rounded-full border border-violet-100 bg-violet-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-600 shadow-sm">Why Nexora AI</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Built for <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">real business.</span></h2>
          </div>
          <div  className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {AI_WHY_CHOOSE.map((item) => (
              <div key={item.title} className="group rounded-2xl border border-violet-100/50 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_8px_28px_-10px_rgba(139,92,246,0.15)]">
                <span className="text-2xl">{item.icon}</span><h3 className="mt-3 text-[13px] font-black text-slate-950">{item.title}</h3><p className="mt-1.5 text-[11px] leading-[1.6] text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHASE 2 — AI COMPARISON */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Traditional Software <span className="text-slate-300">vs</span> <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">Nexora AI</span></h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200/60 bg-slate-50/80 p-6 sm:p-8">
              <p className="text-lg font-black text-slate-400">Traditional Software</p>
              <div className="mt-6 space-y-4">
                {TRADITIONAL_PAIN_POINTS.map((row) => (
                  <div key={row.label} className="flex items-start gap-3 rounded-xl border border-slate-200/40 bg-white p-4">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">✕</span>
                    <div><p className="text-sm font-bold text-slate-600">{row.label}</p><p className="mt-0.5 text-[12px] text-slate-400">{row.desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-6 sm:p-8 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.2)]">
              <p className="text-lg font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Nexora AI Platform</p>
              <div className="mt-6 space-y-4">
                {NEXORA_AI_ADVANTAGES.map((row) => (
                  <div key={row.label} className="flex items-start gap-3 rounded-xl border border-violet-100/50 bg-white/80 p-4 backdrop-blur-sm">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">✓</span>
                    <div><p className="text-sm font-bold text-slate-900">{row.label}</p><p className="mt-0.5 text-[12px] text-slate-500">{row.desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE 2 — AI STATISTICS */}
      <section data-reveal className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 py-16 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"><div className="h-[400px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)] blur-3xl" /></div>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-300 backdrop-blur-xl"><HiOutlineSparkles className="h-3.5 w-3.5 text-violet-400" />Nexora AI by the Numbers</span>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {AI_STATS.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"><p className="text-4xl font-black text-white sm:text-5xl">{stat.value}</p><p className="mt-2 text-sm font-bold text-violet-300">{stat.label}</p><p className="mt-1 text-[12px] text-slate-400">{stat.sub}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* PHASE 2 — AI EVERYWHERE */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center"><h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">AI Everywhere. <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">One Engine.</span></h2></div>
          <div className="mt-12 flex flex-col items-center gap-3">
            {AI_EVERYWHERE_ROWS.map((row, ri) => (
              <div key={ri} className="flex flex-wrap justify-center gap-3">{row.map((item) => (<div key={item} className="flex items-center gap-2 rounded-full border border-violet-100/60 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:border-violet-300 hover:shadow-[0_4px_16px_-6px_rgba(139,92,246,0.15)] hover:-translate-y-0.5">{item}</div>))}</div>
            ))}
            <div className="py-2 text-violet-400 text-2xl">↓</div>
            <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-[0_8px_32px_-8px_rgba(139,92,246,0.4)]"><HiOutlineSparkles className="h-4 w-4" />One Nexora AI Engine</div>
          </div>
        </div>
      </section>

      {/* PHASE 2 — TRUST & SECURITY */}
      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#faf5ff_50%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-600 shadow-sm"><HiOutlineShieldCheck className="h-3.5 w-3.5" />Trust & Security</span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Enterprise-grade security. <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Zero compromises.</span></h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="group rounded-2xl border border-violet-100/50 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_8px_28px_-10px_rgba(139,92,246,0.12)]"><span className="text-2xl">{item.icon}</span><h3 className="mt-3 text-[13px] font-black text-slate-950">{item.title}</h3><p className="mt-1.5 text-[11px] leading-[1.6] text-slate-500">{item.desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* PHASE 2 — FINAL PREMIUM CTA */}
      <section data-reveal  className="relative overflow-hidden bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><div className="h-[500px] w-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1)_0%,rgba(168,85,247,0.05)_40%,transparent_70%)] blur-3xl" /></div>
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700 shadow-[0_0_24px_-4px_rgba(139,92,246,0.15)] backdrop-blur-xl"><HiOutlineSparkles className="h-3.5 w-3.5 text-violet-500" />Get Started Today</span>
          <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Transform Your Business with <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">Nexora AI.</span></h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">7-day free trial. No credit card. No setup fees. Full access to every AI-powered module.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 min-[390px]:flex-row">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_6px_28px_-4px_rgba(139,92,246,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-6px_rgba(139,92,246,0.55)] active:scale-[0.97]">Start Free Trial <HiOutlineArrowRight className="text-lg" /></Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-violet-200/60 bg-white/90 px-6 py-3.5 text-sm font-bold text-violet-700 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 active:scale-[0.97]">Schedule Live Demo <HiOutlinePlayCircle className="text-xl text-violet-500" /></Link>
          </div>
        </div>
      </section>
    </>
  )
}
