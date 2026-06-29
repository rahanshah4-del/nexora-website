import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { createWorkspaceNotification, workspaceNotificationTargets } from '../crm/lib/notifications.js'
import {
  BUSINESS_SERVICE_REQUESTS_COLLECTION,
  BUSINESS_SERVICES_COLLECTION,
  businessServiceDocId,
  defaultBusinessServices,
  normalizeBusinessService,
  sortBusinessServices,
} from './businessServices.js'

function clean(value = '', max = 1000) {
  return String(value || '').trim().slice(0, max)
}

async function resolveWorkspaceForUser(uid = '') {
  if (!db || !uid) return { workspaceId: '', ownerId: '' }
  try {
    const userSnap = await getDoc(doc(db, 'users', uid))
    const userData = userSnap.exists() ? userSnap.data() : {}
    const workspaceId = clean(userData.workspaceId || userData.ownerId || userData.companyId || userData.userId || uid, 128)
    const workspaceSnap = workspaceId ? await getDoc(doc(db, 'workspaces', workspaceId)) : null
    const workspaceData = workspaceSnap?.exists?.() ? workspaceSnap.data() : {}
    return {
      workspaceId,
      ownerId: clean(workspaceData.ownerId || userData.ownerId || uid, 128),
      businessType: clean(workspaceData.businessType || workspaceData.selectedBusinessType || userData.businessType || userData.selectedBusinessType, 120),
    }
  } catch {
    return { workspaceId: uid, ownerId: uid, businessType: '' }
  }
}

export function listenBusinessServices({ includeDisabled = false } = {}, onNext, onError) {
  if (!db) {
    onNext(includeDisabled ? defaultBusinessServices : defaultBusinessServices.filter((service) => service.enabled))
    return () => {}
  }

  const q = query(collection(db, BUSINESS_SERVICES_COLLECTION), orderBy('sortOrder', 'asc'), limit(50))
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((item) => normalizeBusinessService({ id: item.id, ...item.data() }, item.id))
      const next = rows.length ? sortBusinessServices(rows) : defaultBusinessServices
      onNext(includeDisabled ? next : next.filter((service) => service.enabled))
    },
    (error) => {
      onError?.(error)
      onNext(includeDisabled ? defaultBusinessServices : defaultBusinessServices.filter((service) => service.enabled))
    },
  )
}

export async function getBusinessServicesOnce({ includeDisabled = false } = {}) {
  if (!db) return includeDisabled ? defaultBusinessServices : defaultBusinessServices.filter((service) => service.enabled)
  try {
    const q = query(collection(db, BUSINESS_SERVICES_COLLECTION), orderBy('sortOrder', 'asc'), limit(50))
    const snap = await getDocs(q)
    const rows = snap.docs.map((item) => normalizeBusinessService({ id: item.id, ...item.data() }, item.id))
    const next = rows.length ? sortBusinessServices(rows) : defaultBusinessServices
    return includeDisabled ? next : next.filter((service) => service.enabled)
  } catch {
    return includeDisabled ? defaultBusinessServices : defaultBusinessServices.filter((service) => service.enabled)
  }
}

export function listenBusinessServiceRequests(onNext, onError) {
  if (!db) {
    onNext([])
    return () => {}
  }
  const q = query(collection(db, BUSINESS_SERVICE_REQUESTS_COLLECTION), orderBy('createdAt', 'desc'), limit(100))
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export function listenMyBusinessServiceRequests(onNext, onError) {
  const uid = auth?.currentUser?.uid
  if (!db || !uid) {
    onNext([])
    return () => {}
  }
  const q = query(collection(db, BUSINESS_SERVICE_REQUESTS_COLLECTION), where('userId', '==', uid), limit(50))
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => {
      const left = a.createdAt?.toDate?.()?.getTime?.() || 0
      const right = b.createdAt?.toDate?.()?.getTime?.() || 0
      return right - left
    })),
    onError,
  )
}

