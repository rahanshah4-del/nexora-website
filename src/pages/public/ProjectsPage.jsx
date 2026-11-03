import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineArrowRight } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import Link from '../../components/AppLink.jsx'

const workKinds = [
  { title: 'Our own products', count: '8 products', text: 'Restaurant POS, Retail POS, Pharmacy POS, School ERP, CRM, WhatsApp CRM, Property ERP and Transport and Fleet. Each has its own page with the real features, screens and questions.' },
  { title: 'Free tools', count: '7 tools', text: 'Invoice, quotation, thermal receipt, pay stub, delivery note and letterhead generators, plus a temporary email tool. These are free to use and need no account.' },
  { title: 'Client websites', count: '1 public project', text: 'Alqudabea Security, a security company in Bahrain, with its services, industries and careers pages. The live site is linked below.' },
]

const freeTools = [
  { to: '/tools/invoice-generator', t: 'Invoice generator' },
  { to: '/tools/quotation-generator', t: 'Quotation generator' },
  { to: '/tools/thermal-receipt-generator', t: 'Thermal receipt generator' },
  { to: '/tools/pay-stub-generator', t: 'Pay stub generator' },
  { to: '/tools/delivery-note-generator', t: 'Delivery note generator' },
  { to: '/tools/invoice-on-letterhead', t: 'Invoice on letterhead' },
  { to: '/tools/temp-mail', t: 'Temp mail' },
]

const products = [
  { to: '/restaurant-pos', title: 'Restaurant POS', text: 'Billing, KOT and kitchen display, table management, menu and food stock for restaurants and cafes, with billing that keeps working when the internet drops.' },
  { to: '/retail-pos', title: 'Retail POS', text: 'Barcode billing, inventory control, discounts, customer records and daily store reports for shops, grocery stores and supermarkets.' },
  { to: '/pharmacy-pos', title: 'Pharmacy POS', text: 'Medicine billing, batch and expiry tracking, supplier purchases and daily reports for pharmacies and medical stores.' },
  { to: '/school-erp', title: 'School management software', text: 'Admissions, attendance, fee management, payroll and parent communication for schools, academies and coaching centres.' },
  { to: '/transport-fleet', title: 'Car rental and fleet software', text: 'Vehicle records, rental bookings, customer ledgers and payment dues for fleet and rental businesses.' },
  { to: '/whatsapp-crm', title: 'WhatsApp CRM', text: 'Turn WhatsApp conversations into leads, broadcasts, follow-ups and sales workflows.' },
  { to: '/crm', title: 'CRM software', text: 'Track leads, customers, invoices, tasks and sales teams from one cloud dashboard.' },
  { to: '/property-erp', title: 'Property management software', text: 'Tenants, rent collection, leases, maintenance and owner reporting for property teams.' },
]


const rolloutSteps = [
  { title: 'Tell us how your business runs', text: 'We start with a short conversation about what you sell, how many people work with you, and which tasks cost you the most time today: billing, stock counts, fee collection, follow-ups or month-end reports. There is no template questionnaire. The goal is to pick the right Nexora product and decide what to switch on first.' },
  { title: 'Start the free 1-month trial', text: 'Create a workspace and choose your product. The trial gives you the full product to try with your own data, so you learn what it does before paying anything. During the trial the number of team members is unlimited.' },
  { title: 'Bring in your data', text: 'Add products, customers, students, vehicles or menu items. Most businesses begin with their fastest-moving records instead of everything at once, check that the numbers match reality, and then add the rest.' },
  { title: 'Set up your team and roles', text: 'Give each person their own login with the access their job needs: cashiers see billing, accountants see finance, managers see reports and approvals, and the owner sees everything.' },
  { title: 'Run one real week', text: 'Use Nexora for actual sales, fees or bookings for a week. Compare the daily report with your drawer or register. Small differences at this stage are easy to fix and teach the team quickly.' },
  { title: 'Review, then expand', text: 'When the basics feel natural, add the next layer: purchase tracking, loyalty, WhatsApp follow-ups, payroll or deeper reports. Growth happens in small, safe steps.' },
]

