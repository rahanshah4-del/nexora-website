import { useCallback, useEffect, useState } from 'react'
import { checkWhatsappWorker, workerBaseUrl } from '../lib/whatsappConnect.js'

// Polls the deployed WhatsApp worker's GET /health endpoint and exposes a simple
// online/offline status for the Connect wizard, WhatsApp Dashboard, and Control
// Centre status cards. Read-only: no secrets, no Firestore writes. The worker URL
// always comes from VITE_WHATSAPP_WORKER_URL (via the whatsappConnect lib).
export function useWhatsappWorkerStatus({ enabled = true } = {}) {
  const [status, setStatus] = useState({ loading: enabled, online: false, configured: Boolean(workerBaseUrl()), url: workerBaseUrl(), error: '' })

  const refresh = useCallback(async () => {
    setStatus((current) => ({ ...current, loading: true }))
    const result = await checkWhatsappWorker()
    setStatus({
      loading: false,
      online: Boolean(result.online),
      configured: Boolean(result.configured),
      url: result.url || '',
      service: result.service || '',
      hasProjectId: Boolean(result.hasProjectId),
      hasVerifyToken: Boolean(result.hasVerifyToken),
      hasAppSecret: Boolean(result.hasAppSecret),
      error: result.error || '',
    })
    return result
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStatus((current) => ({ ...current, loading: false }))
      return undefined
    }
    let active = true
    ;(async () => {
      const result = await checkWhatsappWorker()
      if (!active) return
      setStatus({
        loading: false,
        online: Boolean(result.online),
        configured: Boolean(result.configured),
        url: result.url || '',
        service: result.service || '',
        hasProjectId: Boolean(result.hasProjectId),
        hasVerifyToken: Boolean(result.hasVerifyToken),
        hasAppSecret: Boolean(result.hasAppSecret),
        error: result.error || '',
      })
    })()
    return () => {
      active = false
    }
  }, [enabled])

  return { ...status, refresh }
}
