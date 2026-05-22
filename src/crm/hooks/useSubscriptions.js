import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { subscribeCollection } from '../lib/firestore.js'
import { plansDemo } from '../data/subscriptionsDemo.js'
import { useUser } from './useUser.js'

function normalizeSub(s) {
  return {
    id: s.id,
    userId: s.userId || '',
    plan: s.plan || 'Free',
    planStatus: s.planStatus || 'inactive',
    billingCycle: s.billingCycle || 'monthly',
    expiresOn: s.expiresOn || s.renewsOn || '—',
    renewsOn: s.renewsOn || '—',
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
  const { userId, userDoc } = useUser()
  const [subscription, setSubscription] = useState(() =>
    normalizeSub({
      id: 'sub',
      userId: userId || '',
      plan: userDoc?.plan || 'Free',
      planStatus: userDoc?.planStatus || 'inactive',
      billingCycle: userDoc?.billingCycle || 'monthly',
      renewsOn: '—',
      expiresOn: '—',
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
            plan: userDoc?.plan || 'Free',
            planStatus: userDoc?.planStatus || 'inactive',
            billingCycle: userDoc?.billingCycle || 'monthly',
            renewsOn: '—',
            expiresOn: '—',
          }),
        )
        setHistory([])
        setSource('none')
        setError('Firestore is not configured.')
        setLoading(false)
      })
      return
    }
    if (!userId) {
      Promise.resolve().then(() => {
        setSubscription(
          normalizeSub({
            id: 'sub',
            userId: '',
            plan: userDoc?.plan || 'Free',
            planStatus: userDoc?.planStatus || 'inactive',
            billingCycle: userDoc?.billingCycle || 'monthly',
            renewsOn: '—',
            expiresOn: '—',
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

    const unsub = subscribeCollection(
      'subscriptions',
      (rows) => {
        const raw = rows.find((r) => r.userId === userId) || null
        const sub = normalizeSub(raw || { id: 'sub', userId })
        setSubscription({
          ...sub,
          plan: userDoc?.plan || sub.plan,
          planStatus: userDoc?.planStatus || sub.planStatus,
          billingCycle: userDoc?.billingCycle || sub.billingCycle,
        })
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load subscriptions')
        setSubscription(
          normalizeSub({
            id: 'sub',
            userId,
            plan: userDoc?.plan || 'Free',
            planStatus: userDoc?.planStatus || 'inactive',
            billingCycle: userDoc?.billingCycle || 'monthly',
            renewsOn: '—',
            expiresOn: '—',
          }),
        )
        setSource('firestore')
        setLoading(false)
      },
    )

    const unsubUpgrades = subscribeCollection(
      'upgradeRequests',
      (rows) => {
        const approved = rows
          .filter((r) => r.userId === userId)
          .filter((r) => r.approvalStatus === 'approved')
          .slice(0, 20)
          .map((r) => ({
            id: r.id,
            plan: r.selectedPlan || r.requestedPlan || '—',
            billingCycle: r.billingCycle || '—',
            status: 'approved',
            changedAt: r.approvedAt?.toDate?.()?.toISOString?.().slice(0, 10) || '—',
            note: `Approved via ${r.paymentMethod || 'manual'}`,
          }))
        setHistory(approved)
      },
      () => setHistory([]),
    )

    return () => {
      unsub?.()
      unsubUpgrades?.()
    }
  }, [userId, userDoc?.plan, userDoc?.planStatus, userDoc?.billingCycle])

  useEffect(() => {
    const exp = subscription?.expiresOn
    Promise.resolve().then(() => {
      if (!exp || exp === '—') {
        setRenewalReminder(null)
        return
      }
      const d = new Date(exp)
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
      plans: plansDemo,
      subscription,
      history,
      renewalReminder,
      loading,
      source,
      error,
    }),
    [subscription, history, renewalReminder, loading, source, error],
  )
}
