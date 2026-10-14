import { useEffect, useState } from 'react'
import { watchClient } from '../../../lib/geolintClient.js'

/** The signed-in client, or null; `ready` is false until the first answer from Firebase. */
export function useFixClient() {
  const [state, setState] = useState({ user: null, ready: false })
  useEffect(() => watchClient((user) => setState({ user, ready: true })), [])
  return state
}
