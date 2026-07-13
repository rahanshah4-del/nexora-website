import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { fetchWorkspaceCollectionPage } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { useLoyaltyAccounts } from './useLoyaltyAccounts.js'
import { useLoyaltyRewards } from './useLoyaltyRewards.js'
import { useLoyaltyCoupons } from './useLoyaltyCoupons.js'
import { useLoyaltyReferrals } from './useLoyaltyReferrals.js'
import { useLoyaltyWallet } from './useLoyaltyWallet.js'
import { calculateLoyaltyAnalytics, ANALYTICS_KPI_DEFAULTS } from '../lib/loyaltyCalculations.js'

export function useLoyaltyAnalytics({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, role } = useUser()
  const accountsApi = useLoyaltyAccounts({ limitCount: 500, enabled })
  const rewardsApi = useLoyaltyRewards({ limitCount: 500, enabled })
  const couponsApi = useLoyaltyCoupons({ limitCount: 500, enabled })
  const referralsApi = useLoyaltyReferrals({ limitCount: 500, enabled })
  const walletApi = useLoyaltyWallet({ limitCount: 500, enabled })
  const [pointsLedger, setPointsLedger] = useState([])
  const [loadingLedger, setLoadingLedger] = useState(true)

  useEffect(() => {
    if (!enabled || !workspaceId || !db) { setLoadingLedger(false); return }
    setLoadingLedger(true)
    fetchWorkspaceCollectionPage({
      workspaceId, collectionName: 'loyaltyPointsLedger', businessType,
      orderByField: 'createdAt', orderDirection: 'desc', limitCount: 500,
      diagnostics: { currentUserUid: userId, role },
    }).then((page) => {
      setPointsLedger(Array.isArray(page.rows) ? page.rows : [])
      setLoadingLedger(false)
    }).catch(() => setLoadingLedger(false))
  }, [businessType, enabled, role, userId, workspaceId])

  const loading = accountsApi.loading || rewardsApi.loading || couponsApi.loading || referralsApi.loading || walletApi.loading || loadingLedger

  const kpis = useMemo(() => {
    if (loading) return ANALYTICS_KPI_DEFAULTS
    return calculateLoyaltyAnalytics({
      accounts: accountsApi.accounts,
      pointsLedger,
      redemptions: rewardsApi.redemptions,
      coupons: couponsApi.coupons,
      referrals: referralsApi.referrals,
      walletEntries: walletApi.entries,
    })
  }, [loading, accountsApi.accounts, pointsLedger, rewardsApi.redemptions, couponsApi.coupons, referralsApi.referrals, walletApi.entries])

  return {
    kpis, loading,
    accounts: accountsApi.accounts,
    pointsLedger,
    redemptions: rewardsApi.redemptions,
    coupons: couponsApi.coupons,
    referrals: referralsApi.referrals,
    walletEntries: walletApi.entries,
  }
}
