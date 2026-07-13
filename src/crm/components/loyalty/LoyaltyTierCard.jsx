import { motion } from 'framer-motion'
import { MEMBERSHIP_TIERS } from '../../lib/loyaltyCalculations.js'
import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'

export default function LoyaltyTierCard({ tierId = 'bronze', progress = 0, nextLabel = '' }) {
  const tier = MEMBERSHIP_TIERS.find((t) => t.id === tierId) || MEMBERSHIP_TIERS[0]
  const isMax = tierId === 'vip'
  const safeProgress = Math.min(100, Math.max(0, Number(progress)))

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute right-0 top-0 h-24 w-24 opacity-5">
        <div className="h-full w-full rounded-bl-full" style={{ backgroundColor: tier.color }} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current Tier</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
            <h3 className="text-xl font-black text-slate-950">{tier.label}</h3>
          </div>
        </div>
        <Badge variant={isMax ? 'purple' : 'info'}>
          {tier.discountPct > 0 ? `${tier.discountPct}% Discount` : 'Entry Level'}
        </Badge>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-600">{isMax ? 'Maximum Tier' : `Progress to ${nextLabel || 'Next Tier'}`}</span>
          <span className="font-bold text-slate-950">{safeProgress}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${safeProgress}%`, backgroundColor: tier.color }}
          />
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {tier.benefits.slice(0, 3).map((benefit, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-emerald-500">✓</span> {benefit}
          </div>
        ))}
        {tier.benefits.length > 3 && (
          <p className="text-xs font-semibold text-sky-600">+{tier.benefits.length - 3} more benefits</p>
        )}
      </div>
    </Card>
  )
}

export function TierBadge({ tierId = 'bronze', size = 'sm' }) {
  const tier = MEMBERSHIP_TIERS.find((t) => t.id === tierId) || MEMBERSHIP_TIERS[0]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}
      style={{ backgroundColor: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tier.color }} />
      {tier.label}
    </span>
  )
}

export function TierList() {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {MEMBERSHIP_TIERS.map((tier, i) => (
        <motion.div
          key={tier.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl border p-4"
          style={{ borderColor: `${tier.color}40` }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
            <h4 className="font-black text-slate-950">{tier.label}</h4>
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-slate-600">
            <p>Min Spend: Rs {tier.minSpend.toLocaleString()}</p>
            <p>Min Visits: {tier.minVisits}</p>
            <p>Min Points: {tier.minPoints.toLocaleString()}</p>
            {tier.discountPct > 0 && <p className="font-bold">Discount: {tier.discountPct}%</p>}
            {tier.priorityService && <p className="font-semibold text-sky-600">Priority Service</p>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
