/** Speed test (Google PageSpeed) helpers shared by the Control Centre, the client's Results tab and the PDF report. */

export const DEVICES = Object.freeze([
  { id: 'mobile', label: 'Phone' },
  { id: 'desktop', label: 'Desktop' },
])

/** Metric rows in the order people read them. `plain` is what it means, in words a business owner understands. */
export const SPEED_METRICS = Object.freeze([
  { key: 'lcpMs', label: 'Main content appears', short: 'LCP', unit: 'ms', plain: 'How fast the biggest thing on the page shows. Under 2.5 s is good.' },
  { key: 'fcpMs', label: 'First paint', short: 'FCP', unit: 'ms', plain: 'When the first text or image appears. Under 1.8 s is good.' },
  { key: 'tbtMs', label: 'Page is ready to tap', short: 'TBT', unit: 'ms', plain: 'How long the page ignores taps while loading. Under 200 ms is good.' },
  { key: 'cls', label: 'Layout jumping', short: 'CLS', unit: '', plain: 'How much the page moves while loading. Under 0.1 is good.' },
  { key: 'speedIndexMs', label: 'Speed Index', short: 'SI', unit: 'ms', plain: 'How quickly the page fills in. Under 3.4 s is good.' },
  { key: 'ttfbMs', label: 'Server answer time', short: 'TTFB', unit: 'ms', plain: 'How long your server takes to reply. Under 0.8 s is good.' },
])

export function formatMetric(key, value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-'
  const n = Number(value)
  if (key === 'cls') return String(Math.round(n * 1000) / 1000)
  return n >= 1000 ? `${Math.round(n / 100) / 10} s` : `${Math.round(n)} ms`
}

export function speedGrade(score) {
  if (typeof score !== 'number') return { word: 'Not measured', tone: 'slate' }
  if (score >= 90) return { word: 'Fast', tone: 'emerald' }
  if (score >= 50) return { word: 'Needs work', tone: 'amber' }
  return { word: 'Slow', tone: 'rose' }
}

export const RATING_LABEL = Object.freeze({ good: 'Good', 'needs-improvement': 'Needs work', poor: 'Poor' })

/** The change in speed score for one device, or null when either side is missing. */
export function speedGain(speed, device) {
  const a = speed?.before?.[device]?.score
  const b = speed?.after?.[device]?.score
  return typeof a === 'number' && typeof b === 'number' ? Math.round((b - a) * 10) / 10 : null
}

/** One line per device for events, the brief and short summaries: "Phone 54 -> 78, Desktop 88". */
export function speedSummary(speed) {
  if (!speed) return ''
  return DEVICES.map((d) => {
    const b = speed.before?.[d.id]?.score
    const a = speed.after?.[d.id]?.score
    if (typeof b !== 'number' && typeof a !== 'number') return ''
    if (typeof b === 'number' && typeof a === 'number') return `${d.label} ${b} -> ${a}`
    return `${d.label} ${typeof a === 'number' ? a : b}`
  }).filter(Boolean).join(', ')
}

export const hasSpeed = (speed) => Boolean(speed?.before?.mobile || speed?.before?.desktop || speed?.after?.mobile || speed?.after?.desktop)
