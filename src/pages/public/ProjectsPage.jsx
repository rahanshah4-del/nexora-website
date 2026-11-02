import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import { HiOutlineSparkles } from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'
import Link from '../../components/AppLink.jsx'

const stories = [
  { title: 'Restaurant rollout', text: 'A restaurant chain improved order accuracy, inventory control, and online takeaway performance.' },
  { title: 'Retail expansion', text: 'A small retail group replaced spreadsheets with automated sales, stock, and customer tracking.' },
  { title: 'School automation', text: 'A private school digitized fees, attendance, and academic workflows in one system.' },
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
      <PageSeo {...seo} />
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20 lg:py-24 text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-300 backdrop-blur-xl">
              <HiOutlineSparkles className="h-3.5 w-3.5 text-cyan-400" />
              Our Work
            </span>
            <h1 className="mt-6 text-4xl font-medium tracking-[-0.02em] text-white sm:text-5xl">Implementation stories from teams using Nexora products.</h1>
            <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
              Discover how local restaurants, retail businesses, schools, transport operators, and sales teams drive efficiency with integrated POS, ERP, CRM and customer communication tools.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {stories.map(({ title, text }) => (
              <article key={title} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.3)] backdrop-blur-xl">
                <h2 className="text-lg font-medium tracking-[-0.01em] text-white">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">Software you can put to work today</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-7 text-slate-400">
              Every Nexora product starts with a free 1-month trial. Pick the one that matches how your business runs, and see exactly what it does before you commit.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {products.map(({ to, title, text }) => (
                <Link key={to} to={to} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
                  <h3 className="text-base font-medium text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{text}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">How a Nexora rollout works, step by step</h2>
            <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-7 text-slate-400">
              Moving a business onto new software feels risky, so we keep it gradual. The path below is the one most teams follow, from the first conversation to a system the whole team uses without thinking about it.
            </p>
            <ol className="mt-8 grid gap-4 md:grid-cols-2">
              {rolloutSteps.map(({ title, text }, i) => (
                <li key={title} className="flex gap-4 rounded-[1.2rem] border border-white/10 bg-white/5 p-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold text-slate-950">{i + 1}</span>
                  <div>
                    <h3 className="text-base font-medium text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-400">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">Which Nexora product fits your business</h2>
            <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-7 text-slate-400">
              Different businesses lose time in different places. Use this guide to match your daily work to the product built for it. Each card links to the full product page.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {fitGuide.map(({ to, title, text }) => (
                <Link key={to} to={to} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
                  <h3 className="text-base font-medium text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{text}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">What every workspace includes</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {included.map(({ title, text }) => (
                <article key={title} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-6">
                  <h3 className="text-base font-medium text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-20 grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">What changes after the first month</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Teams that move off paper registers and scattered spreadsheets usually notice the same things. Closing the day takes minutes because the report is already there. Stock stops being a guess because every sale and every delivery adjusts the count. Fee and customer dues become a clear list instead of a memory exercise. And the owner can check how the business is doing from a phone without calling the shop.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                None of that happens by magic. It comes from entering each transaction once, in the right place, and letting the software do the adding up. That is why the rollout above starts small and checks each week against the real till or register.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">Beyond the products: custom work</h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Some businesses need more than a ready-made product. The Nexora team also builds custom business software, websites, mobile apps and integrations, and can connect your workflow to the tools you already use. If you have a process that does not fit a standard module, describe it and we will tell you honestly whether a product, a configuration or a custom build is the right answer.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/software-development" className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400">Custom software</Link>
                <Link to="/contact" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">Talk to the team</Link>
                <Link to="/help-center" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">Help Center</Link>
              </div>
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-center text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">Questions owners ask before starting</h2>
            <div className="mx-auto mt-8 max-w-3xl divide-y divide-white/10 rounded-[1.2rem] border border-white/10 bg-white/5">
              {faqs.map(({ q, a }) => (
                <div key={q} className="p-6">
                  <h3 className="text-base font-medium text-white">{q}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
