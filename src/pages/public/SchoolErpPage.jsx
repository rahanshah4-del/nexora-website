import Link from '../../components/AppLink.jsx'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBanknotes,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentCheck,
  HiOutlineDocumentChartBar,
  HiOutlinePlayCircle,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import RelatedBlogSection from '../../components/RelatedBlogSection.jsx'
import ProductVideoSection from '../../components/product/ProductVideoSection.jsx'
import ModuleIntroSection from '../../components/video/ModuleIntroSection.jsx'
import { SOLUTION_BLOG_TOPICS } from '../../lib/relatedBlog.js'
import { getSeoForSolutionSlug } from '../../lib/seoMetadata.js'
import { featurePages, PILLAR_COMPARE_LINKS } from '../../lib/featurePagesData.js'
import PublicPageShell from './PublicPageShell.jsx'

const SLUG = 'school-erp'
const PRODUCT = 'Nexora School ERP'
const DESCRIPTION =
  'A modern ERP for schools to manage students, classes, attendance, fees, exams, parent communication and academic reporting.'

const whatsappLeadLink = `https://wa.me/923194329754?text=${encodeURIComponent(
  'Assalam o Alaikum, I want to book a Nexora product demo.',
)}`

const ctaBase =
  'inline-flex h-12 w-full items-center justify-center sm:w-auto gap-2 whitespace-nowrap rounded-full px-7 text-[15px] font-medium transition-colors duration-200'
const ctaPrimary = `${ctaBase} bg-emerald-800 text-white hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800`
const ctaSecondary = `${ctaBase} border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500`

const features = [
  ['Student Management', 'Maintain student records, classes, sections and guardian details.', HiOutlineAcademicCap],
  ['Attendance', 'Track daily attendance with quick class and student-level views.', HiOutlineCheckCircle],
  ['Fee Management', 'Manage fee vouchers, dues, collections and financial summaries.', HiOutlineBanknotes],
  ['Exams', 'Plan exam schedules, marks and result workflows.', HiOutlineClipboardDocumentCheck],
  ['Parent Portal', 'Keep parents informed with academic and payment visibility.', HiOutlineChatBubbleLeftRight],
  ['Academic Reports', 'Generate performance, attendance and fee reports for leadership.', HiOutlineDocumentChartBar],
]

const benefits = [
  ['Less paperwork at the front desk', 'Student details, guardian numbers and class sections live on one record, so nobody hunts through registers.'],
  ['You can see fee status', 'Fee bills, approvals and collections show up in one place instead of a pile of vouchers.'],
  ['Parents stay informed', 'Academic, attendance and fee visibility without a phone call for every question.'],
  ['Clean numbers for the principal', 'Attendance and fee reports you can print or save as PDF for a meeting.'],
]

const useCases = [
  ['Private schools', 'Admissions, class sections, monthly fees and staff salaries in one system.'],
  ['Academies', 'Smaller batches, simpler fee plans and quick attendance each session.'],
  ['Colleges', 'Student records, attendance and fee collection across programs.'],
  ['Training institutes', 'Short courses, trainee records and payment tracking.'],
]

const ownFaqs = [
  ['Is Nexora school management software available for schools in Pakistan?', 'Yes. Nexora is built in Multan, Pakistan. Schools can manage fees in PKR, mark attendance and keep student records, starting with the 1-month free trial. Book a demo on WhatsApp for setup help.'],
  ['Can schools manage fees and exams together?', 'Yes. Nexora School ERP combines fee management, exams, attendance and reports.'],
  ['Can parents receive updates?', 'Yes. Parent-facing workflows can support academic, attendance and fee visibility.'],
  ['How does fee management work in Nexora?', 'Fee bills are created for each class and start as pending. Someone with approval rights reviews them in the Approval Center before they count. You can bill monthly, apply discounts or scholarships, and see collections on the School Reports dashboard.'],
  ['Does Nexora support biometric or RFID attendance?', 'Yes. You register a device by name, provider and serial number or IP address, and the live punch log shows who checked in. Staff and student attendance can also be marked by hand as present, absent, late or on leave, with a note.'],
  ['Can I run teacher and staff payroll for my school?', 'Yes. Pick a staff role such as teacher, admin staff, accountant, support staff or driver, set monthly, daily, hourly or custom pay, and add allowances, bonuses and deductions. Salaries can be marked paid by cash, bank transfer, cheque, JazzCash or EasyPaisa, and slips can be printed or sent on WhatsApp.'],
  ['Is there a free trial for the school module?', 'Yes. Every new account gets a 1-month free trial with no credit card. After that you choose a plan on the pricing page.'],
]

