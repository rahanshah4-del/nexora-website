import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase.js'
import { createUserDoc, patchUserDoc, removeUserDoc, subscribeUserCollection } from '../lib/firestore.js'
import { logActivity, userActivityInfo } from '../lib/activityLogger.js'
import { useUser } from './useUser.js'
import { clientSafeMessage } from '../utils/messages.js'
import {
  CONTRACT_LATE_FEE_TYPES,
  CONTRACT_STATUSES,
  contractAdvancePayment,
  contractDurationMonths,
  contractMonthlyRent,
  contractSecurityDeposit,
  contractTotalValue,
  normalizeCurrency,
} from '../lib/propertyCalculations.js'

function normalizeStatus(value) {
  const match = CONTRACT_STATUSES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'Draft'
}

function normalizeLateFeeType(value) {
  const match = CONTRACT_LATE_FEE_TYPES.find((item) => item.toLowerCase() === String(value || '').trim().toLowerCase())
  return match || 'None'
}

function normalizeContract(record) {
  return {
    id: record.id,
    reference: record.reference || record.title || '',
    tenantId: record.tenantId || '',
    tenantName: record.tenantName || '',
    propertyId: record.propertyId || '',
    propertyName: record.propertyName || '',
    unit: record.unit || '',
    startDate: record.startDate || '',
    endDate: record.endDate || '',
    monthlyRent: contractMonthlyRent(record),
    securityDeposit: contractSecurityDeposit(record),
    advancePayment: contractAdvancePayment(record),
    paidAmount: Math.max(Number(record.paidAmount) || 0, 0),
    paymentDueDay: Math.min(Math.max(Math.floor(Number(record.paymentDueDay) || 0), 0), 31),
    lateFeeType: normalizeLateFeeType(record.lateFeeType),
    lateFeeValue: Math.max(Number(record.lateFeeValue) || 0, 0),
    gracePeriodDays: Math.max(Math.floor(Number(record.gracePeriodDays) || 0), 0),
    status: normalizeStatus(record.status),
    currency: normalizeCurrency(record.currency),
    notes: record.notes || '',
    documentUrl: record.documentUrl || '',
    documentName: record.documentName || '',
    renewalCount: Math.max(Math.floor(Number(record.renewalCount) || 0), 0),
    renewedAt: record.renewedAt || null,
    previousEndDate: record.previousEndDate || '',
    terminatedAt: record.terminatedAt || null,
    terminationReason: record.terminationReason || '',
    durationMonths: contractDurationMonths(record.startDate, record.endDate),
    totalContractValue: contractTotalValue(record),
    createdBy: record.createdBy || record.userId || '',
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  }
}

function sanitizeContract(payload) {
  const monthlyRent = Math.max(Number(payload.monthlyRent) || 0, 0)
  return {
    reference: String(payload.reference || '').trim(),
    tenantId: String(payload.tenantId || '').trim(),
    tenantName: String(payload.tenantName || '').trim(),
    propertyId: String(payload.propertyId || '').trim(),
    propertyName: String(payload.propertyName || '').trim(),
    unit: String(payload.unit || '').trim(),
    startDate: String(payload.startDate || '').trim(),
    endDate: String(payload.endDate || '').trim(),
    monthlyRent,
    securityDeposit: Math.max(Number(payload.securityDeposit) || 0, 0),
    advancePayment: Math.max(Number(payload.advancePayment) || 0, 0),
    paidAmount: Math.max(Number(payload.paidAmount) || 0, 0),
    paymentDueDay: Math.min(Math.max(Math.floor(Number(payload.paymentDueDay) || 0), 0), 31),
    lateFeeType: normalizeLateFeeType(payload.lateFeeType),
    lateFeeValue: Math.max(Number(payload.lateFeeValue) || 0, 0),
    gracePeriodDays: Math.max(Math.floor(Number(payload.gracePeriodDays) || 0), 0),
    status: normalizeStatus(payload.status),
    currency: normalizeCurrency(payload.currency),
    notes: String(payload.notes || '').trim(),
    documentUrl: String(payload.documentUrl || '').trim(),
    documentName: String(payload.documentName || '').trim(),
  }
}

