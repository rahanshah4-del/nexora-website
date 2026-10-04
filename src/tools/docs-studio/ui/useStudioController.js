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
  amountInWords, calculateDocument, canConvert, conversionTargets, convertDocument, getDocumentType, normalizeDocument,
  parseSeq, serializeDocument, todayIso,
} from '../engine/index.js'
import { useDocumentStudio } from '../state/useDocumentStudio.js'
import { SETTING_KEYS, numberingFor } from '../storage/repository.js'
import { downloadJson, readFileText } from '../io/files.js'
import { prepareMarkImage, resizeImageFile } from '../io/images.js'
import { applyRegion, normalizeRegion } from './regionPresets.js'
import { saveBlob } from '../io/files.js'
import { prepareLetterhead } from '../io/letterhead.js'
import { useAssetUrl } from './hooks.js'
import { fieldIdCandidates, groupIssuesByPath, sectionForPath } from './issues.js'
import {
  DEFAULT_MESSAGE_TEMPLATE, buildShareLink, emailSubject, hasLocalDesignAssets, mailtoUrl, messageContext, renderShareMessage,
  toWhatsAppNumber, whatsappUrl,
} from './share.js'
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
  const preferencesRef = useRef(boot.preferences || null)
  // Replaced logos, deleted after the next save if nothing references them.
  const pendingLogoCleanup = useRef(new Set())

  const saveNow = useCallback(async () => {
    const { doc: current, serialized: body, businessDefault: business } = live.current
    await repo.saveDocument(current)
    preferencesRef.current = preferencesFromDocument(current, preferencesRef.current)
    await repo.setSetting(SETTING_KEYS.preferences, preferencesRef.current)
    await repo.setSetting(SETTING_KEYS.lastDocumentId, current.id)
    await repo.setSetting(SETTING_KEYS.sampleSeen, true)
    if (business.enabled) {
      const profile = { enabled: true, party: current.seller, letterhead: current.appearance.letterhead, signoff: current.signoff, payment: current.payment }
      await repo.setSetting(SETTING_KEYS.businessDefault, profile)
      // State too: the ref is rebuilt from state on every render.
      live.current.businessDefault = profile
      setBusinessDefault(profile)
    }
    for (const assetId of [...pendingLogoCleanup.current]) {
      pendingLogoCleanup.current.delete(assetId)
      await repo.deleteAssetIfUnreferenced(assetId, { alsoReferencedBy: [current, live.current.doc] }).catch(() => {})
    }
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

  // ── View: wizard (steps 1–3) → creating (animation) → result; advanced = the full editor ──
  const [view, setView] = useState(boot.initialView?.view || 'wizard')
  const [wizardStep, setWizardStep] = useState(boot.initialView?.step || 1)
  const [returning, setReturning] = useState(Boolean(boot.returning))

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
  const letterheadUrl = useAssetUrl(repo, doc.appearance.letterhead?.imageAssetId)
  const signatureUrl = useAssetUrl(repo, doc.signoff?.signatureAssetId)
  const sealUrl = useAssetUrl(repo, doc.signoff?.sealAssetId)
  const [letterheadBusy, setLetterheadBusy] = useState(false)

  /** action: optional { label, onClick } rendered as a button in the toast. */
  const toast = useCallback((message, tone = 'info', action = null) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((list) => [...list.slice(-2), { id, message, tone, action }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), action ? 9000 : 3800)
  }, [])
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

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
    const next = createStarterDocument({ type, number: await nextNumber(type), preferences: preferencesFromDocument(current, preferencesRef.current), businessDefault: live.current.businessDefault })
    loadDocument(next, { persist: false })
    setIsSample(false)
    setView('wizard')
    setWizardStep(live.current.businessDefault?.enabled ? 2 : 1)
    toast(`New ${getDocumentType(type).label.toLowerCase()}`)
  }, [flush, loadDocument, nextNumber, toast])

  const startFresh = useCallback(async () => {
    await repo.setSetting(SETTING_KEYS.sampleSeen, true)
    const current = live.current.doc
    const next = createStarterDocument({ type: current.type, number: await nextNumber(current.type), preferences: preferencesFromDocument(current, preferencesRef.current), businessDefault: live.current.businessDefault })
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
    setView((current) => (current === 'advanced' ? 'advanced' : 'result'))
    repo.setSetting(SETTING_KEYS.lastDocumentId, id).catch(() => {})
  }, [flush, loadDocument, repo, toast])

  const listRecent = useCallback((limit = 12) => repo.listDocuments({ limit }), [repo])

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
      busyLabel: 'Deleting…',
      onConfirm: async () => {
        await repo.clearAll()
        await repo.setSetting(SETTING_KEYS.sampleSeen, true)
        setBusinessDefault({ enabled: false, party: null, letterhead: null })
        live.current.businessDefault = { enabled: false, party: null, letterhead: null }
        const next = createStarterDocument({ type: 'invoice', number: await nextNumber('invoice') })
        loadDocument(next, { persist: false })
        setIsSample(false)
        setReturning(false)
        setView('wizard')
        setWizardStep(1)
        toast('All data cleared', 'success')
      },
    })
  }, [repo, loadDocument, nextNumber, toast])

  // ── Business, clients, products, logo ──
  const setBusinessDefaultEnabled = useCallback(async (enabled) => {
    const current = live.current.doc
    const next = { enabled, party: current.seller, letterhead: current.appearance.letterhead, signoff: current.signoff, payment: current.payment }
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
      const previous = live.current.doc.seller.logoAssetId
      actions.updateParty('seller', { logoAssetId: id })
      if (previous) pendingLogoCleanup.current.add(previous)
    } catch (error) {
      toast(error.message || 'That image could not be used.', 'error')
    }
  }, [actions, repo, toast])

  const uploadLetterhead = useCallback(async (file) => {
    setLetterheadBusy(true)
    try {
      const { image, pdf } = await prepareLetterhead(file)
      const imageAssetId = await repo.putAsset(image)
      const pdfAssetId = pdf ? await repo.putAsset({ blob: pdf.blob }) : ''
      const previous = live.current.doc.appearance.letterhead
      actions.setLetterhead({ imageAssetId, pdfAssetId, widthPx: image.width, heightPx: image.height })
      if (previous) [previous.imageAssetId, previous.pdfAssetId].filter(Boolean).forEach((id) => pendingLogoCleanup.current.add(id))
    } catch (error) {
      toast(error.message || 'That letterhead could not be used.', 'error')
    } finally {
      setLetterheadBusy(false)
    }
  }, [actions, repo, toast])

  const removeLetterhead = useCallback(() => {
    const previous = live.current.doc.appearance.letterhead
    actions.setLetterhead(null)
    if (previous) [previous.imageAssetId, previous.pdfAssetId].filter(Boolean).forEach((id) => pendingLogoCleanup.current.add(id))
  }, [actions])

  /** Wizard step 1 → 2: remember "Your business" (details, logo, letterhead) for next time. */
  const saveBusinessProfile = useCallback(async () => {
    const current = live.current.doc
    const profile = { enabled: true, party: current.seller, letterhead: current.appearance.letterhead, signoff: current.signoff, payment: current.payment }
    setBusinessDefault(profile)
    live.current.businessDefault = profile
    setReturning(true)
    await repo.setSetting(SETTING_KEYS.businessDefault, profile).catch(() => {})
  }, [repo])

  /** Wizard step 3 → the creation animation → the result screen. */
  const createFromWizard = useCallback(async () => {
    // Created = issued: a draft moves to the type's first issued status (sent /
    // issued / dispatched), so the finished document carries no DRAFT stamp.
    const current = live.current.doc
    const statuses = getDocumentType(current.type).statuses
    if (current.status === 'draft' && statuses[1]) actions.set('status', statuses[1])
    setView('creating')
    await flush()
    await repo.setSetting(SETTING_KEYS.lastCreatedId, live.current.doc.id).catch(() => {})
  }, [actions, flush, repo])

  /** Signature or company stamp image ('signatureAssetId' | 'sealAssetId'); from a file or a drawn Blob. */
  const setSignoffImage = useCallback(async (key, input) => {
    try {
      const image = input instanceof File ? await prepareMarkImage(input, 600) : input
      if (!image?.blob) return
      const id = await repo.putAsset(image)
      const current = live.current.doc.signoff || {}
      const previous = current[key]
      actions.set('signoff', { signatureAssetId: '', sealAssetId: '', name: '', title: '', label: '', ...current, [key]: id })
      if (previous) pendingLogoCleanup.current.add(previous)
    } catch (error) {
      toast(error.message || 'That image could not be used.', 'error')
    }
  }, [actions, repo, toast])

  const removeSignoffImage = useCallback((key) => {
    const current = live.current.doc.signoff
    if (!current?.[key]) return
    pendingLogoCleanup.current.add(current[key])
    actions.set('signoff', { ...current, [key]: '' })
  }, [actions])

  const removeLogo = useCallback(() => {
    const previous = live.current.doc.seller.logoAssetId
    actions.updateParty('seller', { logoAssetId: '' })
    if (previous) pendingLogoCleanup.current.add(previous)
  }, [actions])

  // ── Quick actions ──
  /** Invoice: record a payment for the whole balance and mark it paid (PAID stamp). */
  const markAsPaid = useCallback(() => {
    const current = live.current.doc
    const balance = calculateDocument(current).balanceDue
    if (balance > 0) actions.addPayment({ date: todayIso(), amount_minor: balance, method: '', reference: 'Paid in full' })
    actions.set('status', 'paid')
    toast('Marked as paid', 'success')
  }, [actions, toast])

  const openSource = useCallback(async () => {
    const id = live.current.doc.sourceDocId
    if (!id || !(await repo.getDocument(id))?.ok) {
      toast('The original document is not saved in this browser.', 'error')
      return
    }
    openDocument(id)
  }, [openDocument, repo, toast])

  const [documentsOpen, setDocumentsOpen] = useState(false)

  // ── Print & PDF ──
  const print = useCallback(() => { window.print() }, [])
  const [pdfBusy, setPdfBusy] = useState(false)
  const downloadPdf = useCallback(async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    const fallback = { label: 'Use Print → Save as PDF instead', onClick: () => window.print() }
    try {
      const current = live.current.doc
      const totals = calculateDocument(current)
      const words = amountInWords(totals.amountPayable, current.currency, { lang: current.options.wordsLanguage, system: current.options.wordsSystem })
      const { downloadDocumentPdf } = await import('../pdf/downloadPdf.js')
      const result = await downloadDocumentPdf({ doc: current, totals, amountWords: words, repo })
      if (result.ok && current.appearance.letterhead?.pdfAssetId && result.letterhead === 'image') {
        toast(`Downloaded ${result.fileName} — your PDF letterhead could not be merged, so its image was used.`, 'info')
      } else if (!result.ok) {
        toast('Arabic, Urdu and Hebrew text cannot go into the downloaded PDF yet — use Print → Save as PDF.', 'info', fallback)
      } else if (result.fontFallback) {
        toast('The Unicode font could not load, so the PDF uses a basic font and currency codes (e.g. INR).', 'info')
      } else {
        toast(`Downloaded ${result.fileName}`, 'success')
      }
    } catch {
      toast('The PDF could not be created.', 'error', fallback)
    } finally {
      setPdfBusy(false)
    }
  }, [pdfBusy, repo, toast])

  // ── Excel (loaded on click, with fflate) ──
  const downloadXlsx = useCallback(async () => {
    try {
      const current = live.current.doc
      const totals = calculateDocument(current)
      const words = amountInWords(totals.amountPayable, current.currency, { lang: current.options.wordsLanguage, system: current.options.wordsSystem })
      const { downloadDocumentXlsx } = await import('../io/xlsxExport.js')
      const { fileName } = downloadDocumentXlsx({ doc: current, totals, amountWords: words })
      toast(`Downloaded ${fileName}`, 'success')
    } catch {
      toast('The Excel file could not be created.', 'error')
    }
  }, [toast])

  // ── Sharing: WhatsApp, email, link ──
  const [messageTemplate, setMessageTemplateState] = useState(() => boot.preferences?.messageTemplate || '')
  const setMessageTemplate = useCallback((text) => {
    const value = String(text || '').slice(0, 1000)
    setMessageTemplateState(value)
    preferencesRef.current = { ...(preferencesRef.current || preferencesFromDocument(live.current.doc)), messageTemplate: value }
    repo.setSetting(SETTING_KEYS.preferences, preferencesRef.current).catch(() => {})
  }, [repo])
  // ── Country preset (currency, number format, tax labels, "Tax Invoice") ──
  const [region, setRegionState] = useState(() => normalizeRegion(boot.preferences?.region))
  const setRegion = useCallback((value) => {
    const next = normalizeRegion(value)
    setRegionState(next)
    if (next) applyRegion(live.current.doc, next, actions)
    preferencesRef.current = { ...(preferencesRef.current || preferencesFromDocument(live.current.doc)), region: next }
    repo.setSetting(SETTING_KEYS.preferences, preferencesRef.current).catch(() => {})
  }, [actions, repo])

  const [shareBusy, setShareBusy] = useState(null)

  /** The message text for the current document (with a share link when one fits). */
  const shareMessage = useCallback(async () => {
    const current = live.current.doc
    const link = await buildShareLink(current, window.location.origin).catch(() => null)
    const ctx = messageContext(current, calculateDocument(current), { link: link?.ok ? link.url : '' })
    return { text: renderShareMessage(messageTemplate || DEFAULT_MESSAGE_TEMPLATE, ctx), subject: emailSubject(ctx), current }
  }, [messageTemplate])

  /**
   * WhatsApp / Email. Phones: the native share sheet with the PDF attached.
   * Elsewhere: download the PDF, then open wa.me / the mail app with the text.
   */
  const shareVia = useCallback(async (channel) => {
    if (shareBusy) return
    setShareBusy(channel)
    const printFallback = { label: 'Use Print → Save as PDF instead', onClick: () => window.print() }
    try {
      const current = live.current.doc
      const totals = calculateDocument(current)
      const words = amountInWords(totals.amountPayable, current.currency, { lang: current.options.wordsLanguage, system: current.options.wordsSystem })
      const [{ createDocumentPdf }, message] = await Promise.all([import('../pdf/downloadPdf.js'), shareMessage()])
      const pdf = await createDocumentPdf({ doc: current, totals, amountWords: words, repo })
      if (!pdf.ok) {
        toast('Arabic, Urdu and Hebrew text cannot go into the PDF yet — use Print → Save as PDF.', 'info', printFallback)
        return
      }
      const file = typeof File === 'function' ? new File([pdf.blob], pdf.fileName, { type: 'application/pdf' }) : null
      if (file && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: message.subject, text: message.text })
        } catch (error) {
          if (error?.name !== 'AbortError') throw error
        }
        return
      }
      saveBlob(pdf.blob, pdf.fileName)
      if (channel === 'whatsapp') {
        const url = whatsappUrl(message.text, toWhatsAppNumber(current.client.phone))
        const opened = window.open(url, '_blank', 'noopener,noreferrer')
        toast('PDF downloaded — attach it in WhatsApp', 'success', opened ? null : { label: 'Open WhatsApp', onClick: () => window.open(url, '_blank', 'noopener,noreferrer') })
      } else {
        const a = document.createElement('a')
        a.href = mailtoUrl(current.client.email, message.subject, message.text)
        a.rel = 'noopener'
        a.click()
        toast('PDF downloaded — attach it to the email', 'success')
      }
    } catch {
      toast('Sharing did not work. The PDF can still be downloaded.', 'error', printFallback)
    } finally {
      setShareBusy(null)
    }
  }, [shareBusy, shareMessage, repo, toast])

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand?.('copy')
      area.remove()
      return Boolean(ok)
    }
  }

  const copyLinkNow = useCallback(async () => {
    const current = live.current.doc
    const link = await buildShareLink(current, window.location.origin)
    if (!link.ok) {
      const tooLong = link.code === 'share_link_too_long'
      toast(tooLong
        ? `This document is too long for a link (${(link.length || 0).toLocaleString()} of 8,000 characters). Send the PDF instead.`
        : 'The link could not be created. Send the PDF instead.', 'error', { label: 'Download PDF', onClick: () => downloadPdf() })
      return
    }
    const copied = await copyText(link.url)
    toast(copied ? 'Link copied — anyone with the link can view this document.' : 'Copy failed — select the link and copy it manually.', copied ? 'success' : 'error')
    return link.url
  }, [toast, downloadPdf])

  /** Copy link: first a short note when the logo / letterhead cannot travel with it. */
  const copyLink = useCallback(() => {
    if (!hasLocalDesignAssets(live.current.doc)) return copyLinkNow()
    setConfirmState({
      tone: 'info',
      title: 'Copy a link to this document?',
      body: 'Logo, letterhead, signature and stamp images aren’t included in links. Send the PDF for the full design.',
      confirmLabel: 'Copy link',
      busyLabel: 'Copying…',
      onConfirm: copyLinkNow,
    })
    return undefined
  }, [copyLinkNow])

  // ── Keyboard shortcuts ──
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
    preset: boot.preset || null,
    storageKind: repo.kind,
    storageFallback: boot.fallbackReason,
    saveState,
    saveError,
    isSample,
    logoUrl,
    letterheadUrl,
    signatureUrl,
    sealUrl,
    letterheadBusy,
    businessDefault,
    view,
    setView,
    wizardStep,
    setWizardStep,
    returning,
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
    dismissToast,
    pdfBusy,
    shareBusy,
    messageTemplate,
    region,
    documentsOpen,
    setDocumentsOpen,
    confirmState,
    closeConfirm: () => setConfirmState(null),
    commands: {
      newDocument, startFresh, dismissSample, duplicate, convertTo, switchType, openDocument, listRecent,
      exportBackup, importFile, requestClearAll, setBusinessDefaultEnabled, saveClient, saveProduct,
      uploadLogo, removeLogo, setSignoffImage, removeSignoffImage, print, downloadPdf, markAsPaid, openSource, toast, conversionTargets: () => conversionTargets(doc.type),
      uploadLetterhead, removeLetterhead, saveBusinessProfile, createFromWizard, downloadXlsx,
      shareVia, copyLink, setMessageTemplate, setRegion,
    },
  }
}
