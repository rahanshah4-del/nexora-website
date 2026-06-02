import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { getUserAnalyticsContext, trackAnalyticsEvent } from '../lib/analyticsTracking.js'

function clickLabel(element) {
  return (
    element?.getAttribute?.('data-analytics-label') ||
    element?.getAttribute?.('aria-label') ||
    element?.innerText ||
    element?.textContent ||
    element?.href ||
    ''
  ).trim().slice(0, 120)
}

function clickEventType(label, element) {
  const text = label.toLowerCase()
  const href = element?.getAttribute?.('href') || ''
  if (text.includes('pricing') || href.includes('pricing')) return 'pricing_click'
  if (text.includes('free trial') || text.includes('start trial')) return 'start_free_trial_click'
  if (text.includes('logout') || text.includes('sign out') || text.includes('sign in with another account')) return 'logout'
  if (['crm', 'school erp', 'property erp', 'pos', 'whatsapp crm', 'retail / pos', 'restaurant pos'].some((item) => text.includes(item))) return 'module_click'
  if (text.includes('upgrade')) return 'upgrade_clicked'
  return 'button_click'
}

export default function AnalyticsTracker() {
  const location = useLocation()
  const { user } = useAuth()
  const contextRef = useRef({})
  const lastClickAt = useRef(0)

  useEffect(() => {
    let cancelled = false
    getUserAnalyticsContext(user).then((context) => {
      if (!cancelled) contextRef.current = context
    })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    trackAnalyticsEvent('page_view', { ...contextRef.current, page: location.pathname })
    if (location.pathname === '/app/dashboard') {
      trackAnalyticsEvent('login_completed', { ...contextRef.current, page: location.pathname, status: 'crm_opened' })
    }
  }, [location.pathname])

  useEffect(() => {
    const onClick = (event) => {
      const target = event.target?.closest?.('button,a,[role="button"]')
      if (!target) return
      const now = Date.now()
      if (now - lastClickAt.current < 400) return
      lastClickAt.current = now
      const label = clickLabel(target)
      if (!label) return
      trackAnalyticsEvent(clickEventType(label, target), {
        ...contextRef.current,
        page: location.pathname,
        buttonLabel: label,
        moduleName: clickEventType(label, target) === 'module_click' ? label : '',
      })
    }
    const onUnload = () => {
      trackAnalyticsEvent('session_ended', { ...contextRef.current, page: location.pathname })
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [location.pathname])

  return null
}
