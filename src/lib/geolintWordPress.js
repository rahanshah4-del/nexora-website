/** Origin (https://host) of whatever the visitor typed or the audited URL, or '' when it is not a web address. */
export function wordpressOrigin(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    if (!url.hostname.includes('.')) return ''
    return url.origin
  } catch {
    return ''
  }
}

/** Where the "Upload Plugin" screen lives on a default WordPress install. */
export function wordpressUploadUrl(value) {
  const origin = wordpressOrigin(value)
  return origin ? `${origin}/wp-admin/plugin-install.php?tab=upload` : ''
}
