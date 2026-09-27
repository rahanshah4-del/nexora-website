/**
 * Template registry. Each entry pairs a data spec (shared with the PDF
 * renderer in Step 3) with its HTML component. Add a template by adding an
 * entry; the Appearance picker lists whatever is registered here.
 */

import ClassicTemplate from './classic/ClassicTemplate.jsx'
import { classicSpec } from './classic/spec.js'

export const TEMPLATES = Object.freeze({
  classic: { id: 'classic', name: classicSpec.name, description: classicSpec.description, spec: classicSpec, Component: ClassicTemplate },
})

export const DEFAULT_TEMPLATE_ID = 'classic'

export function getTemplate(id) {
  return TEMPLATES[id] || TEMPLATES[DEFAULT_TEMPLATE_ID]
}
