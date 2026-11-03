import Link from '../../components/AppLink.jsx'
import { HiOutlineArrowRight, HiOutlineBriefcase } from 'react-icons/hi2'
import BusinessServicesSection from '../../components/BusinessServicesSection.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForPath } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

// Statuses mirror businessServiceRequestStatuses in src/lib/businessServices.js
const statusSteps = [
  { name: 'New', text: 'Your request is saved with the company details and support notes you typed in.' },
  { name: 'Under Review', text: 'Someone at Nexora reads it and checks what staff, hours and scope it needs.' },
  { name: 'Proposal Sent', text: 'You get the support plan and the price. Nothing starts until you agree.' },
  { name: 'Approved', text: 'You said yes. The work is being lined up.' },
  { name: 'Active', text: 'The service is running with your team.' },
  { name: 'Closed', text: 'The engagement is finished. Rejected is the other way a request can end.' },
]

const serviceGuide = [
  {
    name: 'Back Office Setup',
    price: 'One-time',
    body:
      'This is for the business that has the software but not the habits yet. We sort out the admin side: where records live, who updates what, which tool holds customers and which holds stock, and what the owner checks each morning. It suits a shop that just bought a POS, or an office that has been running on paper and chat messages.',
    bring: 'A short description of how work moves today, and the tools you already pay for.',
  },
  {
    name: 'Data Entry Operator',
    price: 'Monthly',
    body:
      'A dedicated person who types customer lists, product catalogues, invoices and ledgers into your system so your own staff do not have to. It is the most common request when a business first moves from registers to software and has two years of old records to bring across.',
    bring: 'The source records (photos, sheets or registers) and a sample of how you want them entered.',
  },
  {
    name: 'Virtual Assistant',
    price: 'Monthly',
    body:
      'Remote help with scheduling, follow-ups, reminders, coordination between your team and your suppliers, and the small admin jobs that pile up on an owner. It works best when you give the same person a steady list of recurring tasks.',
    bring: 'Your usual weekly tasks and the apps they involve.',
  },
  {
    name: 'Accounting / Bookkeeping',
    price: 'Monthly',
    body:
      'Routine bookkeeping: recording expenses, matching invoices, tidying finance records that have drifted. This is record keeping and support, not tax advice or an audit, and it is not a substitute for a registered accountant where the law asks for one.',
    bring: 'Bank or cash statements, invoices and the chart of accounts you use now.',
  },
  {
    name: 'Customer Support',
    price: 'Monthly',
    body:
      'Someone to answer customer questions, follow up open tickets and keep the support desk moving. It pairs well with a CRM or WhatsApp inbox, where the conversation history is already in one place.',
    bring: 'Common questions, your tone of voice and the channels customers use.',
  },
  {
    name: 'Lead Generation',
    price: 'Monthly',
    body:
      'Building prospect lists, supporting outreach and qualifying who is worth a call. We help with the groundwork; the sale itself stays with you. Qualified leads can be logged straight into a CRM pipeline.',
    bring: 'Who your ideal customer is, the area you sell in, and what you offer.',
  },
  {
    name: 'Social Media Management',
    price: 'Monthly',
    body:
      'Scheduling posts, looking after the page, tracking incoming messages and sending a basic report. Think of it as keeping a page alive and answered, rather than running a large ad budget.',
    bring: 'Brand basics, access to the pages and an idea of what you want posted.',
  },
  {
    name: 'Website Management',
    price: 'Monthly',
    body:
      'Content changes, page updates, routine maintenance and basic technical support for a site that already exists. Larger rebuilds are a different job and are better handled as custom development.',
    bring: 'Site access and a list of the changes you need.',
  },
  {
    name: 'Custom Development',
    price: 'Custom',
    body:
      'Custom modules, integrations, workflow automation and tailored tools that sit next to your Nexora software. It is priced after we understand the work, which is why there is no fixed starting figure.',
    bring: 'The problem you want solved and the systems it has to talk to.',
  },
]

const pricingModes = [
  {
    name: 'Monthly',
    text: 'For ongoing work such as data entry, bookkeeping or support. The same arrangement repeats each month, and the catalogue below shows a starting price for each service.',
  },
  {
    name: 'One-time',
    text: 'For a job with an end, such as setting up your back office. You agree the scope, it gets done, and that is the end of it.',
  },
  {
    name: 'Custom',
    text: 'For work we cannot price without talking first. Custom development is listed this way, with no starting price.',
  },
]

