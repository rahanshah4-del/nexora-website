/**
 * Template library catalogue: which designs exist for which paper, plus the
 * filter tags the library modal offers. Tags live here (not in the template
 * spec) so the strict spec schema stays unchanged.
 */

import { listTemplates } from './registry.js'
import { PAPERS, RECEIPT_STYLES } from './specs.js'

export const LIBRARY_TABS = Object.freeze([
  { paper: 'A4', label: 'A4' },
  { paper: 'Letter', label: 'Letter' },
  { paper: 'Thermal80', label: '80 mm' },
  { paper: 'Thermal58', label: '58 mm' },
])

export const LIBRARY_TAGS = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'colourful', label: 'Colourful' },
  { id: 'formal', label: 'Formal' },
  { id: 'compact', label: 'Compact' },
  { id: 'serif', label: 'Serif' },
  { id: 'sidebar', label: 'Sidebar' },
])

const TAGS = {
  classic: ['classic'], modern: ['modern', 'colourful'], minimal: ['minimal'], corporate: ['formal'],
  elegant: ['minimal', 'formal'], bold: ['modern', 'colourful'], compact: ['compact'], ledger: ['formal', 'compact'],
  'soft-side': ['modern'], executive: ['formal'], fresh: ['colourful'], simple: ['minimal', 'classic'],
  swiss: ['minimal', 'modern'], noir: ['formal'], ocean: ['modern', 'sidebar'], sunset: ['colourful', 'serif'], forest: ['sidebar', 'serif'],
  royal: ['formal', 'colourful', 'serif'], 'mono-tech': ['modern', 'compact'], 'paper-cream': ['serif', 'classic'], blush: ['colourful'],
  'slate-pro': ['sidebar', 'formal', 'compact'], mint: ['colourful'], 'amber-line': ['serif', 'minimal'], steel: ['formal'], crimson: ['colourful', 'serif'],
  'indigo-night': ['sidebar', 'modern'], 'large-print': ['classic'], dense: ['compact'], gazette: ['serif', 'formal'], 'pastel-side': ['sidebar', 'colourful'], 'teal-band': ['modern', 'colourful'],
  'r-dotted-left': ['minimal'], 'r-strip': ['compact', 'modern'], 'r-airy': ['minimal'], 'r-label': ['formal'],
  'r-classic': ['classic'], 'r-compact': ['compact'], 'r-bold': ['modern', 'colourful'],
  'r-minimal': ['minimal'], 'r-ticket': ['modern'], 'r-ledger': ['formal', 'compact'],
}

/** Featured designs shown before the "More" tile. */
export const FEATURED_COUNT = 4

export function isReceiptTemplateId(id) {
  return typeof id === 'string' && id.startsWith('r-')
}

/** Designs available on a paper (page templates for A4/Letter, receipt styles for thermal), in display order. */
export function designsForPaper(paperId) {
  const paper = PAPERS[paperId] || PAPERS.A4
  const source = paper.kind === 'receipt' ? RECEIPT_STYLES : listTemplates()
  return source.map((t) => ({ id: t.id, name: t.name, description: t.description, tags: TAGS[t.id] || [] }))
}

/** The id that is really in use on `paperId` (an id from the other kind falls back to the paper's default). */
export function effectiveDesignId(paperId, templateId) {
  const list = designsForPaper(paperId)
  return list.some((d) => d.id === templateId) ? templateId : list[0].id
}
