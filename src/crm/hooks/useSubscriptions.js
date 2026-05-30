import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeOwnedCollection, subscribeUserCollection } from '../lib/firestore.js'
import { accessPlanForUser, daysUntil, getPlanCatalog, isTrialActive, trialEndDate } from '../data/moduleAccess.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

function normalizeSub(s) {
  return {
    id: s.id,
    userId: s.userId || '',
    plan: s.plan || 'Free',
    planStatus: s.planStatus || 'inactive',
    billingCycle: s.billingCycle || 'monthly',
    billingCurrency: s.billingCurrency || s.currency || 'PKR',
    nextBillingDate: s.nextBillingDate || s.renewsOn || '—',
    subscriptionStartedAt: s.subscriptionStartedAt || s.startedAt || null,
    subscriptionExpiresAt: s.subscriptionExpiresAt || s.expiresOn || s.renewsOn || null,
    expiresOn: s.subscriptionExpiresAt || s.expiresOn || s.renewsOn || '—',
    renewsOn: s.nextBillingDate || s.renewsOn || '—',
    usage: s.usage || {
      storageUsedGb: 0,
      storageLimitGb: 0,
      teamMembersUsed: 0,
      teamMembersLimit: 0,
      reportsGenerated: 0,
      reportsLimit: 0,
      apiRequests: 0,
      apiRequestsLimit: 0,
    },
  }
}

export function useSubscriptions() {
  const { userId, workspaceId, userDoc, accessPlan, isTrialActive: trialActive, trialEndsAt, trialDaysRemaining } = useUser()
  const [subscription, setSubscription] = useState(() =>
    normalizeSub({
      id: 'sub',
      userId: userId || '',
      plan: accessPlanForUser(userDoc || {}, userDoc?.plan || 'Free'),
      planStatus: userDoc?.planStatus || 'inactive',
      billingCycle: userDoc?.billingCycle || 'monthly',
      billingCurrency: userDoc?.billingCurrency || 'PKR',
      nextBillingDate: userDoc?.nextBillingDate || '—',
      subscriptionExpiresAt: userDoc?.subscriptionExpiresAt || null,
    }),
  )
  const [history, setHistory] = useState([])
  const [renewalReminder, setRenewalReminder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setSubscription(
          normalizeSub({
            id: 'sub',
            userId: userId || '',
            plan: accessPlanForUser(userDoc || {}, userDoc?.plan || 'Free'),
            planStatus: userDoc?.planStatus || 'inactive',
            billingCycle: userDoc?.billingCycle || 'monthly',
            billingCurrency: userDoc?.billingCurrency || 'PKR',
            nextBillingDate: userDoc?.nextBillingDate || '—',
            subscriptionExpiresAt: userDoc?.subscriptionExpiresAt || null,
          }),
        )
        setHistory([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setSubscription(
          normalizeSub({
            id: 'sub',
            userId: '',
            plan: accessPlanForUser(userDoc || {}, userDoc?.plan || 'Free'),
            planStatus: userDoc?.planStatus || 'inactive',
            billingCycle: userDoc?.billingCycle || 'monthly',
            billingCurrency: userDoc?.billingCurrency || 'PKR',
            nextBillingDate: userDoc?.nextBillingDate || '—',
            subscriptionExpiresAt: userDoc?.subscriptionExpiresAt || null,
          }),
        )
        setHistory([])
        setSource('firestore')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => setLoading(true))
    Promise.resolve().then(() => setError(''))

    const unsub = subscribeUserCollection(
      workspaceId,
      'subscriptions',
      (rows) => {
        const raw = rows[0] || null
        const sub = normalizeSub(raw || { id: 'sub', userId: workspaceId })
        setSubscription({
          ...sub,
          plan: accessPlanForUser(userDoc || {}, userDoc?.plan || sub.plan),
          planStatus: userDoc?.planStatus || sub.planStatus,
          billingCycle: userDoc?.billingCycle || sub.billingCycle,
          billingCurrency: userDoc?.billingCurrency || sub.billingCurrency,
          nextBillingDate: userDoc?.nextBillingDate || sub.nextBillingDate,
          subscriptionStartedAt: userDoc?.subscriptionStartedAt || sub.subscriptionStartedAt,
          subscriptionExpiresAt: userDoc?.subscriptionExpiresAt || sub.subscriptionExpiresAt,
          expiresOn: userDoc?.subscriptionExpiresAt || sub.expiresOn,
          renewsOn: userDoc?.nextBillingDate || sub.renewsOn,
        })
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load subscriptions.'))
        setSubscription(
          normalizeSub({
            id: 'sub',
            userId: workspaceId,
            plan: accessPlanForUser(userDoc || {}, userDoc?.plan || 'Free'),
            planStatus: userDoc?.planStatus || 'inactive',
            billingCycle: userDoc?.billingCycle || 'monthly',
            billingCurrency: userDoc?.billingCurrency || 'PKR',
            nextBillingDate: userDoc?.nextBillingDate || '—',
            subscriptionExpiresAt: userDoc?.subscriptionExpiresAt || null,
          }),
        )
        setSource('firestore')
        setLoading(false)
      },
    )

    const unsubUpgrades = subscribeOwnedCollection(
      'upgradeRequests',
      workspaceId,
      (rows) => {
        const approved = rows
          .filter((r) => r.approvalStatus === 'approved')
          .slice(0, 20)
          .map((r) => ({
            id: r.id,
            plan: r.selectedPlan || r.requestedPlan || 'Business',
            billingCycle: r.billingCycle || '—',
            status: 'approved',
            changedAt: r.approvedAt?.toDate?.()?.toISOString?.().slice(0, 10) || '—',
            note: `Approved via ${r.paymentMethod || 'manual'}`,
          }))
        setHistory(approved)
      },
      () => setHistory([]),
      'workspaceId',
    )

    return () => {
      unsub?.()
      unsubUpgrades?.()
    }
  }, [userId, workspaceId, userDoc])

  useEffect(() => {
    const exp = subscription?.expiresOn
    Promise.resolve().then(() => {
      if (!exp || exp === '—') {
        setRenewalReminder(null)
        return
      }
      const d = exp?.toDate?.() || new Date(exp)
      if (Number.isNaN(d.getTime())) {
        setRenewalReminder(null)
        return
      }
      const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
      if (days <= 7) {
        setRenewalReminder({ tone: 'warning', message: `Renewal due in ${Math.max(days, 0)} day(s)` })
      } else {
        setRenewalReminder(null)
      }
    })
  }, [subscription?.expiresOn])

  return useMemo(
    () => ({
      plans: getPlanCatalog(),
      subscription,
      currentPlan: accessPlan,
      trial: {
        active: trialActive || isTrialActive(userDoc || {}),
        endsAt: trialEndsAt || trialEndDate(userDoc || {}),
        daysRemaining: trialDaysRemaining || daysUntil(trialEndDate(userDoc || {})),
      },
      history,
      renewalReminder,
      loading,
      source,
      error,
    }),
    [accessPlan, subscription, trialActive, trialEndsAt, trialDaysRemaining, userDoc, history, renewalReminder, loading, source, error],
  )
}