export function useContracts({ enabled = true } = {}) {
  const { userId, workspaceId, businessType, userDoc, firebaseUser } = useUser()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState(db ? 'firestore' : 'none')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) {
      Promise.resolve().then(() => {
        setContracts([])
        setLoading(false)
        setError('')
      })
      return
    }
    if (!db) {
      Promise.resolve().then(() => {
        setContracts([])
        setSource('none')
        setError('Secure Cloud Sync is not available right now.')
        setLoading(false)
      })
      return
    }
    if (!workspaceId) {
      Promise.resolve().then(() => {
        setContracts([])
        setSource('firestore')
        setError('')
        setLoading(false)
      })
      return
    }

    Promise.resolve().then(() => {
      setLoading(true)
      setSource('firestore')
      setError('')
    })

    const unsub = subscribeUserCollection(
      workspaceId,
      'propertyContracts',
      (rows) => {
        setContracts((Array.isArray(rows) ? rows : []).map(normalizeContract))
        setLoading(false)
      },
      (err) => {
        setError(clientSafeMessage(err, 'Unable to load contracts.'))
        setContracts([])
        setLoading(false)
      },
      { businessType },
    )

    return () => unsub?.()
  }, [businessType, enabled, workspaceId])

  return useMemo(
    () => ({
      contracts,
      loading,
      source,
      error,
      async createContract(payload) {
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeContract(payload)
        if (!record.tenantName) return { ok: false, error: 'Tenant is required' }
        if (!record.startDate || !record.endDate) return { ok: false, error: 'Start and end dates are required' }
        if (new Date(record.endDate) <= new Date(record.startDate)) return { ok: false, error: 'End date must be after start date' }
        if (record.monthlyRent <= 0) return { ok: false, error: 'Monthly rent is required' }
        try {
          const ref = await createUserDoc(workspaceId, 'propertyContracts', {
            ...record,
            renewalCount: 0,
            createdBy: userId,
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Contract created',
            module: 'Contracts',
            description: `Lease for ${record.tenantName} (${record.propertyName || 'property'}) created.`,
            targetId: ref.id,
            targetName: record.reference || record.tenantName,
            metadata: { monthlyRent: record.monthlyRent, status: record.status },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to create contract.') }
        }
      },
      async updateContract(id, payload) {
        if (!id) return { ok: false, error: 'Contract not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const record = sanitizeContract(payload)
        if (!record.tenantName) return { ok: false, error: 'Tenant is required' }
        if (!record.startDate || !record.endDate) return { ok: false, error: 'Start and end dates are required' }
        if (new Date(record.endDate) <= new Date(record.startDate)) return { ok: false, error: 'End date must be after start date' }
        if (record.monthlyRent <= 0) return { ok: false, error: 'Monthly rent is required' }
        try {
          await patchUserDoc(workspaceId, 'propertyContracts', id, record, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Contract updated',
            module: 'Contracts',
            description: `Lease for ${record.tenantName} was updated.`,
            targetId: id,
            targetName: record.reference || record.tenantName,
            metadata: { monthlyRent: record.monthlyRent, status: record.status },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to update contract.') }
        }
      },
      async renewContract(id, payload) {
        if (!id) return { ok: false, error: 'Contract not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        const current = contracts.find((item) => item.id === id)
        const record = sanitizeContract(payload)
        if (!record.startDate || !record.endDate) return { ok: false, error: 'Start and end dates are required' }
        if (new Date(record.endDate) <= new Date(record.startDate)) return { ok: false, error: 'End date must be after start date' }
        if (record.monthlyRent <= 0) return { ok: false, error: 'Monthly rent is required' }
        try {
          await patchUserDoc(workspaceId, 'propertyContracts', id, {
            ...record,
            status: 'Active',
            renewalCount: (current?.renewalCount || 0) + 1,
            previousEndDate: current?.endDate || '',
            renewedAt: new Date().toISOString(),
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Contract renewed',
            module: 'Contracts',
            description: `Lease for ${record.tenantName} renewed to ${record.endDate}.`,
            targetId: id,
            targetName: record.reference || record.tenantName,
            metadata: { monthlyRent: record.monthlyRent, endDate: record.endDate },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to renew contract.') }
        }
      },
      async terminateContract(contract, reason = '') {
        if (!contract?.id) return { ok: false, error: 'Contract not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await patchUserDoc(workspaceId, 'propertyContracts', contract.id, {
            status: 'Terminated',
            terminatedAt: new Date().toISOString(),
            terminationReason: String(reason || '').trim(),
          }, { businessType })
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Contract terminated',
            module: 'Contracts',
            description: `Lease for ${contract.tenantName || 'tenant'} was terminated.`,
            targetId: contract.id,
            targetName: contract.reference || contract.tenantName || 'Contract',
            metadata: { reason: String(reason || '').trim() },
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to terminate contract.') }
        }
      },
      async deleteContract(contract) {
        if (!contract?.id) return { ok: false, error: 'Contract not found' }
        if (!userId || !workspaceId) return { ok: false, error: 'Please login first' }
        if (!db) return { ok: false, error: 'Secure Cloud Sync is not available right now' }
        try {
          await removeUserDoc(workspaceId, 'propertyContracts', contract.id)
          await logActivity({
            workspaceId,
            userId,
            businessType,
            ...userActivityInfo(userDoc, firebaseUser),
            action: 'Contract deleted',
            module: 'Contracts',
            description: `Lease for ${contract.tenantName || 'tenant'} was removed.`,
            targetId: contract.id,
            targetName: contract.reference || contract.tenantName || 'Contract',
            metadata: {},
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: clientSafeMessage(e, 'Unable to delete contract.') }
        }
      },
    }),
    [contracts, loading, source, error, businessType, firebaseUser, userDoc, userId, workspaceId],
  )
}
