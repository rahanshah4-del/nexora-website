/**
 * SSR Entry Point — Build-time prerendering
 *
 * This module is only used during `npm run prerender`. It renders React
 * components to static HTML strings for each public marketing route.
 * Never loaded in the browser — tree-shaken from client bundles.
 */
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App.jsx'
import { canonicalPath } from './lib/seoStructuredData.js'

/**
 * Render a public marketing page to a complete HTML string.
 *
 * @param {string}  url     — Route path (e.g. '/', '/pricing', '/blog/my-post')
 * @param {Object}  options — { title, description, canonical, ogImage, jsonLd }
 * @returns {string}        — Complete HTML page
 */
export function render(url, options = {}) {
  const appHtml = renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  )

  // Detect HTML lang from URL prefix
  const langPrefixes = { ur: 'ur', hi: 'hi', ar: 'ar', bn: 'bn' }
  const urlLang = Object.entries(langPrefixes).find(([prefix]) => url.startsWith(`/${prefix}/`))
  const htmlLang = urlLang ? urlLang[1] : 'en'

  const meta = {
    title: options.title || 'Nexora POS Software Pakistan | Nexora Solution',
    description: options.description || 'Nexora offers Pakistan\'s leading POS software for restaurant, retail, school ERP and WhatsApp CRM teams with unified business workflows.',
    canonical: options.canonical || `https://nexorasolution.online${canonicalPath(url)}`,
    ogImage: options.ogImage || 'https://nexorasolution.online/nexora-brand-logo.png',
    jsonLd: options.jsonLd || '',
    twitterCard: options.twitterCard || 'summary_large_image',
  }

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.title}</title>
  <meta name="description" content="${escapeAttr(meta.description)}" />
  <link rel="canonical" href="${escapeAttr(meta.canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Nexora Solution" />
  <meta property="og:title" content="${escapeAttr(meta.title)}" />
  <meta property="og:description" content="${escapeAttr(meta.description)}" />
  <meta property="og:url" content="${escapeAttr(meta.canonical)}" />
  <meta property="og:image" content="${escapeAttr(meta.ogImage)}" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:image:alt" content="Nexora Solution — POS, ERP and CRM software for Pakistan" />
  <meta name="twitter:card" content="${meta.twitterCard}" />
  <meta name="twitter:site" content="@nexorasolution" />
  <meta name="twitter:title" content="${escapeAttr(meta.title)}" />
  <meta name="twitter:description" content="${escapeAttr(meta.description)}" />
  <meta name="twitter:image" content="${escapeAttr(meta.ogImage)}" />
  <meta name="twitter:image:alt" content="Nexora Solution — POS, ERP and CRM software for Pakistan" />
  ${meta.jsonLd}
</head>
<body>
  <div id="root">${appHtml}</div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`
}

function escapeAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
