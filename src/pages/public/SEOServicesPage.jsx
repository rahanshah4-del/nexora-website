import { Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineMagnifyingGlass,
  HiOutlineCheckCircle,
  HiOutlineChartBar,
  HiOutlineGlobeAlt,
  HiOutlineCodeBracket,
  HiOutlineDocumentText,
  HiOutlineLink,
  HiOutlineMapPin,
  HiOutlineRocketLaunch,
  HiOutlineSparkles,
  HiOutlineChevronDown,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const seoServices = [
  { icon: HiOutlineCodeBracket, title: 'Technical SEO', desc: 'Site speed optimization, crawl error fixes, XML sitemaps, robots.txt, schema markup, mobile-first indexing, Core Web Vitals optimization.' },
  { icon: HiOutlineDocumentText, title: 'On-Page SEO', desc: 'Title tags, meta descriptions, header optimization, keyword placement, internal linking, image alt text, content structure optimization.' },
  { icon: HiOutlineMagnifyingGlass, title: 'Keyword Research', desc: 'In-depth keyword analysis, competitor keyword gaps, long-tail keyword discovery, search intent mapping, local keyword targeting.' },
  { icon: HiOutlineChartBar, title: 'Content Strategy', desc: 'SEO content planning, blog optimization, pillar pages, topic clusters, content gap analysis, conversion-focused copywriting.' },
  { icon: HiOutlineLink, title: 'Link Building', desc: 'High-quality backlink acquisition, guest posting, digital PR, broken link building, competitor backlink analysis, disavow toxic links.' },
  { icon: HiOutlineMapPin, title: 'Local SEO', desc: 'Google Business Profile optimization, local citations, NAP consistency, review management, local landing pages, map pack rankings.' },
  { icon: HiOutlineGlobeAlt, title: 'International SEO', desc: 'Hreflang implementation, multi-language SEO, country-specific targeting, international keyword research, global site structure.' },
  { icon: HiOutlineRocketLaunch, title: 'SEO Audits', desc: 'Comprehensive site audits, technical SEO health checks, competitor analysis, actionable recommendations with priority scoring.' },
]

const processSteps = [
  { step: '01', title: 'SEO Audit', desc: 'Full technical and content audit of your website. We identify every issue holding back your rankings.' },
  { step: '02', title: 'Strategy', desc: 'Custom SEO strategy based on your industry, competitors, and business goals. Keyword mapping and content plan.' },
  { step: '03', title: 'Implementation', desc: 'Technical fixes, on-page optimization, content creation, and link building — executed systematically.' },
  { step: '04', title: 'Monitoring', desc: 'Real-time rank tracking, traffic analysis, and conversion monitoring. Monthly reports with clear metrics.' },
  { step: '05', title: 'Optimization', desc: 'Continuous improvement based on data — refine keywords, update content, build more authority.' },
]

const faqs = [
  { q: 'How long does SEO take to show results?', a: 'SEO is a long-term strategy. Initial technical improvements can show results in 4-6 weeks. Competitive keywords typically take 3-6 months to rank. Local SEO can deliver results faster — often within 30-60 days. We provide monthly reports so you can track progress from day one.' },
  { q: 'What industries do you provide SEO for?', a: 'We work with businesses across all industries — restaurants, retail stores, schools, e-commerce, real estate, healthcare, professional services, and SaaS companies. Our strategies are tailored to your specific industry and target audience.' },
  { q: 'Do you guarantee #1 rankings on Google?', a: 'No ethical SEO agency can guarantee #1 rankings — Google\'s algorithm has 200+ ranking factors. What we guarantee is: data-driven strategy, transparent reporting, and measurable improvement in rankings, traffic, and conversions month over month. Our clients typically see 40-120% organic traffic growth within 6 months.' },
  { q: 'What is included in your monthly SEO reports?', a: 'Monthly reports include: keyword ranking changes, organic traffic trends (Google Analytics), click-through rates (Google Search Console), backlinks acquired, technical health score, content performance, competitor comparison, and actionable recommendations for the next month.' },
  { q: 'Do you do SEO for existing websites or only new ones?', a: 'Both! We optimize existing websites (often there are quick wins) and build SEO-ready new websites. For existing sites, we start with a comprehensive audit. For new sites, we build SEO into the architecture from day one — which is far more effective than retrofitting later.' },
  { q: 'What is the difference between SEO and Google Ads?', a: 'SEO brings free, organic traffic through search rankings — it is a long-term investment that builds lasting authority. Google Ads bring paid traffic instantly but stop the moment you stop paying. The best strategy combines both: SEO for sustainable growth, PPC for immediate visibility.' },
  { q: 'How much does SEO cost in Pakistan?', a: 'Our SEO packages start at PKR 15,000/month for basic local SEO, PKR 35,000/month for standard SEO (includes content + link building), and custom pricing for enterprise/competitive industries. Every package includes a free initial audit. Contact us for a tailored quote.' },
  { q: 'Can you help recover from a Google penalty?', a: 'Yes. We specialize in Google penalty recovery — whether it is a manual action or an algorithmic penalty (Panda, Penguin, Core Updates). We conduct a thorough audit, identify the root cause, fix the issues, and submit a reconsideration request. Recovery typically takes 2-8 weeks depending on severity.' },
]

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.08)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-slate-900 sm:text-[15px]">{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[13px] leading-[1.7] text-slate-500">{faq.a}</p></div>
      </div>
    </article>
  )
}

