import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.js'
import { getUserAnalyticsContext, trackAnalyticsEvent, updateUserSessionActivity } from '../lib/analyticsTracking.js'
import { syncClientIpToProfile } from '../lib/clientIp.js'

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
  const lastIssueRef = useRef({})
  const lastPageViewRef = useRef({ path: '', at: 0 })

  useEffect(() => {
    let cancelled = false
    getUserAnalyticsContext(user).then((context) => {
      if (!cancelled) {
        contextRef.current = context
        updateUserSessionActivity('session_seen', context)
      }
    })
    syncClientIpToProfile({ user })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user?.uid) return undefined
    const touch = () => {
      if (document.hidden) return
      updateUserSessionActivity('session_heartbeat', { userId: user.uid, email: user.email || '', ...contextRef.current })
    }
    touch()
    const timer = window.setInterval(touch, 120000)
    window.addEventListener('focus', touch)
    document.addEventListener('visibilitychange', touch)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', touch)
      document.removeEventListener('visibilitychange', touch)
    }
  }, [user])

  useEffect(() => {
    const now = Date.now()
    if (lastPageViewRef.current.path === location.pathname && now - lastPageViewRef.current.at < 30000) return
    lastPageViewRef.current = { path: location.pathname, at: now }
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

  useEffect(() => {
    const recordFrontendIssue = (eventType, message, status = 'critical') => {
      const cleanMessage = String(message || 'Frontend issue detected').replace(/\s+/g, ' ').trim().slice(0, 160)
      const key = `${eventType}:${location.pathname}:${cleanMessage}`
      const now = Date.now()
      if (now - (lastIssueRef.current[key] || 0) < 60000) return
      lastIssueRef.current[key] = now
      trackAnalyticsEvent(eventType, {
        ...contextRef.current,
        page: `${location.pathname}${location.search || ''}${location.hash || ''}`,
        buttonLabel: cleanMessage,
        moduleName: 'Frontend health',
        status,
      })
    }

    const onError = (event) => {
      recordFrontendIssue('frontend_runtime_error', event?.message || event?.error?.message || 'Runtime error', 'critical')
    }
    const onUnhandledRejection = (event) => {
      const reason = event?.reason
      recordFrontendIssue('frontend_unhandled_rejection', reason?.message || reason || 'Unhandled promise rejection', 'critical')
    }
    const onOffline = () => {
      recordFrontendIssue('frontend_offline', 'Internet disconnected. Live sync is paused.', 'warning')
    }
    const onOnline = () => {
      recordFrontendIssue('frontend_online', 'Internet restored. Live sync is active.', 'healthy')
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [location.hash, location.pathname, location.search])

  return null
}
