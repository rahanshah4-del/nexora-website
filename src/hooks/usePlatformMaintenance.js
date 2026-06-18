import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { firestoreDb as db } from '../lib/firebase.js'
import { getMaintenanceState, normalizeMaintenanceConfig } from '../lib/maintenanceMode.js'

export default function usePlatformMaintenance(context) {
  const [config, setConfig] = useState(() => normalizeMaintenanceConfig())

  useEffect(() => {
    if (!db) return undefined
    return onSnapshot(
      doc(db, 'platformSettings', 'main'),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {}
        setConfig(normalizeMaintenanceConfig(data.maintenanceConfig || {
          enabled: data.maintenanceMode === true,
          target: 'workspace',
        }))
      },
      () => {
        setConfig(normalizeMaintenanceConfig())
      },
    )
  }, [])

  return useMemo(() => getMaintenanceState(config, context), [config, context])
}
