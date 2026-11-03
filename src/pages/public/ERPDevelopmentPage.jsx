import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineServerStack } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

// Modules that exist in the Nexora platform today, and what a custom ERP adds around them.
const modules = [
  { t: 'Finance & Accounting', have: 'Invoices, expenses and account statements for customers.', add: 'A fuller ledger, bank reconciliation or tax reports shaped to your accountant’s needs.' },
  { t: 'HR & Payroll', have: 'Staff records, attendance, a HR dashboard and payroll (built for schools).', add: 'Leave rules, shift patterns and salary structures specific to your company.' },
  { t: 'Inventory & Warehouse', have: 'Products and stock tracking, with batch handling in the pharmacy module.', add: 'More warehouses, transfers between them and stock counts.' },
  { t: 'Approvals', have: 'An approvals workflow for requests that need a manager’s sign-off.', add: 'Your own approval chains: who signs, up to what amount.' },
  { t: 'Reports & Dashboards', have: 'Report pages and dashboards for each module.', add: 'The exact weekly report your owner reads, and exports in your format.' },
  { t: 'Maintenance', have: 'A maintenance module for tracking repairs and upkeep.', add: 'Schedules, vendors and cost tracking per asset.' },
  { t: 'Multi-branch', have: 'Branch-aware data so each location’s records stay separate.', add: 'Consolidated reporting across branches and transfers between them.' },
  { t: 'Access control', have: 'Staff roles and an activity log.', add: 'Finer permissions per department or per branch.' },
]

const stages = [
  { t: 'Month one', d: 'The module that hurts most, usually stock or billing. Live with real data, used by real staff.' },
  { t: 'Months two and three', d: 'The next module, once the first is trusted. Imports from old sheets, reports the owner needs.' },
  { t: 'After that', d: 'Branches, approvals and integrations, added when the earlier parts are stable.' },
]

const faqs = [
  {
    q: 'What is ERP and why does my business need it?',
    a: 'ERP (Enterprise Resource Planning) puts finance, stock, people and purchasing in one system, so each department is not keeping its own version of the truth. You may need it when the same numbers are typed into several spreadsheets, or when the owner cannot get a straight answer about stock or cash without calling three people. If you are not at that stage yet, you probably do not need it.',
  },
  {
    q: 'How much does a custom ERP cost?',
    a: 'Cost follows the number of modules, branches, users and integrations. A focused two-module system is a much smaller job than a company-wide rollout. We suggest starting with the module that hurts most and adding others later, so cost is spread out and each stage is proven before the next one begins.',
  },
  {
    q: 'How long does ERP implementation take?',
    a: 'A first module can be in use in weeks to a few months. A broad ERP across departments takes longer, and most of the time goes into agreeing processes and moving old data, not writing code. We plan it in phases so something useful goes live early.',
  },
  {
    q: 'Can you integrate with my existing accounting software?',
    a: 'Often yes, if your accounting tool has an API or can export files. We first check what it offers, then tell you whether live sync or a regular import and export is the safer option. Some older packages offer neither, and we will say so.',
  },
  {
    q: 'Is my data secure in a cloud ERP?',
    a: 'Data is kept per company and per branch, access is by role, and an activity log records changes. The system runs on managed cloud platforms, Firebase and Cloudflare. If you have special requirements such as keeping data in a particular place, tell us at the start and we will check whether they can be met.',
  },
  {
    q: 'What is the price of ERP software in Pakistan?',
    a: 'There are two routes. Ready-made software such as Nexora is a monthly subscription, and our pricing page lists the current plans, with a free one-month trial that needs no credit card. A custom ERP is quoted per project, based on modules, branches, users and integrations, so there is no honest single price. If an ERP quote arrives without asking about your processes, treat it with caution.',
  },
  {
    q: 'Can multiple branches use the same ERP?',
    a: 'Yes. Nexora is built with branches in mind, so each location keeps its own records while the owner can look across all of them. How far consolidated reporting goes is agreed in the scope.',
  },
]

