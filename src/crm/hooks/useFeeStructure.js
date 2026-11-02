import { useCallback, useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, listenToWorkspaceCollection, patchUserDoc, removeUserDoc } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { clientSafeMessage } from '../utils/messages.js'
import { classKey, normalizeStructure } from '../lib/schoolFees.js'
import { useUser } from './useUser.js'

function listen(workspaceId, businessType, collectionName, onData, onError) {
  return listenToWorkspaceCollection({ workspaceId, businessType, collectionName, orderByField: null, limitCount: 400, onData, onError })
}

/** Class fee structures and discount rules of the school workspace, with save/remove helpers. */
export function useFeeStructure({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [structures, setStructures] = useState([])
  const [concessions, setConcessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !db || !workspaceId) { Promise.resolve().then(() => setLoading(false)); return undefined }
    let pending = 2
    const done = () => { pending -= 1; if (pending <= 0) setLoading(false) }
    const fail = (err) => { setError(clientSafeMessage(err, 'Unable to load fee settings.')); done() }
    const stopA = listen(workspaceId, businessType, 'feeStructures', (rows) => { setStructures(rows.map(normalizeStructure)); setError(''); done() }, fail)
    const stopB = listen(workspaceId, businessType, 'feeConcessions', (rows) => { setConcessions(rows); setError(''); done() }, fail)
    return () => { stopA?.(); stopB?.() }
  }, [businessType, enabled, workspaceId])

  const log = useCallback((action, description, targetName) => logActivity({
    workspaceId, userId, businessType, ...userActivityInfo(userDoc, firebaseUser),
    action, module: 'School Fees', description, targetName,
  }).catch(() => {}), [businessType, firebaseUser, userDoc, userId, workspaceId])

  const api = useMemo(() => ({
    /** Create or update the structure of one class. */
    async saveStructure({ id = '', className, academicYear = '', fees = [] }) {
      if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
      const name = String(className || '').trim()
      if (!name) return { ok: false, error: 'Enter the class name.' }
      const clean = normalizeStructure({ className: name, academicYear, fees })
      if (!clean.fees.length) return { ok: false, error: 'Add at least one fee with an amount.' }
      const existing = id ? { id } : structures.find((s) => classKey(s.className) === classKey(name))
      const payload = { className: clean.className, academicYear: clean.academicYear, fees: clean.fees }
      try {
        if (existing?.id) await patchUserDoc(workspaceId, 'feeStructures', existing.id, payload, { businessType })
        else await createUserDoc(workspaceId, 'feeStructures', { ...payload, createdBy: userId }, { businessType })
        log('Fee structure saved', `${name} fee structure was saved.`, name)
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to save the fee structure.') }
      }
    },
    async removeStructure(id, name = '') {
      if (!workspaceId || !id) return { ok: false, error: 'Fee structure not found' }
      try { await removeUserDoc(workspaceId, 'feeStructures', id, { businessType }); log('Fee structure deleted', `${name} fee structure was deleted.`, name); return { ok: true } }
      catch (err) { return { ok: false, error: clientSafeMessage(err, 'Unable to delete the fee structure.') } }
    },
    /** Create or update a discount / scholarship, or the single sibling rule (kind: 'sibling'). */
    async saveConcession(concession) {
      if (!workspaceId || !userId) return { ok: false, error: 'Please login first' }
      const kind = concession.kind || 'custom'
      const payload = kind === 'sibling'
        ? { kind, name: 'Sibling discount', secondPercent: Number(concession.secondPercent) || 0, thirdPlusPercent: Number(concession.thirdPlusPercent) || 0, heads: concession.heads || 'tuition', enabled: concession.enabled !== false }
        : { kind, name: String(concession.name || '').trim(), type: concession.type === 'fixed' ? 'fixed' : 'percent', value: Math.max(0, Number(concession.value) || 0), heads: concession.heads || 'tuition' }
      if (kind !== 'sibling' && !payload.name) return { ok: false, error: 'Enter a name for the discount.' }
      if (kind !== 'sibling' && !payload.value) return { ok: false, error: 'Enter the discount amount or percent.' }
      try {
        if (concession.id) await patchUserDoc(workspaceId, 'feeConcessions', concession.id, payload, { businessType })
        else await createUserDoc(workspaceId, 'feeConcessions', { ...payload, createdBy: userId }, { businessType })
        log('Fee discount saved', `${payload.name} was saved.`, payload.name)
        return { ok: true }
      } catch (err) {
        return { ok: false, error: clientSafeMessage(err, 'Unable to save the discount.') }
      }
    },
    async removeConcession(id, name = '') {
      if (!workspaceId || !id) return { ok: false, error: 'Discount not found' }
      try { await removeUserDoc(workspaceId, 'feeConcessions', id, { businessType }); log('Fee discount deleted', `${name} was deleted.`, name); return { ok: true } }
      catch (err) { return { ok: false, error: clientSafeMessage(err, 'Unable to delete the discount.') } }
    },
    /** Give a student a list of discounts (stored on the student record). */
    async assignConcessions(studentId, concessionIds) {
      if (!workspaceId || !studentId) return { ok: false, error: 'Student not found' }
      try { await patchUserDoc(workspaceId, 'customers', studentId, { concessionIds: [...new Set(concessionIds)] }, { businessType }); return { ok: true } }
      catch (err) { return { ok: false, error: clientSafeMessage(err, 'Unable to update the student.') } }
    },
  }), [businessType, log, structures, userId, workspaceId])

  return { structures, concessions, loading, error, ...api }
}
