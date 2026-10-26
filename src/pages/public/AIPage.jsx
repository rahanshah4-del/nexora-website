import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import PublicPageShell from './PublicPageShell.jsx'
import ModuleIntroSection from '../../components/video/ModuleIntroSection.jsx'
import { GEOLINT_FIX_PATH, GEOLINT_HOW_PATH, GEOLINT_PATH } from '../../lib/geolintLaunch.js'
import { TOOLS_HUB_PATH, TOOL_LINKS } from '../../lib/toolsLaunch.js'
import { HiOutlineArrowRight, HiOutlineChartBar, HiOutlineChatBubbleLeftRight, HiOutlineCloudArrowUp, HiOutlineCpuChip, HiOutlineCube, HiOutlineDocumentText, HiOutlineLightBulb, HiOutlinePlayCircle, HiOutlineSparkles } from 'react-icons/hi2'

const seo = {
  title: 'Nexora AI: AI POS, AI CRM & Business Software',
  description: 'Nexora AI adds AI menu import, an Urdu and English business assistant, AI sales insights and a free GEO audit to POS, CRM and inventory. Try it free.',
  keywords: 'AI POS software, AI business software, AI restaurant POS, AI inventory management, AI sales insights, AI menu import, AI business assistant, GEO audit tool, AI search visibility, free invoice generator',
  canonical: 'https://nexorasolution.us/ai/',
  path: '/ai',
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

const geoChecks = [
  { points: '30', title: 'Bot access', desc: 'Can ChatGPT, Gemini, Perplexity and Claude crawlers reach your pages? GeoLint reads robots.txt and the real server response.' },
  { points: '25', title: 'JavaScript test', desc: 'Loads the page as raw HTML and after scripts run, to measure how much text AI crawlers never see.' },
  { points: '25', title: 'Answer-first content', desc: 'Rewards a direct answer under each heading instead of a long introduction, the style AI answers quote.' },
  { points: '20', title: 'Facts and structure', desc: 'Counts specific facts, outside sources and JSON-LD structured data, and checks that each type has the fields it needs.' },
]

const freeToolKeys = ['invoice', 'pakistan', 'quotation', 'paystub', 'purchaseorder', 'thermal', 'letterhead', 'proforma']
const freeTools = freeToolKeys.map((key) => TOOL_LINKS.find((tool) => tool.key === key)).filter(Boolean)

const faqs = [
  ['What is Nexora AI?', 'Nexora AI is the AI built into Nexora POS, CRM, inventory and reports. It imports a menu from a photo, answers questions about your sales in English or Urdu, writes reports and highlights low stock.'],
  ['What is an AI POS?', 'An AI POS is a point of sale that does more than bill. It reads your menu from a photo, predicts what will sell, warns you before stock runs out and answers questions about your numbers. Nexora Restaurant POS and Retail POS include these.'],
  ['What is a GEO audit?', 'GEO means generative engine optimization: making your website readable and quotable for AI search tools such as ChatGPT, Gemini and Perplexity. A GEO audit tests whether those tools can access and understand your pages.'],
  ['Is the GeoLint GEO audit free?', 'Yes. GeoLint gives a free score out of 100 with a ranked list of fixes. If you would rather not do the fixes yourself, you can order them from the fix page.'],
  ['Is there a free invoice generator?', 'Yes. Nexora has free tools for invoices, quotations, pay stubs, purchase orders, delivery notes and thermal receipts. They run in your browser and make PDF or Excel files with no sign-up.'],
  ['Does Nexora AI understand Urdu?', 'Yes. You can ask the Nexora AI assistant about sales, stock and customers in plain English or Urdu.'],
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
      <PageSeo {...seo} faqItems={faqs} />

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

      {/* ── Video ── */}
      <ModuleIntroSection solutionSlug="nexora-ai" />

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

      {/* ── GeoLint: AI search visibility ── */}
      <section id="geo-audit" className="bg-[linear-gradient(180deg,#ffffff_0%,#faf5ff_100%)] py-16 sm:py-20 lg:py-24" aria-labelledby="geo-heading">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-600 shadow-sm">
              <HiOutlineSparkles className="h-3.5 w-3.5" />
              Free GEO audit · GeoLint
            </span>
            <h2 id="geo-heading" className="mt-5 text-3xl font-black tracking-[-0.02em] text-slate-950 sm:text-5xl">
              Can AI search <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">read your website?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Customers now ask ChatGPT, Gemini and Perplexity before they search Google. GeoLint is our free generative engine optimization (GEO) audit: it checks whether AI search tools can reach and understand your site, then gives one score out of 100 and a ranked list of fixes.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {geoChecks.map((c) => (
              <div key={c.title} className="rounded-[1.35rem] border border-violet-100/60 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(139,92,246,0.06)]">
                <p className="text-3xl font-black tabular-nums text-violet-600">{c.points}<span className="ml-1 text-sm font-bold text-slate-400">points</span></p>
                <h3 className="mt-2 text-base font-black text-slate-950">{c.title}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.65] text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row">
            <Link to={GEOLINT_PATH} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_24px_-4px_rgba(139,92,246,0.4)] transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]">
              Run a free GEO audit <HiOutlineArrowRight className="text-lg" />
            </Link>
            <Link to={GEOLINT_HOW_PATH} className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200/60 bg-white px-6 py-3 text-sm font-bold text-violet-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 active:scale-[0.97]">
              How the score works
            </Link>
            <Link to={GEOLINT_FIX_PATH} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-slate-600 transition hover:text-violet-700">
              Order the fixes for me
            </Link>
          </div>
        </div>
      </section>

      {/* ── Free business tools ── */}
      <section id="free-tools" className="bg-white py-16 sm:py-20 lg:py-24" aria-labelledby="tools-heading">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="tools-heading" className="text-3xl font-black tracking-[-0.02em] text-slate-950 sm:text-5xl">
              Free tools for <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">everyday paperwork.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Make a free invoice, quotation, pay stub or purchase order in your browser. PDF and Excel downloads, taxes and discounts worked out for you, and no sign-up needed.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {freeTools.map((tool) => (
              <Link key={tool.key} to={tool.path} className="group rounded-[1.35rem] border border-violet-100/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(139,92,246,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_16px_44px_-16px_rgba(139,92,246,0.18)]">
                <HiOutlineDocumentText className="h-6 w-6 text-violet-500" />
                <h3 className="mt-3 text-base font-black text-slate-950">{tool.label}</h3>
                <p className="mt-1 text-[13px] leading-[1.6] text-slate-500">{tool.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-violet-600">Open the tool <HiOutlineArrowRight className="transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link to={TOOLS_HUB_PATH} className="text-sm font-bold text-violet-700 hover:underline">See all free tools</Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-[linear-gradient(180deg,#ffffff_0%,#faf5ff_100%)] py-16 sm:py-20" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 id="faq-heading" className="text-center text-3xl font-black tracking-[-0.02em] text-slate-950 sm:text-4xl">Nexora AI questions</h2>
          <div className="mt-8 divide-y divide-violet-100/70 rounded-[1.5rem] border border-violet-100/60 bg-white px-5 shadow-sm sm:px-7">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-slate-950 [&::-webkit-details-marker]:hidden">
                  {question}
                  <span aria-hidden="true" className="text-violet-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[14px] leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / Stats ── */}
      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-violet-100/60 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_58%,#f5f3ff_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(139,92,246,0.25)] sm:p-8">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              { value: 'PKR', label: 'Local Billing & Support' },
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
