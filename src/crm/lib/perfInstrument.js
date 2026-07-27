/**
 * TEMPORARY performance instrumentation for Restaurant POS freeze diagnosis.
 * Remove after root cause is identified.
 */
const RENDER_COUNTS = new Map()
const RENDER_TIMES = new Map()
const STATE_UPDATES = []
const BLOCKING_OPS = []

const BLOCK_THRESHOLD_MS = 30
const MAX_LOG_ENTRIES = 200
const RAPID_RENDER_THRESHOLD = 3 // renders within this many ms
const RAPID_RENDER_WINDOW_MS = 100

let globalStartTime = 0
let lastRenderTime = 0
let rapidRenderCount = 0

export function initPerfTrace() {
  globalStartTime = performance.now()
  lastRenderTime = globalStartTime
  rapidRenderCount = 0
  RENDER_COUNTS.clear()
  RENDER_TIMES.clear()
  STATE_UPDATES.length = 0
  BLOCKING_OPS.length = 0
  console.log('%c[PERF] ═══ Trace started ═══', 'color:#f59e0b;font-weight:bold')
}

function elapsed() {
  return ((performance.now() - globalStartTime) / 1000).toFixed(3)
}

function sinceLastRender() {
  const now = performance.now()
  const delta = now - lastRenderTime
  lastRenderTime = now
  return delta.toFixed(1)
}

export function useRenderCounter(componentName) {
  const count = (RENDER_COUNTS.get(componentName) || 0) + 1
  RENDER_COUNTS.set(componentName, count)

  const times = RENDER_TIMES.get(componentName) || []
  const delta = sinceLastRender()
  times.push(delta)
  if (times.length > 50) times.shift()
  RENDER_TIMES.set(componentName, times)

  // Detect rapid re-rendering
  if (Number(delta) < RAPID_RENDER_WINDOW_MS) {
    rapidRenderCount++
    if (rapidRenderCount >= RAPID_RENDER_THRESHOLD) {
      console.warn(
        `%c[PERF] ⚡ RAPID RENDERS %c${componentName} %c${count} renders, last gap ${delta}ms — possible render loop!`,
        'color:#ef4444;font-weight:bold', 'color:#f59e0b', 'color:#6b7280',
      )
      rapidRenderCount = 0
    }
  } else {
    rapidRenderCount = 0
  }

  if (count <= 5 || count % 20 === 0) {
    console.log(
      `%c[PERF] 🎨 %c${componentName} %crender #${count} %c@${elapsed()}s %c(+${delta}ms)`,
      'color:#3b82f6', 'color:#f59e0b;font-weight:bold',
      'color:#8b5cf6', 'color:#6b7280', 'color:#9ca3af',
    )
  }

  return count
}

export function logStateUpdate(source, detail = '') {
  const entry = `${elapsed()}s ${source} ${detail}`
  STATE_UPDATES.push(entry)
  if (STATE_UPDATES.length > MAX_LOG_ENTRIES) STATE_UPDATES.shift()
  console.log(`%c[PERF] 📡 %c${source} %c${detail} %c@${elapsed()}s`,
    'color:#10b981', 'color:#f59e0b;font-weight:bold', 'color:#6b7280', 'color:#9ca3af')
}

let blockTimer = 0

export function beginBlockWatch(label) {
  blockTimer = performance.now()
  return blockTimer
}

export function endBlockWatch(label) {
  const duration = performance.now() - blockTimer
  if (duration > BLOCK_THRESHOLD_MS) {
    BLOCKING_OPS.push(`${elapsed()}s ${label} (${duration.toFixed(1)}ms)`)
    if (BLOCKING_OPS.length > MAX_LOG_ENTRIES) BLOCKING_OPS.shift()
    console.warn(
      `%c[PERF] 🛑 BLOCKING %c${label} %c${duration.toFixed(1)}ms %c@${elapsed()}s`,
      'color:#ef4444;font-weight:bold', 'color:#f59e0b',
      'color:#ef4444', 'color:#6b7280',
    )
  }
  return duration
}

export function measureSync(label, fn) {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  if (duration > BLOCK_THRESHOLD_MS) {
    BLOCKING_OPS.push(`${elapsed()}s ${label} (${duration.toFixed(1)}ms)`)
    console.warn(
      `%c[PERF] 🛑 SYNC-BLOCK %c${label} %c${duration.toFixed(1)}ms %c@${elapsed()}s`,
      'color:#ef4444;font-weight:bold', 'color:#f59e0b',
      'color:#ef4444', 'color:#6b7280',
    )
  }
  return result
}

export function dumpPerfReport() {
  console.log('%c[PERF] ═══ Trace Report ═══', 'color:#f59e0b;font-weight:bold;font-size:14px')
  console.log('%c[PERF] Render counts:', 'color:#3b82f6;font-weight:bold')
  for (const [name, count] of RENDER_COUNTS.entries()) {
    const times = RENDER_TIMES.get(name) || []
    const avgGap = times.length > 1
      ? (times.slice(1).reduce((a, b) => a + Number(b), 0) / (times.length - 1)).toFixed(1)
      : 'N/A'
    console.log(`  ${name}: ${count} renders, avg gap: ${avgGap}ms`)
  }
  if (BLOCKING_OPS.length > 0) {
    console.log('%c[PERF] Blocking operations (>30ms):', 'color:#ef4444;font-weight:bold')
    for (const op of BLOCKING_OPS.slice(-20)) console.log(`  ${op}`)
  }
  if (STATE_UPDATES.length > 0) {
    console.log('%c[PERF] Recent state updates:', 'color:#10b981;font-weight:bold')
    for (const update of STATE_UPDATES.slice(-30)) console.log(`  ${update}`)
  }
}

export { RENDER_COUNTS, RENDER_TIMES, BLOCKING_OPS, STATE_UPDATES }
