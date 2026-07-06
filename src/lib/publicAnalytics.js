const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
const GTM_ID = import.meta.env.VITE_GTM_ID || ''
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID || ''
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID || ''

const loadedScripts = new Set()
const initializedAnalytics = { gtag: false, gtm: false, clarity: false }

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function loadScript(id, src, attrs = {}) {
  if (!canUseDom() || !src) return
  const existingScript = document.getElementById(id)
  if (existingScript || loadedScripts.has(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value))
  document.head.appendChild(script)
  loadedScripts.add(id)
}

function ensureDataLayer() {
  if (!canUseDom()) return
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments)
  }
}

function configureGtag(id) {
  if (!id || !canUseDom()) return
  ensureDataLayer()
  window.gtag('js', new Date())
  window.gtag('config', id, { anonymize_ip: true })
}

function loadGtag() {
  if (initializedAnalytics.gtag) return
  const primaryId = GA_MEASUREMENT_ID || GOOGLE_ADS_ID
  if (!primaryId || !import.meta.env.PROD) return
  ensureDataLayer()
  loadScript('nexora-gtag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`)
  configureGtag(GA_MEASUREMENT_ID)
  configureGtag(GOOGLE_ADS_ID)
  initializedAnalytics.gtag = true
}

function loadGtm() {
  if (initializedAnalytics.gtm || !GTM_ID || !canUseDom() || !import.meta.env.PROD) return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  loadScript('nexora-gtm', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`)
  initializedAnalytics.gtm = true
}

function renderGtmNoscript() {
  if (!canUseDom() || !import.meta.env.PROD || !GTM_ID || document.getElementById('nexora-gtm-noscript')) return
  const iframe = document.createElement('iframe')
  iframe.id = 'nexora-gtm-noscript'
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GTM_ID)}`
  iframe.height = '0'
  iframe.width = '0'
  iframe.style.display = 'none'
  iframe.style.visibility = 'hidden'
  const body = document.body
  if (body) {
    body.insertBefore(iframe, body.firstChild)
  }
}

function loadClarity() {
  if (initializedAnalytics.clarity || !CLARITY_ID || !canUseDom() || !import.meta.env.PROD) return
  window.clarity = window.clarity || function clarity() {
    ;(window.clarity.q = window.clarity.q || []).push(arguments)
  }
  const script = document.createElement('script')
  script.id = 'nexora-clarity'
  script.async = true
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`
  document.head.appendChild(script)
  loadedScripts.add('nexora-clarity')
  initializedAnalytics.clarity = true
}

export function hasPublicAnalyticsConfig() {
  return Boolean(GA_MEASUREMENT_ID || GTM_ID || CLARITY_ID || GOOGLE_ADS_ID)
}

export function initPublicAnalytics() {
  if (!hasPublicAnalyticsConfig()) return
  loadGtag()
  loadGtm()
  renderGtmNoscript()
  loadClarity()
}

export function trackPublicEvent(eventName, params = {}) {
  if (!canUseDom() || !eventName || !hasPublicAnalyticsConfig()) return
  const payload = {
    event: eventName,
    page_path: window.location.pathname,
    page_location: window.location.href,
    ...params,
  }

  if (window.dataLayer) window.dataLayer.push(payload)
  if (window.gtag) window.gtag('event', eventName, payload)
  if (window.clarity) {
    window.clarity('event', eventName)
    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        window.clarity('set', key, String(value))
      }
    })
  }

  if (GOOGLE_ADS_ID && ['contact_button_click', 'whatsapp_click', 'pricing_cta_click', 'start_free_trial'].includes(eventName) && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_ID,
      event_category: 'public_website',
      event_label: eventName,
    })
  }
}

export function classifyPublicClick(element) {
  const href = element?.getAttribute?.('href') || ''
  const to = element?.getAttribute?.('to') || ''
  const label = (
    element?.getAttribute?.('data-analytics-label') ||
    element?.getAttribute?.('aria-label') ||
    element?.innerText ||
    element?.textContent ||
    href ||
    to ||
    ''
  ).trim().replace(/\s+/g, ' ').slice(0, 140)
  const target = `${label} ${href} ${to}`.toLowerCase()

  if (href.includes('linkedin.com') || href.includes('facebook.com') || href.includes('twitter.com') || href.includes('wa.me/?text=')) return { eventName: 'blog_share', label }
  if (href.includes('wa.me') || target.includes('whatsapp')) return { eventName: 'whatsapp_click', label }
  if (href.startsWith('mailto:') || target.includes('/contact') || target.includes('contact')) return { eventName: 'contact_button_click', label }
  if (target.includes('/pricing') || target.includes('pricing')) return { eventName: 'pricing_cta_click', label }
  if (target.includes('/signup') || target.includes('free trial') || target.includes('get started free')) return { eventName: 'start_free_trial', label }
  return null
}
