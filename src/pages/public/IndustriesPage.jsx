import Link from '../../components/AppLink.jsx'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDevicePhoneMobile,
  HiOutlineShoppingCart,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineTruck,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'

const industries = [
  {
    title: 'Restaurant',
    subtitle: 'POS & Management',
    description:
      'Streamline dine-in, takeaway and delivery with table management, KOT, inventory and real‑time reporting — built for busy kitchens.',
    icon: HiOutlineShoppingCart,
    tone: 'amber',
    route: '/restaurant-pos',
    features: ['Table & KOT management', 'Menu & recipe costing', 'Delivery integration', 'Real-time analytics'],
  },
  {
    title: 'Retail',
    subtitle: 'Point of Sale',
    description:
      'Barcode-ready billing, multi‑store inventory, customer loyalty and cashier controls — everything a modern shop needs to run smoothly.',
    icon: HiOutlineShoppingCart,
    tone: 'blue',
    route: '/retail-pos',
    features: ['Barcode billing', 'Multi-store inventory', 'Customer loyalty', 'Cashier role control'],
  },
  {
    title: 'Education',
    subtitle: 'School ERP',
    description:
      'Manage admissions, fees, attendance, exams and parent communication from one dashboard — purpose‑built for Pakistani schools.',
    icon: HiOutlineAcademicCap,
    tone: 'emerald',
    route: '/school-erp',
    features: ['Student & staff management', 'Fee & payroll tracking', 'Exam & grade reports', 'Parent portal'],
  },
  {
    title: 'Healthcare',
    subtitle: 'Pharmacy POS',
    description:
      'Pharmacy billing with batch‑aware inventory, expiry alerts, alternative medicine suggestions and compliance reporting.',
    icon: HiOutlineShieldCheck,
    tone: 'rose',
    route: '/pharmacy-pos',
    features: ['Batch & expiry tracking', 'Alternative suggestions', 'Pharmacy compliance', 'Sales performance'],
  },
  {
    title: 'Transport',
    subtitle: 'Fleet & Rentals',
    description:
      'Ticketing, route billing, vehicle tracking and customer ledgers — a complete operations suite for transport businesses.',
    icon: HiOutlineTruck,
    tone: 'cyan',
    route: '/transport-fleet',
    features: ['Fleet management', 'Route & trip billing', 'Customer ledger', 'Maintenance tracking'],
  },
  {
    title: 'Real Estate',
    subtitle: 'Property ERP',
    description:
      'Manage properties, tenants, rent collection and maintenance in one place — built for developers and rental agencies.',
    icon: HiOutlineBuildingOffice2,
    tone: 'violet',
    route: '/property-erp',
    features: ['Tenant & lease management', 'Rent collection', 'Maintenance requests', 'Owner reporting'],
  },
  {
    title: 'CRM & Sales',
    subtitle: 'Customer Relationship',
    description:
      'Track leads, automate follow‑ups, manage pipelines and close more deals — the central nervous system for your sales team.',
    icon: HiOutlineChatBubbleLeftRight,
    tone: 'indigo',
    route: '/crm',
    features: ['Lead & pipeline tracking', 'Automated follow-ups', 'Team collaboration', 'Sales analytics'],
  },
  {
    title: 'WhatsApp Commerce',
    subtitle: 'Chat & Convert',
    description:
      'Send catalogues, take orders and support customers right inside WhatsApp — turn conversations into conversions.',
    icon: HiOutlineDevicePhoneMobile,
    tone: 'green',
    route: '/whatsapp-crm',
    features: ['WhatsApp catalogues', 'Order via chat', 'Bulk messaging', 'Customer support'],
  },
]


