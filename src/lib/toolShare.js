/**
 * Copy-ready link snippets for the free tool pages (/tools/<tool>/), so a
 * blogger, template site or newsletter can point to a tool in one paste.
 * Pure: no network, no React. Used by pages/public/tools/ToolShareSection.jsx.
 *
 * The anchor text names the tool and the brand ("Quotation Generator by
 * Nexora"), not an exact-match keyword, so links that come from it read
 * naturally. The link is a plain, followed link to the canonical tool URL.
 */
import { absoluteUrl, SITE_NAME } from './seoStructuredData.js'

const BRAND = 'Nexora'

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * @param {{ path: string, title: string }} tool  path like '/tools/quotation-generator'
 * @returns {{ url: string, text: string, html: string, markdown: string, plain: string }}
 */
export function toolShareSnippets({ path, title }) {
  const url = absoluteUrl(path)
  const text = `${title} by ${BRAND}`
  return {
    url,
    text,
    html: `<a href="${url}">${escapeHtml(text)}</a>`,
    markdown: `[${text}](${url})`,
    plain: `${text}: ${url}`,
  }
}

export const TOOL_SHARE_BRAND = SITE_NAME
