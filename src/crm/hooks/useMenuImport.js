import { useCallback, useRef, useState } from 'react'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../../lib/firebase.js'
import { useUser } from './useUser.js'
import { extractMenuFromImage, extractMenuFromText } from '../lib/menuImportWorker.js'
import { MENU_IMPORT_DEFAULTS } from '../data/menuImportSettings.js'
import { buildHistoryEntry, saveImportHistoryEntry } from '../data/menuImportHistory.js'

/**
 * Import state machine values.
 * @readonly
 */
export const IMPORT_STATE = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  EXTRACTING: 'extracting',
  PREVIEWING: 'previewing',
  SAVING: 'saving',
  DONE: 'done',
  ERROR: 'error',
}

/**
 * Number of menu gradient tones — cycles through them for imported items.
 */
const MENU_TONES = [
  'from-sky-600 to-indigo-500',
  'from-amber-600 to-orange-500',
  'from-emerald-600 to-teal-500',
  'from-rose-600 to-pink-500',
  'from-violet-600 to-purple-500',
  'from-cyan-600 to-blue-500',
  'from-lime-600 to-green-500',
  'from-red-600 to-rose-500',
]

/**
 * @typedef {Object} ImportPreviewItem
 * @property {number}  _importIndex
 * @property {string}  name
 * @property {string}  nameEn
 * @property {string}  category
 * @property {string}  description
 * @property {number|null} price
 * @property {number}  costPrice
 * @property {string}  itemType
 * @property {string}  availability
 * @property {string}  status
 * @property {boolean} taxEnabled
 * @property {boolean} serviceChargeEnabled
 * @property {string}  discountType
 * @property {number}  discountValue
 * @property {string}  offerTitle
 * @property {string}  offerStartDate
 * @property {string}  offerEndDate
 * @property {boolean} happyHour
 * @property {boolean} buyOneGetOne
 * @property {boolean} comboOffer
 * @property {string}  tone
 * @property {string[]} variants
 * @property {string[]} addOns
 * @property {string[]} tags
 * @property {number}  confidence
 * @property {string[]} warnings
 * @property {boolean} selected
 * @property {boolean} isDuplicate
 */

/**
 * useMenuImport — orchestrates the AI menu import flow.
 *
 * @param {Object}   opts
 * @param {string}   opts.workspaceId
 * @param {Array}    opts.existingItems       — current menu items (for duplicate detection)
 * @param {string[]} opts.existingCategories  — current categories
 * @param {Function} opts.onImportComplete    — called with (importedItems, newCategories) after save
 * @param {Object}   [opts.settings]          — overrides from Control Centre
 */
