/**
 * Opens storage and decides where the studio starts (see initialView):
 *   - a draft still being built in the wizard is resumed;
 *   - otherwise a new document with the saved preferences and business;
 *   - returning visitors (business details saved) start at step 2,
 *     first-time visitors at step 1 "Your business".
 * Falls back to in-memory storage (with a notice) when IndexedDB is unavailable.
 *
 * A landing page's preset (see Studio.jsx) sets the type and paper of a new
 * document; a draft of a different type is left for later rather than resumed,
 * and the letterhead page always opens at step 1 with the letterhead upload.
 */

import { useEffect, useState } from 'react'
import { todayIso } from '../engine/index.js'
import { openStorageBackend } from '../storage/backends.js'
import { SETTING_KEYS, createRepository } from '../storage/repository.js'
import { getRegionPreset, regionChanges } from './regionPresets.js'
import { createStarterDocument, initialView, isReturningBusiness } from './starter.js'

export function useStudioBoot(preset = null) {
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
      // A landing page's region (India on the GST page) overrides the remembered one, in the
      // editor's state as well as in a new document, so the country picker shows it selected.
      const regionPreset = preset?.region ? getRegionPreset(preset.region.code) : null
      const startPrefs = regionPreset
        ? { ...(preferences || {}), region: preset.region, currency: regionPreset.currency, locale: regionPreset.locale, wordsSystem: regionPreset.wordsSystem }
        : preferences
      let lastDocument = null
      if (lastId && lastId !== lastCreatedId) {
        const found = await repo.getDocument(lastId)
        // A country landing page (the GST page) only resumes a document in that country's currency.
        const regionOk = !regionPreset || found?.document?.currency === regionPreset.currency
        if (found?.ok && regionOk && (!preset?.type || found.document.type === preset.type)) lastDocument = found.document
      }
      const view = initialView({ businessDefault, lastDocument, preset })
      let initialDocument = lastDocument
      if (!initialDocument) {
        const type = preset?.type || 'invoice'
        const { number } = await repo.peekNextNumber(type, todayIso())
        initialDocument = createStarterDocument({ type, number, preferences: startPrefs, businessDefault, paperSize: preset?.paperSize })
        // The country's tax-ID label (GSTIN) on the seller, unless the saved business already has its own.
        const changes = regionPreset ? regionChanges(initialDocument, preset.region) : null
        if (changes?.seller) initialDocument = { ...initialDocument, seller: { ...initialDocument.seller, ...changes.seller } }
      }
      if (!cancelled) {
        setState({
          status: 'ready', repo, fallbackReason, initialDocument, isSample: false, preferences: startPrefs, initialView: view, preset,
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
    // The preset is fixed for the page's lifetime; boot runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