const deepDives = [
  { to: '/restaurant-pos', title: 'Restaurants, cafes and food counters', text: 'A restaurant runs on timing. Orders arrive from tables, the counter and delivery at once, and the kitchen needs them in the right order. Restaurant POS gives each order a kitchen ticket, tracks tables, manages the menu with recipe costing and keeps food stock in step with sales. At the end of the shift, a cashier-wise report shows what each person took, so closing the day is a short task and not an argument. Billing keeps working when the internet drops, which matters in a busy lunch hour.' },
  { to: '/retail-pos', title: 'Shops, grocery stores and supermarkets', text: 'In a shop, speed at the counter and accuracy on the shelf decide profit. Retail POS supports barcode billing, discounts and promo codes, customer records and cashier roles, and every sale lowers stock automatically. Owners see daily closing reports, low-stock lists and product profitability, so reordering and pricing are based on numbers. Customers can be walk-ins or saved records, and credit sales are tied to saved customers so dues are never lost.' },
  { to: '/school-erp', title: 'Schools, academies and coaching centres', text: 'School offices spend huge amounts of time on fees, attendance and parent questions. School ERP brings admissions, attendance, fee structures, bulk fee generation, concessions, payroll and reports into one place. Staff see who has paid and who has not, parents get clearer communication, and the principal sees collection and attendance trends without waiting for a monthly spreadsheet.' },
  { to: '/pharmacy-pos', title: 'Pharmacies and medical stores', text: 'Medicines have batches and expiry dates, and mistakes are costly. Pharmacy POS tracks batches and expiry, suggests alternatives, records supplier purchases and produces daily and compliance-friendly reports. Sellers can find near-expiry stock before it is wasted, and owners can see supplier dues and sales performance clearly.' },
  { to: '/transport-fleet', title: 'Transport, car rental and fleet operators', text: 'Vehicles only earn money when they are on the road and the payment is collected. Transport and Fleet records vehicles, bookings and trips, keeps a ledger per customer, tracks maintenance and shows vehicle profit and fuel. You can see which vehicles pay for themselves and which customers are late.' },
  { to: '/property-erp', title: 'Real estate, rentals and property management', text: 'Property teams juggle tenants, leases, rent dates and repair requests. Property ERP keeps those in one place, with rent collection tracking, maintenance requests and owner reporting, so owners get clear statements and managers stop relying on memory.' },
  { to: '/crm', title: 'Sales teams and service companies', text: 'Deals are lost when follow-ups are forgotten. CRM tracks leads and pipelines, tasks and follow-ups, invoices and customer history, with analytics that show where deals stall and which team members close them.' },
  { to: '/whatsapp-crm', title: 'Businesses that sell through WhatsApp', text: 'Many customers prefer to ask and order in chat. WhatsApp CRM turns conversations into leads, with templates, follow-ups, bulk messaging and a shared inbox for your team, so every enquiry has an owner and a next step.' },
]

const commonThreads = [
  { title: 'One cloud workspace', text: 'Your records live online, so owners, managers and staff see the same numbers from any device.' },
  { title: 'Roles and permissions', text: 'Cashiers, accountants, teachers and managers each see only what they need, with logs of who changed what.' },
  { title: 'Reports you can export', text: 'PDF, Excel, CSV and print options for owners, accountants and clients.' },
  { title: 'Free 1-month trial', text: 'Try the product with your own data. Setup, data migration and staff training are free on every plan.' },
]

const chooseSteps = [
  { title: 'Name your biggest daily cost of time', text: 'Is it serving customers, counting stock, collecting fees, chasing follow-ups or preparing reports? Start with the product that fixes that.' },
  { title: 'Pick one product, not all of them', text: 'A focused rollout succeeds more often than a giant one. You can add modules later without moving your data.' },
  { title: 'Test with real work for a week', text: 'Use the trial for real sales, fees or bookings and compare the closing report with your own count.' },
  { title: 'Add your team gradually', text: 'Invite staff with limited roles first. Widen access as trust and habits grow.' },
]

const industryFaqs = [
  { q: 'What if my business is not on the list?', a: 'Tell us what you do. Many businesses fit one of the modules with small changes, and for anything else we can discuss a custom project.' },
  { q: 'Can I use more than one Nexora product?', a: 'Yes. Many businesses combine, for example, a retail POS with CRM or WhatsApp CRM. Modules share the same workspace and login system.' },
  { q: 'Is Nexora only for businesses in Pakistan?', a: 'It was built in Pakistan and supports PKR and local workflows, and we support customers worldwide online.' },
  { q: 'How long does setup take?', a: 'Many teams run their first real day within a few days. Setup, data migration and staff training are free if you want help.' },
  { q: 'Can I try before I pay?', a: 'Yes. Every product starts with a free 1-month trial.' },
]


