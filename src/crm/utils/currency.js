import { demoFxRates } from '../data/currency.js'

export function convertFromUsd(usdValue, currency) {
  const amount = Number(usdValue)
  const rate = demoFxRates[currency] ?? 1
  return (Number.isFinite(amount) ? amount : 0) * rate
}
