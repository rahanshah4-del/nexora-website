import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestoreDb as db } from './firebase.js'
import { upgradeWorkerBaseUrl } from './upgradeWorker.js'

const IP_SYNC_PREFIX = 'nexoraLastIpSyncAt'
const IP_SYNC_INTERVAL_MS = 30 * 60 * 1000

function clean(value) {
  return typeof value === 'string' ? value.trim() : value || ''
}

function ipSyncKey(uid) {
  return `${IP_SYNC_PREFIX}:${uid}`
}

function shouldSyncIp(uid) {
  if (typeof window === 'undefined' || !uid) return false
  const lastSyncedAt = Number(window.localStorage.getItem(ipSyncKey(uid)) || 0)
  return Date.now() - lastSyncedAt >= IP_SYNC_INTERVAL_MS
}

function markIpSynced(uid) {
  if (typeof window !== 'undefined' && uid) window.localStorage.setItem(ipSyncKey(uid), String(Date.now()))
}

export async function fetchClientIp() {
  const baseUrl = upgradeWorkerBaseUrl()
  if (!baseUrl) return null
  const response = await fetch(`${baseUrl}/api/client-ip`, { method: 'GET' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.ok === false || !clean(payload.ip)) return null
  return {
    ipAddress: clean(payload.ip),
    ipCountry: clean(payload.country),
    ipCity: clean(payload.city),
    ipRegion: clean(payload.region),
    ipTimezone: clean(payload.timezone),
    ipColo: clean(payload.colo),
    ipAsn: clean(payload.asn),
    ipOrganization: clean(payload.organization),
  }
}

export async function syncClientIpToProfile({ user } = {}) {
  if (!db || !user?.uid || !shouldSyncIp(user.uid)) return null
  try {
    const ipData = await fetchClientIp()
    if (!ipData?.ipAddress) return null
    await setDoc(
      doc(db, 'users', user.uid),
      {
        ...ipData,
        lastIpAddress: ipData.ipAddress,
        ipCapturedAt: serverTimestamp(),
        lastIpCapturedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      },
      { merge: true },
    )
    markIpSynced(user.uid)
    return ipData
  } catch (error) {
    console.warn('Unable to sync client IP profile data', error)
    return null
  }
}
