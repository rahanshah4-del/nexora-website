export function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function safeCurrencyCode(currency) {
  return typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : 'PKR'
}

export function formatCurrency(value, currency = 'PKR', options = {}) {
  const amount = toFiniteNumber(value)
  const code = safeCurrencyCode(currency)
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === 'number' ? options.maximumFractionDigits : 0
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits,
    }).format(amount)
  } catch {
    return `PKR ${amount.toFixed(maximumFractionDigits)}`
  }
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
