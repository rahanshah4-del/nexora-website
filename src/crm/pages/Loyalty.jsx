import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  HiOutlinePlus, HiOutlineUserGroup, HiOutlineStar, HiOutlineGift,
  HiOutlineTicket, HiOutlineSparkles, HiOutlineCog6Tooth,
} from 'react-icons/hi2'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Table from '../components/ui/Table.jsx'
import Toast from '../components/ui/Toast.jsx'
import EmptyState from '../components/system/EmptyState.jsx'
import LoyaltyTierCard, { TierBadge } from '../components/loyalty/LoyaltyTierCard.jsx'
import LoyaltyEnrollModal from '../components/loyalty/LoyaltyEnrollModal.jsx'
import LoyaltyAnalyticsCards, { LoyaltyTierDistribution } from '../components/loyalty/LoyaltyAnalyticsCards.jsx'
import { useLoyaltyAccounts } from '../hooks/useLoyaltyAccounts.js'
import { useLoyaltyAnalytics } from '../hooks/useLoyaltyAnalytics.js'
import { useCustomers } from '../hooks/useCustomers.js'
import { useUser } from '../hooks/useUser.js'
import { MEMBERSHIP_TIERS } from '../lib/loyaltyCalculations.js'
import { formatCompact, formatCurrency } from '../utils/format.js'

