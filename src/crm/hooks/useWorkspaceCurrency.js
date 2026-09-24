import { useEffect, useMemo } from 'react'
import { useBusinessSettings } from './useBusinessSettings.js'
import { usePreferences } from './usePreferences.js'
import { useUser } from './useUser.js'
import {
  currencySymbol,
  getActiveCurrency,
  resolveWorkspaceCurrency,
  setActiveCurrency,
} from '../lib/workspaceCurrency.js'

// Mounted once in DashboardLayout. Resolves the workspace currency from
// Firestore, publishes it for every formatter, caches it on this device and
// returns a key that changes whenever the currency or symbol changes (the
// layout keys its <Outlet> with it so open pages re-render in the new currency).
export function useWorkspaceCurrencySync() {
  const { workspaceDoc, userDoc, isOwner } = useUser()
  const { savedCurrency, loading } = useBusinessSettings()
  const { currency: cachedCurrency, currencySymbol: cachedSymbol, setCurrencySettings } = usePreferences()

  const resolved = useMemo(() => {
    const cached = { currency: cachedCurrency, currencySymbol: cachedSymbol }
    // Until businessSettings answers, keep what this device last used instead
    // of flashing through lower-priority sources.
    if (loading) return resolveWorkspaceCurrency({ cached })
    return resolveWorkspaceCurrency({
      savedBusinessSettings: savedCurrency,
      workspaceDoc,
      userDoc: isOwner ? userDoc : null,
      cached,
    })
  }, [cachedCurrency, cachedSymbol, isOwner, loading, savedCurrency, userDoc, workspaceDoc])

  // Publish before any page under the layout renders.
  setActiveCurrency(resolved)

  useEffect(() => {
    setCurrencySettings({ currency: resolved.code, currencySymbol: resolved.symbol })
  }, [resolved.code, resolved.symbol, setCurrencySettings])

  return `${resolved.code}|${resolved.symbol}`
}

// Workspace currency for components: { code, symbol, displaySymbol }.
export function useCurrency() {
  const { code, symbol } = getActiveCurrency()
  return { code, symbol, displaySymbol: currencySymbol(code) }
}
