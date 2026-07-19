import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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

export function MultiCurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    if (typeof window === 'undefined') return 'PKR'
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENCY)
      if (stored && /^[A-Z]{3}$/.test(stored)) return stored
    } catch { /* quota */ }
    return 'PKR'
  })

  const [isAutoDetected, setIsAutoDetected] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return !localStorage.getItem(STORAGE_KEY_CURRENCY)
    } catch { return true }
  })

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

    const init = async () => {
      // Load exchange rates in background
      setRatesLoading(true)
      const rateResult = await loadExchangeRates()
      if (cancelled) return
      setRates(rateResult.rates)
      setRatesSource(rateResult.source)
      setRatesLoading(false)

      // Auto-detect currency (only if user hasn't manually selected one)
      if (isAutoDetected) {
        const detection = await detectVisitorCurrency()
        if (cancelled) return
        setMarket({ country: detection.country, currency: detection.currency })
        if (detection.currency !== 'PKR') {
          setCurrencyState(detection.currency)
          // Don't persist auto-detected — user hasn't manually chosen
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
