import { useCallback, useEffect, useMemo, useState } from 'react'
import { LOCAL_DATA_CHANGED_EVENT } from '../lib/localDataEvents.js'

export function useLocalData(loader, storageKeys = []) {
  const keySignature = useMemo(() => storageKeys.filter(Boolean).sort().join('|'), [storageKeys])
  const keys = useMemo(() => new Set(keySignature.split('|').filter(Boolean)), [keySignature])
  const [rows, setRows] = useState(() => loader())
  const refresh = useCallback(() => setRows(loader()), [loader])

  useEffect(() => {
    const onLocalChange = (event) => {
      if (!event.detail?.storageKey || keys.has(event.detail.storageKey)) refresh()
    }
    const onStorage = (event) => {
      if (!event.key || keys.has(event.key)) refresh()
    }
    window.addEventListener(LOCAL_DATA_CHANGED_EVENT, onLocalChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, onLocalChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [keys, refresh])

  return { data: rows, refresh }
}
