import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import { clampPercent, dealAmount } from '../lib/salesCalculations.js'

const COLLECTION = 'salesDeals'

function normalizeDeal(deal = {}) {
  return {
    ...deal,
    title: deal.title || 'Untitled deal',
    customerName: deal.customerName || deal.customer || '',
    leadName: deal.leadName || deal.lead || '',
    value: dealAmount(deal),
    dealValueUsd: dealAmount(deal),
    stage: deal.stage || 'New Lead',
    probability: clampPercent(deal.probability ?? deal.winProbability ?? 30),
    winProbability: clampPercent(deal.probability ?? deal.winProbability ?? 30),
    expectedCloseDate: deal.expectedCloseDate || '',
    owner: deal.owner || deal.assignedTo || '',
    priority: deal.priority || 'Medium',
    source: deal.source || '',
    status: deal.status || (['Won', 'Lost'].includes(deal.stage) ? deal.stage : 'Open'),
    notes: deal.notes || '',
  }
}

export function usePipelineDeals() {
  const { workspaceId, businessType } = useUser()
  const [deals, setDeals] = useState([])
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db) {
      Promise.resolve().then(() => {
        setDeals([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setDeals([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }
    Promise.resolve().then(() => setLoading(true))
    const unsub = subscribeUserCollection(
      workspaceId,
      COLLECTION,
      (rows) => {
        setDeals((Array.isArray(rows) ? rows : []).map(normalizeDeal))
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load deals.'))
        setDeals([])
        setSource('firestore')
        setLoading(false)
      },
      { businessType },
    )
    return () => unsub()
  }, [businessType, workspaceId])

  const api = useMemo(
    () => ({
      deals,
      source,
      loading,
      error,
      async moveDeal(id, stage) {
        setDeals((arr) => arr.map((d) => (d.id === id ? { ...d, stage } : d)))
        if (!db || !workspaceId) return
        await patchUserDoc(workspaceId, COLLECTION, id, { stage, status: ['Won', 'Lost'].includes(stage) ? stage : 'Open' }, { businessType })
      },
      async saveDeal(deal) {
        const normalized = normalizeDeal(deal)
        setDeals((arr) => arr.map((d) => (d.id === deal.id ? normalized : d)))
        if (!db || !workspaceId) return
        await patchUserDoc(workspaceId, COLLECTION, deal.id, normalized, { businessType })
      },
      async deleteDeal(deal) {
        setDeals((arr) => arr.filter((d) => d.id !== deal.id))
        if (!db || !workspaceId) return
        await removeUserDoc(workspaceId, COLLECTION, deal.id)
      },
      async createDeal(payload) {
        if (!workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const title = String(payload.title || '').trim()
        const customerName = String(payload.customerName || '').trim()
        if (!title) return { ok: false, error: 'Deal title is required' }
        if (!customerName) return { ok: false, error: 'Customer name is required' }
        try {
          await createUserDoc(workspaceId, COLLECTION, normalizeDeal({ ...payload, title, customerName }), { businessType })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create deal.') }
        }
      },
    }),
    [businessType, deals, source, loading, error, workspaceId],
  )

  return api
}
