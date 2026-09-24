import { formatMoney, getActiveCurrencyCode } from '../lib/workspaceCurrency.js'

export function toFiniteNumber(value, fallback = 0) {
  const numeric = typeof value === 'string' ? Number(value.replace(/[,\s]/g, '')) : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

// `currency` defaults to the active workspace currency (set in the setup wizard
// or Settings), so callers that omit it follow the workspace automatically.
export function formatCurrency(value, currency, options = {}) {
  return formatMoney(toFiniteNumber(value), currency || getActiveCurrencyCode(), options)
}

export function formatCompact(value) {
  const amount = toFiniteNumber(value)
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export function formatPercent(value, options = {}) {
  const amount = toFiniteNumber(value)
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === 'number' ? options.maximumFractionDigits : 0
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits,
  }).format(amount)
}

export function formatPercentValue(value, options = {}) {
  const amount = toFiniteNumber(value)
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === 'number' ? options.maximumFractionDigits : 1
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    signDisplay: options.signDisplay || 'auto',
  }).format(amount)
  return `${formatted}%`
}
