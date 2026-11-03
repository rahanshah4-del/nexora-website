import Link from '../../components/AppLink.jsx'
import {
  HiOutlineArrowRight,
  HiOutlineBanknotes,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineCloud,
  HiOutlineDocumentText,
  HiOutlinePlayCircle,
  HiOutlineUserGroup,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import RelatedBlogSection from '../../components/RelatedBlogSection.jsx'
import ProductVideoSection from '../../components/product/ProductVideoSection.jsx'
import ModuleIntroSection from '../../components/video/ModuleIntroSection.jsx'
import { SOLUTION_BLOG_TOPICS } from '../../lib/relatedBlog.js'
import { getSeoForSolutionSlug } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'

const SLUG = 'property-erp'
const PRODUCT = 'Nexora Property ERP'
const DESCRIPTION =
  'A property management ERP for owners, agencies and teams handling tenants, rent collection, lease tracking and maintenance requests.'

const whatsappLeadLink = `https://wa.me/923194329754?text=${encodeURIComponent(
  'Assalam o Alaikum, I want to book a Nexora product demo.',
)}`

const ctaBase =
  'inline-flex h-12 w-full items-center justify-center sm:w-auto gap-2 whitespace-nowrap rounded-md px-7 text-[15px] font-medium transition-colors duration-200'
const ctaPrimary = `${ctaBase} bg-sky-800 text-white hover:bg-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800`
const ctaSecondary = `${ctaBase} border border-slate-400 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500`
const linkClass = 'font-medium text-sky-800 underline decoration-sky-300 underline-offset-4 hover:decoration-sky-800'

const features = [
  ['Tenant Management', 'Organize tenant profiles, contacts, dues and activity history.', HiOutlineUserGroup],
  ['Rent Collection', 'Track rent payments, balances and collection performance.', HiOutlineBanknotes],
  ['Lease Tracking', 'Monitor lease dates, renewals and agreement status.', HiOutlineDocumentText],
  ['Maintenance Requests', 'Assign maintenance work and keep requests visible.', HiOutlineWrenchScrewdriver],
  ['Financial Reports', 'View owner, rent and portfolio level financial summaries.', HiOutlineChartBarSquare],
  ['Cloud Access', 'Keep property teams connected from office and field.', HiOutlineCloud],
]

const benefits = [
  'Improve rent collection visibility',
  'Reduce tenant follow-up gaps',
  'Keep leases organized',
  'Make owner reporting faster',
]

const useCases = [
  'Property dealers',
  'Building managers',
  'Rental portfolios',
  'Commercial property teams',
  'Real estate agencies',
  'Housing society offices',
]

const faqs = [
  ['Can I track rent balances?', 'Yes. Property ERP workflows include rent collection, balances and reporting.'],
  ['Can maintenance teams use it?', 'Yes. Maintenance requests can be tracked and assigned from the same workspace.'],
  ['Does it work for rentals and property sales?', 'Yes. When you set up the workspace you choose Rentals, Sales or Both, and Nexora shapes the dashboard around that portfolio.'],
  ['Can I keep tenant and owner records together?', 'Yes. Tenants and owners live in one directory with contact details, dues and history, linked to the properties and contracts they belong to.'],
  ['Can I record expenses and see the accounts?', 'Yes. Expenses, payments and accounts are part of the workspace, so rent income and property costs show up in the same reports.'],
  ['Can I control what my staff can do?', 'Yes. Team roles and approvals let you decide who can record payments, edit contracts or view financial reports.'],
  ['Can I track lease expiry and renewals?', 'Yes. Every lease has a status of Draft, Active or Terminated, and leases ending within 30 days show as Expiring Soon. You can renew a lease from the same screen and apply a rent increase percentage to the new value.'],
  ['Can I set late fees for rent?', 'Yes. Each lease can have a payment due day, a grace period in days and a late fee, either a flat amount or a percentage of the rent.'],
  ['Can I give maintenance work to a vendor?', 'Yes. A request can be assigned to your own staff or to an outside vendor, with a priority from Low to Urgent, an estimated and actual cost, and a due date.'],
  ['Is Nexora property management software available in Pakistan?', 'Yes. Nexora is built in Multan, Pakistan, so rent and costs can be kept in PKR. Start with the 1-month free trial and book a demo on WhatsApp if you want help setting up.'],
  ['Can Nexora work on desktop and mobile?', 'Yes. Nexora is built for web dashboards, desktop counters and mobile-ready access with secure cloud sync.'],
  ['Can my team have different permissions?', 'Yes. Owners can control role-based access for managers, sales teams, accountants and operational staff.'],
  ['Do you provide onboarding support?', 'Yes. Nexora offers guided setup, demo sessions and support for moving teams into the right workflow.'],
]

const related = [
  { to: '/crm/', label: 'CRM Software', text: 'Track leads, customers, invoices, tasks and sales teams.' },
  { to: '/solutions/reports/', label: 'Business Reports', text: 'Review KPIs, exports and performance insights across modules.' },
  { to: '/whatsapp-crm', label: 'WhatsApp CRM', text: 'Turn conversations into leads, follow-ups and customer activity.' },
]

/* Hero picture: the lease record itself, using the fields the lease form really has. */
function LeaseCard() {
  const rows = [
    ['Reference', 'LEASE-2026-014'],
    ['Tenant', 'Bilal Ahmed'],
    ['Property, unit', 'Gulgasht Plaza, Shop 2B'],
    ['Term', '1 Dec 2025 to 30 Nov 2026'],
    ['Monthly rent', 'PKR 85,000'],
    ['Security deposit', 'PKR 170,000'],
    ['Payment due day', '5th of each month'],
    ['Late fee', '2 percent after 3 days grace'],
  ]
  return (
    <figure className="mx-auto w-full max-w-lg" aria-label="Sample lease record">
      <div className="border border-slate-300 bg-white shadow-[8px_8px_0_0_rgba(12,74,110,0.12)]">
        <div className="flex items-center justify-between border-b border-slate-300 bg-slate-900 px-5 py-3 text-white">
          <p className="font-medium">New lease / contract</p>
          <span className="rounded bg-amber-300 px-2 py-0.5 text-xs font-semibold text-amber-950">Expiring Soon</span>
        </div>
        <dl className="divide-y divide-dashed divide-slate-300 px-5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between border-t border-slate-300 bg-slate-50 px-5 py-3 text-sm">
          <span className="text-slate-500">Ends in 27 days</span>
          <span className="font-medium text-sky-800">Renew with rent increase %</span>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-slate-400">Sample lease with made-up names and amounts, shown for illustration.</figcaption>
    </figure>
  )
}

const leaseLifecycle = [
  ['Draft', 'You enter the tenant, unit, dates, rent, deposit and advance. The lease stays in Draft until you activate it.'],
  ['Active', 'Rent is due on the day you set. Late fee and grace period apply if a payment comes in after that.'],
  ['Expiring Soon', 'Thirty days before the end date the lease is flagged, so you can talk to the tenant early.'],
  ['Renewed', 'Renew from the same screen and apply a rent increase percentage. The new term starts as Active.'],
  ['Terminated', 'If the tenant leaves early, the lease is terminated and the record stays for your history.'],
]

const maintenanceColumns = [
  { name: 'Open', items: [['Leaking kitchen tap', 'Flat 2B, High priority']] },
  { name: 'In Progress', items: [['Lift service', 'Block A, Medium priority, vendor assigned']] },
  { name: 'Completed', items: [['Repaint corridor', 'Floor 3, Low priority, actual cost recorded']] },
]

const sections = [
  {
    heading: 'What property management software does',
    paragraphs: [
      'Property management software puts tenants, leases, rent and repairs in one place instead of a notebook, a spreadsheet and a WhatsApp group. For an owner or agency it answers the daily questions quickly: who has paid, whose lease ends next month, and which repair is still open.',
      'Nexora Property ERP is built around those questions for rental and sales portfolios. When you set up the workspace you choose Rentals, Sales or Both, and the dashboard follows that choice.',
    ],
  },
  {
    heading: 'Lease tracking that warns you before a lease ends',
    paragraphs: [
      'Each lease records the tenant, property and unit, start and end dates, monthly rent, security deposit and advance payment. You choose a payment due day from 1 to 28, and a late fee that is either a flat amount or a percentage, with a grace period.',
      'Leases that end within 30 days show as Expiring Soon, and renewing one takes a few clicks, with an optional rent increase percentage applied to the new value. You can also keep notes on clauses and link the signed document.',
    ],
  },
  {
    heading: 'Rent collection and tenant records',
    paragraphs: [
      'Tenants and owners live in one directory with contact details, dues and history, linked to the properties and contracts they belong to. Rent payments, balances and expenses go into the same accounts, so the rent report shows income next to property costs without a second sheet.',
      'The point of keeping this together is the monthly question every landlord asks: how much should have come in, and how much did? When the lease holds the rent and the due day, and payments are recorded against it, that answer stops depending on someone’s memory.',
    ],
  },
  {
    heading: 'Maintenance requests from report to repair',
    paragraphs: [
      'A repair request gets a title, a category, a priority from Low to Urgent and a property and unit. You assign it to your own staff or to an outside vendor, note the estimated and actual cost, set a due date and move it through Open, In Progress and Completed.',
      'Requests past their due date can be filtered as Overdue, so nothing sits forgotten. You can also attach a photo or document link, which helps when a vendor needs to see the problem before visiting.',
    ],
  },
  {
    heading: 'Who a property ERP is for',
    paragraphs: [
      'A single landlord with six flats can run on a notebook for a while. The trouble starts when the number of leases passes what one person can remember. Property dealers and agencies managing units for several owners, building managers handling common repairs, and housing society offices collecting monthly dues all hit that point.',
      'Commercial property teams have a slightly different need: longer leases, larger deposits and annual rent increases. The renewal flow with a rent increase percentage is built for exactly that.',
    ],
  },
  {
    heading: 'Moving from paper to software without a big project',
    paragraphs: [
      'You do not need to enter everything on day one. A practical way to start is one building. Add its tenants, create a lease for each, and record this month’s rent as it arrives. After a month you will know whether the reports save you time.',
      'The 1-month free trial exists for this reason. Use real data from one property, see the Expiring Soon list and the rent report, and then decide whether to move the rest of the portfolio.',
    ],
  },
  {
    heading: 'Property software for agencies and owners in Pakistan',
    paragraphs: [
      'Property dealers, building managers and housing society offices in Pakistan usually run on paper registers and phone calls. Nexora keeps amounts in PKR and gives staff different permissions, for example one person who records payments and another who can only view reports.',
      'Nexora is built in Multan, so support is a WhatsApp message away when you are setting up your first building.',
    ],
    links: [
      { to: '/pricing', label: 'See pricing' },
      { to: '/solutions/reports', label: 'Business reports' },
    ],
  },
]

export default function PropertyErpPage() {
  const seo = getSeoForSolutionSlug(SLUG)

  return (
    <PublicPageShell>
      <PageSeo
        {...seo}
        faqItems={faqs}
        softwareApplication={{ name: PRODUCT, description: DESCRIPTION, applicationCategory: 'BusinessApplication' }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">{PRODUCT}</span>
      </nav>

      {/* Hero */}
      <section className="border-b border-slate-200 bg-slate-100 pb-16 pt-14 sm:pb-20 sm:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-sky-800">Property ERP Solution</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl lg:text-[3.4rem]">
              Property management software for tenants, rent, leases and maintenance.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{DESCRIPTION}</p>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Start with a 1-month free trial, choose Basic after the trial, then upgrade to Standard when your users, records and reports need more room.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link to="/signup" className={ctaPrimary}>
                Start Free Trial
                <HiOutlineArrowRight className="text-lg" />
              </Link>
              <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={ctaSecondary}>
                Book Demo
                <HiOutlinePlayCircle className="text-xl text-slate-500" />
              </a>
            </div>
          </div>
          <LeaseCard />
        </div>
      </section>

      <ModuleIntroSection key={SLUG} solutionSlug={SLUG} />

      <ProductVideoSection solutionSlug={SLUG} />

      {/* Lease lifecycle: a real sequence, drawn across */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">The life of a lease, from first draft to renewal</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Every lease in Nexora passes through the same stages, so you always know where an agreement stands.
          </p>
          <ol className="mt-12 grid gap-0 border-t-2 border-slate-900 md:grid-cols-5">
            {leaseLifecycle.map(([name, text], i) => (
              <li key={name} className="border-b border-slate-200 py-6 md:border-b-0 md:border-r md:px-5 md:first:pl-0 md:last:border-r-0">
                <p className="text-sm text-slate-500">Stage {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{name}</h3>
                <p className="mt-2 text-base leading-7 text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features as a ledger */}
      <section className="bg-slate-100 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Key features for {PRODUCT}</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              What a rental office handles every month: tenant records, rent and balances, lease dates, repair requests and the owner report.
            </p>
          </div>
          <ul className="divide-y divide-slate-300 border-y border-slate-300 bg-white">
            {features.map(([title, text, FeatureIcon]) => (
              <li key={title} className="flex gap-4 px-5 py-5">
                <FeatureIcon className="mt-1 shrink-0 text-2xl text-sky-800" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-base leading-7 text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Maintenance board */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Repairs move through three simple states</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Each request carries a priority from Low to Urgent, a staff member or vendor, a due date and the cost.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {maintenanceColumns.map((col) => (
              <div key={col.name} className="border border-slate-300 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-900">{col.name}</h3>
                {col.items.map(([title, meta]) => (
                  <div key={title} className="mt-3 border border-slate-200 bg-white p-4">
                    <p className="font-medium text-slate-900">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">{meta}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Sample requests, shown for illustration.</p>
        </div>
      </section>

      {/* Long-form: sticky heading left, text right */}
      <section className="bg-slate-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl divide-y divide-slate-300 px-5 sm:px-6 lg:px-8">
          {sections.map((section) => (
            <article key={section.heading} className="grid gap-4 py-10 first:pt-0 last:pb-0 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 lg:sticky lg:top-24 lg:self-start">{section.heading}</h2>
              <div className="grid gap-4">
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="text-lg leading-8 text-slate-700">{p}</p>
                ))}
                {section.links?.length ? (
                  <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {section.links.map((l) => (
                      <Link key={l.to} to={l.to} className={linkClass}>{l.label}</Link>
                    ))}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Benefits + use cases */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Better operations, faster teams and clearer ROI.</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.
            </p>
            <ul className="mt-6 list-disc space-y-2 pl-5 text-lg leading-8 text-slate-700">
              {benefits.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Industry use cases</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Flexible enough for dealers, building managers, rental portfolios and society offices.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {useCases.map((u) => (
                <li key={u} className="flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">
                  <HiOutlineBuildingOffice2 className="text-base text-sky-800" aria-hidden="true" />
                  {u}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="bg-slate-100 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Software that works with {PRODUCT}</h2>
            <Link to="/pricing" className={ctaSecondary}>Compare Pricing</Link>
          </div>
          <ul className="mt-10 grid gap-px border border-slate-300 bg-slate-300 md:grid-cols-3">
            {related.map((item) => (
              <li key={item.to} className="bg-white">
                <Link to={item.to} className="group block h-full p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-800">
                  <p className="text-lg font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-2 text-base leading-7 text-slate-600">{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sky-800">
                    View solution
                    <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ: every answer visible, two columns */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {faqs.map(([q, a]) => (
              <div key={q}>
                <h3 className="text-lg font-semibold text-slate-900">{q}</h3>
                <p className="mt-2 text-base leading-7 text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RelatedBlogSection topics={SOLUTION_BLOG_TOPICS[SLUG] || []} intro={`Practical guides for ${PRODUCT} users and owners.`} />

      {/* Closing */}
      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 bg-slate-900 p-8 sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ready to see {PRODUCT} in action?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Start a 1-month free trial with no credit card, or book a guided demo before choosing a plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className={`${ctaBase} bg-white text-slate-900 hover:bg-slate-100`}>
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={`${ctaBase} border border-slate-500 text-white hover:bg-slate-800`}>
              Book Demo
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