export default function SEOServicesPage() {
  const seo = getSeoForPath('/seo-services')
  const [openFaqIndex, setOpenFaqIndex] = useState(0)
  const pageFaqs = useMemo(() => faqs, [])

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="SEO Services" badgeIcon={HiOutlineMagnifyingGlass}>
      <PageSeo {...seo} faqItems={pageFaqs.map(f => ({ question: f.q, answer: f.a }))} />

      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link><span> / </span>
        <Link to="/software-development">Software Development</Link><span> / </span>
        <span aria-current="page">SEO Services</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_64%,#f1f5f9_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h1 className="mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">SEO</span> Services
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
            Data-driven SEO that puts your business on Google's first page. Technical optimization,
            keyword strategy, content marketing, and link building — everything you need to grow
            organic traffic and generate qualified leads.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: HiOutlineChartBar, label: '40-120% Traffic Growth', sub: 'Within 6 months' },
              { icon: HiOutlineSparkles, label: '200+ Keywords Ranked', sub: 'Across client portfolio' },
              { icon: HiOutlineMapPin, label: 'Local & International', sub: 'Pakistan, UAE, global' },
              { icon: HiOutlineDocumentText, label: 'Monthly Reports', sub: 'Transparent metrics' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white/60 p-3 backdrop-blur-sm">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-[12px] font-semibold tracking-[-0.01em] text-slate-800">{item.label}</p>
                  <p className="text-[11px] text-slate-400">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]">
              Get Free SEO Audit <HiOutlineArrowRight className="text-lg" />
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
              <FaWhatsapp className="text-base text-emerald-500" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">Complete SEO <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Solutions</span></h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {seoServices.map(s => (
              <article key={s.title} className="group flex flex-col rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_-16px_rgba(15,23,42,0.16)]">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200/60 transition-transform duration-300 group-hover:scale-110">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-[14px] font-semibold tracking-[-0.01em] text-slate-900">{s.title}</h3>
                <p className="mt-2 flex-1 text-[12px] leading-[1.6] text-slate-500">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section data-reveal className="bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">Our SEO <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Process</span></h2>
          </div>
          <div className="mt-10 pl-1">
            {processSteps.map((s, i) => (
              <div key={s.step} className="relative flex gap-5">
                {i < processSteps.length - 1 ? <div className="absolute left-[22px] top-12 bottom-0 w-px bg-gradient-to-b from-emerald-300 to-transparent" aria-hidden="true" /> : null}
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-[0_4px_16px_-6px_rgba(16,185,129,0.3)] ring-4 ring-white">{s.step}</div>
                <div className="pb-10">
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-[1.65] text-slate-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">SEO <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">FAQs</span></h2>
          </div>
          <div className="mt-10 grid gap-3">
            {pageFaqs.map((faq, i) => (
              <FaqItem key={faq.q} faq={faq} isOpen={openFaqIndex === i} onToggle={() => setOpenFaqIndex(openFaqIndex === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section data-reveal className="px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-emerald-200/60 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_58%,#d1fae5_100%)] p-6 shadow-[0_8px_40px_-16px_rgba(16,185,129,0.1)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Ready to Rank Higher on Google?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Get a free SEO audit and custom strategy for your business. No commitment — just expert insights.</p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(16,185,129,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 active:scale-[0.97]">
              Get Free SEO Audit <HiOutlineArrowRight className="text-lg" />
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]">
              <FaWhatsapp className="text-base text-emerald-500" /> WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
