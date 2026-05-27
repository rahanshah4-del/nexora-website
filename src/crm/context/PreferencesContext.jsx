import { createContext, useEffect, useMemo, useState } from 'react'

const PreferencesContext = createContext(null)

const STORAGE_KEY = 'nexora_preferences_v1'

const defaultState = {
  currency: 'PKR',
  plan: 'Free', // Free | Business
  profile: {
    companyName: 'NEXORA SOLUTIONS',
    ownerName: 'Admin User',
    email: 'admin@nexora.solutions',
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
    const raw = localStorage.getItem(STORAGE_KEY)
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
