#!/usr/bin/env node
/* Generates src/styles/public-dark.css — the night-mode palette for the
   public marketing website.

   The marketing pages are written with light-only Tailwind classes
   (bg-white, text-slate-900, bg-[linear-gradient(...#f8fbff...)], …). Rather
   than hand-adding `dark:` variants to thousands of class strings, this
   script scans the public-site sources for colour utilities and emits a
   dark counterpart for each one, scoped to `html.public-dark.public-website`
   so the CRM / POS / admin modules are never touched.

   Re-run after adding new colour classes to public pages:
     node scripts/generate-public-dark-css.mjs */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import twColors from 'tailwindcss/colors.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'src/styles/public-dark.css')
const SCOPE = 'html.public-dark.public-website'

const SOURCES = [
  'src/App.jsx',
  'src/pages/public',
  'src/sections',
  'src/components',
  'src/lib',
]
// App-only components that never render on marketing pages.
const SKIP = [/\.bak$/, /components\/(workspace|security)\//, /CrmProviderShell|WorkspaceProviderShell|RootAuthProviderShell|AppProviders/]

/* ── Dark palette ─────────────────────────────────────────────────────── */
const PAGE = '#0b1019'
const SURFACE = '#121826' // bg-white
const SURFACE_SUNK = '#0e131d' // bg-slate-50 (sections behind cards)
const SURFACE_2 = '#1a2130' // bg-slate-100
const SURFACE_3 = '#242c3b' // bg-slate-200
const SURFACE_4 = '#2e3748' // bg-slate-300
const INK = '#f1f5f9'

const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone']
const HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']

/* ── colour helpers ───────────────────────────────────────────────────── */
function hexToRgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
}
const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b); const min = Math.min(r, g, b)
  let h = 0; let s = 0; const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return [h, s, l]
}
function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255)
}
const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})` }

/* A light background colour → a dark surface that keeps its hue. */
function darkSurface(hex) {
  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)
  if (s < 0.2 || l > 0.985) {
    // neutral / near-white → slate surfaces
    if (l >= 0.995) return SURFACE
    if (l >= 0.97) return SURFACE_SUNK
    if (l >= 0.93) return SURFACE_2
    if (l >= 0.88) return SURFACE_3
    return SURFACE_4
  }
  return hslToHex(h, Math.min(s, 0.55) * 0.75, 0.1 + (1 - l) * 0.25)
}
/* A dark text colour → a light one (keeps saturated brand colours bright). */
function lightText(hex) {
  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)
  if (s > 0.4) return l >= 0.62 ? hex : hslToHex(h, Math.min(1, s), 0.66)
  return hslToHex(h, Math.min(s, 0.12), Math.max(0.58, 0.97 - l * 0.62))
}
const luminance = (hex) => { const [r, g, b] = hexToRgb(hex); return rgbToHsl(r, g, b)[2] }

/* ── class token → selector ───────────────────────────────────────────── */
const esc = (cls) => cls.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c)
const SCREENS = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1440px' }
const PSEUDO = { hover: ':hover', focus: ':focus', active: ':active', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within', disabled: ':disabled', first: ':first-child', last: ':last-child' }

/* Returns { media, selector } or null when a variant is unsupported. */
function selectorFor(token, variants, target = '') {
  let sel = '.' + esc(token)
  let media = null
  let prefix = ''
  let placeholder = false
  for (const v of variants) {
    if (SCREENS[v]) media = SCREENS[v]
    else if (PSEUDO[v]) sel += PSEUDO[v]
    else if (v === 'group-hover') prefix = '.group:hover '
    else if (v === 'placeholder') placeholder = true
    else return null
  }
  if (placeholder) sel += '::placeholder'
  return { media, selector: `${SCOPE} ${prefix}${sel}${target}` }
}

/* ── utility → declarations ───────────────────────────────────────────── */
function alphaOf(mod) {
  if (!mod) return 1
  const m = mod.match(/^\[?([0-9.]+)\]?$/)
  if (!m) return 1
  const v = parseFloat(m[1])
  return v > 1 ? v / 100 : v
}

function neutralBg(shade, alpha) {
  if (shade === 'black' && alpha < 0.45) return `rgba(255, 255, 255, ${+Math.min(0.14, alpha * 1.4).toFixed(3)})` // hover washes
  if (alpha < 0.45) return null // translucent washes on dark panels — keep
  const map = { white: SURFACE, 50: SURFACE_SUNK, 100: SURFACE_2, 200: SURFACE_3, 300: SURFACE_4 }
  const base = map[shade]
  if (!base) return null
  return alpha >= 1 ? base : rgba(base, alpha)
}
function neutralText(shade) {
  const map = { black: INK, 950: INK, 900: INK, 800: '#e2e8f0', 700: '#cbd5e1', 600: '#b3bfcf', 500: '#94a3b8', 400: '#7f8ca0' }
  return map[shade] || null
}
function neutralBorder(shade, alpha) {
  const map = { white: 0.1, 50: 0.05, 100: 0.07, 200: 0.1, 300: 0.15, 400: 0.22 }
  if (map[shade] == null) return null
  if (shade === 'white' && alpha < 0.45) return null
  return `rgba(255, 255, 255, ${+(map[shade] * Math.min(1, alpha + 0.25)).toFixed(3)})`
}

function colorValue(family, shade) {
  if (family === 'white') return '#ffffff'
  if (family === 'black') return '#000000'
  return twColors[family]?.[shade]
}

/* Main mapper: returns CSS declarations for a colour utility, or null. */
function darkDecls(util) {
  // util without variants, e.g. "bg-white/80", "text-[#1d1d1f]", "bg-[linear-gradient(...)]"
  let m = util.match(/^(bg|text|border(?:-[trblxy])?|ring|divide|decoration|from|via|to|fill|stroke|outline|placeholder)-(.+)$/)
  if (!m) return null
  const [, kind, rest] = m
  let value = rest
  let mod = null
  const slash = rest.match(/^(.*?)\/(\[?[0-9.]+\]?)$/)
  if (slash && !rest.startsWith('[')) { value = slash[1]; mod = slash[2] }
  if (rest.startsWith('[') && /\]\/(\[?[0-9.]+\]?)$/.test(rest)) {
    const i = rest.lastIndexOf('/')
    value = rest.slice(0, i); mod = rest.slice(i + 1)
  }
  const alpha = alphaOf(mod)

  // ── arbitrary values ──
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1)
    if (kind === 'bg' && /gradient\(/.test(inner)) return gradientDecls(inner)
    const hex = inner.match(/^#[0-9a-fA-F]{3,8}$/)?.[0]
    if (!hex) return null
    const l = luminance(hex)
    if (kind === 'bg') {
      if (l > 0.8) return { 'background-color': alpha >= 1 ? darkSurface(hex) : rgba(darkSurface(hex), alpha) }
      return null
    }
    if (kind === 'text') {
      if (l < 0.6) return { color: alpha >= 1 ? lightText(hex) : rgba(lightText(hex), alpha) }
      return null
    }
    if (kind.startsWith('border') || kind === 'ring') {
      if (l > 0.8) return borderDecl(kind, 'rgba(255, 255, 255, 0.1)')
      return null
    }
    if (kind === 'from' || kind === 'via' || kind === 'to') {
      if (l > 0.85) return gradientStop(kind, darkSurface(hex))
      return null
    }
    return null
  }

  // ── palette values ──
  const pm = value.match(/^([a-z]+)(?:-(\d{2,3}))?$/)
  if (!pm) return null
  const family = pm[1]
  const shade = family === 'white' || family === 'black' ? family : pm[2]
  const isNeutral = NEUTRALS.includes(family) || family === 'white' || family === 'black'
  const isHue = HUES.includes(family)
  if (!isNeutral && !isHue) return null

  if (isNeutral) {
    switch (kind) {
      case 'bg': {
        const v = neutralBg(shade, alpha)
        return v ? { 'background-color': v } : null
      }
      case 'text': case 'placeholder': {
        if (family === 'white') return null
        const v = neutralText(shade)
        return v ? { color: alpha >= 1 ? v : rgba(v, Math.max(alpha, 0.6)) } : null
      }
      case 'fill': case 'stroke': {
        if (family === 'white') return null
        const v = neutralText(shade)
        return v ? { [kind]: v } : null
      }
      case 'decoration': {
        const v = neutralBorder(shade, alpha)
        return v ? { 'text-decoration-color': v.replace(/[\d.]+\)$/, '0.35)') } : null
      }
      case 'from': case 'via': case 'to': {
        if (shade === 'white' || ['50', '100', '200'].includes(shade)) {
          const base = neutralBg(shade, 1)
          return gradientStop(kind, alpha >= 1 ? base : rgba(base, alpha))
        }
        return null
      }
      case 'ring': {
        if (shade === 'white' && alpha >= 0.45) return { '--tw-ring-color': SURFACE }
        const v = neutralBorder(shade, alpha)
        return v ? { '--tw-ring-color': v } : null
      }
      default: {
        const v = neutralBorder(shade, alpha)
        return v ? borderDecl(kind, v) : null
      }
    }
  }

  // hue families (blue, violet, emerald, …)
  const c500 = twColors[family][500]
  const s = Number(shade)
  switch (kind) {
    case 'bg': {
      const a = { 50: 0.1, 100: 0.16, 200: 0.24 }[s]
      if (a == null) return null
      return { 'background-color': rgba(c500, a * Math.max(alpha, 0.5)) }
    }
    case 'text': {
      const to = { 600: 400, 700: 300, 800: 200, 900: 200, 950: 100 }[s]
      if (!to) return null
      const v = twColors[family][to]
      return { color: alpha >= 1 ? v : rgba(v, alpha) }
    }
    case 'fill': case 'stroke': {
      const to = { 600: 400, 700: 300, 800: 200, 900: 200 }[s]
      return to ? { [kind]: twColors[family][to] } : null
    }
    case 'from': case 'via': case 'to': {
      const a = { 50: 0.1, 100: 0.16, 200: 0.22 }[s]
      if (a == null) return null
      return gradientStop(kind, rgba(c500, a))
    }
    case 'ring': {
      const a = { 50: 0.15, 100: 0.2, 200: 0.28, 300: 0.38 }[s]
      return a == null ? null : { '--tw-ring-color': rgba(twColors[family][400], a) }
    }
    default: {
      const a = { 50: 0.14, 100: 0.2, 200: 0.28, 300: 0.38 }[s]
      if (a == null) return null
      return borderDecl(kind, rgba(twColors[family][400], a * Math.max(alpha, 0.6)))
    }
  }
}

function borderDecl(kind, value) {
  if (kind === 'divide') return { __divide: true, 'border-color': value }
  const side = { 'border-t': 'top', 'border-b': 'bottom', 'border-l': 'left', 'border-r': 'right' }[kind]
  if (side) return { [`border-${side}-color`]: value }
  if (kind === 'border-x') return { 'border-left-color': value, 'border-right-color': value }
  if (kind === 'border-y') return { 'border-top-color': value, 'border-bottom-color': value }
  if (kind === 'outline') return { 'outline-color': value }
  return { 'border-color': value }
}

/* Tailwind v3 gradient stop overrides. `from`/`to` only swap their own colour
   variable so a sibling `via-*` class keeps its stop list intact. */
function gradientStop(kind, color) {
  if (kind === 'from') return { '--tw-gradient-from': `${color} var(--tw-gradient-from-position)`, '--tw-gradient-to': 'rgba(18, 24, 38, 0) var(--tw-gradient-to-position)' }
  if (kind === 'to') return { '--tw-gradient-to': `${color} var(--tw-gradient-to-position)` }
  return { '--tw-gradient-stops': `var(--tw-gradient-from), ${color} var(--tw-gradient-via-position), var(--tw-gradient-to)` }
}

/* bg-[linear-gradient(...)] / bg-[radial-gradient(...)] with light colours. */
function gradientDecls(inner) {
  const css = inner.replace(/_/g, ' ')
  const isDotPattern = /radial-gradient\(\s*circle\s*,\s*#[0-9a-fA-F]{3,8}\s+1px/.test(css)
  let changed = false
  const out = css
    .replace(/#[0-9a-fA-F]{3,8}\b/g, (hex) => {
      if (luminance(hex) < 0.8) return hex
      changed = true
      return isDotPattern ? 'rgba(148, 163, 184, 0.16)' : darkSurface(hex)
    })
    .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/g, (full, r, g, b, a) => {
      const hex = rgbToHex(+r, +g, +b)
      if (luminance(hex) < 0.8) return full
      changed = true
      return rgba(darkSurface(hex), a == null ? 1 : +a)
    })
  return changed ? { 'background-image': out } : null
}

/* The original (light) value of a colour utility. Used for variant classes
   we don't remap (e.g. \`md:bg-transparent\`, \`hover:bg-slate-900\`) so the
   scoped base overrides above can't out-rank them. */
function lightDecls(util) {
  const m = util.match(/^(bg|text|border(?:-[trblxy])?|ring|divide|decoration|fill|stroke|outline|placeholder)-(.+)$/)
  if (!m) return null
  const [, kind, rest] = m
  let value = rest
  let alpha = 1
  const i = rest.lastIndexOf('/')
  if (i > 0 && (!rest.startsWith('[') || rest[i - 1] === ']')) { value = rest.slice(0, i); alpha = alphaOf(rest.slice(i + 1)) }
  let color
  if (['transparent', 'current', 'inherit'].includes(value)) color = value === 'current' ? 'currentColor' : value
  else if (/^\[#[0-9a-fA-F]{3,8}\]$/.test(value)) color = value.slice(1, -1)
  else {
    const pm = value.match(/^([a-z]+)(?:-(\d{2,3}))?$/)
    if (!pm) return null
    color = colorValue(pm[1], pm[1] === 'white' || pm[1] === 'black' ? null : pm[2])
    if (!color) return null
  }
  if (alpha < 1 && color.startsWith('#')) color = rgba(color, alpha)
  if (kind === 'bg') return { 'background-color': color }
  if (kind === 'text' || kind === 'placeholder') return { color }
  if (kind === 'fill' || kind === 'stroke') return { [kind]: color }
  if (kind === 'decoration') return { 'text-decoration-color': color }
  if (kind === 'ring') return { '--tw-ring-color': color }
  return borderDecl(kind, color)
}

/* ── scan sources ─────────────────────────────────────────────────────── */
function walk(p, files = []) {
  const abs = join(root, p)
  const st = statSync(abs)
  if (st.isDirectory()) for (const f of readdirSync(abs)) walk(join(p, f), files)
  else if (/\.(jsx?|mjs)$/.test(p) && !SKIP.some((re) => re.test(p))) files.push(abs)
  return files
}

const TOKEN_RE = /(?<![\w-])((?:[a-z0-9-]+:)*)(bg|text|border(?:-[trblxy])?|ring|divide|decoration|from|via|to|fill|stroke|outline|placeholder)-([^\s'"`{}]+)/g
const tokens = new Set()
for (const file of SOURCES.flatMap((s) => walk(s))) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(TOKEN_RE)) {
    const full = (m[1] + m[2] + '-' + m[3]).replace(/[,;)]+$/, (t) => (m[3].includes('[') && t.startsWith(')') ? t : ''))
    tokens.add(full)
  }
}
// Class names that are built dynamically (`bg-${color}-50`) never show up
// literally, so also emit the common tinted surfaces for every hue.
for (const hue of HUES) {
  for (const s of [50, 100, 200]) tokens.add(`bg-${hue}-${s}`).add(`hover:bg-${hue}-${s}`).add(`from-${hue}-${s}`).add(`to-${hue}-${s}`).add(`via-${hue}-${s}`)
  for (const s of [100, 200, 300]) tokens.add(`border-${hue}-${s}`).add(`ring-${hue}-${s}`)
  for (const s of [600, 700, 800, 900]) tokens.add(`text-${hue}-${s}`)
}

