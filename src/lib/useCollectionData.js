import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from './firebase.js'

export function useCollectionData(collectionName, options = {}) {
  const { orderByField = '', direction = 'desc', limitCount = 20, userId = '', admin = false, workspaceScoped = true } = options
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(Boolean(db && collectionName))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!db || !collectionName || (!admin && !userId)) {
      Promise.resolve().then(() => {
        setItems([])
        setLoading(false)
      })
      return undefined
    }

    let canceled = false
    async function load() {
      setLoading(true)
      setError(null)

      try {
        const collectionRef =
          workspaceScoped && userId ? collection(db, 'workspaces', userId, collectionName) : collection(db, collectionName)
        const queryConstraints = []
        if (!workspaceScoped && userId) {
          queryConstraints.push(where('userId', '==', userId))
        }
        if (orderByField) {
          queryConstraints.push(orderBy(orderByField, direction))
        }
        if (limitCount > 0) {
          queryConstraints.push(limit(limitCount))
        }
        const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef
        const snap = await getDocs(q)
        if (canceled) return
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setItems(data)
      } catch (e) {
        if (!canceled) {
          setError(e)
          setItems([])
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    load()
    return () => {
      canceled = true
    }
  }, [admin, collectionName, direction, limitCount, orderByField, userId, workspaceScoped])

  return { items, loading, error }
}
