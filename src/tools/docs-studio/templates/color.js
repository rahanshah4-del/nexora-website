/** Colour helpers for templates (pure). */

/** '#0071e3' → [0, 113, 227]; null when not #rrggbb. */
export function hexToRgb(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''))
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}

/** WCAG relative luminance, 0 (black) … 1 (white). */
export function luminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Text colour for text drawn on `hex`: white on dark accents, near-black on light ones. */
export function onAccentColor(hex) {
  const l = luminance(hex)
  const contrastWhite = 1.05 / (l + 0.05)
  const contrastDark = (l + 0.05) / (luminance('#0f172a') + 0.05)
  return contrastWhite >= contrastDark ? '#ffffff' : '#0f172a'
}

export const ACCENT_PRESETS = Object.freeze([
  { name: 'Nexora blue', value: '#0071e3' },
  { name: 'Slate', value: '#334155' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Amber', value: '#d97706' },
])
