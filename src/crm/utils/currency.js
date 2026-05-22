import { demoFxRates } from '../data/currency.js'

export function convertFromUsd(usdValue, currency) {
  const rate = demoFxRates[currency] ?? 1
  return usdValue * rate
}

