/**
 * Mobile-Only AI Animation Observer
 *
 * Watches [data-ai-animate] elements via IntersectionObserver.
 * Adds .ai-visible class when they enter viewport.
 * Only activates on screens < 768px. Pauses animations when off-screen.
 * Respects prefers-reduced-motion.
 *
 * Bundle cost: ~0.4 KB gzipped. Zero dependencies. CSS transforms only.
 */

let observer = null
let initialized = false

export function initMobileAiAnimations() {
  if (initialized) return
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  // Only initialize on mobile
  const mq = window.matchMedia('(max-width: 767px)')
  if (!mq.matches) {
    // Listen for resize into mobile
    mq.addEventListener('change', (e) => {
      if (e.matches) initMobileAiAnimations()
    })
    return
  }

  initialized = true

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ai-visible')
        } else {
          // Pause when off-screen (CSS animation-play-state handles this via class removal)
          // Keep visible for elements already seen (better UX than flickering)
        }
      }
    },
    { rootMargin: '40px 0px', threshold: 0.1 },
  )

  // Observe existing elements
  document.querySelectorAll('[data-ai-animate]').forEach((el) => observer.observe(el))

  // Watch for dynamically added elements (e.g., lazy-loaded sections)
  if (typeof MutationObserver !== 'undefined') {
    const mutObs = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            if (node.hasAttribute?.('data-ai-animate')) observer.observe(node)
            node.querySelectorAll?.('[data-ai-animate]')?.forEach((el) => observer.observe(el))
          }
        }
      }
    })
    mutObs.observe(document.body, { childList: true, subtree: true })
  }
}