const commonFaqs = [
  ['Can Nexora work on desktop and mobile?', 'Yes. Nexora is built for web dashboards, desktop counters and mobile-ready access with secure cloud sync.'],
  ['Can my team have different permissions?', 'Yes. Owners can control role-based access for managers, sales teams, accountants and operational staff.'],
  ['Do you provide onboarding support?', 'Yes. Nexora offers guided setup, demo sessions and support for moving teams into the right workflow.'],
]

const faqs = [...ownFaqs, ...commonFaqs]

const related = [
  { to: '/crm/', label: 'CRM Software', text: 'Track leads, customers, invoices, tasks and sales teams.' },
  { to: '/whatsapp-crm', label: 'WhatsApp CRM', text: 'Turn conversations into leads, follow-ups and customer activity.' },
  { to: '/solutions/reports/', label: 'Business Reports', text: 'Review KPIs, exports and performance insights across modules.' },
]

const linkClass = 'font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-800'

/* The hero's picture: a page from a class attendance register, the thing
   every school office already knows how to read. Sample data, labelled. */
const register = [
  ['1', 'Ayesha Tariq', ['P', 'P', 'P', 'L', 'P']],
  ['2', 'Hamza Khan', ['P', 'A', 'P', 'P', 'P']],
  ['3', 'Maryam Siddiqui', ['P', 'P', 'Lv', 'Lv', 'P']],
  ['4', 'Usman Raza', ['P', 'P', 'P', 'P', 'P']],
  ['5', 'Zainab Malik', ['A', 'P', 'P', 'P', 'L']],
]
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const mark = {
  P: 'text-emerald-800',
  A: 'text-rose-700 font-semibold',
  L: 'text-amber-700 font-semibold',
  Lv: 'text-sky-700 font-semibold',
}

