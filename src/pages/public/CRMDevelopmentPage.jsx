import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineUserGroup } from 'react-icons/hi2'
import { FaWhatsapp } from 'react-icons/fa6'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const WHATSAPP_URL = 'https://wa.me/923194329754'

const flow = [
  { when: 'When', what: 'a new lead arrives from a form or WhatsApp' },
  { when: 'Then', what: 'assign it to the salesperson for that city' },
  { when: 'And', what: 'create a follow-up task due in two days' },
  { when: 'If', what: 'nobody has replied by then, remind the manager' },
]

// Features that already exist in the Nexora CRM, which we use as the base for custom work.
const features = [
  { t: 'Lead Management', d: 'Leads with a source, owner, status and notes, plus lead scoring so the team knows who to call first.' },
  { t: 'Visual Pipeline', d: 'A board of deals by stage. Stages, names and order can be changed to match how you really sell.' },
  { t: 'Quotations and invoices', d: 'Create a quotation for a customer, then bill them from the same system, instead of retyping into a separate tool.' },
  { t: 'Follow-ups and tasks', d: 'Every lead can have follow-ups and tasks with owners and dates, so promises to call back do not live in someone’s head.' },
  { t: 'WhatsApp inbox', d: 'Connect WhatsApp so conversations and leads from chats land next to the customer’s record.' },
  { t: 'Team permissions', d: 'Staff accounts with roles. A new salesperson does not need to see the whole company’s numbers.' },
  { t: 'Customer records', d: 'One place for each customer’s contact details, deals, contracts and history.' },
  { t: 'Reports', d: 'Sales and activity reports so a manager can see what happened this week without asking five people.' },
]

const whenCustom = [
  { t: 'Stay with a ready-made CRM when', d: 'Your sales process is fairly normal: leads in, follow-ups, quotation, invoice. Our own Nexora CRM covers that and starts with a free one-month trial, which costs far less than building anything.' },
  { t: 'Go custom when', d: 'Your process has steps that no template has: approvals by region, a site visit before quoting, commissions by product, or a link to software you already depend on.' },
  { t: 'Do not build when', d: 'You have not yet written down how a lead becomes a customer. Start with a spreadsheet or the ready-made tool, then build once the process is clear.' },
]

const scope = [
  'Your stages and what moves a deal between them',
  'Which fields each lead and customer needs, and which are required',
  'Who owns a lead and what happens when they are away',
  'What should happen automatically, and what a person must decide',
  'Which reports the owner reads every week',
  'What has to be imported from your current spreadsheet or CRM',
]

const faqs = [
  {
    q: 'Why build a custom CRM instead of using Zoho/HubSpot?',
    a: 'Often you should not. Ready-made CRMs are cheaper and quicker if your process is ordinary. Custom makes sense when your sales steps are unusual, when you need the CRM tied to other software of yours, or when per-user pricing becomes expensive at your team size. We will tell you honestly which side you are on.',
  },
  {
    q: 'How much does a custom CRM cost?',
    a: 'It depends on how many stages, fields, roles, reports and integrations you need. A small team with a simple pipeline costs far less than a multi-branch company with approvals and imports. After a first call we write a scope and a price, so you know what is included before work starts.',
  },
  {
    q: 'Can you integrate with WhatsApp?',
    a: 'Yes. Nexora already has a WhatsApp inbox built on the Meta WhatsApp Cloud API, with leads and follow-ups. For a custom CRM we can connect it the same way, subject to WhatsApp’s own rules on message templates and approvals.',
  },
  {
    q: 'How long does CRM development take?',
    a: 'A small CRM with a pipeline and a few reports takes weeks. Anything with several departments, approvals and data imports takes a few months. A realistic timeline comes after we have written the scope together.',
  },
  {
    q: 'Can you migrate data from our existing CRM?',
    a: 'If your current system can export to CSV or Excel, yes, we can import contacts, deals and notes. We do a test import first and show you the result before the real one. Attachments and full history depend on what your current tool lets you export.',
  },
  {
    q: 'Is my sales data secure?',
    a: 'Access is limited by role, each company’s data is kept separate, and the system runs on managed cloud services (Firebase and Cloudflare). We also keep an activity log. No system is risk-free, so we review who can see what before go-live.',
  },
]

