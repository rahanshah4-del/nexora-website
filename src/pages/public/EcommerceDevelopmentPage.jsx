import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineShoppingCart } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const journey = [
  { t: 'Browse', d: 'Categories, search and filters, product pages with several photos and clear prices.' },
  { t: 'Cart', d: 'Quantities, variants and delivery charge visible before the customer commits.' },
  { t: 'Checkout', d: 'Guest or account, address, delivery option and payment. As few fields as possible.' },
  { t: 'Payment', d: 'Cash on delivery, bank transfer or an online payment through your provider’s hosted page.' },
  { t: 'Order', d: 'You see it in the admin panel, pack it, and mark it shipped. The customer is told.' },
  { t: 'After sale', d: 'Returns, repeat purchases and the questions that always follow a delivery.' },
]

const needs = [
  { t: 'Storefront', d: 'A fast, mobile-first shop with your branding. Most of your customers will arrive on a phone, so the phone version is designed first.' },
  { t: 'Product catalogue', d: 'Categories, variants such as size and colour, photos, descriptions and prices you can edit without a developer.' },
  { t: 'Stock', d: 'Stock levels that drop when something sells, and a warning when you are running low. If you also sell in a shop, we can share stock with a POS.' },
  { t: 'Orders', d: 'An order list with statuses from new to delivered, plus customer details and notes.' },
  { t: 'Payments', d: 'Cash on delivery and bank transfer are simple. Online payments go through your provider’s hosted checkout, and the order is only marked paid when the provider confirms.' },
  { t: 'Admin panel', d: 'Where you and your staff manage products, orders and customers. Roles keep staff to the screens they need.' },
  { t: 'Search visibility', d: 'Clean URLs, titles and descriptions per product, a sitemap and product structured data, so Google can understand what you sell.' },
  { t: 'Installable on a phone', d: 'The shop can be added to a phone’s home screen like an app, without going through an app store.' },
]

const honest = [
  { t: 'What we have built', d: 'Our closest live example is the online ordering portal in Nexora Restaurant POS, where customers order from a menu and orders reach the kitchen. We also build business websites and web applications on the same stack: React, Firebase and Cloudflare.' },
  { t: 'When a hosted store is smarter', d: 'If you have a handful of products and need to start selling this month, a hosted shop builder is often cheaper and quicker than anything custom. Build custom when you need your own rules, a link to your stock system or a particular checkout.' },
  { t: 'What we need from you', d: 'Your product data, product photos, delivery rules and which payment methods you can actually accept. The shop is quick to build when these are ready.' },
]

const faqs = [
  {
    q: 'How much does an e-commerce website cost?',
    a: 'It depends on the number of products, whether they have variants, which payment and delivery options you need, and how much admin work you want automated. A small catalogue with cash on delivery is a modest job. We give a written estimate once we have seen your products and rules.',
  },
  {
    q: 'Which payment gateways do you integrate?',
    a: 'We start from the provider you already have or want. Cash on delivery and bank transfer are simple to support. For online payments we connect to the provider’s hosted checkout and wait for its confirmation before marking an order paid. Whether a particular Pakistani gateway offers a usable API is something we check first, before promising it.',
  },
  {
    q: 'Can you migrate my existing store from Shopify/WooCommerce?',
    a: 'Both can export products and customers to files, and we can import those into a new shop. Order history and reviews depend on what the old platform lets you export. We do a test import first and show you the result before anything is final. Keep redirects from old product URLs in mind too, so you do not lose search traffic.',
  },
  {
    q: 'Do you provide admin panel for managing the store?',
    a: 'Yes. You get a panel to add and edit products, set stock, process orders and see customers, with staff roles. We build it so non-technical people can run the shop day to day.',
  },
  {
    q: 'How long does it take to build an e-commerce site?',
    a: 'A small shop can take a few weeks and a larger catalogue with payments and imports takes longer. Most delays come from waiting for product photos and descriptions, so having them ready speeds things up the most.',
  },
  {
    q: 'Is SEO included for my e-commerce site?',
    a: 'Yes, the technical basics are part of the build: readable URLs, page titles, meta descriptions, a sitemap and product structured data. Rankings also need good product descriptions and links over time, which is ongoing work. See our SEO services page if you want help with that.',
  },
]

