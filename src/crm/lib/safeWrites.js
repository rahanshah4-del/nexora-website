/**
 * Drop-in replacements for the Firestore SDK's setDoc / updateDoc / deleteDoc / addDoc / writeBatch that send every
 * write over TWO roads: the SDK's Write channel and a plain HTTPS request (firestoreRest.js).
 *
 * Why: on some networks (ISP filtering, VPN, proxy, antivirus) the Write channel answers 503 or never answers, so a
 * save is never confirmed and the data is lost on reload. A normal HTTPS request does not depend on that channel.
 * The first road to confirm wins. Both carry the same data and the same document ID, so a late second arrival changes
 * nothing. After one SDK failure the HTTPS road is used immediately for 5 minutes so saves stay fast.
 *
 * Callers use these exactly like the SDK functions (same arguments, same promise). Anything the HTTPS road cannot
 * express (field increments, array unions, dotted field paths ...) simply keeps using the SDK road alone.
 *
 * Not covered: runTransaction (reads then writes atomically) stays on the SDK.
 */
import { deleteDoc as sdkDeleteDoc, doc, setDoc as sdkSetDoc, updateDoc as sdkUpdateDoc, writeBatch as sdkWriteBatch } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { RestUnsupportedError, buildDeleteBody, buildMergeBody, buildPatchBody, buildSetBody, restCommit } from './firestoreRest.js'

const REST_HEDGE_AFTER_MS = 3000
const SDK_UNHEALTHY_FOR_MS = 5 * 60 * 1000
let sdkUnhealthyUntil = 0
const sdkUnhealthy = () => Date.now() < sdkUnhealthyUntil

// Transient, transport-shaped failures: the write may well succeed on the other road or on a retry.
const RETRYABLE_CODES = new Set(['unavailable', 'deadline-exceeded', 'resource-exhausted', 'aborted', 'client/timeout'])
// Answers that mean the server itself refused this write; the other road would be refused the same way.
const FINAL_REST_CODES = new Set(['permission-denied', 'not-found', 'already-exists', 'failed-precondition'])
export const isRetryableWriteError = (error) => RETRYABLE_CODES.has(error?.code || '')

async function idToken() {
  return auth?.currentUser ? auth.currentUser.getIdToken() : ''
}

/**
 * @param sdk        already-started SDK write promise (stays queued in the SDK even if we stop waiting)
 * @param body       REST commit body, or null when this write cannot be expressed over REST
 * @param timeoutMs  give up waiting after this long (the SDK write stays queued); 0 = wait as long as the SDK does
 */
export function confirmedWrite({ sdk, body, timeoutMs, timeoutMessage = 'Could not confirm the save — check your internet connection and try again.' }) {
  return new Promise((resolve, reject) => {
    const projectId = db?.app?.options?.projectId
    const restPossible = Boolean(body && projectId && auth)
    let settled = false
    let restStarted = false
    let sdkDone = false
    let restDone = false
    let sdkError = null
    let restError = null
    const timers = []
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const finish = (fn, value) => {
      if (settled) return
      settled = true
      timers.forEach(clearTimeout)
      if (fn === resolve) controller?.abort()
      fn(value)
    }
    const maybeGiveUp = () => {
      if (settled) return
      if (sdkDone && (!restPossible || restDone)) finish(reject, sdkError || restError)
    }
    const startRest = () => {
      if (settled || restStarted || !restPossible) return
      restStarted = true
      restCommit({ projectId, body, getToken: idToken, signal: controller?.signal })
        .then(() => { sdkUnhealthyUntil = Date.now() + SDK_UNHEALTHY_FOR_MS; finish(resolve, true) })
        .catch((error) => {
          restDone = true
          restError = error
          if (FINAL_REST_CODES.has(error?.code)) finish(reject, error)
          else maybeGiveUp()
        })
    }

    sdk.then(
      () => { sdkUnhealthyUntil = 0; finish(resolve, true) },
      (error) => {
        sdkDone = true
        sdkError = error
        if (!isRetryableWriteError(error)) { finish(reject, error); return }
        sdkUnhealthyUntil = Date.now() + SDK_UNHEALTHY_FOR_MS
        startRest()
        maybeGiveUp()
      },
    )
    if (restPossible) {
      if (sdkUnhealthy()) startRest()
      else timers.push(setTimeout(startRest, REST_HEDGE_AFTER_MS))
    }
    if (timeoutMs > 0) {
      timers.push(setTimeout(() => {
        sdkUnhealthyUntil = Date.now() + SDK_UNHEALTHY_FOR_MS
        finish(reject, Object.assign(new Error(timeoutMessage), { code: 'client/timeout' }))
      }, timeoutMs))
    }
  })
}