const fitGuide = [
  { to: '/restaurant-pos', title: 'Restaurants, cafes and food counters', text: 'Choose Restaurant POS if you take dine-in, takeaway or delivery orders and need the kitchen to see tickets instantly. Table management, KOT, menu control and food stock sit in one place, and billing keeps working if the internet drops. A cashier end-of-day report helps you close the shift quickly.' },
  { to: '/retail-pos', title: 'Shops, grocery stores and supermarkets', text: 'Choose Retail POS if you sell many items at the counter. Barcode billing, discounts, customer records and live stock mean each sale updates inventory by itself. Daily closing reports show cash against sales, and low-stock alerts tell you what to reorder.' },
  { to: '/pharmacy-pos', title: 'Pharmacies and medical stores', text: 'Choose Pharmacy POS if you handle medicines. Batch and expiry tracking, supplier purchases and daily reports help you sell near-expiry stock first and keep supplier dues clear.' },
  { to: '/school-erp', title: 'Schools, academies and coaching centres', text: 'Choose School ERP if fee collection, attendance and parent communication take up your office. Fee structures, bulk fee generation, concessions, payroll and reports give the office one system instead of several registers.' },
  { to: '/transport-fleet', title: 'Car rental and fleet operators', text: 'Choose Transport and Fleet if you manage vehicles and bookings. Vehicle records, customer ledgers, payment dues and trip reports show which vehicles earn money and which customers are late.' },
  { to: '/crm', title: 'Sales teams and service companies', text: 'Choose CRM if leads and follow-ups slip through the cracks. Track leads, deals, tasks, invoices and customer history in one dashboard so no enquiry is forgotten.' },
  { to: '/whatsapp-crm', title: 'Businesses that sell over WhatsApp', text: 'Choose WhatsApp CRM if most enquiries arrive in chat. Turn conversations into leads, use templates and follow-ups, and see which messages become sales.' },
  { to: '/property-erp', title: 'Property and rental management', text: 'Choose Property ERP if you manage tenants, rent collection, leases and maintenance. Owners get clearer reports, and your team gets reminders instead of memory.' },
]

const included = [
  { title: 'One cloud workspace', text: 'Your data lives in your own workspace and is available from the office, the counter or your phone, with cloud sync keeping devices aligned.' },
  { title: 'Roles and permissions', text: 'Each team member gets a separate login with module-level and action-level access, plus activity logs showing who did what.' },
  { title: 'Reports and exports', text: 'Sales, finance, stock, customer and module-specific reports with PDF, Excel, CSV and print options.' },
  { title: 'Approvals', text: 'Expenses and payments can wait for sign-off from the right person, which keeps spending under control.' },
  { title: 'Support', text: 'Help Center guides for every module, plus support by email and WhatsApp from the Nexora team.' },
  { title: 'Room to grow', text: 'Start with one product and add modules later without moving your data to a new system.' },
]

const faqs = [
  { q: 'Do I need technical skills to start?', a: 'No. Nexora is designed for business owners and office staff. If you can use WhatsApp and a spreadsheet, you can use Nexora. The Help Center explains each module step by step.' },
  { q: 'Can I try it before I pay?', a: 'Yes. Every product starts with a free 1-month trial, so you can test it with your own data first.' },
  { q: 'Will it work if my internet is unreliable?', a: 'Billing in the restaurant product keeps working when the connection drops and syncs afterwards. Across the workspace, a sync indicator shows when your data is safely stored in the cloud.' },
  { q: 'Can I move my existing records in?', a: 'Yes. You can add records yourself, starting with the most important ones. If you want help planning the move, contact the team.' },
  { q: 'Can several people use it at the same time?', a: 'Yes. Team members log in separately from their own devices, and roles control what each can see and change.' },
  { q: 'Is my data private?', a: 'Each workspace is separate and access is controlled by roles. Read the privacy policy for details on how data is handled.' },
  { q: 'What if my business needs something custom?', a: 'Nexora also offers custom software, websites and apps. Tell us what you need on the contact page and we will discuss it.' },
]

