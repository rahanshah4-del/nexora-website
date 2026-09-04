import { useEffect, useState } from 'react'
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { workspaceCollectionPath } from '../lib/firestore.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

// A true total count for a workspace collection, via Firestore's server-side
// count aggregation — cheap (no documents are actually fetched) and not
// capped the way a "recent N" list read is. Use this for stat tiles like
// "Total Students" instead of `someList.length` on a limited/paginated read,
// which silently caps out and stops moving once the collection grows past
// that limit.
export function useCollectionCount(collectionName, { workspaceId, businessType, enabled = true } = {}) {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!enabled || !db || !workspaceId || !collectionName) {
      setCount(0)
      setLoading(false)
      return undefined
    }
    setLoading(true)
    const normalizedBusinessType = normalizeBusinessType(businessType)
    const ref = collection(db, workspaceCollectionPath(workspaceId, collectionName))
    const target = normalizedBusinessType ? query(ref, where('businessType', '==', normalizedBusinessType)) : ref
    getCountFromServer(target)
      .then((snap) => {
        if (cancelled) return
        setCount(snap.data().count || 0)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setCount(0)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessType, collectionName, enabled, workspaceId])

  return { count, loading }
}