export default function ERPDevelopmentPage() {
  const seo = getSeoForPath('/erp-development')

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="ERP Solutions" badgeIcon={HiOutlineServerStack}>
      <PageSeo {...seo} faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/software-development">Software Development</Link>
        <span> / </span>
        <span aria-current="page">ERP Solutions</span>
      </nav>

      <section className="bg-orange-50 pb-14 pt-24 sm:pt-28 lg:pb-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h1 className="max-w-3xl text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-stone-900 sm:text-[3.6rem]">ERP Solutions</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-700 sm:text-lg">
            One system for stock, billing, people and approvals, instead of a spreadsheet for each
            department. We build it in stages, so the first useful part goes live early and the rest
            follows once it is trusted.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-orange-700 px-6 text-sm font-bold text-white hover:bg-orange-600">
              Discuss Your ERP <HiOutlineArrowRight className="h-4 w-4" />
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-stone-400 px-6 text-sm font-semibold text-stone-800 hover:bg-white">
              <FaWhatsapp className="text-base text-emerald-600" /> WhatsApp Us
            </a>
          </div>

          {/* ledger strip */}
          <div aria-label="Example stock ledger" className="mt-12 overflow-x-auto rounded-md border border-stone-300 bg-white">
            <table className="w-full min-w-[34rem] text-left text-[13px]">
              <caption className="border-b border-stone-200 px-4 py-2 text-left text-xs text-stone-500">Example stock ledger. Made-up items, shown for illustration.</caption>
              <thead className="bg-stone-100 text-stone-600">
                <tr><th className="px-4 py-2 font-semibold">Date</th><th className="px-4 py-2 font-semibold">Item</th><th className="px-4 py-2 font-semibold">Movement</th><th className="px-4 py-2 text-right font-semibold">Qty</th><th className="px-4 py-2 font-semibold">Branch</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                <tr><td className="px-4 py-2">03 Nov</td><td className="px-4 py-2">Steel shelf, 4 tier</td><td className="px-4 py-2">Received</td><td className="px-4 py-2 text-right">+24</td><td className="px-4 py-2">Main store</td></tr>
                <tr><td className="px-4 py-2">03 Nov</td><td className="px-4 py-2">Steel shelf, 4 tier</td><td className="px-4 py-2">Transferred</td><td className="px-4 py-2 text-right">−6</td><td className="px-4 py-2">Main → Branch 2</td></tr>
                <tr><td className="px-4 py-2">04 Nov</td><td className="px-4 py-2">Steel shelf, 4 tier</td><td className="px-4 py-2">Sold</td><td className="px-4 py-2 text-right">−2</td><td className="px-4 py-2">Branch 2</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-stone-900 sm:text-4xl">ERP Modules</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-stone-600">
            For each area, here is what the Nexora platform already does and what a custom ERP would
            add. The left column is real and working today.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left text-[14px] leading-6">
              <thead>
                <tr className="border-b-2 border-stone-900 text-stone-900">
                  <th className="py-3 pr-4 font-bold">Module</th>
                  <th className="py-3 pr-4 font-bold">Already in Nexora</th>
                  <th className="py-3 font-bold">What custom ERP adds</th>
                </tr>
              </thead>
              <tbody className="align-top text-stone-700">
                {modules.map((m) => (
                  <tr key={m.t} className="border-b border-stone-200">
                    <th scope="row" className="py-4 pr-4 font-bold text-orange-800"><h3 className="text-[15px]">{m.t}</h3></th>
                    <td className="py-4 pr-4">{m.have}</td>
                    <td className="py-4">{m.add}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-stone-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-stone-900 sm:text-4xl">A phased rollout, not a big bang</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-stone-600">
            Switching a whole company at once is how ERP projects fail. This is the shape we suggest.
            The exact order is yours to decide.
          </p>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {stages.map((s) => (
              <li key={s.t} className="rounded-md border border-stone-300 bg-white p-5">
                <h3 className="text-[16px] font-bold text-orange-800">{s.t}</h3>
                <p className="mt-2 text-[14px] leading-6 text-stone-600">{s.d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-3xl text-[15px] leading-7 text-stone-600">
            If sales is the weak spot, look at <Link to="/crm-development" className="font-semibold text-orange-800 hover:underline">custom CRM development</Link>. For connecting
            to tools you already pay for, see <Link to="/api-integration" className="font-semibold text-orange-800 hover:underline">API integration</Link>.
            Ready-made systems for <Link to="/retail-pos" className="font-semibold text-orange-800 hover:underline">retail</Link> and <Link to="/school-erp" className="font-semibold text-orange-800 hover:underline">schools</Link> are cheaper if they fit.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-stone-900 sm:text-4xl">ERP FAQs</h2>
          <div className="mt-8 divide-y divide-stone-300 border-y border-stone-300">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-stone-900 marker:hidden">
                  <span className="mr-2 text-orange-700 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-orange-700 group-open:inline">−</span>
                  <h3 className="inline">{f.q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-stone-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-md bg-stone-900 p-8 text-white sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">Ready to Unify Your Business Operations?</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-stone-300">Free first conversation. Tell us where the numbers are stuck today and we will suggest which module to start with.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-orange-500 px-6 text-sm font-bold text-white hover:bg-orange-400">Get Free Consultation <HiOutlineArrowRight className="h-4 w-4" /></a>
            <Link to="/software-development" className="inline-flex min-h-[44px] items-center rounded-md border border-stone-500 px-6 text-sm font-semibold hover:bg-white/10">All development services</Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
