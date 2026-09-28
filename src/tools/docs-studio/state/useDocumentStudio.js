/**
 * useDocumentStudio(initialDocument) — live editor + preview state.
 *
 * The document lives in a reducer; everything shown is derived from it:
 *   totals    calculateDocument() of the DEFERRED document, so a large
 *             document's preview re-render never delays a keystroke
 *             (useDeferredValue), and inputs stay responsive while typing
 *   issues    validateDocument() of the current document (drives field errors)
 *   words     amount payable in words, per the document's options
 *
 * Not SSR-safe by design when called without an initial document (a new
 * document takes today's date and a random id). Mount the studio client-side
 * only, or pass a fully built document.
 */

import { useDeferredValue, useMemo, useReducer } from 'react'
import { amountInWords, calculateDocument, createDocument, normalizeDocument, validateDocument } from '../engine/index.js'
import { documentActions, documentReducer } from './documentReducer.js'

function init(initialDocument) {
  const value = typeof initialDocument === 'function' ? initialDocument() : initialDocument
  return value ? normalizeDocument(value) : createDocument('invoice')
}

/**
 * @param {object | (() => object)} [initialDocument]
 */
export function useDocumentStudio(initialDocument) {
  const [doc, dispatch] = useReducer(documentReducer, initialDocument, init)
  const previewDocument = useDeferredValue(doc)
  const totals = useMemo(() => calculateDocument(previewDocument), [previewDocument])
  const issues = useMemo(() => validateDocument(doc), [doc])
  const words = useMemo(
    () => amountInWords(totals.amountPayable, previewDocument.currency, {
      lang: previewDocument.options.wordsLanguage,
      system: previewDocument.options.wordsSystem,
    }),
    [totals.amountPayable, previewDocument.currency, previewDocument.options.wordsLanguage, previewDocument.options.wordsSystem],
  )
  // Bound action creators: actions.addLine({ description: 'Design' }), …
  const actions = useMemo(
    () => Object.fromEntries(Object.entries(documentActions).map(([name, create]) => [name, (...args) => dispatch(create(...args))])),
    [],
  )

  return {
    document: doc,
    previewDocument,
    isPreviewStale: previewDocument !== doc,
    totals,
    issues,
    amountInWords: words,
    dispatch,
    actions,
  }
}
