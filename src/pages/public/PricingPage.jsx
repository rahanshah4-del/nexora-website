import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlineArrowRight,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCloud,
  HiOutlineDocumentChartBar,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import PublicPageShell from './PublicPageShell.jsx'

const yearlyDiscount = 0.8

const pricingPlans = [
  {
    name: 'Free Forever',
    label: 'Free Forever',
    priceLabel: 'Rs 0',
    priceNote: 'No credit card required',
    description: 'For founders and small teams that want to keep Nexora running after the trial.',
    features: ['1 workspace', '1 user', '50 customers', '20 leads', '10 invoices/month', 'Basic CRM', 'Basic dashboard'],
    ctaLabel: 'Start Free Trial',
    ctaTo: '/signup',
  },
  {
    name: 'Standard',
    label: 'Paid Standard',
    monthly: 5999,
    description: 'For growing businesses that need unlimited records, team controls and support.',
    features: ['More users', 'Unlimited customers/leads/invoices', 'Reports', 'Analytics', 'Team management', 'Support tickets', 'Priority support'],
    featured: true,
    ctaLabel: 'Upgrade When Business Grows',
    ctaTo: '/signup',
  },
  {
    name: 'Enterprise',
    label: 'Enterprise Plan',
    custom: true,
    description: 'For organizations that need custom modules, users and integrations.',
    features: ['All Business Features', 'Unlimited Users', 'Custom Integrations', 'Dedicated Support', 'Custom Development', 'SLA Options'],
    ctaLabel: 'Book Demo',
    ctaTo: '/contact',
  },
]

const comparisonRows = [
  ['Workspace included', '1', true, true],
  ['Users included', '1', 'More users', 'Unlimited'],
  ['Customers', '50', 'Unlimited', 'Unlimited'],
  ['Leads', '20', 'Unlimited', 'Unlimited'],
  ['Invoices', '10/month', 'Unlimited', 'Unlimited'],
  ['Basic CRM and dashboard', true, true, true],
  ['Reports and analytics', false, true, true],
  ['Team management', false, true, true],
  ['Support tickets', false, true, true],
  ['Priority support', false, true, true],
  ['Custom integrations', false, false, true],
  ['Enterprise SLA', false, false, true],
]

const faqs = [
  ['Is Free Forever really free?', 'Yes. After the trial, you can continue on Free Forever with 1 workspace, 1 user, Basic CRM and starter limits.'],
  ['Do I need a credit card to start?', 'No. Nexora lets you start a free trial without a credit card, then continue free or upgrade when ready.'],
  ['When should I upgrade to Standard?', 'Upgrade when your team needs more users, unlimited customers, unlimited leads, unlimited invoices, reports, analytics and support tickets.'],
  ['Can I start with one module?', 'Yes. You can start with CRM or the solution you need most, then upgrade as your operations grow.'],
  ['Do yearly plans save money?', 'Yes. Yearly billing applies a 20% saving compared with monthly billing.'],
  ['Can I request a custom plan?', 'Yes. Enterprise plans are tailored for larger teams, custom workflows and integrations.'],
  ['Is onboarding included?', 'Standard and Enterprise plans include guided setup support so your team can launch faster.'],
]

const highlightCards = [
  ['Start safely', 'Try Nexora without a credit card and continue Free Forever after trial.', HiOutlineCloud],
  ['Scale clearly', 'Upgrade to Standard when users, records, reports and support needs grow.', HiOutlineShieldCheck],
  ['Sell with confidence', 'CRM, invoices, analytics and support are packaged around business growth.', HiOutlineDocumentChartBar],
]

function formatPrice(amount) {
  return new Intl.NumberFormat('en-PK').format(amount)
}

function getPrice(plan, billingCycle) {
  if (plan.custom) return 'Custom Pricing'
  if (plan.priceLabel) return plan.priceLabel
  if (billingCycle === 'yearly') return `Rs ${formatPrice(Math.round(plan.monthly * 12 * yearlyDiscount))}`
  return `Rs ${formatPrice(plan.monthly)}`
}

