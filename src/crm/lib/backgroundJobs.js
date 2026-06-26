import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { workspaceCollectionPath } from './firestore.js'
import { normalizeBusinessType } from '../data/moduleAccess.js'

export const BACKGROUND_JOBS_WORKER_URL =
  import.meta.env.VITE_BACKGROUND_JOBS_WORKER_URL || 'https://nexora-background-jobs.rahanshah4.workers.dev'

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject).filter((item) => item !== undefined)
  if (value && typeof value === 'object' && typeof value.toDate !== 'function' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, compactObject(entryValue)]),
    )
  }
  return value === undefined ? null : value
}

export async function enqueueBackgroundJob({
  workspaceId,
  businessType,
  userId,
  createdByEmail = '',
  type,
  label,
  payload = {},
  priority = 'normal',
  route = '',
  metadata = {},
} = {}) {
  if (!db || !workspaceId || !userId || !type) {
    return { ok: false, error: 'Background queue is not available.' }
  }

  const jobPayload = compactObject({
    workspaceId,
    ownerId: workspaceId,
    businessType: normalizeBusinessType(businessType),
    createdBy: userId,
    createdByEmail,
    type,
    label: clean(label) || type,
    status: 'pending',
    priority,
    route,
    payload,
    metadata,
    progress: {
      total: Number(metadata?.total || payload?.recipients?.length || payload?.items?.length || 1) || 1,
      completed: 0,
      sent: 0,
      failed: 0,
    },
    attempts: 0,
    maxAttempts: 5,
    error: '',
    queuedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  let jobRef
  try {
    jobRef = await addDoc(collection(db, workspaceCollectionPath(workspaceId, 'queueJobs')), jobPayload)
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not create queue job.' }
  }

  try {
    const token = auth?.currentUser ? await auth.currentUser.getIdToken() : ''
    if (!token) throw new Error('Please sign in again before queueing work.')
    const response = await fetch(`${BACKGROUND_JOBS_WORKER_URL}/api/jobs/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workspaceId, jobId: jobRef.id }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || data?.success !== true) throw new Error(data?.error || `Queue request failed (${response.status}).`)
    return { ok: true, jobId: jobRef.id, status: 'pending' }
  } catch (error) {
    await updateDoc(doc(db, workspaceCollectionPath(workspaceId, 'queueJobs'), jobRef.id), {
      status: 'failed',
      error: error?.message || 'Queue worker is unreachable.',
      failedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(() => {})
    return { ok: false, jobId: jobRef.id, error: error?.message || 'Queue worker is unreachable.' }
  }
}

export function queueJobStatusLabel(status) {
  const value = clean(status).toLowerCase()
  if (value === 'processing') return 'Processing'
  if (value === 'completed') return 'Completed'
  if (value === 'failed') return 'Failed'
  return 'Pending'
}
