import { Link, Navigate, useParams } from 'react-router-dom'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineCloud,
  HiOutlineDevicePhoneMobile,
  HiOutlineDocumentChartBar,
  HiOutlineMapPin,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'

const whatsappLeadLink = `https://wa.me/923194329754?text=${encodeURIComponent(
  'Assalam o Alaikum, I want to book a Nexora product demo.',
)}`

const commonFaqs = [
  ['Can Nexora work on desktop and mobile?', 'Yes. Nexora is built for web dashboards, desktop counters and mobile-ready access with secure cloud sync.'],
  ['Can my team have different permissions?', 'Yes. Owners can control role-based access for managers, sales teams, accountants and operational staff.'],
  ['Do you provide onboarding support?', 'Yes. Nexora offers guided setup, demo sessions and support for moving teams into the right workflow.'],
]

const solutionPages = {
  'crm': {
    eyebrow: 'CRM Solution',
    productName: 'Nexora CRM',
    headlineBefore: 'A complete CRM for leads, customers, invoices and ',
    headlineHighlight: 'team growth.',
    description: 'Manage your sales pipeline, customer follow-ups, invoices, tasks and team activity from one clean business dashboard.',
    icon: HiOutlineUserGroup,
    previewTitle: 'Revenue Command Center',
    previewLabel: 'Live CRM workspace',
    sidebar: ['Dashboard', 'Leads', 'Customers', 'Pipeline', 'Invoices', 'Tasks'],
    stats: [
      ['Open Leads', '184', '+18%'],
      ['Won Deals', 'PKR 2.4M', '+12%'],
      ['Follow-ups', '47', 'Today'],
    ],
    rows: ['Lead captured', 'Invoice sent', 'Task assigned', 'Deal moved'],
    features: [
      ['Leads', 'Capture, assign and track leads from first contact to closed deal.', HiOutlineUserGroup],
      ['Customers', 'Keep customer profiles, history, notes and activity in one place.', HiOutlineShieldCheck],
      ['Pipeline', 'Visualize sales stages and team movement across every opportunity.', HiOutlineChartBarSquare],
      ['Invoices', 'Create business invoices and keep sales connected to payments.', HiOutlineDocumentChartBar],
      ['Tasks', 'Plan follow-ups, assign work and keep teams accountable.', HiOutlineCheckCircle],
      ['Team Management', 'Control roles, visibility and daily performance across staff.', HiOutlineUserGroup],
    ],
    benefits: ['Improve lead conversion speed', 'Reduce missed follow-ups', 'Connect sales and billing', 'Give managers clear performance visibility'],
    useCases: ['Real estate agencies', 'Service businesses', 'B2B sales teams', 'Consultants and field teams'],
    faqs: [
      ['Can I manage invoices inside CRM?', 'Yes. CRM workflows can include customers, invoices, follow-ups and payment visibility.'],
      ['Can managers see team performance?', 'Yes. Managers can review leads, tasks, pipeline movement and reports from the dashboard.'],
    ],
  },
  'school-erp': {
    eyebrow: 'School ERP Solution',
    productName: 'Nexora School ERP',
    headlineBefore: 'Run admissions, attendance, fees and academics from ',
    headlineHighlight: 'one school system.',
    description: 'A modern ERP for schools to manage students, classes, attendance, fees, exams, parent communication and academic reporting.',
    icon: HiOutlineAcademicCap,
    previewTitle: 'Academic Operations Hub',
    previewLabel: 'School ERP dashboard',
    sidebar: ['Students', 'Attendance', 'Fees', 'Exams', 'Parents', 'Reports'],
    stats: [
      ['Students', '1,284', '+42'],
      ['Fee Collection', 'PKR 3.1M', 'This month'],
      ['Attendance', '94%', 'Today'],
    ],
    rows: ['Student admitted', 'Fee voucher paid', 'Exam schedule updated', 'Parent notified'],
    features: [
      ['Student Management', 'Maintain student records, classes, sections and guardian details.', HiOutlineAcademicCap],
      ['Attendance', 'Track daily attendance with quick class and student-level views.', HiOutlineCheckCircle],
      ['Fee Management', 'Manage fee vouchers, dues, collections and financial summaries.', HiOutlineDocumentChartBar],
      ['Exams', 'Plan exam schedules, marks and result workflows.', HiOutlineChartBarSquare],
      ['Parent Portal', 'Keep parents informed with academic and payment visibility.', HiOutlineChatBubbleLeftRight],
      ['Academic Reports', 'Generate performance, attendance and fee reports for leadership.', HiOutlineDocumentChartBar],
    ],
    benefits: ['Reduce manual admin work', 'Improve fee visibility', 'Keep parents better informed', 'Give principals clean academic reporting'],
    useCases: ['Private schools', 'Academies', 'Colleges', 'Training institutes'],
    faqs: [
      ['Can schools manage fees and exams together?', 'Yes. Nexora School ERP combines fee management, exams, attendance and reports.'],
      ['Can parents receive updates?', 'Yes. Parent-facing workflows can support academic, attendance and fee visibility.'],
    ],
  },
  'property-erp': {
    eyebrow: 'Property ERP Solution',
    productName: 'Nexora Property ERP',
    headlineBefore: 'Manage tenants, rent, leases and maintenance with ',
    headlineHighlight: 'property-grade control.',
    description: 'A property management ERP for owners, agencies and teams handling tenants, rent collection, lease tracking and maintenance requests.',
    icon: HiOutlineBuildingOffice2,
    previewTitle: 'Property Portfolio Desk',
    previewLabel: 'Property ERP workspace',
    sidebar: ['Properties', 'Tenants', 'Rent', 'Leases', 'Maintenance', 'Reports'],
    stats: [
      ['Properties', '86', 'Active'],
      ['Rent Collected', 'PKR 5.8M', '+9%'],
      ['Open Requests', '12', 'Pending'],
    ],
    rows: ['Rent payment recorded', 'Lease renewed', 'Maintenance assigned', 'Owner report ready'],
    features: [
      ['Tenant Management', 'Organize tenant profiles, contacts, dues and activity history.', HiOutlineUserGroup],
      ['Rent Collection', 'Track rent payments, balances and collection performance.', HiOutlineDocumentChartBar],
      ['Lease Tracking', 'Monitor lease dates, renewals and agreement status.', HiOutlineCheckCircle],
      ['Maintenance Requests', 'Assign maintenance work and keep requests visible.', HiOutlineBuildingOffice2],
      ['Financial Reports', 'View owner, rent and portfolio level financial summaries.', HiOutlineChartBarSquare],
      ['Cloud Access', 'Keep property teams connected from office and field.', HiOutlineCloud],
    ],
    benefits: ['Improve rent collection visibility', 'Reduce tenant follow-up gaps', 'Keep leases organized', 'Make owner reporting faster'],
    useCases: ['Property dealers', 'Building managers', 'Rental portfolios', 'Commercial property teams'],
    faqs: [
      ['Can I track rent balances?', 'Yes. Property ERP workflows include rent collection, balances and reporting.'],
      ['Can maintenance teams use it?', 'Yes. Maintenance requests can be tracked and assigned from the same workspace.'],
    ],
  },
  'pos': {
    eyebrow: 'POS Solution',
    productName: 'Nexora POS',
    headlineBefore: 'A fast, modern POS for restaurants, retail, medical stores and ',
    headlineHighlight: 'multi-counter sales.',
    description: 'A desktop, web and mobile-ready POS for billing, inventory, receipt printing, reports, staff roles and secure cloud sync.',
    icon: HiOutlineShoppingCart,
    previewTitle: 'Live Counter Workspace',
    previewLabel: 'Nexora POS live',
    sidebar: ['Counter', 'Products', 'Inventory', 'Receipts', 'Reports', 'Roles'],
    stats: [
      ['Today Sales', 'PKR 184K', '+22%'],
      ['Inventory Alerts', '16', 'Low stock'],
      ['Receipts', '328', 'Printed'],
    ],
    rows: ['Restaurant order billed', 'Receipt printed', 'Stock synced', 'Cashier report closed'],
    features: [
      ['Restaurant POS', 'Handle tables, quick bills, receipts, taxes and daily sales.', HiOutlineBuildingOffice2],
      ['Retail POS', 'Run barcode-ready sales, returns and stock movement.', HiOutlineShoppingCart],
      ['Medical Store POS', 'Support fast item search, receipts and inventory checks.', HiOutlineShieldCheck],
      ['Mall POS', 'Operate multi-counter sales and branch-level summaries.', HiOutlineCloud],
      ['Inventory Management', 'Track products, stock alerts, pricing and movement.', HiOutlineChartBarSquare],
      ['Receipt Printing', 'Print, email or sync receipts into reports instantly.', HiOutlineDocumentChartBar],
      ['Reports', 'View sales, cash summaries, staff performance and trends.', HiOutlineChartBarSquare],
      ['Multi-user Access', 'Set owner, manager, cashier and staff roles.', HiOutlineUserGroup],
      ['Cloud Sync', 'Keep counter, back office and mobile access aligned.', HiOutlineCloud],
    ],
    benefits: ['Speed up billing lines', 'Reduce stock mistakes', 'Control cashier access', 'See daily sales from anywhere'],
    useCases: ['Restaurants', 'Retail stores', 'Medical stores', 'Malls', 'Transport and fleet counters'],
    faqs: [
      ['Can Nexora POS print receipts?', 'Yes. POS workflows support receipt printing, email-ready receipts and reporting sync.'],
      ['Can it support multiple counters?', 'Yes. Nexora POS is built for multi-user and multi-counter workflows.'],
    ],
  },
  'whatsapp-crm': {
    eyebrow: 'WhatsApp CRM Solution',
    productName: 'Nexora WhatsApp CRM',
    headlineBefore: 'Turn WhatsApp conversations into follow-ups, automation and ',
    headlineHighlight: 'customer wins.',
    description: 'Manage broadcasts, follow-ups, automation and customer tracking so every conversation becomes a measurable business workflow.',
    icon: HiOutlineChatBubbleLeftRight,
    previewTitle: 'Conversation Growth Desk',
    previewLabel: 'WhatsApp CRM workflow',
    sidebar: ['Inbox', 'Broadcasts', 'Automation', 'Follow-ups', 'Customers', 'Reports'],
    stats: [
      ['Broadcasts', '24K', 'Sent'],
      ['Follow-ups', '312', 'Queued'],
      ['Replies', '38%', '+11%'],
    ],
    rows: ['Broadcast delivered', 'Follow-up scheduled', 'Customer tagged', 'Automation triggered'],
    features: [
      ['Broadcast Messaging', 'Send targeted updates to customers and prospects.', HiOutlineChatBubbleLeftRight],
      ['Follow-ups', 'Schedule team follow-ups and reduce missed conversations.', HiOutlineCheckCircle],
      ['Automation', 'Trigger consistent responses and repeatable outreach flows.', HiOutlineCloud],
      ['Customer Tracking', 'Link conversations with customer records and activity.', HiOutlineUserGroup],
      ['Reports', 'Measure outreach, response rates and team performance.', HiOutlineChartBarSquare],
      ['Mobile Ready', 'Support fast customer handling across devices.', HiOutlineDevicePhoneMobile],
    ],
    benefits: ['Improve response discipline', 'Make campaigns measurable', 'Keep customer context organized', 'Support sales and service teams'],
    useCases: ['Sales teams', 'Service teams', 'Retail campaigns', 'Education and admissions teams'],
    faqs: [
      ['Can broadcasts be tracked?', 'Yes. Campaign activity can be connected with customer follow-up and reporting.'],
      ['Can teams assign follow-ups?', 'Yes. WhatsApp CRM workflows support team follow-ups and customer tracking.'],
    ],
  },
  'reports': {
    eyebrow: 'Reports Solution',
    productName: 'Nexora Reports',
    headlineBefore: 'Business intelligence, KPI dashboards and exports for ',
    headlineHighlight: 'smarter decisions.',
    description: 'Turn CRM, POS, school, property and finance activity into clear dashboards, PDF reports, Excel exports and leadership-ready insights.',
    icon: HiOutlineDocumentChartBar,
    previewTitle: 'Executive Reporting Suite',
    previewLabel: 'Analytics dashboard',
    sidebar: ['Analytics', 'KPI', 'PDF Reports', 'Excel Export', 'BI', 'Trends'],
    stats: [
      ['Revenue', 'PKR 8.6M', '+17%'],
      ['KPI Score', '92%', 'Healthy'],
      ['Reports', '48', 'Generated'],
    ],
    rows: ['PDF report exported', 'KPI dashboard opened', 'Excel sheet prepared', 'Trend report shared'],
    features: [
      ['Analytics', 'Review operational, sales and financial performance in one place.', HiOutlineChartBarSquare],
      ['KPI Dashboards', 'Track key indicators for leadership and managers.', HiOutlineDocumentChartBar],
      ['PDF Reports', 'Create polished PDF reports for clients and teams.', HiOutlineDocumentChartBar],
      ['Excel Export', 'Export business data for finance and advanced analysis.', HiOutlineCheckCircle],
      ['Business Intelligence', 'Compare performance trends across departments and modules.', HiOutlineCloud],
      ['Secure Visibility', 'Keep reporting access controlled by role and workspace.', HiOutlineShieldCheck],
    ],
    benefits: ['Make decisions with clean data', 'Reduce manual report preparation', 'Give leadership faster visibility', 'Connect multiple business modules'],
    useCases: ['Owners and directors', 'Finance teams', 'Sales managers', 'Operations leaders'],
    faqs: [
      ['Can reports export to PDF and Excel?', 'Yes. Reports workflows include PDF reporting and Excel export capability.'],
      ['Can reports combine business areas?', 'Yes. Nexora Reports is designed to connect activity across modules where access is enabled.'],
    ],
  },
}

