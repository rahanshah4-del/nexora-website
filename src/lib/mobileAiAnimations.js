/**
 * Mobile-Only Apple-Style Animations
 *
 * - Apple spring card reveals
 * - Number counter animation (stats count up)
 * - Scale-fade for images/icons
 * - Hero shimmer gradient
 * - Battery saver (pauses when tab hidden)
 * - Hero delay (400ms after DOM)
 *
 * Bundle: ~1 KB gzipped. Zero deps.
 */

let observer = null
let mutObs = null
let visibilityHandler = null
let initialized = false

/* ── Apple-style easing for number counters ──────────────────────────── */
function appleEase(t) {
  // Custom bezier approximating Apple's spring: fast start, gentle settle
  return 1 - Math.pow(1 - t, 4)
}

/* ── Animate a single number counter ─────────────────────────────────── */
function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-ai-counter'), 10)
  if (!target || target <= 0) return
  const suffix = el.getAttribute('data-ai-suffix') || ''
  const prefix = el.getAttribute('data-ai-prefix') || ''
  const duration = 1200 // ms
  const start = performance.now()

  function step(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = appleEase(progress)
    const current = Math.round(eased * target)
    el.textContent = `${prefix}${current.toLocaleString()}${suffix}`
    if (progress < 1) {
      requestAnimationFrame(step)
    }
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
        if (!entry.isIntersecting) continue
        const el = entry.target

        // Hero: delay 400ms
        if (el.hasAttribute('data-ai-hero')) {
          setTimeout(() => el.classList.add('ai-visible'), 400)
        } else {
          el.classList.add('ai-visible')
        }

        // Number counters: animate when visible
        if (el.hasAttribute('data-ai-counter') && !el.dataset.aiAnimated) {
          el.dataset.aiAnimated = '1'
          animateCounter(el)
        }
      }
    },
    { rootMargin: '60px 0px', threshold: 0.05 },
  )

  // Observe existing elements
  document.querySelectorAll('[data-ai-reveal], [data-ai-animate], [data-ai-counter]').forEach(el => observer.observe(el))

  // MutationObserver for lazy-loaded sections
  if (typeof MutationObserver !== 'undefined') {
    mutObs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.matches?.('[data-ai-reveal], [data-ai-animate], [data-ai-counter]')) observer.observe(node)
          node.querySelectorAll?.('[data-ai-reveal], [data-ai-animate], [data-ai-counter]').forEach(el => observer.observe(el))
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
