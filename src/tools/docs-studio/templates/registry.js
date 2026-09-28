/**
 * Template registry. Every page template — built-in now, admin-uploaded in
 * Step 4 — enters through registerTemplate(), which runs validateTemplateSpec()
 * and stores the frozen, complete result. Renderers only ever see validated
 * specs. The thermal receipt is not a registry template: 58 / 80 mm paper
 * always uses RECEIPT_TEMPLATE (specs.js).
 */

import { BUILTIN_SPECS } from './builtin.js'
import { validateTemplateSpec } from './schema.js'

export const DEFAULT_TEMPLATE_ID = 'classic'

/** @type {Map<string, { spec: object, source: 'builtin' | 'remote' }>} */
const templates = new Map()

/**
 * @param {unknown} spec
 * @param {{ source?: 'builtin' | 'remote' }} [options]
 * @returns {{ ok: true, spec: object, warnings: string[] } | { ok: false, errors: string[], warnings: string[] }}
 */
export function registerTemplate(spec, { source = 'remote' } = {}) {
  const result = validateTemplateSpec(spec)
  if (!result.ok) return result
  const existing = templates.get(result.spec.id)
  // Built-ins are fixed: a remote spec can add templates, never replace one.
  if (existing?.source === 'builtin' && source !== 'builtin') {
    return { ok: false, errors: [`id: "${result.spec.id}" is a built-in template`], warnings: result.warnings }
  }
  templates.set(result.spec.id, { spec: result.spec, source })
  return result
}

/** Removes a non-built-in template. */
export function unregisterTemplate(id) {
  if (templates.get(id)?.source === 'builtin') return false
  return templates.delete(id)
}

export function hasTemplate(id) {
  return templates.has(id)
}

/** The validated spec for `id`, or Classic when it is unknown (e.g. a template removed later). */
export function getTemplate(id) {
  return (templates.get(id) || templates.get(DEFAULT_TEMPLATE_ID)).spec
}

/** Validated specs in registration order (built-ins first). */
export function listTemplates() {
  return [...templates.values()].map((t) => t.spec)
}

for (const spec of BUILTIN_SPECS) {
  const result = registerTemplate(spec, { source: 'builtin' })
  if (!result.ok) throw new Error(`Built-in template "${spec.id}" is invalid: ${result.errors.join('; ')}`)
}
