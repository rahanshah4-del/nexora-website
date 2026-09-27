/**
 * Maps validateDocument() issues (paths like "lines[2].qty_milli") onto editor
 * fields and sections.
 */

export const SECTION_IDS = Object.freeze(['business', 'client', 'details', 'items', 'taxes', 'payments', 'notes', 'appearance'])

/** DOM id of the input for an issue path. */
export function fieldId(path) {
  return `ds-f-${String(path).replace(/[^a-zA-Z0-9]+/g, '-').replace(/-$/, '')}`
}

/** Which editor section a path belongs to. */
export function sectionForPath(path) {
  const p = String(path || '')
  if (p.startsWith('seller')) return 'business'
  if (p.startsWith('client') || p.startsWith('shipTo')) return 'client'
  if (p.startsWith('lines')) return 'items'
  if (/^(taxes|discount|shipping|fees|options)/.test(p)) return 'taxes'
  if (/^(payments|deposit)/.test(p)) return 'payments'
  if (/^(notes|terms|footer)/.test(p)) return 'notes'
  return 'details'
}

/** Candidate element ids for a path, most specific first: a.b[1].c → a.b[1].c, a.b[1], a.b, a. */
export function fieldIdCandidates(path) {
  const ids = []
  let p = String(path || '')
  while (p) {
    ids.push(fieldId(p))
    const next = p.replace(/(\.[^.[\]]+|\[\d+\])$/, '')
    if (next === p) break
    p = next
  }
  return ids
}

/** Issues grouped by exact path. */
export function groupIssuesByPath(issues) {
  const map = new Map()
  for (const issue of issues) {
    if (!map.has(issue.path)) map.set(issue.path, [])
    map.get(issue.path).push(issue)
  }
  return map
}