export function useMenuImport({ workspaceId, existingItems = [], existingCategories = [], onImportComplete, settings = {} } = {}) {
  const [state, setState] = useState(IMPORT_STATE.IDLE)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [file, setFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [previewItems, setPreviewItems] = useState([])
  const [summary, setSummary] = useState(null)
  const [extractionStats, setExtractionStats] = useState(null)
  const [menuText, setMenuText] = useState('')

  const abortRef = useRef(null)
  const resolved = { ...MENU_IMPORT_DEFAULTS, ...settings }

  /** Reset everything to idle. */
  const reset = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    setState(IMPORT_STATE.IDLE)
    setProgress(0)
    setError(null)
    setFile(null)
    setImageUrl(null)
    setPreviewItems([])
    setSummary(null)
    setExtractionStats(null)
  }, [])

  /** Select a file for import (validates type & size). */
  const selectFile = useCallback((selectedFile) => {
    if (!selectedFile) return
    reset()

    // Validate type
    if (!resolved.allowedMimeTypes.includes(selectedFile.type) &&
        !resolved.allowedFileTypes.some(ext => selectedFile.name.toLowerCase().endsWith(`.${ext}`))) {
      setState(IMPORT_STATE.ERROR)
      setError(`Unsupported file type. Allowed: ${resolved.allowedFileTypes.map(e => e.toUpperCase()).join(', ')}`)
      return
    }

    // Validate size
    const maxBytes = resolved.maxUploadSizeMB * 1024 * 1024
    if (selectedFile.size > maxBytes) {
      setState(IMPORT_STATE.ERROR)
      setError(`File too large. Maximum: ${resolved.maxUploadSizeMB} MB`)
      return
    }

    setFile(selectedFile)
    setState(IMPORT_STATE.IDLE)
    setError(null)
  }, [resolved, reset])

  /** Start the upload + extraction flow. */
  const startImport = useCallback(async () => {
    if (!file || !workspaceId) return

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Phase 1: Upload to Firebase Storage
      setState(IMPORT_STATE.UPLOADING)
      setProgress(5)

      const safeName = file.name?.replaceAll(/[^\w.-]+/g, '_') || `menu-import-${Date.now()}.png`
      const objectPath = `menuImports/${workspaceId}/${Date.now()}_${safeName}`

      let downloadUrl = ''
      let imageBase64 = ''

      // Try Firebase Storage first, fall back to base64 on failure
      if (storage) {
        try {
          const fileRef = ref(storage, objectPath)
          await uploadBytes(fileRef, file, { contentType: file.type || 'image/png' })
          setProgress(35)
          downloadUrl = await getDownloadURL(fileRef)
          setProgress(50)
        } catch (storageErr) {
          // Storage upload failed (permissions not deployed, etc.) — fall back to base64
          console.warn('Storage upload failed, falling back to base64:', storageErr.message)
          if (file.size > 8 * 1024 * 1024) {
            throw new Error('Storage upload failed and file is too large for direct upload (>8 MB). Please contact support to deploy storage rules.')
          }
          imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
          })
          setProgress(50)
        }
      } else {
        // No storage configured — use base64 for files up to 1 MB
        if (file.size > 1024 * 1024) {
          throw new Error('Storage is not configured. Cannot upload files larger than 1 MB.')
        }
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })
        setProgress(50)
      }

      setImageUrl(downloadUrl || imageBase64)

      if (controller.signal.aborted) return

      // Phase 2: AI Extraction
      setState(IMPORT_STATE.EXTRACTING)
      setProgress(55)

      const existingItemNames = existingItems.map(i => i.name)
      const existingCatNames = existingCategories.filter(c => c !== 'All Menu')

      const result = await extractMenuFromImage({
        imageUrl: downloadUrl,
        provider: resolved.ocrProvider,
        confidenceThreshold: resolved.confidenceThreshold,
        existingCategories: existingCatNames,
        existingItemNames,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      setProgress(90)
      setExtractionStats(result.stats)

      // Phase 3: Transform to menu item schema + mark duplicates
      const existingNameSet = new Set(existingItemNames.map(n => n.toLowerCase().trim()))
      const existingCatSet = new Set(existingCatNames.map(c => c.toLowerCase().trim()))

      const transformed = result.items.map((aiItem, idx) => {
        const nameLower = aiItem.name.toLowerCase().trim()
        const isDuplicate = existingNameSet.has(nameLower)
        const costPrice = aiItem.price != null
          ? Math.round(aiItem.price * resolved.costPriceCoefficient)
          : 0

        return {
          _importIndex: aiItem._index ?? idx,
          name: aiItem.name || '',
          nameEn: aiItem.nameEn || '',
          category: aiItem.category || 'Uncategorized',
          description: aiItem.description || '',
          price: aiItem.price,
          costPrice,
          itemType: aiItem.itemType || 'Food',
          availability: 'Available',
          status: 'Active',
          taxEnabled: true,
          serviceChargeEnabled: true,
          discountType: 'none',
          discountValue: 0,
          offerTitle: '',
          offerStartDate: '',
          offerEndDate: '',
          happyHour: false,
          buyOneGetOne: false,
          comboOffer: false,
          tone: MENU_TONES[idx % MENU_TONES.length],
          variants: aiItem.variants || [],
          addOns: aiItem.addOns || [],
          tags: aiItem.tags || [],
          confidence: aiItem.confidence ?? 0.5,
          warnings: aiItem.warnings || [],
          selected: !isDuplicate && aiItem.name?.trim(),
          isDuplicate,
        }
      })

      setProgress(100)
      setPreviewItems(transformed)
      setState(IMPORT_STATE.PREVIEWING)

    } catch (err) {
      if (err.name === 'AbortError') return
      setState(IMPORT_STATE.ERROR)
      setError(err.message || 'Import failed. Please try again.')
    }
  }, [file, workspaceId, existingItems, existingCategories, resolved])

  /** Start text-based extraction (DeepSeek — no vision needed). */
  const startTextImport = useCallback(async () => {
    if (!menuText?.trim()) return
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setState(IMPORT_STATE.EXTRACTING)
      setProgress(20)
      setError(null)

      const existingItemNames = existingItems.map(i => i.name)
      const existingCatNames = existingCategories.filter(c => c !== 'All Menu')

      const result = await extractMenuFromText({
        text: menuText,
        confidenceThreshold: resolved.confidenceThreshold,
        existingCategories: existingCatNames,
        existingItemNames,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return
      setProgress(90)
      setExtractionStats(result.stats)

      const existingNameSet = new Set(existingItemNames.map(n => n.toLowerCase().trim()))

      const transformed = result.items.map((aiItem, idx) => {
        const nameLower = aiItem.name.toLowerCase().trim()
        const isDuplicate = existingNameSet.has(nameLower)
        const costPrice = aiItem.price != null ? Math.round(aiItem.price * resolved.costPriceCoefficient) : 0

        return {
          _importIndex: aiItem._index ?? idx,
          name: aiItem.name || '',
          nameEn: aiItem.nameEn || '',
          category: aiItem.category || 'Uncategorized',
          description: aiItem.description || '',
          price: aiItem.price,
          costPrice,
          itemType: aiItem.itemType || 'Food',
          availability: 'Available',
          status: 'Active',
          taxEnabled: true,
          serviceChargeEnabled: true,
          discountType: 'none',
          discountValue: 0,
          offerTitle: '',
          offerStartDate: '',
          offerEndDate: '',
          happyHour: false,
          buyOneGetOne: false,
          comboOffer: false,
          tone: MENU_TONES[idx % MENU_TONES.length],
          variants: aiItem.variants || [],
          addOns: aiItem.addOns || [],
          tags: aiItem.tags || [],
          confidence: aiItem.confidence ?? 0.5,
          warnings: aiItem.warnings || [],
          selected: !isDuplicate && aiItem.name?.trim(),
          isDuplicate,
        }
      })

      setProgress(100)
      setPreviewItems(transformed)
      setState(IMPORT_STATE.PREVIEWING)
    } catch (err) {
      if (err.name === 'AbortError') return
      setState(IMPORT_STATE.ERROR)
      setError(err.message || 'Text extraction failed.')
    }
  }, [menuText, existingItems, existingCategories, resolved])

  /** Update a single preview item field. */
  const updatePreviewItem = useCallback((index, field, value) => {
    setPreviewItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      // Clear related warnings when user fixes data
      if (field === 'name' && value?.trim() && updated.warnings.includes('missing_name')) {
        updated.warnings = updated.warnings.filter(w => w !== 'missing_name')
        updated.selected = true
      }
      if (field === 'price' && value != null && !isNaN(Number(value)) && updated.warnings.includes('missing_price')) {
        updated.warnings = updated.warnings.filter(w => w !== 'missing_price')
      }
      return updated
    }))
  }, [])

  /** Toggle item selection. */
  const toggleItem = useCallback((index) => {
    setPreviewItems(prev => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ))
  }, [])

  /** Select all items. */
  const selectAll = useCallback(() => {
    setPreviewItems(prev => prev.map(item => ({ ...item, selected: true })))
  }, [])

  /** Deselect items with warnings. */
  const deselectWarnings = useCallback(() => {
    setPreviewItems(prev => prev.map(item =>
      item.warnings.length > 0 ? { ...item, selected: false } : item
    ))
  }, [])

  /** Deselect duplicate items. */
  const deselectDuplicates = useCallback(() => {
    setPreviewItems(prev => prev.map(item =>
      item.isDuplicate ? { ...item, selected: false } : item
    ))
  }, [])

  /** Save selected items to localStorage. */
  const saveSelectedItems = useCallback(() => {
    setState(IMPORT_STATE.SAVING)
    setProgress(0)

    try {
      const selected = previewItems.filter(item => item.selected)
      const skipped = previewItems.filter(item => !item.selected)

      // Build menu items from selected preview items
      const newItems = selected.map((item, idx) => ({
        id: `menu-ai-${Date.now()}-${idx}`,
        name: item.name || 'Unnamed Item',
        category: item.category || 'Uncategorized',
        description: item.description || [
          item.nameEn && `(${item.nameEn})`,
          item.variants.length > 0 && `Variants: ${item.variants.join(', ')}`,
          item.addOns.length > 0 && `Add-ons: ${item.addOns.join(', ')}`,
          item.tags.length > 0 && `Tags: ${item.tags.join(', ')}`,
        ].filter(Boolean).join(' | ') || '',
        price: item.price != null ? Number(item.price) : 0,
        costPrice: item.costPrice || 0,
        sku: `AI-${String(idx + 1).padStart(3, '0')}`,
        preparationTime: '',
        itemType: item.itemType || 'Food',
        availability: item.availability || 'Available',
        status: item.status || 'Active',
        taxEnabled: item.taxEnabled ?? true,
        serviceChargeEnabled: item.serviceChargeEnabled ?? true,
        discountType: item.discountType || 'none',
        discountValue: item.discountValue || 0,
        offerTitle: item.offerTitle || '',
        offerStartDate: item.offerStartDate || '',
        offerEndDate: item.offerEndDate || '',
        happyHour: item.happyHour || false,
        buyOneGetOne: item.buyOneGetOne || false,
        comboOffer: item.comboOffer || false,
        tone: item.tone || MENU_TONES[idx % MENU_TONES.length],
      }))

      // Identify genuinely new categories
      const existingCatLower = new Set(existingCategories.map(c => c.toLowerCase().trim()))
      const importedCategories = [...new Set(selected.map(i => i.category).filter(Boolean))]
      const newCategories = importedCategories.filter(c => !existingCatLower.has(c.toLowerCase().trim()))

      // Build summary
      const sum = {
        imported: newItems.length,
        skipped: skipped.length,
        duplicatesSkipped: skipped.filter(i => i.isDuplicate).length,
        warningsSkipped: skipped.filter(i => i.warnings.length > 0 && !i.isDuplicate).length,
        newCategories,
        itemsWithWarnings: selected.filter(i => i.warnings.length > 0).length,
      }

      // Save import history
      saveImportHistoryEntry(buildHistoryEntry({
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        imageUrl,
        stats: extractionStats,
        imported: newItems.length,
        skipped: skipped.length,
        newCategories,
      }))

      setProgress(100)
      setSummary(sum)

      // Notify parent with imported items and new categories
      if (onImportComplete) {
        onImportComplete(newItems, newCategories)
      }

      setState(IMPORT_STATE.DONE)
    } catch (err) {
      setState(IMPORT_STATE.ERROR)
      setError(err.message || 'Failed to save items.')
    }
  }, [previewItems, existingCategories, file, imageUrl, extractionStats, onImportComplete])

  /** Retry on error. */
  const retry = useCallback(() => {
    setError(null)
    setState(IMPORT_STATE.IDLE)
    setProgress(0)
  }, [])

  /** Go back from preview to upload. */
  const backToUpload = useCallback(() => {
    setState(IMPORT_STATE.IDLE)
    setProgress(0)
    setError(null)
    setPreviewItems([])
    setExtractionStats(null)
    setImageUrl(null)
  }, [])

  return {
    state,
    progress,
    error,
    file,
    imageUrl,
    previewItems,
    extractionStats,
    summary,
    resolved,
    selectFile,
    startImport,
    updatePreviewItem,
    toggleItem,
    selectAll,
    deselectWarnings,
    deselectDuplicates,
    saveSelectedItems,
    reset,
    retry,
    backToUpload,
    menuText,
    setMenuText,
    startTextImport,
  }
}