const faqs = [
  {
    q: 'What are Nexora business services?',
    a: 'They are managed back-office services that sit beside the software. Instead of only selling you a POS or a CRM, we can also supply people and set-up help for the daily admin work: data entry, bookkeeping, customer support, lead generation, social media, website upkeep and custom development.',
  },
  {
    q: 'Do I need to be a Nexora software customer to ask for a service?',
    a: 'No. You can send a request without owning any Nexora software. The services are easier to run when your records already live in a Nexora workspace, because requests, scope and pricing stay connected with your business account, but it is not a condition.',
  },
  {
    q: 'How much do the services cost?',
    a: 'Each service in the catalogue shows a starting price and whether it is monthly, one-time or custom. The final price depends on the scope in your proposal, so treat the listed figure as where pricing begins, not a fixed quote.',
  },
  {
    q: 'What is the difference between full-time and part-time support?',
    a: 'The request form asks you to choose Full Time or Part Time and to write your preferred working hours. That tells us how much of a person’s day you need and when you need them reachable, so the proposal can be sized properly.',
  },
  {
    q: 'What happens after I submit a request?',
    a: 'It is saved as New, then reviewed by the Nexora team, then you receive a proposal with the plan and price. Work only becomes Active after you approve. Signed-in clients can follow a timeline of each change and leave comments on the request.',
  },
  {
    q: 'Can I see where my request stands?',
    a: 'Yes. When you are signed in, your requests are listed with their current status, a timeline of updates and a place to add comments for the Nexora team.',
  },
  {
    q: 'Is bookkeeping here the same as hiring an accountant?',
    a: 'No. It covers routine record keeping such as expenses, invoice support and cleaning up records. It does not replace a qualified accountant for tax filing, audits or anything the law requires a professional to sign.',
  },
  {
    q: 'Can you build something that is not on the list?',
    a: 'Describe it under Custom Development. Modules, integrations and workflow automation are handled there, and the work is scoped and priced once we know what you need.',
  },
]

const related = [
  { label: 'CRM Software', to: '/crm', text: 'Keep leads, customers, tasks and service requests connected in one workspace.' },
  { label: 'Retail POS', to: '/retail-pos', text: 'Connect store billing, products and customer records with daily operations.' },
  { label: 'WhatsApp CRM', to: '/whatsapp-crm', text: 'Use conversations, follow-ups and campaigns alongside managed services.' },
  { label: 'Software Development', to: '/software-development', text: 'When the job is a build rather than back-office help, start here.' },
  { label: 'Pricing', to: '/pricing', text: 'See what the software itself costs before you add services.' },
]

