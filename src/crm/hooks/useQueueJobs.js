import { useEffect, useMemo, useState } from 'react'
import { limit, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { belongsToBusiness, collectionRef, workspaceCollectionPath } from '../lib/firestore.js'
import { queueJobStatusLabel } from '../lib/backgroundJobs.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'
import { useUser } from './useUser.js'

function toDate(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeJob(row = {}) {
  const createdAt = toDate(row.createdAt || row.queuedAt)
  const updatedAt = toDate(row.updatedAt || row.completedAt || row.failedAt)
  return {
    ...row,
    status: String(row.status || 'pending').toLowerCase(),
    statusLabel: queueJobStatusLabel(row.status),
    businessType: normalizeBusinessType(row.businessType),
    createdAt,
    updatedAt,
    progress: row.progress || { total: 1, completed: 0, sent: 0, failed: 0 },
  }
}

export function useQueueJobs({ limitCount = 50 } = {}) {
  const { workspaceId, businessType } = useUser()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!db || !workspaceId) {
      Promise.resolve().then(() => {
        setJobs([])
        setLoading(false)
      })
      return
    }
    Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })
    const ref = collectionRef(workspaceCollectionPath(workspaceId, 'queueJobs'))
    const q = query(ref, where('workspaceId', '==', workspaceId), limit(limitCount))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((row) => !row.workspaceId || row.workspaceId === workspaceId)
          .filter((row) => belongsToBusiness(row, businessType))
          .map(normalizeJob)
          .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
        setJobs(rows)
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Unable to load queue jobs.')
        setJobs([])
        setLoading(false)
      },
    )
    return () => unsub()
  }, [businessType, limitCount, workspaceId])

  return useMemo(() => {
    const counts = jobs.reduce((acc, job) => {
      const status = ['pending', 'processing', 'completed', 'failed'].includes(job.status) ? job.status : 'pending'
      acc[status] += 1
      return acc
    }, { pending: 0, processing: 0, completed: 0, failed: 0 })
    return { jobs, loading, error, counts }
  }, [error, jobs, loading])
}
