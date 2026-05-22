export function formatCurrency(value, currency = 'USD', options = {}) {
  const maximumFractionDigits =
    typeof options.maximumFractionDigits === 'number' ? options.maximumFractionDigits : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(value)
}

export function formatCompact(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatPercent(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}
