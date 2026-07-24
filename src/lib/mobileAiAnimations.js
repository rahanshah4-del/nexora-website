/**
 * Mobile-Only Number Counter Animations
 *
 * Animates [data-ai-counter] elements when they enter the viewport.
 * Counts up from 0 to the target value with Apple-style easing.
 * Only activates on screens < 768px.
 * Respects prefers-reduced-motion.
 *
 * Bundle: ~0.8 KB gzipped. Zero dependencies.
 */

let observer = null
let mutObs = null
let visibilityHandler = null
let initialized = false

function appleEase(t) {
  return 1 - Math.pow(1 - t, 4)
}

function animateCounter(el) {
  if (el.dataset.aiAnimated) return
  el.dataset.aiAnimated = '1'

  const target = parseFloat(el.getAttribute('data-ai-counter'))
  if (!target || target <= 0) return

  const suffix = el.getAttribute('data-ai-suffix') || ''
  const prefix = el.getAttribute('data-ai-prefix') || ''
  const decimals = suffix === '%' ? 1 : 0
  const duration = 1400
  const start = performance.now()

  function step(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = appleEase(progress)
    const current = eased * target
    el.textContent = `${prefix}${decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString()}${suffix}`
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export function initMobileAiAnimations() {
  if (initialized) return
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const mq = window.matchMedia('(max-width: 767px)')
  if (!mq.matches) {
    mq.addEventListener('change', (e) => { if (e.matches) initMobileAiAnimations() })
    return
  }

  initialized = true

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          animateCounter(entry.target)
        }
      }
    },
    { rootMargin: '80px 0px', threshold: 0 },
  )

  // Observe existing counters
  document.querySelectorAll('[data-ai-counter]').forEach(el => observer.observe(el))

  // Watch for dynamically added counters (lazy-loaded sections)
  if (typeof MutationObserver !== 'undefined') {
    mutObs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.hasAttribute?.('data-ai-counter')) observer.observe(node)
          node.querySelectorAll?.('[data-ai-counter]')?.forEach(el => observer.observe(el))
        }
      }
    })
    mutObs.observe(document.body, { childList: true, subtree: true })
  }

  // Battery saver
  visibilityHandler = () => {
    document.documentElement.classList.toggle('ai-animations-paused', document.visibilityState === 'hidden')
  }
  document.addEventListener('visibilitychange', visibilityHandler)
}
