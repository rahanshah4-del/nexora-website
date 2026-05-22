import { useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from './firebase.js'

export function useCollectionData(collectionName, options = {}) {
  const { orderByField = '', direction = 'desc', limitCount = 20 } = options
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(Boolean(db && collectionName))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!db || !collectionName) {
      return undefined
    }

    let canceled = false
    async function load() {
      setLoading(true)
      setError(null)

      try {
        const collectionRef = collection(db, collectionName)
        const queryConstraints = []
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
  }, [collectionName, direction, limitCount, orderByField])

  return { items, loading, error }
}