const beforeAfter = [
  { title: 'Restaurant', before: 'Orders shouted to the kitchen, bills added by hand, stock guessed at month end.', after: 'Orders appear on the kitchen screen, bills are printed in seconds and food stock follows sales.' },
  { title: 'Retail shop', before: 'Prices checked from memory, a notebook for credit customers, stock counted once a year.', after: 'Barcode billing, a saved-customer ledger for credit sales and low-stock alerts every morning.' },
  { title: 'School', before: 'Fee registers, paper receipts and a long list of names to chase each month.', after: 'Fee structures, bulk fee bills and a clear list of who owes what.' },
  { title: 'Pharmacy', before: 'Expiry dates checked by walking along shelves, supplier dues kept in a diary.', after: 'Batch and expiry tracking, supplier purchases and dues in one report.' },
  { title: 'Fleet', before: 'Bookings on WhatsApp, payments in a notebook, no idea which vehicle earns most.', after: 'Bookings, customer ledgers and vehicle profit in one dashboard.' },
  { title: 'Property', before: 'Rent dates remembered by the manager, repair calls forgotten.', after: 'Rent collection tracking, maintenance requests and owner statements.' },
  { title: 'Sales team', before: 'Leads in personal phones, follow-ups missed when someone is away.', after: 'A shared pipeline with tasks, reminders and clear owners.' },
  { title: 'WhatsApp seller', before: 'Orders buried in chat scroll, no record of who asked for what.', after: 'Conversations turned into leads and orders with templates and follow-ups.' },
]

const localDetails = [
  { title: 'Built in Pakistan', text: 'Nexora is built in Multan, Punjab, and understands local ways of working, including prices in rupees, cash-heavy counters and WhatsApp as a main sales channel.' },
  { title: 'Practical for small teams', text: 'You do not need an IT department. Setup, data migration and staff training are free, and support answers on WhatsApp.' },
  { title: 'Works for global customers too', text: 'We support customers worldwide online. If you operate outside Pakistan, tell us your needs on the contact page.' },
]

const toneMap = {
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200/60',
    gradient: 'from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100/80',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-200/60',
    gradient: 'from-blue-50 to-sky-50',
    iconBg: 'bg-blue-100/80',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200/60',
    gradient: 'from-emerald-50 to-teal-50',
    iconBg: 'bg-emerald-100/80',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-200/60',
    gradient: 'from-rose-50 to-pink-50',
    iconBg: 'bg-rose-100/80',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    ring: 'ring-cyan-200/60',
    gradient: 'from-cyan-50 to-sky-50',
    iconBg: 'bg-cyan-100/80',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    ring: 'ring-violet-200/60',
    gradient: 'from-violet-50 to-purple-50',
    iconBg: 'bg-violet-100/80',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-200/60',
    gradient: 'from-indigo-50 to-blue-50',
    iconBg: 'bg-indigo-100/80',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-200/60',
    gradient: 'from-green-50 to-emerald-50',
    iconBg: 'bg-green-100/80',
  },
}

