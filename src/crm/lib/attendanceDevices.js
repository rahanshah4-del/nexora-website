import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from './firebase.js'

const functions = app ? getFunctions(app, 'us-central1') : null
const registerCallable = functions ? httpsCallable(functions, 'registerAttendanceDevice') : null

export async function registerAttendanceDevice(payload) {
  if (!registerCallable) {
    throw new Error('Firebase Functions are not configured.')
  }
  const result = await registerCallable(payload)
  return result.data || {}
}
