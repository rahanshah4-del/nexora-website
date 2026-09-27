/**
 * Opens storage and decides what the editor starts with:
 *   1. the last document the visitor worked on, else
 *   2. the sample invoice on a genuine first visit (nothing saved yet), else
 *   3. a new blank invoice with their saved preferences.
 * Falls back to in-memory storage (with a notice) when IndexedDB is unavailable.
 */

import { useEffect, useState } from 'react'
import { todayIso } from '../engine/index.js'
import { openStorageBackend } from '../storage/backends.js'
import { SETTING_KEYS, createRepository } from '../storage/repository.js'
import { createSampleDocument } from '../sample.js'
import { createStarterDocument } from './starter.js'

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

      const [businessDefault, preferences, lastId, sampleSeen, count] = await Promise.all([
        repo.getSetting(SETTING_KEYS.businessDefault, null),
        repo.getSetting(SETTING_KEYS.preferences, null),
        repo.getSetting(SETTING_KEYS.lastDocumentId, null),
        repo.getSetting(SETTING_KEYS.sampleSeen, false),
        repo.countDocuments(),
      ])
      let initialDocument = null
      let isSample = false
      if (lastId) {
        const found = await repo.getDocument(lastId)
        if (found?.ok) initialDocument = found.document
      }
      if (!initialDocument && !sampleSeen && count === 0) {
        initialDocument = createSampleDocument()
        isSample = true
      }
      if (!initialDocument) {
        const { number } = await repo.peekNextNumber('invoice', todayIso())
        initialDocument = createStarterDocument({ type: 'invoice', number, preferences, businessDefault })
      }
      if (!cancelled) {
        setState({ status: 'ready', repo, fallbackReason, initialDocument, isSample, businessDefault: businessDefault || { enabled: false, party: null } })
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