function SoftwareMockup({ page }) {
  return (
    <div className="relative mx-auto w-full max-w-[60rem]">
      <div className="pos-float-card absolute -left-5 top-16 z-10 hidden w-48 rounded-[1.45rem] border border-blue-100 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.42)] backdrop-blur xl:block">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-slate-400">{page.productName}</p>
        <p className="mt-2 text-2xl font-black text-slate-950">{page.stats[0][1]}</p>
        <p className="mt-1 text-xs font-semibold text-emerald-600">{page.stats[0][2]}</p>
      </div>

      <div className="pos-float-card absolute -right-4 bottom-14 z-10 hidden w-52 rounded-[1.45rem] border border-sky-100 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.4)] backdrop-blur lg:block">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <HiOutlineCloud className="text-xl" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-slate-950">Cloud Synced</p>
            <p className="text-xs text-slate-500">Desktop, web, mobile</p>
          </div>
        </div>
      </div>

      <div className="pos-preview-shell overflow-hidden rounded-[2rem] border border-blue-100/90 bg-white shadow-[0_44px_126px_-62px_rgba(15,23,42,0.58)] ring-1 ring-white/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="hidden rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-blue-700 sm:block">
            {page.previewLabel}
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] font-bold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </div>
        </div>

        <div className="grid min-h-[24rem] grid-cols-[6.2rem_1fr] bg-[linear-gradient(180deg,#fbfdff_0%,#edf6ff_100%)] sm:grid-cols-[8rem_1fr] lg:grid-cols-[9rem_1fr]">
          <aside className="border-r border-blue-50 bg-white/70 px-2 py-4">
            <div className="grid gap-1">
              {page.sidebar.map((item, index) => (
                <span
                  key={item}
                  className={`truncate rounded-lg px-2 py-2 text-[0.58rem] font-bold sm:text-[0.68rem] ${
                    index === 0 ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </aside>

          <div className="min-w-0 p-3 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Nexora Suite</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{page.previewTitle}</h2>
              </div>
              <span className="w-max rounded-full bg-slate-950 px-4 py-2 text-xs font-extrabold text-white">Live workspace</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {page.stats.map(([label, value, note]) => (
                <div key={label} className="rounded-[1.2rem] border border-white bg-white p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
                  <p className="text-[0.65rem] font-bold text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
                  <p className="mt-1 text-xs font-bold text-blue-600">{note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_16rem]">
              <div className="rounded-[1.3rem] border border-white bg-white p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-950">Performance Overview</p>
                  <span className="rounded-full border border-slate-200 px-2 py-1 text-[0.6rem] font-bold text-slate-500">This month</span>
                </div>
                <svg viewBox="0 0 420 160" className="h-40 w-full text-blue-600" fill="none" aria-hidden="true">
                  <path d="M12 138 L54 92 L92 108 L132 58 L174 84 L214 42 L254 102 L294 52 L334 76 L376 34 L410 18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  <path d="M12 138 L54 92 L92 108 L132 58 L174 84 L214 42 L254 102 L294 52 L334 76 L376 34 L410 18 L410 160 L12 160 Z" fill="currentColor" opacity="0.08" />
                </svg>
              </div>

              <div className="rounded-[1.3rem] border border-white bg-white p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
                <p className="text-sm font-extrabold text-slate-950">Recent Activity</p>
                <div className="mt-3 space-y-2">
                  {page.rows.map((row) => (
                    <div key={row} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600">
                        <HiOutlineCheckCircle className="m-2 text-base" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{row}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SolutionPage() {
  const { solutionSlug } = useParams()
  const page = solutionPages[solutionSlug]

  if (!page) return <Navigate to="/" replace />

  const Icon = page.icon
  const faqs = [...page.faqs, ...commonFaqs]

  return (
    <PublicPageShell>
      <section className="hero-enter relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_72%,#ffffff_100%)] pb-16 pt-12 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              <Icon className="text-base" />
              {page.eyebrow}
            </span>
            <h1 className="website-hero-heading mt-6 text-[2.75rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.2rem] lg:text-[5.2rem]">
              {page.headlineBefore}
              <span className="marker-highlight marker-highlight-blue">{page.headlineHighlight}</span>
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">{page.description}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 min-[390px]:flex-row lg:justify-start">
              <Link to="/signup" className="premium-button-primary">
                Start Free Trial
                <HiOutlineArrowRight className="text-lg" />
              </Link>
              <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className="premium-button-secondary">
                Book Demo
                <HiOutlinePlayCircle className="text-xl text-blue-600" />
              </a>
            </div>
          </div>

          <SoftwareMockup page={page} />
        </div>
      </section>

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Key features for <span className="marker-highlight marker-highlight-blue">{page.productName}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Purpose-built tools, clean permissions and a premium workflow designed for daily business operations.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map(([title, text, FeatureIcon]) => (
              <article key={title} className="premium-card group flex min-h-48 gap-4 p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 transition duration-200 group-hover:bg-slate-950 group-hover:text-white">
                  <FeatureIcon className="text-2xl" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              Business Benefits
            </span>
            <h2 className="website-section-heading mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Better operations, faster teams and clearer ROI.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {page.benefits.map((benefit) => (
              <div key={benefit} className="rounded-[1.35rem] border border-blue-100 bg-white p-5 shadow-[0_22px_62px_-44px_rgba(37,99,235,0.32)]">
                <HiOutlineCheckCircle className="text-2xl text-blue-600" />
                <p className="mt-4 text-lg font-black text-slate-950">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Industry use cases</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Flexible enough for modern service, sales, education, property, retail and operations teams.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {page.useCases.map((useCase) => (
                <div key={useCase} className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.45)]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
                    <HiOutlineMapPin className="text-xl" />
                  </span>
                  <p className="text-sm font-extrabold text-slate-900">{useCase}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Frequently asked questions</h2>
          </div>
          <div className="mt-10 grid gap-4">
            {faqs.map(([question, answer]) => (
              <article key={question} className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_18px_54px_-42px_rgba(15,23,42,0.36)]">
                <h3 className="text-base font-black text-slate-950">{question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(37,99,235,0.44)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Ready to see {page.productName} in action?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Start free or book a guided demo with a Nexora product specialist.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <Link to="/signup" className="premium-button-primary">
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className="premium-button-secondary">
              Book Demo
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