export default function CRMDevelopmentPage() {
  const seo = getSeoForPath('/crm-development')

  return (
    <PublicPageShell backTo="/software-development" backLabel="Back to Software Dev" badge="CRM Development" badgeIcon={HiOutlineUserGroup}>
      <PageSeo {...seo} faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/software-development">Software Development</Link>
        <span> / </span>
        <span aria-current="page">CRM Development</span>
      </nav>

      <section className="bg-violet-950 pb-16 pt-24 text-white sm:pt-28 lg:pb-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <h1 className="text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[3.6rem]">Custom CRM Development</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-violet-100 sm:text-lg">
              A CRM shaped around how your team really sells: your stages, your fields, your rules for
              who follows up with whom. Built on the same foundations as our own Nexora CRM.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-amber-300 px-6 text-sm font-bold text-violet-950 hover:bg-amber-200">
                Build Your CRM <HiOutlineArrowRight className="h-4 w-4" />
              </a>
              <Link to="/crm" className="inline-flex min-h-[44px] items-center rounded-md border border-violet-300/50 px-6 text-sm font-semibold hover:bg-white/10">
                See the ready-made CRM
              </Link>
            </div>
          </div>

          <div aria-label="Example automation rule" className="rounded-md bg-white p-6 text-violet-950 shadow-[8px_8px_0_0_rgba(251,191,36,0.9)]">
            <p className="text-sm font-bold">An automation rule, in plain words</p>
            <ol className="mt-4">
              {flow.map((s, i) => (
                <li key={s.what} className="relative pb-5 pl-14 last:pb-0">
                  {i < flow.length - 1 && <span className="absolute left-[18px] top-9 h-[calc(100%-1.5rem)] w-px bg-violet-300" />}
                  <span className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-md bg-violet-100 text-xs font-extrabold text-violet-800">{s.when}</span>
                  <p className="pt-1.5 text-[14px] leading-6 text-violet-950">{s.what}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-violet-700">An example rule, shown for illustration. Your rules depend on your process.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-violet-950 sm:text-4xl">Do you actually need a custom CRM?</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {whenCustom.map((w) => (
              <div key={w.t} className="border-t-4 border-violet-700 pt-4">
                <h3 className="text-[16px] font-bold text-zinc-900">{w.t}</h3>
                <p className="mt-2 text-[15px] leading-7 text-zinc-600">{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-violet-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-violet-950 sm:text-4xl">CRM Features</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-zinc-600">
            These already exist in the Nexora CRM, so a custom project starts from working parts rather than a blank page.
          </p>
          <dl className="mt-8 grid gap-x-10 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.t} className="border-b border-violet-200 py-4">
                <dt className="text-[16px] font-bold text-zinc-900"><h3>{f.t}</h3></dt>
                <dd className="mt-1 text-[15px] leading-7 text-zinc-600">{f.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-violet-950 sm:text-3xl">What we agree before building</h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Most CRM projects go wrong because the process was never written down, not because of the
              code. So the first job is a short scope that answers these:
            </p>
            <ul className="mt-5 space-y-2.5 text-[15px] leading-7 text-zinc-700">
              {scope.map((s) => (
                <li key={s} className="flex gap-3"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-700" />{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-violet-200 bg-violet-50 p-6">
            <h2 className="text-xl font-extrabold text-violet-950">What “custom” means here</h2>
            <p className="mt-3 text-[15px] leading-7 text-zinc-700">
              We do not start from nothing. The sign-in, roles, customer records, pipeline, tasks and
              WhatsApp pieces already exist in Nexora, so the project is about changing the stages,
              adding the fields and rules you need, and connecting it to your other software.
            </p>
            <p className="mt-3 text-[15px] leading-7 text-zinc-700">
              That keeps cost and risk lower than a ground-up build. If a connection to another system
              is needed, our <Link to="/api-integration" className="font-semibold text-violet-800 hover:underline">API integration</Link> work covers it,
              and larger operations may want the <Link to="/erp-development" className="font-semibold text-violet-800 hover:underline">ERP</Link> side too.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-violet-50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-violet-950 sm:text-4xl">CRM FAQs</h2>
          <div className="mt-8 divide-y divide-violet-200 border-y border-violet-200">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-zinc-900 marker:hidden">
                  <span className="mr-2 text-violet-700 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-violet-700 group-open:inline">−</span>
                  <h3 className="inline">{f.q}</h3>
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-md bg-violet-950 p-8 text-white sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">Ready for a CRM That Fits Your Business?</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-violet-100">Tell us how a lead becomes a customer today. We will say whether a ready-made tool or a custom build suits you better.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-amber-300 px-6 text-sm font-bold text-violet-950 hover:bg-amber-200">
              <FaWhatsapp className="text-base" /> Get Free Consultation
            </a>
            <Link to="/software-development" className="inline-flex min-h-[44px] items-center rounded-md border border-violet-300/50 px-6 text-sm font-semibold hover:bg-white/10">All development services</Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
