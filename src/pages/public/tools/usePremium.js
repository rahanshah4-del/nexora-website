import { useCallback, useEffect, useRef, useState } from 'react'
import { watchClient } from '../../../lib/geolintClient.js'
import { fetchMe } from './tempMailPremiumClient.js'

const POLL_TRIES = 20
const POLL_MS = 3000

/**
 * Signed-in state + Premium entitlement. Does nothing (and loads no auth code) until `enabled`, so while the plan
 * is switched off in the Control Centre the page behaves exactly as before.
 */
export default function usePremium(enabled) {
  const [user, setUser] = useState(undefined) // undefined = still checking, null = signed out
  const [me, setMe] = useState(null)
  const [waiting, setWaiting] = useState(() => new URLSearchParams(window.location.search).get('premium') === 'success') // just paid: waiting for the webhook to switch the plan on
  const alive = useRef(true)

  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  useEffect(() => {
    if (!enabled) return undefined
    return watchClient((next) => { if (!alive.current) return; setUser(next); if (!next) setMe(null) })
  }, [enabled])

  const reload = useCallback(async () => {
    try {
      const data = await fetchMe()
      if (alive.current) setMe(data)
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!enabled || !user) return
    fetchMe().then((data) => { if (alive.current) setMe(data) }).catch(() => {})
  }, [enabled, user])

  // Back from checkout (?premium=success): the plan switches on a moment later, when Polar's webhook arrives.
  useEffect(() => {
    if (!enabled || !user) return undefined
    const params = new URLSearchParams(window.location.search)
    if (params.get('premium') !== 'success') return undefined
    let cancelled = false
    ;(async () => {
      for (let i = 0; i < POLL_TRIES && !cancelled; i += 1) {
        const data = await reload()
        if (data?.premium?.active) break
        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS))
      }
      if (!cancelled) {
        setWaiting(false)
        params.delete('premium')
        const query = params.toString()
        window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
      }
    })()
    return () => { cancelled = true }
  }, [enabled, user, reload])

  return { enabled, user, signedIn: Boolean(user), me, active: Boolean(me?.premium?.active), waiting, reload }
}
