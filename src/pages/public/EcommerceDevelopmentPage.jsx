import { Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { HiOutlineArrowRight, HiOutlineArrowLeft, HiOutlineShoppingCart, HiOutlineCheckCircle, HiOutlineShieldCheck, HiOutlineCreditCard, HiOutlineCube, HiOutlineChartBar, HiOutlineTruck, HiOutlineDevicePhoneMobile, HiOutlineGlobeAlt, HiOutlineChevronDown } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const features = [
  { icon: HiOutlineShoppingCart, title: 'Custom Storefront', desc: 'Beautiful, branded online store designed to convert visitors into customers. Mobile-optimized checkout, product galleries, search & filters.' },
  { icon: HiOutlineCreditCard, title: 'Secure Payments', desc: 'Stripe, PayPal, JazzCash, Easypaisa, bank transfers. PCI-compliant payment flows with tokenization and fraud protection.' },
  { icon: HiOutlineCube, title: 'Inventory Sync', desc: 'Real-time stock tracking across online and physical stores. Auto-update quantities, low stock alerts, purchase order automation.' },
  { icon: HiOutlineTruck, title: 'Order Management', desc: 'End-to-end order lifecycle — confirmation, processing, shipping, delivery, returns. Automated email/SMS updates to customers.' },
  { icon: HiOutlineChartBar, title: 'Analytics Dashboard', desc: 'Sales trends, product performance, customer behavior, conversion funnels. AI-powered insights to grow revenue.' },
  { icon: HiOutlineDevicePhoneMobile, title: 'Mobile Commerce', desc: 'Progressive Web App (PWA) support. Customers can browse and buy from their phone home screen like a native app.' },
  { icon: HiOutlineGlobeAlt, title: 'Multi-Currency', desc: 'Sell globally with multi-currency support, automatic tax calculation (GST/VAT), and localized checkout experiences.' },
  { icon: HiOutlineShieldCheck, title: 'Security & Compliance', desc: 'SSL encryption, GDPR compliance, regular security audits, daily backups, and DDoS protection via Cloudflare.' },
]

const faqs = [
  { q: 'How much does an e-commerce website cost?', a: 'A custom e-commerce website ranges from PKR 80,000 for a basic store (up to 50 products) to PKR 500,000+ for a large marketplace. Includes: design, development, payment integration, admin dashboard, and 30 days post-launch support. Contact us for a detailed quote based on your requirements.' },
  { q: 'Which payment gateways do you integrate?', a: 'Stripe (international), PayPal, JazzCash, Easypaisa, bank transfer (HBL, UBL, Meezan), and manual payment methods (cash on delivery). We can integrate any payment gateway that provides an API.' },
  { q: 'Can you migrate my existing store from Shopify/WooCommerce?', a: 'Yes! We handle full data migration — products, customers, orders, reviews, and SEO metadata. We ensure zero data loss and zero downtime during migration. Your new store will be live while we redirect old URLs to preserve SEO rankings.' },
  { q: 'Do you provide admin panel for managing the store?', a: 'Every e-commerce project includes a custom admin dashboard for: adding/editing products, managing inventory, processing orders, viewing customer data, running promotions, and accessing analytics. Designed for non-technical users.' },
  { q: 'How long does it take to build an e-commerce site?', a: 'Basic store (up to 50 products): 3-5 weeks. Medium store (50-500 products): 6-10 weeks. Large marketplace: 10-16 weeks. We deliver usable builds every 2 weeks through agile sprints.' },
  { q: 'Is SEO included for my e-commerce site?', a: 'Yes — every e-commerce site we build includes: SEO-friendly URLs, schema markup (Product, Organization), meta tags, sitemap.xml, alt text optimization, fast loading (95+ Lighthouse), and mobile-first responsive design. We also offer dedicated SEO services.' },
]

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.08)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
        <h3 className="text-[14px] font-semibold text-slate-900 sm:text-[15px]">{faq.q}</h3>
        <HiOutlineChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="px-5 pb-5 text-[13px] leading-[1.7] text-slate-500">{faq.a}</p></div>
      </div>
    </article>
  )
}

export default function EcommerceDevelopmentPage() {
  const seo = getSeoForPath('/ecommerce-development')
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="E-commerce" badgeIcon={HiOutlineShoppingCart}>
      <PageSeo {...seo} faqItems={faqs.map(f => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only"><Link to="/">Home</Link><span> / </span><Link to="/software-development">Software Development</Link><span> / </span><span aria-current="page">E-commerce Development</span></nav>

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#ecfdf5_64%,#f1f5f9_100%)] pb-14 pt-20 sm:pb-18 sm:pt-24 lg:pb-20 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          
          <p className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 shadow-sm backdrop-blur-xl"><HiOutlineShoppingCart className="h-3.5 w-3.5" />E-commerce Development</p>
          <h1 className="mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]"><span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">E-commerce</span> Development</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">Full-featured online stores with secure payments, inventory management, order tracking, and a powerful admin dashboard. Built to sell 24/7.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.97]">Start Your Store <HiOutlineArrowRight className="text-lg" /></a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium text-slate-500 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"><FaWhatsapp className="text-base text-emerald-500" />WhatsApp Us</a>
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="text-center"><h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">Everything Your <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Online Store</span> Needs</h2></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(f => (
              <article key={f.title} className="group flex flex-col rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_-16px_rgba(15,23,42,0.16)]">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200/60 transition-transform duration-300 group-hover:scale-110"><f.icon className="h-5 w-5" /></div>
                <h3 className="mt-3 text-[14px] font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 flex-1 text-[12px] leading-[1.6] text-slate-500">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <div className="text-center"><h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl">E-commerce <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">FAQs</span></h2></div>
          <div className="mt-10 grid gap-3">{faqs.map((f, i) => <FaqItem key={f.q} faq={f} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />)}</div>
        </div>
      </section>

      <section data-reveal className="px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-emerald-200/60 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_58%,#d1fae5_100%)] p-6 shadow-md sm:p-8 lg:grid-cols-[1fr_auto]">
          <div><h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Ready to Launch Your Online Store?</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Free consultation, detailed estimate, no commitment.</p></div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-medium text-white shadow-[0_4px_16px_-6px_rgba(16,185,129,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 active:scale-[0.97]">Get Free Quote <HiOutlineArrowRight className="text-lg" /></a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium text-slate-500 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"><FaWhatsapp className="text-base text-emerald-500" />WhatsApp</a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
