import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineCog6Tooth,
  HiOutlineInbox,
  HiOutlineInformationCircle,
  HiOutlineLink,
  HiOutlineRocketLaunch,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserPlus,
  HiOutlineXCircle,
} from 'react-icons/hi2'
import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import { useWhatsappPricing } from '../../hooks/useWhatsappPricing.js'
import { formatPricingAmount } from '../../lib/whatsappPricing.js'

// Complete SaaS client flow, grouped into 4 phases. Steps are numbered
// continuously 1–16 across the groups.
const FLOW_GROUPS = [
  {
    key: 'A',
    icon: HiOutlineUserPlus,
    title: 'Before Nexora',
    subtitle: 'Account & Meta prerequisites',
    steps: [
      'Client creates Nexora account',
      'Client opens WhatsApp CRM',
      'Client reviews WhatsApp CRM plan and pricing',
      'Client completes Meta Business Account setup',
      'Client completes Meta Business Verification',
      'Client adds payment method in Meta billing',
    ],
  },
  {
    key: 'B',
    icon: HiOutlineLink,
    title: 'Connect in Nexora',
    subtitle: 'Meta Embedded Signup',
    steps: [
      'Client clicks Connect WhatsApp in Nexora',
      'Client logs into Meta',
      'Client selects Business Portfolio',
      'Client selects WhatsApp Business number',
    ],
  },
  {
    key: 'C',
    icon: HiOutlineShieldCheck,
    title: 'Meta Verification',
    subtitle: 'Number & webhook',
    steps: [
      'Client completes QR / OTP verification',
      'Meta returns Phone Number ID and WABA ID',
      'Nexora verifies webhook connection',
      'WhatsApp status becomes Connected',
    ],
  },
  {
    key: 'D',
    icon: HiOutlineInbox,
    title: 'Inbox Live',
    subtitle: 'Start operating',
    steps: [
      'Messages appear in Nexora WhatsApp Inbox',
      'Team starts managing leads, follow-ups, templates and reports',
    ],
  },
]

const MONTHLY_FEATURES = [
  'Full WhatsApp CRM access',
  'Dashboard analytics',
  'Leads management',
  'Contact management',
  'Follow-ups',
  'Templates',
  'Reports',
  'Team management',
  'WhatsApp connect flow',
  'Meta billing paid by client',
]

const SETUP_FEATURES = [
  'Meta Business setup guidance',
  'Business verification guidance',
  'WhatsApp connection assistance',
  'Webhook setup',
  'CRM onboarding',
  'Team training',
]

// Pre-compute the starting step number for each group so numbering is continuous.
const GROUP_START = FLOW_GROUPS.reduce((acc, group, index) => {
  acc.push(index === 0 ? 1 : acc[index - 1] + FLOW_GROUPS[index - 1].steps.length)
  return acc
}, [])

function FeatureRow({ children, excluded = false }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {excluded ? (
        <HiOutlineXCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
      ) : (
        <HiOutlineCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      )}
      <span className={excluded ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}>{children}</span>
    </li>
  )
}

