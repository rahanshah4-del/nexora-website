import Card from '../ui/Card.jsx'
import Badge from '../ui/Badge.jsx'
import {
  HiOutlineUsers, HiOutlineStar, HiOutlineSparkles, HiOutlineGift,
  HiOutlineTicket, HiOutlineUserGroup, HiOutlineCurrencyDollar, HiOutlineChartBar,
  HiOutlineArrowTrendingUp,
} from 'react-icons/hi2'
import { formatCompact, formatCurrency } from '../../utils/format.js'
import { ANALYTICS_KPI_DEFAULTS } from '../../lib/loyaltyCalculations.js'

const KPI_CARDS = [
  { key: 'totalMembers', label: 'Members', icon: HiOutlineUsers, tone: 'sky' },
  { key: 'activeMembers', label: 'Active Members', icon: HiOutlineStar, tone: 'emerald' },
  { key: 'totalPointsIssued', label: 'Points Issued', icon: HiOutlineSparkles, tone: 'violet', format: (v) => formatCompact(v) },
  { key: 'totalPointsRedeemed', label: 'Points Redeemed', icon: HiOutlineGift, tone: 'amber', format: (v) => formatCompact(v) },
  { key: 'totalRewardsRedeemed', label: 'Rewards Redeemed', icon: HiOutlineGift, tone: 'purple' },
  { key: 'totalCouponsGenerated', label: 'Coupons', icon: HiOutlineTicket, tone: 'cyan' },
  { key: 'vipCount', label: 'VIP Customers', icon: HiOutlineUserGroup, tone: 'rose' },
  { key: 'totalReferrals', label: 'Referrals', icon: HiOutlineUserGroup, tone: 'sky' },
  { key: 'totalWalletBalance', label: 'Wallet Balance', icon: HiOutlineCurrencyDollar, tone: 'emerald', format: (v) => formatCurrency(v) },
  { key: 'repeatRate', label: 'Repeat Rate', icon: HiOutlineArrowTrendingUp, tone: 'violet', format: (v) => `${v}%` },
  { key: 'retentionRate', label: 'Retention', icon: HiOutlineChartBar, tone: 'sky', format: (v) => `${v}%` },
  { key: 'lifetimeValue', label: 'LTV', icon: HiOutlineCurrencyDollar, tone: 'amber', format: (v) => formatCurrency(v) },
]

export default function LoyaltyAnalyticsCards({ kpis = ANALYTICS_KPI_DEFAULTS, loading = false }) {
  return (
    <div className="crm-auto-grid gap-4">
      {KPI_CARDS.map((card) => {
        const value = kpis[card.key] ?? 0
        const Icon = card.icon
        const formatFn = card.format || ((v) => formatCompact(v))
        return (
          <Card key={card.key} className="p-4">
            {loading ? (
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-6 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{formatFn(value)}</p>
                  </div>
                  <Icon className={`h-8 w-8 shrink-0 text-${card.tone}-500 opacity-40`} />
                </div>
                {card.key === 'repeatRate' && kpis.averageVisits > 0 && (
                  <p className="mt-1 text-xs text-slate-500">{kpis.averageVisits} avg visits</p>
                )}
              </>
            )}
          </Card>
        )
      })}
    </div>
  )
}

export function LoyaltyTierDistribution({ tierDistribution = {} }) {
  const tiers = [
    { id: 'bronze', label: 'Bronze', color: '#cd7f32' },
    { id: 'silver', label: 'Silver', color: '#c0c0c0' },
    { id: 'gold', label: 'Gold', color: '#ffd700' },
    { id: 'platinum', label: 'Platinum', color: '#e5e4e2' },
    { id: 'vip', label: 'VIP', color: '#b9f2ff' },
  ]
  const total = Object.values(tierDistribution).reduce((s, v) => s + Number(v || 0), 0) || 1

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-bold text-slate-950">Tier Distribution</p>
      <div className="space-y-3">
        {tiers.map((tier) => {
          const count = Number(tierDistribution[tier.id] || 0)
          const pct = Math.round((count / total) * 100)
          return (
            <div key={tier.id}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tier.color }} />
                  {tier.label}
                </span>
                <span className="font-bold text-slate-950">{count} ({pct}%)</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tier.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