/* ── emit ─────────────────────────────────────────────────────────────── */
const plain = []
const byMedia = {}
let count = 0
for (const token of [...tokens].sort()) {
  const parts = token.split(':')
  const util = parts.pop()
  if (parts.includes('dark')) continue
  let decls = darkDecls(util)
  if (!decls && parts.length) decls = lightDecls(util)
  if (!decls) continue
  const isDivide = decls.__divide
  delete decls.__divide
  const target = isDivide ? ' > :not([hidden]) ~ :not([hidden])' : ''
  const sel = selectorFor(token, parts, target)
  if (!sel) continue
  const body = Object.entries(decls).map(([k, v]) => `${k}: ${v};`).join(' ')
  const rule = `${sel.selector} { ${body} }`
  if (sel.media) (byMedia[sel.media] ||= []).push(rule)
  else plain.push(rule)
  count += 1
}

// Gradient headline text (bg-clip-text from-blue-600 …) — brighten the stops
// so the words read on dark instead of sinking into the background.
for (const hue of HUES) {
  for (const [from, to] of [[500, 300], [600, 400], [700, 400], [800, 300], [900, 300]]) {
    for (const kind of ['from', 'via', 'to']) {
      const decls = gradientStop(kind, twColors[hue][to])
      const body = Object.entries(decls).map(([k, v]) => `${k}: ${v};`).join(' ')
      plain.push(`${SCOPE} .bg-clip-text.${kind}-${hue}-${from} { ${body} }`)
      count += 1
    }
  }
}

const header = `/* AUTO-GENERATED by scripts/generate-public-dark-css.mjs — do not edit by hand.
   Night-mode palette for the public website, scoped to ${SCOPE}.
   Hand-written overrides live in src/styles/public-dark-base.css. */
`
const mediaOrder = Object.keys(byMedia).sort((a, b) => parseInt(a) - parseInt(b))
const css = [header, ...plain, ...mediaOrder.map((mq) => `@media (min-width: ${mq}) {\n  ${byMedia[mq].join('\n  ')}\n}`)].join('\n') + '\n'
writeFileSync(OUT, css)
console.log(`public-dark.css: ${count} rules from ${tokens.size} colour tokens`)
