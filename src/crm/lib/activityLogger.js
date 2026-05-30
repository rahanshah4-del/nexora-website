import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'
import { clientSafeMessage } from '../utils/messages.js'

function cleanString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export async function logActivity({
  workspaceId,
  userId,
  userName,
  userEmail,
  action,
  module,
  description,
  targetId = '',
  targetName = '',
  metadata = {},
}) {
  if (!db || !workspaceId || !userId) return { ok: false, error: 'Activity logging is not configured.' }

  try {
    await addDoc(collection(db, 'workspaces', workspaceId, 'activityLogs'), {
      userId,
      ownerId: workspaceId,
      workspaceId,
      createdBy: userId,
      userName: cleanString(userName, 'Nexora User'),
      userEmail: cleanString(userEmail),
      action: cleanString(action, 'Action'),
      module: cleanString(module, 'System'),
      description: cleanString(description),
      targetId: cleanString(targetId),
      targetName: cleanString(targetName),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      createdAt: serverTimestamp(),
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: clientSafeMessage(error, 'Unable to save activity.') }
  }
}

export function userActivityInfo(userDoc, fallbackUser) {
  return {
    userName:
      cleanString(userDoc?.name) ||
      cleanString(userDoc?.fullName) ||
      cleanString(fallbackUser?.displayName) ||
      cleanString(fallbackUser?.email?.split('@')?.[0], 'Nexora User'),
    userEmail: cleanString(userDoc?.email) || cleanString(fallbackUser?.email),
  }
}