export default function IndustriesPage() {
  return (
    <PublicPageShell>
      <PageSeo
        title="Industry Software Solutions Pakistan | Nexora"
        description="See how Nexora serves restaurants, retail, schools, transport and service teams with tailored software workflows and cloud management."
        canonical={absoluteUrl('/industries')}
        path="/industries"
        ogTitle="Industry Solutions — Nexora"
        ogDescription="Tailored software for restaurants, retail, education, healthcare, transport and more."
        twitterCard="summary_large_image"
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-16 pt-20 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
              Tailored by industry
            </span>
            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
              Software built for{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                your industry.
              </span>
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">
              Every industry runs differently. Nexora gives you tools shaped to your workflow — not a
              one‑size‑fits‑all template. Choose your vertical and see what's possible.
            </p>
          </div>
        </div>
      </section>

      {/* ── Industries Grid ── */}
      <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {industries.map((industry) => {
              const t = toneMap[industry.tone]
              const Icon = industry.icon
              return (
                <Link
                  key={industry.route}
                  to={industry.route}
                  className={`group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/70 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.18)] active:scale-[0.98]`}
                >
                  {/* Subtle gradient glow on hover */}
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${t.gradient} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60`}
                  />

                  {/* Icon */}
                  <span
                    className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl ${t.iconBg} ${t.text} ring-1 ${t.ring}`}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                  </span>

                  {/* Title */}
                  <h2 className="mt-4 text-[17px] font-medium tracking-[-0.01em] text-slate-900">
                    {industry.title}
                  </h2>
                  <p className="text-[13px] font-medium tracking-[-0.01em] text-slate-400">
                    {industry.subtitle}
                  </p>

                  {/* Description */}
                  <p className="mt-3 text-[13px] leading-[1.65] text-slate-500">
                    {industry.description}
                  </p>

                  {/* Feature pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {industry.features.map((feat) => (
                      <span
                        key={feat}
                        className="inline-flex rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1 text-[0.65rem] font-medium text-slate-500"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <span
                    className={`mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-medium tracking-[-0.01em] ${t.text} transition-all duration-200 group-hover:gap-2`}
                  >
                    Explore {industry.title}
                    <HiOutlineArrowRight className="h-[15px] w-[15px] transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>


          {/* ── Long-form guidance ── */}
          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">How each industry uses Nexora</h2>
            <p className="mx-auto mt-3 max-w-3xl text-center text-[15px] leading-7 text-slate-500">
              The cards above are a quick map. Below is what each product does day to day, in plain language, so you can see yourself in it before you start a trial.
            </p>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {deepDives.map(({ to, title, text }) => (
                <Link key={to} to={to} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-7 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.14)]">
                  <h3 className="text-[18px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                  <p className="mt-3 text-[14px] leading-7 text-slate-500">{text}</p>
                </Link>
              ))}
            </div>
          </div>


          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">From daily friction to a working system</h2>
            <p className="mx-auto mt-3 max-w-3xl text-center text-[15px] leading-7 text-slate-500">
              Every industry has its own version of paperwork pain. Here is what typically changes when the daily work moves into one system.
            </p>
            <div className="mt-10 overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white">
              {beforeAfter.map(({ title, before, after }) => (
                <div key={title} className="grid gap-3 border-b border-slate-200/60 p-6 last:border-b-0 md:grid-cols-[10rem_1fr_1fr]">
                  <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                  <p className="text-[14px] leading-7 text-slate-500"><strong className="font-medium text-slate-700">Before: </strong>{before}</p>
                  <p className="text-[14px] leading-7 text-slate-500"><strong className="font-medium text-slate-700">With Nexora: </strong>{after}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">Made for the way local businesses work</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {localDetails.map(({ title, text }) => (
                <article key={title} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-6">
                  <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                  <p className="mt-2 text-[14px] leading-7 text-slate-500">{text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">What every Nexora product shares</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {commonThreads.map(({ title, text }) => (
                <article key={title} className="rounded-[1.35rem] border border-slate-200/60 bg-slate-50/70 p-6">
                  <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                  <p className="mt-2 text-[14px] leading-7 text-slate-500">{text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">How to choose the right product</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-2">
              {chooseSteps.map(({ title, text }, i) => (
                <li key={title} className="flex gap-4 rounded-[1.35rem] border border-slate-200/60 bg-white p-6">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-medium text-white">{i + 1}</span>
                  <div>
                    <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
                    <p className="mt-2 text-[14px] leading-7 text-slate-500">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">Questions about industries and fit</h2>
            <div className="mt-8 divide-y divide-slate-200/70 rounded-[1.35rem] border border-slate-200/60 bg-white">
              {industryFaqs.map(({ q, a }) => (
                <div key={q} className="p-6">
                  <h3 className="text-[16px] font-medium tracking-[-0.01em] text-slate-900">{q}</h3>
                  <p className="mt-2 text-[14px] leading-7 text-slate-500">{a}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-[15px] leading-7 text-slate-500">
              Want to go deeper? Read the <Link className="text-slate-900 underline" to="/help-center">Help Center</Link>, see <Link className="text-slate-900 underline" to="/projects">how a rollout works</Link> or <Link className="text-slate-900 underline" to="/contact">talk to the team</Link>.
            </p>
          </div>

          {/* ── Bottom CTA banner ── */}
          <div className="mt-14 overflow-hidden rounded-[1.8rem] border border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-[1px] shadow-[0_8px_40px_-16px_rgba(15,23,42,0.1)]">
            <div className="rounded-[1.75rem] bg-white/60 px-6 py-10 text-center backdrop-blur-xl sm:px-10 sm:py-14">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50/80 px-4 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200/50">
                <HiOutlineSparkles className="h-3.5 w-3.5" />
                Not sure which fits?
              </span>
              <h2 className="mt-5 text-2xl font-medium tracking-[-0.02em] text-slate-900 sm:text-3xl">
                We'll help you find the right solution.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[15px] leading-7 text-slate-500">
                Tell us about your business and our team will recommend the best setup — no sales
                pitch, just practical advice.
              </p>
              <Link
                to="/contact"
                className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]"
              >
                Talk to our team
                <HiOutlineArrowRight className="h-[17px] w-[17px]" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
