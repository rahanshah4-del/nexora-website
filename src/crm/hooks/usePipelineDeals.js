import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'

export function usePipelineDeals() {
  const { workspaceId } = useUser()
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
      'pipelines',
      (rows) => {
        setDeals(Array.isArray(rows) ? rows : [])
        setSource('firestore')
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load deals.'))
        setDeals([])
        setSource('firestore')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [workspaceId])

  const api = useMemo(
    () => ({
      deals,
      source,
      loading,
      error,
      async moveDeal(id, stage) {
        setDeals((arr) => arr.map((d) => (d.id === id ? { ...d, stage } : d)))
        if (!db || !workspaceId) return
        await patchUserDoc(workspaceId, 'pipelines', id, { stage })
      },
      async saveDeal(deal) {
        setDeals((arr) => arr.map((d) => (d.id === deal.id ? deal : d)))
        if (!db || !workspaceId) return
        await patchUserDoc(workspaceId, 'pipelines', deal.id, deal)
      },
      async deleteDeal(deal) {
        setDeals((arr) => arr.filter((d) => d.id !== deal.id))
        if (!db || !workspaceId) return
        await removeUserDoc(workspaceId, 'pipelines', deal.id)
      },
      async createDeal(payload) {
        if (!workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const title = String(payload.title || '').trim()
        const customerName = String(payload.customerName || '').trim()
        if (!title) return { ok: false, error: 'Deal title is required' }
        if (!customerName) return { ok: false, error: 'Customer name is required' }
        try {
          await createUserDoc(workspaceId, 'pipelines', { ...payload, title, customerName })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create deal.') }
        }
      },
    }),
    [deals, source, loading, error, workspaceId],
  )

  return api
}
