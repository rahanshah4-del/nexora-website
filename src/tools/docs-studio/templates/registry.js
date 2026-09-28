/**
 * Template registry: the page templates offered in Appearance (all data specs
 * in specs.js, rendered by PaperTemplate.jsx and pdf/renderPdf.js), plus the
 * thermal receipt, chosen automatically for 58 / 80 mm paper.
 */

import { PAGE_TEMPLATES, PAGE_TEMPLATE_IDS, RECEIPT_TEMPLATE, resolveLayout } from './specs.js'

export const DEFAULT_TEMPLATE_ID = 'classic'

export const TEMPLATES = Object.freeze(Object.fromEntries(PAGE_TEMPLATE_IDS.map((id) => [id, {
  id,
  name: PAGE_TEMPLATES[id].name,
  description: PAGE_TEMPLATES[id].description,
  spec: PAGE_TEMPLATES[id],
}])))

export { PAGE_TEMPLATES, RECEIPT_TEMPLATE, resolveLayout }
