import { useMemo } from 'react'
import { buildPaperModel } from './paperModel.js'
import PaperTemplate from './PaperTemplate.jsx'
import ReceiptTemplate from './ReceiptTemplate.jsx'
import { resolveLayout } from './specs.js'

/**
 * The rendered document: page template (A4 / Letter) or thermal receipt,
 * chosen from doc.appearance.paperSize and doc.templateId.
 */
export default function DocumentPaper({ doc, totals, logoUrl = null, amountWords = '' }) {
  const model = useMemo(() => buildPaperModel(doc, totals, { amountWords }), [doc, totals, amountWords])
  const layout = resolveLayout(doc)
  return layout.kind === 'receipt'
    ? <ReceiptTemplate model={model} layout={layout} logoUrl={logoUrl} />
    : <PaperTemplate model={model} layout={layout} logoUrl={logoUrl} />
}