function renderComparisonValue(value) {
  if (value === true) return <HiOutlineCheckCircle className="mx-auto text-2xl text-blue-600" />
  if (value === false) return <span className="text-sm font-bold text-slate-300">-</span>
  return <span className="text-center text-xs font-extrabold text-blue-700">{value}</span>
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly')

  return (
    <PublicPageShell>
      <section className="hero-enter relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_72%,#ffffff_100%)] pb-16 pt-12 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            Nexora Pricing
          </span>
          <h1 className="website-hero-heading mx-auto mt-6 max-w-5xl text-[2.85rem] font-black leading-[0.98] tracking-tight text-slate-950 sm:text-[4.4rem] lg:text-[5.7rem]">
            Start free, stay free, then upgrade when <span className="marker-highlight marker-highlight-blue">business grows.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            Try Nexora with no credit card, continue Free Forever after the trial, and move to Standard when your team needs unlimited growth tools.
          </p>
          <div className="mx-auto mt-7 grid max-w-4xl gap-3 text-left sm:grid-cols-3">
            {[
              ['Start Free Trial', 'Explore Nexora with guided CRM, invoices and dashboards.'],
              ['Continue Free Forever', 'Keep 1 workspace, 1 user and starter CRM limits after trial.'],
              ['Upgrade When Ready', 'Unlock unlimited records, teams, reports and support tickets.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[1.2rem] border border-blue-100 bg-white/85 p-4 shadow-[0_22px_58px_-46px_rgba(37,99,235,0.38)]">
                <p className="text-sm font-black text-slate-950">{title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-[0_18px_46px_-34px_rgba(15,23,42,0.45)]">
            {['monthly', 'yearly'].map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={`min-h-10 rounded-full px-5 text-sm font-bold transition duration-200 ease-out ${
                  billingCycle === cycle ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                {cycle === 'monthly' ? 'Monthly' : 'Yearly (Save 20%)'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex h-full min-h-[32rem] flex-col rounded-[1.65rem] border bg-white p-6 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.34)] transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_34px_90px_-52px_rgba(37,99,235,0.32)] ${
                  plan.featured ? 'border-blue-300 bg-blue-50/50 ring-2 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="mb-4 flex min-h-7 justify-center">
                  {plan.featured && (
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[0.68rem] font-extrabold text-white">
                      Most Popular
                    </span>
                  )}
                </div>
                <h2 className={`text-center text-2xl font-black ${plan.featured ? 'text-blue-600' : 'text-slate-950'}`}>{plan.label}</h2>
                <p className="mt-3 text-center text-sm leading-6 text-slate-500">{plan.description}</p>
                <div className="mt-6 text-center">
                  <p className="text-3xl font-black text-slate-950 sm:text-4xl">{getPrice(plan, billingCycle)}</p>
                  {!plan.custom && <p className="mt-1 text-sm text-slate-500">{plan.priceNote || `/${billingCycle === 'monthly' ? 'month' : 'year'}`}</p>}
                </div>

                <div className="mt-7 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <HiOutlineCheckCircle className="mt-0.5 shrink-0 text-blue-600" />
                      <span className="leading-6">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to={plan.ctaTo}
                  className={`mt-8 inline-flex min-h-12 items-center justify-center rounded-full border px-5 text-sm font-extrabold transition duration-200 ease-out hover:-translate-y-0.5 ${
                    plan.featured
                      ? 'border-slate-950 bg-slate-950 text-white hover:bg-blue-700'
                      : 'border-slate-200 bg-white text-slate-950 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {plan.ctaLabel}
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {highlightCards.map(([title, text, Icon]) => (
              <article key={title} className="premium-card flex gap-4 p-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="text-2xl" />
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
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Feature comparison
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Compare the Free Forever starter plan with Standard and Enterprise growth packages.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-[1.65rem] border border-slate-200 bg-white shadow-[0_28px_80px_-54px_rgba(15,23,42,0.4)]">
            <div className="min-w-[46rem]">
              <div className="grid grid-cols-[1.35fr_0.8fr_0.95fr_0.9fr] border-b border-slate-100 bg-slate-950 text-white">
                {['Feature', 'Free Forever', 'Standard', 'Enterprise'].map((header) => (
                  <div key={header} className="px-3 py-4 text-xs font-black uppercase tracking-[0.14em] sm:px-5">
                    {header}
                  </div>
                ))}
              </div>
              {comparisonRows.map(([feature, free, standard, enterprise]) => (
                <div key={feature} className="grid grid-cols-[1.35fr_0.8fr_0.95fr_0.9fr] border-b border-slate-100 last:border-b-0">
                  <div className="px-3 py-4 text-sm font-bold text-slate-800 sm:px-5">{feature}</div>
                  {[free, standard, enterprise].map((value, index) => (
                    <div key={`${feature}-${index}`} className="grid place-items-center border-l border-slate-100 px-2 py-4 text-center">
                      {renderComparisonValue(value)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="website-section-heading text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Pricing FAQ</h2>
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
            <div className="mb-4 flex gap-3 text-blue-600">
              <HiOutlineUserGroup className="text-3xl" />
              <HiOutlineChartBarSquare className="text-3xl" />
              <HiOutlineChatBubbleLeftRight className="text-3xl" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Start free today. Keep growing on your terms.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Start a free trial with no credit card, continue Free Forever after trial, or upgrade to Standard when your team needs unlimited capacity.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <Link to="/signup" className="premium-button-primary">
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <Link to="/contact" className="premium-button-secondary">
              Book Demo
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