export default function ProjectsPage() {
  const seo = getSeoForPath('/projects')

  return (
    <PublicPageShell>
      <PageSeo {...seo} faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))} />

      <section className="bg-purple-50 pb-14 pt-24 sm:pt-28 lg:pb-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-purple-800">Our work</p>
          <h1 className="mt-3 max-w-3xl text-[2.3rem] font-extrabold leading-[1.07] tracking-[-0.03em] text-zinc-900 sm:text-[3.3rem]">Software projects and products built by Nexora.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-700 sm:text-lg">
            A plain list of what we have built: ready-made software for restaurants, shops, pharmacies,
            schools, rental fleets, property managers and sales teams, plus free tools and a client
            website.
          </p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-zinc-300 bg-zinc-300 md:grid-cols-3">
            {workKinds.map((w) => (
              <div key={w.title} className="bg-white p-6">
                <p className="text-xs font-bold text-purple-800">{w.count}</p>
                <h2 className="mt-1 text-lg font-bold text-zinc-900">{w.title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-zinc-600">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Software you can put to work today</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-zinc-600">
            Every Nexora product starts with a free 1-month trial. Pick the one that matches how your
            business runs, and see exactly what it does before you commit.
          </p>
          <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
            {products.map(({ to, title, text }) => (
              <Link key={to} to={to} className="group grid gap-1 py-5 md:grid-cols-[16rem_1fr_auto] md:items-baseline md:gap-8">
                <h3 className="text-[17px] font-bold text-zinc-900 group-hover:text-purple-800">{title}</h3>
                <p className="text-[15px] leading-7 text-zinc-600">{text}</p>
                <HiOutlineArrowRight className="hidden h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-1 md:block" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Which Nexora product fits your business</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-zinc-600">
            Different businesses lose time in different places. Match your daily work to the product built for it.
          </p>
          <dl className="mt-8 grid gap-x-12 gap-y-6 md:grid-cols-2">
            {fitGuide.map(({ to, title, text }) => (
              <div key={to} className="border-l-4 border-purple-700 pl-5">
                <dt className="text-[16px] font-bold text-zinc-900"><h3><Link to={to} className="hover:text-purple-800">{title}</Link></h3></dt>
                <dd className="mt-1.5 text-[15px] leading-7 text-zinc-600">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">How a Nexora rollout works, step by step</h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-zinc-600">
            Moving a business onto new software feels risky, so we keep it gradual. This is the path most teams follow, from the first conversation to a system the whole team uses without thinking about it.
          </p>
          <ol className="mt-8 border-l-2 border-purple-300">
            {rolloutSteps.map(({ title, text }, i) => (
              <li key={title} className="relative pb-7 pl-8 last:pb-0">
                <span className="absolute -left-[13px] top-0.5 grid h-6 w-6 place-items-center rounded-full bg-purple-800 text-[11px] font-bold text-white">{i + 1}</span>
                <h3 className="text-[17px] font-bold text-zinc-900">{title}</h3>
                <p className="mt-1 max-w-3xl text-[15px] leading-7 text-zinc-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-purple-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">What every workspace includes</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-purple-200 bg-purple-200 sm:grid-cols-2 lg:grid-cols-3">
            {included.map(({ title, text }) => (
              <div key={title} className="bg-white p-5">
                <h3 className="text-[15px] font-bold text-zinc-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-zinc-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-3xl">Free tools and a client site</h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Beyond the paid products we publish small free tools for everyday paperwork. They run in
              your browser and need no account.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
              {freeTools.map((t) => (
                <li key={t.to}><Link to={t.to} className="font-semibold text-purple-800 hover:underline">{t.t}</Link></li>
              ))}
            </ul>
            <p className="mt-6 text-[15px] leading-7 text-zinc-600">
              Client work: <a href="https://alqudabeasecurity.online" target="_blank" rel="noreferrer" className="font-semibold text-purple-800 hover:underline">Alqudabea Security</a>, a public website for a security company in Bahrain.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-3xl">Beyond the products: custom work</h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Some businesses need more than a ready-made product. The Nexora team also builds custom business
              software, websites, mobile apps and integrations, and can connect your workflow to the tools you already use.
              If you have a process that does not fit a template, tell us about it.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/software-development" className="rounded-md bg-purple-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700">Custom software</Link>
              <Link to="/contact" className="rounded-md border border-zinc-400 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">Talk to the team</Link>
              <Link to="/help-center" className="rounded-md border border-zinc-400 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">Help Center</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-zinc-900 sm:text-4xl">Questions owners ask before starting</h2>
          <div className="mt-8 divide-y divide-zinc-300 border-y border-zinc-300">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-zinc-900 marker:hidden">
                  <span className="mr-2 text-purple-700 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-purple-700 group-open:inline">−</span>
                  <h3 className="inline">{q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-zinc-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