function RegisterSheet() {
  return (
    <figure className="mx-auto w-full max-w-xl" aria-label="Sample class attendance register">
      <div className="rounded-lg border border-emerald-900/20 bg-white shadow-[0_24px_60px_-30px_rgba(6,78,59,0.45)]">
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-emerald-800 px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">Class 8, Section B</p>
            <p className="text-sm text-slate-500">Attendance, this week</p>
          </div>
          <p className="text-sm font-medium text-emerald-800">Saved for today</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="w-10 px-5 py-2 font-medium">Roll</th>
              <th className="py-2 font-medium">Student</th>
              {days.map((d) => (
                <th key={d} className="w-10 py-2 text-center font-medium">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {register.map(([roll, name, marks]) => (
              <tr key={roll} className="border-t border-sky-100">
                <td className="px-5 py-2.5 text-slate-500">{roll}</td>
                <td className="py-2.5 pr-2 font-medium text-slate-800">{name}</td>
                {marks.map((m, i) => (
                  <td key={days[i]} className={`py-2.5 text-center ${mark[m]}`}>{m}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-sky-100 px-5 py-3 text-xs text-slate-500">
          <span>P present</span>
          <span>A absent</span>
          <span>L late</span>
          <span>Lv leave</span>
        </div>
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-950">
        <span className="font-medium">Fee bill, March, Class 8</span>
        <span>Waiting for approval</span>
      </figcaption>
      <p className="mt-2 text-xs text-slate-400">Sample names and data, shown for illustration.</p>
    </figure>
  )
}

/* The office day is a real sequence, so numbered steps are honest here. */
const officeDay = [
  {
    when: 'Before the first bell',
    title: 'Attendance',
    text: 'Teachers mark the class as present, absent, late or on leave. Where a school has biometric or RFID devices, the punches arrive on their own.',
    link: { to: '/school-erp/attendance', label: 'School attendance software' },
  },
  {
    when: 'At the front desk',
    title: 'Admissions and student records',
    text: 'A new admission gets a roll number, a class and section, and the guardian contact on the same record.',
    link: { to: '/school-erp/admissions-and-students', label: 'Student admissions and records' },
  },
  {
    when: 'Start of the month',
    title: 'Fee bills',
    text: 'Bills are made for the month and wait as pending until they are approved, so a wrong amount gets caught before a parent sees it.',
    link: { to: '/school-erp/fee-management', label: 'School fee management' },
  },
  {
    when: 'End of the month',
    title: 'Staff payroll',
    text: 'Teacher and staff salaries are worked out from base pay, allowances, bonuses and deductions, then paid and slipped.',
    link: { to: '/school-erp/payroll', label: 'School payroll software' },
  },
  {
    when: 'For the principal',
    title: 'Reports',
    text: 'Attendance and fee collection summaries, ready to print or save as PDF for the next meeting.',
    link: { to: '/solutions/reports/', label: 'Business reports' },
  },
]

const detailSections = [
  {
    heading: 'What school management software does',
    body: 'School management software replaces the registers, voucher books and salary sheets a school office keeps by hand. Student records, attendance, fees and staff pay sit in one system, so the same facts are not written down four times. A school ERP goes one step further and connects those parts: a fee bill knows the student, the student knows the class, and the report knows all of it.',
  },
  {
    heading: 'Fee management that catches mistakes early',
    body: 'Fees are where most schools lose time and trust. In Nexora, fee bills start as pending and go through the Approval Center, so one person can prepare them and another can check them. You can set fees per class, apply discounts, scholarships and sibling rules, and generate bills in bulk for a month instead of one child at a time. Collections then show up on the school reports dashboard.',
    links: [{ to: '/school-erp/fee-management', label: 'See how fee management works' }],
  },
  {
    heading: 'Attendance for students and staff, by hand or by device',
    body: 'Marking attendance by hand takes a minute per class: present, absent, late or leave, with a note when it helps. If you already have biometric or RFID devices, you add them by name, provider and serial number or IP address and watch the live punch log. Each person has one record per day, which you can edit or delete if a mistake slips in, and the Reports Center exports attendance to PDF with filters. A setup guide is available in English and Urdu.',
    links: [{ to: '/school-erp/attendance', label: 'Read about school attendance' }],
  },
  {
    heading: 'School payroll software for teachers and staff',
    body: 'Payroll for a school is not one list. Teachers, admin staff, accountants, support staff and drivers are often paid in different ways. Nexora lets you set monthly, daily, hourly or custom pay, add allowances and bonuses, subtract deductions and get a net amount. Salaries go through an approval step, can be paid in cash, bank transfer, cheque, JazzCash or EasyPaisa, and the slip can be printed or sent on WhatsApp.',
    links: [{ to: '/school-erp/payroll', label: 'Explore school payroll' }],
  },
  {
    heading: 'School ERP software for schools in Pakistan',
    body: 'Nexora is built in Multan, so the everyday details are the ones a Pakistani school deals with: fees in PKR, salaries paid through JazzCash or EasyPaisa, guardian phone numbers kept for WhatsApp, and support on WhatsApp when you are setting up. Start with the 1-month free trial, enter one class, and see whether it fits before you move the whole school.',
    links: [
      { to: '/blog/school-erp-software-pakistan-guide', label: 'School ERP software in Pakistan: a buying guide' },
      { to: '/compare/school-erp-buying-checklist', label: 'School ERP buying checklist' },
    ],
  },
]

export default function SchoolErpPage() {
  const seo = getSeoForSolutionSlug(SLUG)
  const supportingPages = Object.entries(featurePages)
    .filter(([, fp]) => fp.pillar === SLUG)
    .map(([key, fp]) => ({ key, ...fp }))
  const compareLinks = PILLAR_COMPARE_LINKS[SLUG] || []

  return (
    <PublicPageShell>
      <PageSeo
        {...seo}
        faqItems={faqs}
        softwareApplication={{
          name: PRODUCT,
          description: DESCRIPTION,
          applicationCategory: 'BusinessApplication',
        }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">{PRODUCT}</span>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-emerald-50 to-white pb-16 pt-14 sm:pb-20 sm:pt-20 lg:pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-emerald-800">School ERP Solution</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.04] tracking-tight text-slate-900 sm:text-6xl lg:text-[3.4rem]">
              School management software for admissions, attendance, fees and academics.
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
          <RegisterSheet />
        </div>
      </section>

      <ModuleIntroSection key={SLUG} solutionSlug={SLUG} />

      <ProductVideoSection solutionSlug={SLUG} />

      {/* A day in the office: a true sequence */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            A school office day, and where the software fits
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Nexora follows the order a school actually works in, from the morning register to the principal&apos;s monthly report.
          </p>
          <ol className="mt-12 border-l-2 border-emerald-800/30">
            {officeDay.map((step, i) => (
              <li key={step.title} className="relative pb-10 pl-8 last:pb-0 sm:pl-10">
                <span className="absolute -left-[15px] top-0 grid h-7 w-7 place-items-center rounded-full bg-emerald-800 text-sm font-semibold text-white">{i + 1}</span>
                <p className="text-sm text-slate-500">{step.when}</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">{step.text}</p>
                <Link to={step.link.to} className={`mt-3 inline-block text-sm ${linkClass}`}>{step.link.label}</Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="bg-emerald-50/60 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Key features for {PRODUCT}</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Purpose-built tools, clean permissions and a clear workflow for daily school operations.
          </p>
          <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text, FeatureIcon]) => (
              <div key={title} className="border-t border-emerald-900/20 pt-5">
                <dt className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                  <FeatureIcon className="text-2xl text-emerald-800" aria-hidden="true" />
                  <h3>{title}</h3>
                </dt>
                <dd className="mt-2 text-base leading-7 text-slate-600">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Supporting pages */}
      {supportingPages.length > 0 ? (
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Explore {PRODUCT} in depth</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              A closer look at how each part of {PRODUCT} actually works.
            </p>
            <ul className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
              {supportingPages.map((sp) => {
                const SpIcon = sp.icon
                return (
                  <li key={sp.key}>
                    <Link to={`/${sp.key}`} className="group flex items-center gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800">
                      <SpIcon className="shrink-0 text-2xl text-emerald-800" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <h3 className="block text-lg font-semibold text-slate-900">{sp.badge}</h3>
                        <span className="block text-base text-slate-600">{sp.title}</span>
                      </span>
                      <HiOutlineArrowRight className="shrink-0 text-lg text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-800" />
                    </Link>
                  </li>
                )
              })}
            </ul>
            {compareLinks.length > 0 ? (
              <p className="mt-8 text-sm leading-7 text-slate-600">
                <span className="font-medium text-slate-900">Comparing your options? </span>
                {compareLinks.map((l, i) => (
                  <span key={l.to}>
                    {i > 0 ? ', ' : null}
                    <Link to={l.to} className={linkClass}>{l.text}</Link>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Long-form explanations */}
      <section className="bg-slate-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-3xl gap-14 px-5 sm:px-6 lg:px-8">
          {detailSections.map((section) => (
            <article key={section.heading}>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{section.heading}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-700">{section.body}</p>
              {section.links?.length ? (
                <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {section.links.map((l) => (
                    <Link key={l.to} to={l.to} className={linkClass}>{l.label}</Link>
                  ))}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {/* Benefits and use cases */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Better operations, faster teams and clearer ROI.</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.
            </p>
            <ul className="mt-8 grid gap-6">
              {benefits.map(([title, text]) => (
                <li key={title} className="flex gap-3">
                  <HiOutlineCheckCircle className="mt-1 shrink-0 text-xl text-emerald-800" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-base leading-7 text-slate-600">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Industry use cases</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Flexible enough for private schools, academies, colleges and training institutes.
            </p>
            <ul className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              {useCases.map(([title, text]) => (
                <li key={title} className="flex gap-4 py-4">
                  <HiOutlineUserGroup className="mt-1 shrink-0 text-xl text-emerald-800" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-base leading-7 text-slate-600">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Related solutions */}
      <section className="bg-emerald-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Software that works with {PRODUCT}</h2>
            <Link to="/pricing" className={ctaSecondary}>Compare Pricing</Link>
          </div>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {related.map((item) => (
              <li key={item.to} className="border-t border-emerald-900/20 pt-5">
                <Link to={item.to} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800">
                  <p className="text-lg font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-2 text-base leading-7 text-slate-600">{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                    View solution
                    <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ: native disclosure, answers stay in the HTML */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{question}</h3>
                  <span className="mt-1 shrink-0 text-xl leading-none text-emerald-800 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-base leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <RelatedBlogSection topics={SOLUTION_BLOG_TOPICS[SLUG] || []} intro={`Practical guides for ${PRODUCT} users and owners.`} />

      {/* Closing CTA */}
      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-lg bg-emerald-900 p-8 sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ready to see {PRODUCT} in action?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-emerald-100">
              Start a 1-month free trial with no credit card, or book a guided demo before choosing a plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className={`${ctaBase} bg-white text-emerald-900 hover:bg-emerald-50`}>
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className={`${ctaBase} border border-emerald-300/50 text-white hover:bg-emerald-800`}>
              Book Demo
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
