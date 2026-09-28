import { useMemo } from 'react'
import { buildPaperModel } from './paperModel.js'
import PaperTemplate from './PaperTemplate.jsx'
import ReceiptTemplate from './ReceiptTemplate.jsx'
import { resolveLayout } from './specs.js'

/**
 * The rendered document: page template (A4 / Letter) or thermal receipt,
 * chosen from doc.appearance.paperSize and doc.templateId; letterheadUrl is
 * the object URL of doc.appearance.letterhead's image (page templates only).
 */
export default function DocumentPaper({ doc, totals, logoUrl = null, letterheadUrl = null, amountWords = '' }) {
  const model = useMemo(() => buildPaperModel(doc, totals, { amountWords }), [doc, totals, amountWords])
  const layout = resolveLayout(doc)
  return layout.kind === 'receipt'
    ? <ReceiptTemplate model={model} layout={layout} logoUrl={logoUrl} />
    : <PaperTemplate model={model} layout={layout} logoUrl={logoUrl} letterheadUrl={letterheadUrl} />
}
