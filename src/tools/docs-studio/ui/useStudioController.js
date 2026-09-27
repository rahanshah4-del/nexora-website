/**
 * The editor's brain: wraps useDocumentStudio() with persistence and the
 * toolbar/menu commands.
 *
 * Autosave: the serialized document is compared with the last saved
 * serialization during render; when they differ a 600 ms debounce writes it
 * (plus preferences, the default business and lastDocumentId). New blank
 * documents and the sample count as "saved" until edited, so opening one never
 * creates a record by itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  canConvert, conversionTargets, convertDocument, getDocumentType, normalizeDocument, parseSeq,
  serializeDocument, todayIso,
} from '../engine/index.js'
import { useDocumentStudio } from '../state/useDocumentStudio.js'
import { SETTING_KEYS, numberingFor } from '../storage/repository.js'
import { downloadJson, readFileText } from '../io/files.js'
import { resizeImageFile } from '../io/images.js'
import { useAssetUrl } from './hooks.js'
import { fieldIdCandidates, groupIssuesByPath, sectionForPath } from './issues.js'
import { createStarterDocument, duplicateDocument, preferencesFromDocument } from './starter.js'

const AUTOSAVE_MS = 600
const DEFAULT_OPEN = ['business', 'client', 'details', 'items']

export function useStudioController(boot) {
  const { repo } = boot
  const studio = useDocumentStudio(boot.initialDocument)
  const { document: doc, actions } = studio

  // ── Autosave ──
  const serialized = useMemo(() => serializeDocument(doc), [doc])
  const [savedSerialized, setSavedSerialized] = useState(() => serializeDocument(boot.initialDocument))
  const [saveError, setSaveError] = useState(null)
  const [businessDefault, setBusinessDefault] = useState(boot.businessDefault)
  const dirty = serialized !== savedSerialized
  const live = useRef({ doc, serialized, savedSerialized, businessDefault })
  useEffect(() => {
    live.current = { doc, serialized, savedSerialized, businessDefault }
  })

  const saveNow = useCallback(async () => {
    const { doc: current, serialized: body, businessDefault: business } = live.current
    await repo.saveDocument(current)
    await repo.setSetting(SETTING_KEYS.preferences, preferencesFromDocument(current))
    await repo.setSetting(SETTING_KEYS.lastDocumentId, current.id)
    await repo.setSetting(SETTING_KEYS.sampleSeen, true)
    if (business.enabled) await repo.setSetting(SETTING_KEYS.businessDefault, { enabled: true, party: current.seller })
    setSavedSerialized(body)
    setSaveError(null)
  }, [repo])

  useEffect(() => {
    if (!dirty) return undefined
    const timer = setTimeout(() => { saveNow().catch((error) => setSaveError(error)) }, AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [dirty, serialized, saveNow])

  /** Writes pending changes now (before switching documents, exporting…). */
  const flush = useCallback(async () => {
    if (live.current.serialized !== live.current.savedSerialized) {
      await saveNow().catch((error) => setSaveError(error))
    }
  }, [saveNow])

  // Best effort on tab close.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [flush])

  const saveState = saveError ? 'error' : dirty ? 'saving' : 'saved'

  // ── UI state ──
  const [isSample, setIsSample] = useState(boot.isSample)
  const [mobileView, setMobileView] = useState('edit')
  const [zoom, setZoom] = useState('fit')
  const [openSections, setOpenSections] = useState(() => new Set(DEFAULT_OPEN))
  const [touched, setTouched] = useState(() => new Set())
  const [revealAll, setRevealAll] = useState(false)
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const logoUrl = useAssetUrl(repo, doc.seller.logoAssetId)

  const toast = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((list) => [...list.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800)
  }, [])

  const toggleSection = useCallback((id, open) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (open ?? !next.has(id)) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // ── Issues ──
  const issuesByPath = useMemo(() => groupIssuesByPath(studio.issues), [studio.issues])
  const markTouched = useCallback((path) => {
    setTouched((prev) => (prev.has(path) ? prev : new Set(prev).add(path)))
  }, [])
  /** Visible issues for a field: shown once the field was touched (or all were revealed). */
  const issuesFor = useCallback((path, { prefix = false } = {}) => {
    const visible = (p) => revealAll || touched.has(p) || touched.has(p.replace(/\[\d+\]$/, ''))
    if (!prefix) return visible(path) ? issuesByPath.get(path) || [] : []
    const out = []
    issuesByPath.forEach((list, p) => { if ((p === path || p.startsWith(`${path}.`) || p.startsWith(`${path}[`)) && (revealAll || touched.has(path))) out.push(...list) })
    return out
  }, [issuesByPath, touched, revealAll])

  const scrollToFirstIssue = useCallback(() => {
    const first = studio.issues[0]
    if (!first) return
    setRevealAll(true)
    toggleSection(sectionForPath(first.path), true)
    setMobileView('edit')
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = fieldIdCandidates(first.path).map((id) => document.getElementById(id)).find(Boolean)
        || document.getElementById(`ds-section-${sectionForPath(first.path)}`)
      if (!target) return
      target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
      target.focus?.({ preventScroll: true })
    }))
  }, [studio.issues, toggleSection])

  // ── Document lifecycle ──
  /** Shows `next` in the editor. persist=false: treat it as saved until edited. */
  const loadDocument = useCallback((next, { persist }) => {
    const normalized = normalizeDocument(next)
    actions.replace(normalized)
    if (!persist) setSavedSerialized(serializeDocument(normalized))
    setTouched(new Set())
    setRevealAll(false)
  }, [actions])

  const nextNumber = useCallback(async (type, date = todayIso()) => (await repo.peekNextNumber(type, date)).number, [repo])

  const newDocument = useCallback(async (type = live.current.doc.type) => {
    await flush()
    const current = live.current.doc
    const next = createStarterDocument({ type, number: await nextNumber(type), preferences: preferencesFromDocument(current), businessDefault: live.current.businessDefault })
    loadDocument(next, { persist: false })
    setIsSample(false)
    toast(`New ${getDocumentType(type).label.toLowerCase()}`)
  }, [flush, loadDocument, nextNumber, toast])

  const startFresh = useCallback(async () => {
    await repo.setSetting(SETTING_KEYS.sampleSeen, true)
    const current = live.current.doc
    const next = createStarterDocument({ type: current.type, number: await nextNumber(current.type), preferences: preferencesFromDocument(current), businessDefault: live.current.businessDefault })
    loadDocument(next, { persist: false })
    setIsSample(false)
  }, [repo, loadDocument, nextNumber])

  const dismissSample = useCallback(() => {
    setIsSample(false)
    repo.setSetting(SETTING_KEYS.sampleSeen, true).catch(() => {})
  }, [repo])

  const duplicate = useCallback(async () => {
    await flush()
    const current = live.current.doc
    loadDocument(duplicateDocument(current, { number: await nextNumber(current.type) }), { persist: true })
    setIsSample(false)
    toast('Duplicated — you are editing the copy')
  }, [flush, loadDocument, nextNumber, toast])

  const convertTo = useCallback(async (targetType) => {
    const source = live.current.doc
    if (!canConvert(source.type, targetType)) return
    await flush()
    const next = convertDocument(source, targetType, { number: await nextNumber(targetType) })
    const sourceConfig = getDocumentType(source.type)
    if (!isSample && sourceConfig.statuses.includes('converted')) {
      await repo.saveDocument({ ...source, status: 'converted' }).catch(() => {})
    }
    loadDocument(next, { persist: true })
    setIsSample(false)
    toast(`Converted to ${getDocumentType(targetType).label.toLowerCase()}`)
  }, [flush, isSample, loadDocument, nextNumber, repo, toast])

  const switchType = useCallback(async (type) => {
    const current = live.current.doc
    if (type === current.type) return
    const { pattern, prefix } = numberingFor(current.type)
    const auto = !current.number || parseSeq(current.number, pattern, { prefix }) !== null
    const number = auto ? await nextNumber(type, current.issueDate || todayIso()) : current.number
    actions.setType(type, number)
  }, [actions, nextNumber])

  const openDocument = useCallback(async (id) => {
    await flush()
    const found = await repo.getDocument(id)
    if (!found?.ok) {
      toast('That document could not be opened.', 'error')
      return
    }
    loadDocument(found.document, { persist: false })
    setIsSample(false)
    repo.setSetting(SETTING_KEYS.lastDocumentId, id).catch(() => {})
  }, [flush, loadDocument, repo, toast])

  const listRecent = useCallback(() => repo.listDocuments({ limit: 12 }), [repo])

  // ── Backup ──
  const exportBackup = useCallback(async () => {
    await flush()
    const backup = await repo.exportBackup()
    downloadJson(`nexora-docs-backup-${todayIso()}.json`, backup)
    toast(`Backup exported (${backup.documents.length} document${backup.documents.length === 1 ? '' : 's'})`, 'success')
  }, [flush, repo, toast])

  const importFile = useCallback(async (file) => {
    try {
      await flush()
      const result = await repo.importBackup(await readFileText(file))
      if (!result.ok) {
        toast(result.error.message, 'error')
        return
      }
      if (result.kind === 'document') {
        loadDocument(result.document, { persist: true })
        setIsSample(false)
        toast('Document imported', 'success')
        return
      }
      const settings = await repo.getSetting(SETTING_KEYS.businessDefault, null)
      if (settings) setBusinessDefault(settings)
      const { documents, clients, products } = result.counts
      toast(`Imported ${documents} documents, ${clients} clients, ${products} products${result.skipped ? ` (${result.skipped} skipped)` : ''}`, 'success')
    } catch (error) {
      toast(error.message || 'Import failed.', 'error')
    }
  }, [flush, loadDocument, repo, toast])

  const requestClearAll = useCallback(() => {
    setConfirmState({
      title: 'Clear all data?',
      body: 'This permanently deletes every document, client, product, logo and setting stored in this browser. Export a backup first if you might need them.',
      confirmLabel: 'Delete everything',
      onConfirm: async () => {
        await repo.clearAll()
        await repo.setSetting(SETTING_KEYS.sampleSeen, true)
        setBusinessDefault({ enabled: false, party: null })
        live.current.businessDefault = { enabled: false, party: null }
        const next = createStarterDocument({ type: 'invoice', number: await nextNumber('invoice') })
        loadDocument(next, { persist: false })
        setIsSample(false)
        toast('All data cleared', 'success')
      },
    })
  }, [repo, loadDocument, nextNumber, toast])

  // ── Business, clients, products, logo ──
  const setBusinessDefaultEnabled = useCallback(async (enabled) => {
    const next = { enabled, party: live.current.doc.seller }
    setBusinessDefault(next)
    await repo.setSetting(SETTING_KEYS.businessDefault, next)
    toast(enabled ? 'Saved as your default business' : 'Default business turned off')
  }, [repo, toast])

  const saveClient = useCallback(async () => {
    const client = live.current.doc.client
    if (!client.name && !client.company) {
      toast('Add a client name first.', 'error')
      return
    }
    await repo.saveClient(client)
    toast('Client saved', 'success')
  }, [repo, toast])

  const saveProduct = useCallback(async (line) => {
    if (!line.description.trim()) {
      toast('Add a description first.', 'error')
      return
    }
    await repo.saveProduct({ description: line.description, sku: line.sku, unit: line.unit, unitPrice_minor: line.unitPrice_minor, currency: live.current.doc.currency })
    toast('Saved to your products', 'success')
  }, [repo, toast])

  const uploadLogo = useCallback(async (file) => {
    try {
      const image = await resizeImageFile(file, 600)
      const id = await repo.putAsset(image)
      actions.updateParty('seller', { logoAssetId: id })
    } catch (error) {
      toast(error.message || 'That image could not be used.', 'error')
    }
  }, [actions, repo, toast])

  // ── Keyboard shortcuts ──
  const print = useCallback(() => { window.print() }, [])
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'p') {
        event.preventDefault()
        print()
      } else if (key === 's') {
        event.preventDefault()
        flush().then(() => toast('All changes saved', 'success'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flush, print, toast])

  return {
    ...studio,
    doc,
    repo,
    storageKind: repo.kind,
    storageFallback: boot.fallbackReason,
    saveState,
    saveError,
    isSample,
    logoUrl,
    businessDefault,
    mobileView,
    setMobileView,
    zoom,
    setZoom,
    openSections,
    toggleSection,
    issuesFor,
    markTouched,
    scrollToFirstIssue,
    toasts,
    confirmState,
    closeConfirm: () => setConfirmState(null),
    commands: {
      newDocument, startFresh, dismissSample, duplicate, convertTo, switchType, openDocument, listRecent,
      exportBackup, importFile, requestClearAll, setBusinessDefaultEnabled, saveClient, saveProduct,
      uploadLogo, print, toast, conversionTargets: () => conversionTargets(doc.type),
    },
  }
}
