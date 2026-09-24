import { createContext } from 'react'
import { useWorkspaceCurrencySync } from '../hooks/useWorkspaceCurrency.js'

// Carries the "<code>|<symbol>" key of the workspace currency. Mounted in
// CRMProviders so every CRM surface gets the currency, including pages that
// render outside DashboardLayout (e.g. the standalone /pos-till/medical till).
const WorkspaceCurrencyContext = createContext('')

export function WorkspaceCurrencyProvider({ children }) {
  const currencyKey = useWorkspaceCurrencySync()
  return <WorkspaceCurrencyContext.Provider value={currencyKey}>{children}</WorkspaceCurrencyContext.Provider>
}

export default WorkspaceCurrencyContext
