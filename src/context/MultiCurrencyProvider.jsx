import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isHydratingServerHtml } from '../lib/hydration.js'
import {
  STORAGE_KEY_CURRENCY,
  detectVisitorCurrency,
  loadExchangeRates,
  formatPriceLabel,
  formatPlanPrice,
  getRegionalPriceOverride,
  getPlanConvertedAmount,
  getBillingPeriodSuffix,
} from '../lib/multiCurrency.js'

const MultiCurrencyContext = createContext(null)

export function useMultiCurrency() {
  const ctx = useContext(MultiCurrencyContext)
  if (!ctx) {
    // Graceful fallback when used outside provider — returns PKR defaults
    return {
      currency: 'PKR',
      setCurrency: () => {},
      isAutoDetected: false,
      rates: null,
      ratesLoading: false,
      ratesSource: 'fallback',
      market: { country: 'PK', currency: 'PKR' },
      formatPrice: (amount) => formatPriceLabel(amount, 'PKR'),
      formatPlanPrice: (plan, cycle) => formatPlanPrice(plan, cycle, 'PKR'),
      getRegionalPrice: () => null,
      getConvertedAmount: (plan, cycle) => getPlanConvertedAmount(plan, cycle, 'PKR'),
      getBillingSuffix: (plan, cycle) => getBillingPeriodSuffix(plan, cycle, 'PKR'),
    }
  }
  return ctx
}

function readStoredCurrency() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENCY)
    return stored && /^[A-Z]{3}$/.test(stored) ? stored : null
  } catch {
    return null
  }
}

// On the server, and while hydrating a server-rendered page (lib/hydration.js),
// the first render must not depend on this browser's saved currency: the server
// rendered PKR with the manual picker, so the browser starts there too and the
// effect below applies the saved or detected currency right after.
function startsFromServerState() {
  return typeof window === 'undefined' || isHydratingServerHtml()
}

export function MultiCurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => (startsFromServerState() ? 'PKR' : readStoredCurrency() || 'PKR'))

  const [isAutoDetected, setIsAutoDetected] = useState(() => (startsFromServerState() ? false : !readStoredCurrency()))

  const [rates, setRates] = useState(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [ratesSource, setRatesSource] = useState('fallback')
  const [market, setMarket] = useState({ country: 'PK', currency: 'PKR' })

  /* ---- Set currency (manual override) ---- */
  const setCurrency = useCallback((code) => {
    const normalized = String(code || '').toUpperCase()
    if (!/^[A-Z]{3}$/.test(normalized)) return
    setCurrencyState(normalized)
    setIsAutoDetected(false)
    try { localStorage.setItem(STORAGE_KEY_CURRENCY, normalized) } catch { /* quota */ }
  }, [])

  /* ---- Auto-detection + rate loading (async, never blocks render) ---- */
  useEffect(() => {
    let cancelled = false

    // Every update here is a transition. This provider sits above the lazy
    // page, so on a server-rendered page these updates can arrive while the
    // page's own markup is still waiting to hydrate; an urgent update would make
    // React throw that markup away and re-render the page from scratch, a
    // transition lets hydration finish first.
    const init = async () => {
      // A saved manual choice wins; without one, the currency is auto-detected.
      // Applied here rather than in the initial state so hydration matches.
      const stored = readStoredCurrency()
      const autoDetect = !stored
      startTransition(() => {
        if (stored) setCurrencyState(stored)
        setIsAutoDetected(autoDetect)
      })

      // Load exchange rates in background
      const rateResult = await loadExchangeRates()
      if (cancelled) return
      startTransition(() => {
        setRates(rateResult.rates)
        setRatesSource(rateResult.source)
        setRatesLoading(false)
      })

      // Auto-detect currency (only if user hasn't manually selected one)
      if (autoDetect) {
        const detection = await detectVisitorCurrency()
        if (cancelled) return
        startTransition(() => {
          setMarket({ country: detection.country, currency: detection.currency })
          // Don't persist auto-detected — user hasn't manually chosen
          if (detection.currency !== 'PKR') setCurrencyState(detection.currency)
        })
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  /* ---- Convenience formatters (memoized against current state) ---- */
  const formatPrice = useCallback(
    (pkrAmount) => formatPriceLabel(pkrAmount, currency, rates),
    [currency, rates],
  )

  const formatPlanPriceFn = useCallback(
    (plan, billingCycle = 'monthly') => formatPlanPrice(plan, billingCycle, currency, rates),
    [currency, rates],
  )

  const getRegionalPrice = useCallback(
    (planId) => getRegionalPriceOverride(planId, currency),
    [currency],
  )

  const getConvertedAmount = useCallback(
    (plan, cycle = 'monthly') => getPlanConvertedAmount(plan, cycle, currency, rates),
    [currency, rates],
  )

  const getBillingSuffix = useCallback(
    (plan, cycle = 'monthly') => getBillingPeriodSuffix(plan, cycle, currency),
    [currency],
  )

  const value = useMemo(() => ({
    currency,
    setCurrency,
    isAutoDetected,
    rates,
    ratesLoading,
    ratesSource,
    market,
    formatPrice,
    formatPlanPrice: formatPlanPriceFn,
    getRegionalPrice,
    getConvertedAmount,
    getBillingSuffix,
  }), [
    currency, setCurrency, isAutoDetected, rates, ratesLoading, ratesSource,
    market, formatPrice, formatPlanPriceFn, getRegionalPrice, getConvertedAmount, getBillingSuffix,
  ])

  return (
    <MultiCurrencyContext.Provider value={value}>
      {children}
    </MultiCurrencyContext.Provider>
  )
}