/** REST body for a write, or null when the data cannot be expressed over REST (the SDK road alone is then used). */
export function tryRestBody(build) {
  try { return build() } catch (error) {
    if (error instanceof RestUnsupportedError) return null
    throw error
  }
}

const isPlainData = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
const projectIdOf = (ref) => ref?.firestore?.app?.options?.projectId || db?.app?.options?.projectId

// --- single-document writes --------------------------------------------------

export function setDoc(ref, data, options) {
  const sdk = options === undefined ? sdkSetDoc(ref, data) : sdkSetDoc(ref, data, options)
  let body = null
  if (options === undefined || (options && options.merge === true && !options.mergeFields)) {
    body = tryRestBody(() => (options?.merge
      ? buildMergeBody({ projectId: projectIdOf(ref), docPath: ref.path, data })
      : buildSetBody({ projectId: projectIdOf(ref), docPath: ref.path, data })))
  }
  return confirmedWrite({ sdk, body, timeoutMs: 0 })
}

export function updateDoc(ref, ...args) {
  const sdk = sdkUpdateDoc(ref, ...args)
  const body = args.length === 1 && isPlainData(args[0])
    ? tryRestBody(() => buildPatchBody({ projectId: projectIdOf(ref), docPath: ref.path, patch: args[0] }))
    : null
  return confirmedWrite({ sdk, body, timeoutMs: 0 })
}

export function deleteDoc(ref) {
  const sdk = sdkDeleteDoc(ref)
  const body = tryRestBody(() => buildDeleteBody({ projectId: projectIdOf(ref), docPath: ref.path }))
  return confirmedWrite({ sdk, body, timeoutMs: 0 })
}

/** addDoc with the ID chosen up front, so both roads write the very same document. */
export async function addDoc(collectionRef, data) {
  const ref = doc(collectionRef)
  await setDoc(ref, data)
  return ref
}

// --- batched writes ----------------------------------------------------------

/** Same API as the SDK's writeBatch; commit() goes out on both roads as one atomic REST commit. */
export function writeBatch(firestore) {
  const batch = sdkWriteBatch(firestore)
  const bodies = []
  const paths = new Set()
  let restOk = true
  const record = (ref, build) => {
    if (paths.has(ref.path)) restOk = false // two writes to one document in one batch: leave ordering to the SDK
    paths.add(ref.path)
    if (!restOk) return
    const body = tryRestBody(build)
    if (body) bodies.push(...body.writes)
    else restOk = false
  }
  const api = {
    set(ref, data, options) {
      if (options === undefined) batch.set(ref, data)
      else batch.set(ref, data, options)
      if (options === undefined || (options?.merge === true && !options.mergeFields)) {
        record(ref, () => (options?.merge
          ? buildMergeBody({ projectId: projectIdOf(ref), docPath: ref.path, data })
          : buildSetBody({ projectId: projectIdOf(ref), docPath: ref.path, data })))
      } else restOk = false
      return api
    },
    update(ref, ...args) {
      batch.update(ref, ...args)
      if (args.length === 1 && isPlainData(args[0])) record(ref, () => buildPatchBody({ projectId: projectIdOf(ref), docPath: ref.path, patch: args[0] }))
      else restOk = false
      return api
    },
    delete(ref) {
      batch.delete(ref)
      record(ref, () => buildDeleteBody({ projectId: projectIdOf(ref), docPath: ref.path }))
      return api
    },
    commit() {
      const sdk = batch.commit()
      const body = restOk && bodies.length ? { writes: bodies } : null
      return confirmedWrite({ sdk, body, timeoutMs: 0 })
    },
  }
  return api
}