function formatDate(value) {
  if (!value) return '—'
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

const TAB_KEYS = ['overview', 'members', 'tiers']
const TAB_LABELS = { overview: 'Overview', members: 'Members', tiers: 'Tiers' }
const TAB_ICONS = { overview: HiOutlineStar, members: HiOutlineUserGroup, tiers: HiOutlineStar }

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [showEnroll, setShowEnroll] = useState(false)
  const [toast, setToast] = useState(null)

  const accountsApi = useLoyaltyAccounts({ paginated: true, limitCount: 50 })
  const customersApi = useCustomers({ limitCount: 50 })
  const analytics = useLoyaltyAnalytics({ enabled: activeTab === 'overview' })

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return accountsApi.accounts
    return accountsApi.accounts.filter((a) =>
      [a.customerName, a.customerEmail, a.customerPhone, a.membershipId].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    )
  }, [accountsApi.accounts, search])

  const columns = [
    { key: 'membershipId', header: 'Membership ID', cell: (r) => <span className="font-mono text-xs font-bold text-slate-950">{r.membershipId}</span> },
    { key: 'customerName', header: 'Member', cell: (r) => <span className="font-semibold text-slate-950">{r.customerName}</span> },
    { key: 'tier', header: 'Tier', cell: (r) => <TierBadge tierId={r.currentTier || 'bronze'} /> },
    { key: 'points', header: 'Points', cell: (r) => <Badge variant="info">{formatCompact(r.currentPoints || 0)}</Badge> },
    { key: 'lifetimePoints', header: 'Lifetime', cell: (r) => formatCompact(r.lifetimePoints || 0) },
    { key: 'lifetimeSpend', header: 'Spend', cell: (r) => formatCurrency(r.lifetimeSpend || 0) },
    { key: 'visits', header: 'Visits', cell: (r) => r.visits || r.posOrdersCount || 0 },
    { key: 'status', header: 'Status', cell: (r) => <Badge variant={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'createdAt', header: 'Enrolled', cell: (r) => formatDate(r.createdAt) },
  ]

  function showToast(tone, message) {
    setToast({ tone, message })
    setTimeout(() => setToast(null), 1800)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}

      <PageHeader
        title="Loyalty & Rewards"
        subtitle="Manage membership tiers, points engine, rewards, coupons, and customer loyalty programs."
        right={
          <>
            <Link to="/app/loyalty/rewards"><Button variant="subtle" className="rounded-2xl"><HiOutlineGift className="text-lg" /> Rewards</Button></Link>
            <Link to="/app/loyalty/coupons"><Button variant="subtle" className="rounded-2xl"><HiOutlineTicket className="text-lg" /> Coupons</Button></Link>
            <Link to="/app/loyalty/campaigns"><Button variant="subtle" className="rounded-2xl"><HiOutlineSparkles className="text-lg" /> Campaigns</Button></Link>
            <Link to="/app/loyalty/settings"><Button variant="subtle" className="rounded-2xl"><HiOutlineCog6Tooth className="text-lg" /> Settings</Button></Link>
            <Button className="rounded-2xl" type="button" onClick={() => setShowEnroll(true)}>
              <HiOutlinePlus className="text-lg" /> Enroll Member
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5">
        {TAB_KEYS.map((key) => {
          const Icon = TAB_ICONS[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeTab === key ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" /> {TAB_LABELS[key]}
            </button>
          )
        })}
        <Link to="/app/loyalty/rewards" className="ml-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">
          <HiOutlineGift className="h-4 w-4" /> Rewards
        </Link>
        <Link to="/app/loyalty/coupons" className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">
          <HiOutlineTicket className="h-4 w-4" /> Coupons
        </Link>
        <Link to="/app/loyalty/campaigns" className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">
          <HiOutlineSparkles className="h-4 w-4" /> Campaigns
        </Link>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <LoyaltyAnalyticsCards kpis={analytics.kpis} loading={analytics.loading} />
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-4"><LoyaltyTierDistribution tierDistribution={analytics.kpis.tierDistribution} /></div>
            <div className="lg:col-span-8">
              <Card className="p-5">
                <p className="mb-4 text-sm font-bold text-slate-950">Tier Requirements</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        <th className="px-3 py-2">Tier</th><th className="px-3 py-2">Min Spend</th>
                        <th className="px-3 py-2">Min Visits</th><th className="px-3 py-2">Min Points</th>
                        <th className="px-3 py-2">Discount</th><th className="px-3 py-2">Benefits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MEMBERSHIP_TIERS.map((tier) => (
                        <tr key={tier.id}>
                          <td className="px-3 py-2.5" data-label="Tier"><TierBadge tierId={tier.id} /></td>
                          <td className="px-3 py-2.5 font-semibold" data-label="Min Spend">Rs {tier.minSpend.toLocaleString()}</td>
                          <td className="px-3 py-2.5" data-label="Min Visits">{tier.minVisits}</td>
                          <td className="px-3 py-2.5" data-label="Min Points">{tier.minPoints.toLocaleString()}</td>
                          <td className="px-3 py-2.5 font-bold" data-label="Discount">{tier.discountPct}%</td>
                          <td className="px-3 py-2.5 text-xs text-slate-600" data-label="Benefits">{tier.benefits.slice(0, 2).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <Input placeholder="Search by name, email, phone, or membership ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <Badge variant={accountsApi.source === 'firestore' ? 'success' : 'default'}>
                {accountsApi.loading ? 'Loading...' : `${accountsApi.accounts.length} members`}
              </Badge>
            </div>
            {accountsApi.error ? <p className="mt-3 text-sm font-semibold text-rose-700">{accountsApi.error}</p> : null}
            <div className="mt-4">
              {accountsApi.loading ? (
                <div className="grid min-h-[14rem] place-items-center text-sm text-slate-600">Loading members...</div>
              ) : filteredAccounts.length ? (
                <Table columns={columns} rows={filteredAccounts} />
              ) : (
                <EmptyState title="No members enrolled" description="Enroll customers in your loyalty program to see them here."
                  actionLabel="Enroll Member" onAction={() => setShowEnroll(true)} />
              )}
            </div>
            {!accountsApi.loading && accountsApi.hasMore ? (
              <div className="mt-4 flex justify-center">
                <Button variant="subtle" className="rounded-2xl" disabled={accountsApi.paginationLoading}
                  onClick={() => accountsApi.loadMore()}>
                  {accountsApi.paginationLoading ? 'Loading...' : 'Load more members'}
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {activeTab === 'tiers' && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MEMBERSHIP_TIERS.map((tier) => (
            <div key={tier.id} className={`rounded-2xl border-2 p-5 ${tier.id === 'bronze' ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: tier.color }} />
                <h3 className="text-lg font-black text-slate-950">{tier.label}</h3>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Minimum Spend</p>
                  <p className="text-lg font-bold text-slate-950">Rs {tier.minSpend.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Required Visits</p>
                  <p className="text-lg font-bold text-slate-950">{tier.minVisits}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">Required Points</p>
                  <p className="text-lg font-bold text-slate-950">{tier.minPoints.toLocaleString()}</p>
                </div>
                {tier.discountPct > 0 && (
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-emerald-600">Discount</p>
                    <p className="text-lg font-bold text-emerald-700">{tier.discountPct}% Off</p>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-bold uppercase text-slate-500">Benefits</p>
                {tier.benefits.map((b, bi) => (
                  <div key={bi} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="text-emerald-500">✓</span> {b}
                  </div>
                ))}
              </div>
              {tier.priorityService && (
                <div className="mt-4 rounded-xl bg-amber-50 p-2 text-center text-xs font-bold text-amber-700">
                  ⭐ Priority Service Included
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <LoyaltyEnrollModal
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
        existingCustomers={customersApi.customers}
        onEnroll={async (payload) => {
          const res = await accountsApi.enrollCustomer(payload)
          if (res.ok) {
            showToast('success', `${payload.customerName} enrolled as member!`)
            setShowEnroll(false)
          } else {
            showToast('error', res.error || 'Enrollment failed')
          }
        }}
      />
    </motion.div>
  )
}
