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
    const raw = localStorage.getItem(_key())
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
    localStorage.setItem(_key(), JSON.stringify(state))
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