function FlowGroup({ group, startNumber }) {
  const Icon = group.icon
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-emerald-100 bg-white/70 p-4 dark:border-emerald-900/40 dark:bg-slate-900/40">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700/80 dark:text-emerald-300/80">Step {group.key}</p>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{group.title}</p>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{group.subtitle}</p>

      <ol className="relative mt-4 space-y-3 border-l-2 border-emerald-100 pl-5 dark:border-emerald-900/50">
        {group.steps.map((step, index) => (
          <li key={step} className="relative">
            <span className="absolute -left-[1.7rem] grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white ring-4 ring-white dark:ring-slate-900">
              {startNumber + index}
            </span>
            <span className="block text-sm leading-5 text-slate-700 dark:text-slate-200">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function PricingCard({ icon: Icon, name, price, priceNote, badge, highlight = false, children }) {
  return (
    <div
      className={`flex flex-col rounded-3xl border p-5 transition ${
        highlight
          ? 'border-emerald-300 bg-emerald-50/50 shadow-[0_18px_40px_-24px_rgba(16,185,129,0.7)] dark:border-emerald-800/60 dark:bg-emerald-950/20'
          : 'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <Icon className="h-5 w-5" />
        </span>
        {badge ? <Badge variant={highlight ? 'success' : 'default'}>{badge}</Badge> : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
      <div className="mt-1 flex items-end gap-1">
        <span className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{price}</span>
        {priceNote ? <span className="pb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{priceNote}</span> : null}
      </div>
      <ul className="mt-4 grid gap-2">{children}</ul>
    </div>
  )
}

// WhatsApp CRM Plan & Pricing section for the Connect WhatsApp page. Guidance
// first (full-width grouped timeline), then a single pricing section. Pricing is
// loaded live from settings/whatsappPricing with safe fallbacks so the page never
// breaks when the config doc is missing.
export default function WhatsappConnectPricing() {
  const { pricing, loading } = useWhatsappPricing({ enabled: true })
  const currency = pricing.currency || 'PKR'

  return (
    <div className="mt-6 space-y-5">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <HiOutlineSparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">WhatsApp CRM Plans &amp; Pricing</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">How the WhatsApp CRM plan works — transparent pricing, you stay in control of Meta.</p>
          </div>
        </div>
        <Badge variant={loading ? 'default' : 'success'}>{loading ? 'Loading…' : 'Live pricing'}</Badge>
      </div>

      {/* How it works — full-width grouped vertical timeline */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <HiOutlineChatBubbleLeftRight className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">How it works</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">The complete client journey — from sign-up to a live, team-managed inbox.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FLOW_GROUPS.map((group, index) => (
            <FlowGroup key={group.key} group={group} startNumber={GROUP_START[index]} />
          ))}
        </div>

        {/* Ownership note */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <HiOutlineInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">
            Nexora provides CRM and integration tools. Client owns Meta Business, WhatsApp number, billing and API usage.
          </p>
        </div>
      </Card>

      {/* Single pricing section */}
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-950 dark:text-white">Plans &amp; pricing</p>
        <div className="grid gap-4 lg:grid-cols-3">
          <PricingCard icon={HiOutlineChatBubbleLeftRight} name="Trial Access" price={`${pricing.trialDays} days`} priceNote="free trial" badge="Try it free">
            <FeatureRow>{pricing.trialDays} days trial</FeatureRow>
            <FeatureRow>1 WhatsApp number</FeatureRow>
            <FeatureRow>{pricing.trialMessageLimit} trial messages</FeatureRow>
            <FeatureRow>Basic inbox</FeatureRow>
            <FeatureRow>Contacts</FeatureRow>
            <FeatureRow>Leads</FeatureRow>
            <FeatureRow>Follow-ups</FeatureRow>
            <FeatureRow>Templates</FeatureRow>
            <FeatureRow excluded>No broadcast</FeatureRow>
            <FeatureRow excluded>No AI automation</FeatureRow>
          </PricingCard>

          <PricingCard
            icon={HiOutlineRocketLaunch}
            name="WhatsApp CRM Monthly Plan"
            price={formatPricingAmount(pricing.monthlyFee, currency)}
            priceNote="/ month"
            badge="Recommended"
            highlight
          >
            {MONTHLY_FEATURES.map((feature) => (
              <FeatureRow key={feature}>{feature}</FeatureRow>
            ))}
          </PricingCard>

          <PricingCard
            icon={HiOutlineCog6Tooth}
            name="Professional Setup Service"
            price={formatPricingAmount(pricing.setupFee, currency)}
            priceNote="one-time"
            badge="Done-for-you"
          >
            {SETUP_FEATURES.map((feature) => (
              <FeatureRow key={feature}>{feature}</FeatureRow>
            ))}
          </PricingCard>
        </div>
      </div>
    </div>
  )
}