export default function EcommerceDevelopmentPage() {
  const seo = getSeoForPath('/ecommerce-development')

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="E-commerce" badgeIcon={HiOutlineShoppingCart}>
      <PageSeo {...seo} faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/software-development">Software Development</Link>
        <span> / </span>
        <span aria-current="page">E-commerce Development</span>
      </nav>

      <section className="bg-cyan-50 pb-14 pt-24 sm:pt-28 lg:pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div>
            <h1 className="text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-slate-900 sm:text-[3.6rem]">E-commerce Development</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              Online stores that are fast on a phone, easy for your staff to run and honest about what
              they can do. We build the shop, the admin panel and the link to your stock.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-cyan-800 px-6 text-sm font-bold text-white hover:bg-cyan-700">Start Your Store <HiOutlineArrowRight className="h-4 w-4" /></a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-400 px-6 text-sm font-semibold text-slate-800 hover:bg-white"><FaWhatsapp className="text-base text-emerald-600" /> WhatsApp Us</a>
            </div>
          </div>

          <div aria-label="Example order" className="rounded-md border border-slate-300 bg-white p-5 shadow-[8px_8px_0_0_rgba(8,145,178,0.25)]">
            <p className="text-sm font-bold text-slate-900">Order #1042 <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Packed</span></p>
            <ul className="mt-3 divide-y divide-slate-200 text-[14px]">
              <li className="flex justify-between py-2"><span>Cotton kurta, M, navy × 2</span><span>PKR 5,600</span></li>
              <li className="flex justify-between py-2"><span>Leather belt, 34 × 1</span><span>PKR 1,800</span></li>
              <li className="flex justify-between py-2 text-slate-500"><span>Delivery</span><span>PKR 250</span></li>
              <li className="flex justify-between py-2 font-bold"><span>Total, cash on delivery</span><span>PKR 7,650</span></li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">Made-up order, shown for illustration.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">Everything Your Online Store Needs</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">The parts of a shop that matter once real customers start ordering.</p>
          <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-slate-300 bg-slate-300 sm:grid-cols-2">
            {needs.map((n) => (
              <div key={n.t} className="bg-white p-6">
                <h3 className="text-[16px] font-bold text-slate-900">{n.t}</h3>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">{n.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">What a customer goes through</h2>
          <ol className="mt-10 flex flex-col gap-0 md:flex-row">
            {journey.map((j, i) => (
              <li key={j.t} className="relative flex-1 border-l-2 border-cyan-700 pb-8 pl-5 md:border-l-0 md:border-t-2 md:pb-0 md:pl-0 md:pr-4 md:pt-5">
                <span className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-cyan-700 md:-top-[7px] md:left-0" />
                <p className="text-xs font-bold text-cyan-800">{i + 1}</p>
                <h3 className="text-[15px] font-bold text-slate-900">{j.t}</h3>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">{j.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">Before you commission a store</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {honest.map((h) => (
              <div key={h.t}>
                <h3 className="text-[16px] font-bold text-cyan-900">{h.t}</h3>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">{h.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-[15px] leading-7 text-slate-600">
            Selling in a physical shop too? Our <Link to="/retail-pos" className="font-semibold text-cyan-800 hover:underline">Retail POS</Link> handles in-store billing and stock,
            and connecting it to an online store is a custom job we can scope. For payment confirmations and courier connections see <Link to="/api-integration" className="font-semibold text-cyan-800 hover:underline">API integration</Link>, and
            for getting found on Google see <Link to="/seo-services" className="font-semibold text-cyan-800 hover:underline">SEO services</Link>.
          </p>
        </div>
      </section>

      <section className="bg-slate-100 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-4xl">E-commerce FAQs</h2>
          <div className="mt-8 divide-y divide-slate-300 border-y border-slate-300">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-900 marker:hidden">
                  <span className="mr-2 text-cyan-700 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-cyan-700 group-open:inline">−</span>
                  <h3 className="inline">{f.q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-md bg-cyan-900 p-8 text-white sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">Ready to Launch Your Online Store?</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-cyan-100">Send us a list of what you sell and how you deliver. We will tell you whether a custom store or a hosted one makes more sense.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-white px-6 text-sm font-bold text-cyan-900 hover:bg-cyan-50">Get Free Consultation <HiOutlineArrowRight className="h-4 w-4" /></a>
            <Link to="/software-development" className="inline-flex min-h-[44px] items-center rounded-md border border-cyan-300/50 px-6 text-sm font-semibold hover:bg-white/10">All development services</Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