export default function PublicBusinessServicesPage() {
  const seo = getSeoForPath('/business-services')

  return (
    <PublicPageShell backTo="/" backLabel="Back to Website" badge="Business Services" badgeIcon={HiOutlineBriefcase}>
      <PageSeo
        {...seo}
        faqItems={faqs.map((f) => ({ question: f.q, answer: f.a }))}
        softwareApplication={{
          name: 'Nexora Business Services',
          description: seo.description,
          applicationCategory: 'BusinessApplication',
        }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">Business Services</span>
      </nav>

      {/* Hero: a request ticket */}
      <section className="bg-stone-100 pb-14 pt-24 sm:pt-28 lg:pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-blue-800">Business Services</p>
            <h1 className="mt-4 text-[2.4rem] font-bold leading-[1.08] tracking-[-0.025em] text-stone-900 sm:text-[3.3rem]">
              Back-office help that works with your Nexora system.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-stone-600 sm:text-lg">
              Request setup, staffing, bookkeeping, customer support, lead generation, social media,
              website management, or custom development — all from one clean service window.
            </p>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-stone-600">
              Most small businesses do not need another tool. They need someone to do the typing, the
              follow-ups and the monthly clean-up, so the owner can get back to the work only the
              owner can do. That is what this desk is for.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#business-services" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-blue-800 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                View Services
                <HiOutlineArrowRight className="h-4 w-4" />
              </a>
              <Link to="/pricing" className="inline-flex min-h-[44px] items-center rounded-md border border-stone-400 px-6 text-sm font-semibold text-stone-800 transition-colors hover:bg-white">
                Software Pricing
              </Link>
            </div>
          </div>

          {/* ticket */}
          <aside aria-label="Example service request" className="relative">
            <div className="rotate-[1.2deg] rounded-sm border border-stone-300 bg-white p-6 shadow-[6px_6px_0_0_rgba(28,25,23,0.12)] sm:p-7">
              <p className="text-xs font-semibold text-stone-500">Support Window</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.01em] text-stone-900">Request, review, approve, activate.</h2>
              <dl className="mt-5 divide-y divide-dashed divide-stone-300 text-sm">
                <div className="flex justify-between gap-4 py-2.5"><dt className="text-stone-500">Service</dt><dd className="font-semibold text-stone-900">Data Entry Operator</dd></div>
                <div className="flex justify-between gap-4 py-2.5"><dt className="text-stone-500">Engagement</dt><dd className="font-semibold text-stone-900">Part Time</dd></div>
                <div className="flex justify-between gap-4 py-2.5"><dt className="text-stone-500">Working hours</dt><dd className="font-semibold text-stone-900">10 am – 2 pm</dd></div>
                <div className="flex justify-between gap-4 py-2.5"><dt className="text-stone-500">Status</dt><dd className="font-semibold text-blue-800">Proposal Sent</dd></div>
              </dl>
              <ol className="mt-4 space-y-2 border-l-2 border-stone-300 pl-4 text-[13px] text-stone-600">
                <li>Service request submitted</li>
                <li>Status changed to Under Review</li>
                <li className="font-semibold text-stone-900">Status changed to Proposal Sent</li>
              </ol>
              <p className="mt-5 text-xs leading-5 text-stone-500">
                A made-up request, shown for illustration. Real requests use the same fields and the
                same status names.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* What each service covers */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl">
            What each service actually covers
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-stone-600">
            The names are short, so here is the longer version. Scope, hours and price are confirmed in
            your proposal before anything starts.
          </p>
          <div className="mt-10 divide-y divide-stone-200 border-y border-stone-200">
            {serviceGuide.map((s) => (
              <article key={s.name} className="grid gap-3 py-7 md:grid-cols-[14rem_1fr_16rem] md:gap-8">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{s.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-blue-800">{s.price}</p>
                </div>
                <p className="text-[15px] leading-7 text-stone-700">{s.body}</p>
                <p className="text-[13px] leading-6 text-stone-500">
                  <span className="font-semibold text-stone-700">Bring: </span>
                  {s.bring}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* live catalogue + request form */}
      <BusinessServicesSection />

      {/* status steps */}
      <section className="bg-stone-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl">
            What each status on your request means
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-stone-600">
            Every change is written to a timeline you can read, and you can leave comments for the team
            on the same request. These are the exact status names you will see.
          </p>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-sm border border-stone-300 bg-stone-300 sm:grid-cols-2 lg:grid-cols-3">
            {statusSteps.map((s) => (
              <li key={s.name} className="bg-white p-6">
                <p className="text-base font-bold text-blue-800">{s.name}</p>
                <p className="mt-2 text-[14px] leading-6 text-stone-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* pricing + engagement */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-900 sm:text-3xl">How services are priced</h2>
            <dl className="mt-6 space-y-5">
              {pricingModes.map((p) => (
                <div key={p.name}>
                  <dt className="text-[15px] font-bold text-stone-900">{p.name}</dt>
                  <dd className="mt-1 text-[15px] leading-7 text-stone-600">{p.text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-900 sm:text-3xl">Full time, part time, and your hours</h2>
            <div className="mt-6 space-y-4 text-[15px] leading-7 text-stone-600">
              <p>
                The request form asks two things that shape the plan: whether you want Full Time or Part
                Time cover, and what working hours suit you. A shop that only needs invoices keyed in
                for a few hours a day is a very different job from an office that wants someone on the
                phones all day.
              </p>
              <p>
                Be specific when you write your support details. “Enter 400 old customer records from
                photographed registers” gives us something we can size. “Help with admin” does not.
              </p>
              <p>
                If you are unsure which service fits, pick the closest one and describe the problem in
                your own words. The review step exists to sort that out before any price is quoted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* faqs */}
      <section className="bg-stone-100 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl">Questions people ask before sending a request</h2>
          <div className="mt-8 divide-y divide-stone-300 border-y border-stone-300">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-stone-900 marker:hidden">
                  <span className="mr-2 text-blue-800 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-blue-800 group-open:inline">−</span>
                  {f.q}
                </summary>
                <p className="mt-3 pl-5 text-[15px] leading-7 text-stone-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* related */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.02em] text-stone-900 sm:text-3xl">
              Software that supports your service workflow
            </h2>
            <Link to="/contact" className="inline-flex min-h-[42px] w-max items-center rounded-md border border-stone-400 px-5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100">
              Contact Nexora
            </Link>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden rounded-sm border border-stone-300 bg-stone-300 md:grid-cols-3">
            {related.map((r) => (
              <Link key={r.to} to={r.to} className="group bg-white p-6 transition-colors hover:bg-stone-50">
                <p className="text-[16px] font-bold text-stone-900">{r.label}</p>
                <p className="mt-2 text-[14px] leading-6 text-stone-600">{r.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-800">
                  View solution
                  <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
