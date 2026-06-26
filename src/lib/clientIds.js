export function clientShortId(value = '') {
  const source = String(value || '').trim()
  if (!source) return 'NXR-000000'
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }
  return `NXR-${hash.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`
}

export function resolveClientShortId(record = {}) {
  return record.shortClientId || record.clientShortId || clientShortId(record.workspaceId || record.ownerId || record.userId || record.uid || record.id)
}
