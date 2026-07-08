import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  classifyPublicClick,
  initPublicAnalytics,
  trackPublicEvent,
} from '../lib/publicAnalytics.js'
import { safeTrackMetaEvent } from '../lib/metaPixel.js'

function serviceNameFromPath(pathname) {
  const servicePages = {
    '/services': 'business_services',
    '/business-services': 'business_services',
    '/restaurant-pos': 'restaurant_pos',
    '/retail-pos': 'retail_pos',
    '/school-erp': 'school_erp',
    '/transport': 'transport_software',
    '/whatsapp-crm': 'whatsapp_crm',
  }
  if (servicePages[pathname]) return servicePages[pathname]
  if (pathname.startsWith('/solutions/')) return pathname.split('/').filter(Boolean).join('_')
  return ''
}

export default function PublicAnalytics() {
  const location = useLocation()
  const lastTrackedPathRef = useRef('')

  useEffect(() => {
    if (!import.meta.env.PROD) return
    // Defer analytics init to avoid blocking initial paint
    const deferInit = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (fn) => window.setTimeout(fn, 1)
    deferInit(() => initPublicAnalytics())
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD) return

    const path = `${location.pathname}${location.search || ''}`
    if (lastTrackedPathRef.current === path) return
    lastTrackedPathRef.current = path

    trackPublicEvent('page_view', {
      page_path: location.pathname,
      page_search: location.search || '',
      page_title: document.title,
    })

    if (location.pathname.startsWith('/blog/') && location.pathname !== '/blog/') {
      trackPublicEvent('blog_article_view', {
        article_slug: location.pathname.split('/').filter(Boolean).pop() || '',
      })
    }

    const serviceName = serviceNameFromPath(location.pathname)
    if (serviceName) {
      trackPublicEvent('service_page_view', {
        service_name: serviceName,
      })
    }
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!import.meta.env.PROD) return

    const onClick = (event) => {
      const target = event.target?.closest?.('a,button,[role="button"]')
      if (!target) return
      const classified = classifyPublicClick(target)
      if (!classified) return
      if (classified.eventName === 'whatsapp_click' || classified.eventName === 'contact_button_click') {
        safeTrackMetaEvent('Contact')
      }
      trackPublicEvent(classified.eventName, {
        button_label: classified.label,
        target_url: target.getAttribute('href') || target.getAttribute('to') || '',
      })
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