export function listenBusinessServiceRequestTimeline(requestId, onNext, onError) {
  if (!db || !requestId) {
    onNext([])
    return () => {}
  }
  const q = query(collection(db, BUSINESS_SERVICE_REQUESTS_COLLECTION, requestId, 'timeline'), orderBy('createdAt', 'asc'), limit(80))
  return onSnapshot(q, (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export function listenBusinessServiceRequestComments(requestId, onNext, onError) {
  if (!db || !requestId) {
    onNext([])
    return () => {}
  }
  const q = query(collection(db, BUSINESS_SERVICE_REQUESTS_COLLECTION, requestId, 'comments'), orderBy('createdAt', 'asc'), limit(80))
  return onSnapshot(q, (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export async function submitBusinessServiceRequest(service, form) {
  if (!db) throw new Error('Firebase is not configured.')
  const currentUser = auth?.currentUser
  const workspace = await resolveWorkspaceForUser(currentUser?.uid || '')
  const requestRef = await addDoc(collection(db, BUSINESS_SERVICE_REQUESTS_COLLECTION), {
    serviceId: service?.id || '',
    serviceTitle: service?.title || form.serviceTitle || '',
    companyName: clean(form.companyName, 160),
    contactNumber: clean(form.contactNumber, 40),
    email: clean(form.email, 254),
    supportDetails: clean(form.supportDetails, 1500),
    engagementType: form.engagementType || 'Part Time',
    preferredWorkingHours: clean(form.preferredWorkingHours, 120),
    notes: clean(form.notes, 1000),
    status: 'New',
    userId: currentUser?.uid || '',
    workspaceId: workspace.workspaceId || '',
    ownerId: workspace.ownerId || '',
    latestAdminRemark: '',
    latestClientComment: '',
    lastActivityAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  try {
    await addDoc(collection(requestRef, 'timeline'), {
      type: 'created',
      title: 'Service request submitted',
      message: `${service?.title || form.serviceTitle || 'Business service'} request submitted.`,
      status: 'New',
      actor: currentUser?.uid ? 'client' : 'system',
      actorId: currentUser?.uid || '',
      actorEmail: currentUser?.email || clean(form.email, 254),
      createdAt: serverTimestamp(),
    })
  } catch (timelineError) {
    console.warn('[Business Services] timeline create skipped', timelineError?.code || timelineError?.message || timelineError)
  }
  return requestRef.id
}

export async function saveBusinessService(service) {
  if (!db) throw new Error('Firebase is not configured.')
  const id = service.id || businessServiceDocId(service.title)
  const payload = {
    title: String(service.title || '').trim(),
    description: String(service.description || '').trim(),
    startingPrice: Math.max(0, Number(service.startingPrice || 0)),
    priceType: service.priceType || 'custom',
    enabled: service.enabled !== false,
    featured: service.featured === true,
    sortOrder: Math.max(0, Number(service.sortOrder || 0)),
    createdAt: service.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(doc(db, BUSINESS_SERVICES_COLLECTION, id), payload, { merge: true })
  return id
}

export async function updateBusinessServiceRequestStatus(id, status, remark = '', request = {}) {
  if (!db) throw new Error('Firebase is not configured.')
  const admin = auth?.currentUser
  const safeRemark = clean(remark, 1000)
  await updateDoc(doc(db, BUSINESS_SERVICE_REQUESTS_COLLECTION, id), {
    status,
    latestAdminRemark: safeRemark,
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await addDoc(collection(db, BUSINESS_SERVICE_REQUESTS_COLLECTION, id, 'timeline'), {
    type: 'status',
    title: `Status changed to ${status}`,
    message: safeRemark || `Nexora team marked this request as ${status}.`,
    status,
    actor: 'admin',
    actorId: admin?.uid || '',
    actorEmail: admin?.email || '',
    createdAt: serverTimestamp(),
  })
  const workspaceId = request.workspaceId || request.ownerId || ''
  const targetUsers = workspaceNotificationTargets(request.userId, request.ownerId, workspaceId)
  if (workspaceId && targetUsers.length) {
    await createWorkspaceNotification({
      workspaceId,
      userIds: targetUsers,
      businessType: request.businessType || '',
      title: status === 'Rejected' ? 'Business service request rejected' : `Business service request: ${status}`,
      message: safeRemark || `${request.serviceTitle || 'Your service request'} is now ${status}.`,
      type: 'Business Services',
      priority: status === 'Rejected' ? 'high' : status === 'Approved' || status === 'Active' ? 'medium' : 'low',
      relatedId: id,
      route: `/app/business-services?request=${encodeURIComponent(id)}`,
      metadata: { requestId: id, status, serviceTitle: request.serviceTitle || '' },
      createdBy: admin?.uid || '',
      createdByEmail: admin?.email || '',
      dedupeKey: `business-service-${id}-${status}`,
      queue: false,
    })
  }
}

export async function addBusinessServiceRequestComment(requestId, request, message) {
  if (!db) throw new Error('Firebase is not configured.')
  const currentUser = auth?.currentUser
  const safeMessage = clean(message, 1000)
  if (!safeMessage) throw new Error('Comment is required.')
  await addDoc(collection(db, BUSINESS_SERVICE_REQUESTS_COLLECTION, requestId, 'comments'), {
    message: safeMessage,
    actor: 'client',
    actorId: currentUser?.uid || '',
    actorEmail: currentUser?.email || request?.email || '',
    createdAt: serverTimestamp(),
  })
  await addDoc(collection(db, BUSINESS_SERVICE_REQUESTS_COLLECTION, requestId, 'timeline'), {
    type: 'comment',
    title: 'Client comment added',
    message: safeMessage,
    status: request?.status || '',
    actor: 'client',
    actorId: currentUser?.uid || '',
    actorEmail: currentUser?.email || request?.email || '',
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, BUSINESS_SERVICE_REQUESTS_COLLECTION, requestId), {
    latestClientComment: safeMessage,
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
