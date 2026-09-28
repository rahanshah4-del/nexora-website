/**
 * Opens storage and decides where the studio starts (see initialView):
 *   - a draft still being built in the wizard is resumed;
 *   - otherwise a new document with the saved preferences and business;
 *   - returning visitors (business details saved) start at step 2,
 *     first-time visitors at step 1 "Your business".
 * Falls back to in-memory storage (with a notice) when IndexedDB is unavailable.
 */

import { useEffect, useState } from 'react'
import { todayIso } from '../engine/index.js'
import { openStorageBackend } from '../storage/backends.js'
import { SETTING_KEYS, createRepository } from '../storage/repository.js'
import { createStarterDocument, initialView, isReturningBusiness } from './starter.js'

export function useStudioBoot() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const { backend, fallbackReason } = await openStorageBackend()
      if (cancelled) {
        // Unmounted (or a StrictMode re-run) before storage opened.
        backend.close()
        return
      }
      const repo = createRepository(backend)
      if (!fallbackReason) globalThis.navigator?.storage?.persist?.().catch(() => {})

      const [businessDefault, preferences, lastId, lastCreatedId] = await Promise.all([
        repo.getSetting(SETTING_KEYS.businessDefault, null),
        repo.getSetting(SETTING_KEYS.preferences, null),
        repo.getSetting(SETTING_KEYS.lastDocumentId, null),
        repo.getSetting(SETTING_KEYS.lastCreatedId, null),
      ])
      let lastDocument = null
      if (lastId && lastId !== lastCreatedId) {
        const found = await repo.getDocument(lastId)
        if (found?.ok) lastDocument = found.document
      }
      const view = initialView({ businessDefault, lastDocument })
      let initialDocument = lastDocument
      if (!initialDocument) {
        const { number } = await repo.peekNextNumber('invoice', todayIso())
        initialDocument = createStarterDocument({ type: 'invoice', number, preferences, businessDefault })
      }
      if (!cancelled) {
        setState({
          status: 'ready', repo, fallbackReason, initialDocument, isSample: false, preferences, initialView: view,
          returning: isReturningBusiness(businessDefault),
          businessDefault: businessDefault || { enabled: false, party: null, letterhead: null },
        })
      }
    }
    boot().catch((error) => {
      if (!cancelled) setState({ status: 'error', error })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
