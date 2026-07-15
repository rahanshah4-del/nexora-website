import { createContext, useEffect, useMemo, useState } from 'react'
import { migrateKey, scopedKey } from '../lib/localDataEvents.js'

const PreferencesContext = createContext(null)

const _BASE = 'nexora.preferences.v1'

function _key() {
  const k = scopedKey(_BASE)
  if (k !== _BASE) {
    migrateKey(_BASE, k)
  }
  return k
}

const defaultState = {
  currency: 'PKR',
  plan: 'Free', // Free | Business
  profile: {
    companyName: 'NEXORA SOLUTION',
    ownerName: 'Nexora User',
    email: '',
    phone: '+92 300 0000000',
    address: '',
    country: 'Pakistan',
    city: 'Karachi',
    businessType: 'SaaS',
    avatarDataUrl: '',
  },
  notifications: {
    enabled: true,
    email: true,
    salesAlerts: true,
    reportAlerts: true,
    teamActivity: true,
    systemUpdates: true,
  },
  usage: {
    storageUsedGb: 7.6,
    storageLimitGb: 10,
    teamMembersUsed: 4,
    teamMembersLimit: 5,
    reportsGenerated: 46,
    reportsLimit: 60,
    apiRequests: 82000,
    apiRequestsLimit: 100000,
    monthlyUsage: [
      { month: 'Jan', api: 42000 },
      { month: 'Feb', api: 51000 },
      { month: 'Mar', api: 65000 },
      { month: 'Apr', api: 72000 },
      { month: 'May', api: 82000 },
      { month: 'Jun', api: 90000 },
    ],
  },
}

function loadInitial() {
  try {
    let raw
    try { raw = localStorage.getItem(_key()) } catch { return defaultState }
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    return {
      ...defaultState,
      ...parsed,
      profile: { ...defaultState.profile, ...(parsed.profile ?? {}) },
      notifications: { ...defaultState.notifications, ...(parsed.notifications ?? {}) },
      usage: { ...defaultState.usage, ...(parsed.usage ?? {}) },
    }
  } catch {
    return defaultState
  }
}

export function PreferencesProvider({ children }) {
  const [state, setState] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(_key(), JSON.stringify(state))
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        /* localStorage full — clear stale nexora keys to free space */
        const keep = [_key(), 'nexora:activeUid', 'nexora:sw-reset-v3']
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i)
          if (k && k.startsWith('nexora.') && !keep.includes(k)) {
            localStorage.removeItem(k)
          }
        }
        /* Retry once after cleanup */
        try { localStorage.setItem(_key(), JSON.stringify(state)) } catch {}
      } else {
        console.warn('[Preferences] localStorage write failed', e)
      }
    }
  }, [state])

  const value = useMemo(
    () => ({
      ...state,
      setCurrency: (currency) => setState((s) => ({ ...s, currency })),
      setPlan: (plan) => setState((s) => ({ ...s, plan })),
      setProfile: (profile) => setState((s) => ({ ...s, profile })),
      setNotifications: (notifications) => setState((s) => ({ ...s, notifications })),
      setUsage: (usage) => setState((s) => ({ ...s, usage })),
      resetPreferences: () => setState(defaultState),
    }),
    [state],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export default PreferencesContext
