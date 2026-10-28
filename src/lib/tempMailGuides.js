/**
 * Copy, SEO and JSON-LD for the temp-mail guide pages (/tools/temp-mail/<slug>/), the written
 * support for the free tool at /tools/temp-mail/.
 *
 * To add a guide: write one file in src/lib/tempMailGuides/ and add it to the list below. The route,
 * SEO metadata, sitemap entry, prerender route and JSON-LD all read this array (src/AppRouter.jsx,
 * src/lib/seoMetadata.js, scripts/generate-sitemap.mjs, scripts/prerender.mjs,
 * pages/public/tools/TempMailGuidePage.jsx).
 *
 * Writing rules for this section live in docs/temp-mail-content-notes.md. Read them before editing:
 * one primary keyword per page, no repeated paragraphs between pages, only facts that are true.
 */
import { absoluteUrl, createFAQPageSchema, SITE_URL } from './seoStructuredData.js'
import { TEMP_MAIL_PATH } from './tempMailLaunch.js'
import { author } from '../config/author.js'
import temporaryEmailAddress from './tempMailGuides/temporaryEmailAddress.js'
import disposableEmailAddress from './tempMailGuides/disposableEmailAddress.js'
import verificationCodes from './tempMailGuides/verificationCodes.js'
import tenMinuteMail from './tempMailGuides/tenMinuteMail.js'
import isTempMailSafe from './tempMailGuides/isTempMailSafe.js'
import blockDisposableEmails from './tempMailGuides/blockDisposableEmails.js'

export const TEMP_MAIL_GUIDES_UPDATED = '2026-10-28'
export const TEMP_MAIL_GUIDE_OG_IMAGE_PATH = '/og-free-tools.png'

export const TEMP_MAIL_GUIDE_CTA = Object.freeze({
  heading: 'Try it yourself: get a free temporary email',
  text: 'Nexora Temp Mail gives you a working inbox the moment the page opens. There is no signup, new mail shows up live, one-time codes are picked out for you, and everything is erased when the timer ends.',
  links: [
    { to: TEMP_MAIL_PATH, label: 'Get a temp email', primary: true },
    { to: '/tools', label: 'More free tools' },
  ],
})

export const TEMP_MAIL_GUIDES = Object.freeze([
  temporaryEmailAddress,
  disposableEmailAddress,
  verificationCodes,
  tenMinuteMail,
  isTempMailSafe,
  blockDisposableEmails,
])

export const TEMP_MAIL_GUIDE_PATHS = Object.freeze(TEMP_MAIL_GUIDES.map((guide) => guide.path))

export function getTempMailGuide(slug) {
  return TEMP_MAIL_GUIDES.find((guide) => guide.slug === slug) || null
}

function breadcrumbSchema(trail, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: trail.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
  }
}

function articleSchema(page) {
  const url = absoluteUrl(page.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    headline: page.h1,
    description: page.seo.description,
    image: `${SITE_URL}${TEMP_MAIL_GUIDE_OG_IMAGE_PATH}`,
    datePublished: TEMP_MAIL_GUIDES_UPDATED,
    dateModified: TEMP_MAIL_GUIDES_UPDATED,
    inLanguage: 'en',
    author: { '@type': 'Person', name: author.name, jobTitle: author.jobTitle, worksFor: { '@id': `${SITE_URL}/#organization` } },
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

/** Article, FAQPage (mirrors the visible FAQ) and BreadcrumbList, in output order. */
export function tempMailGuideSchemas(page) {
  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Free tools', path: '/tools' },
    { name: 'Temp Mail', path: TEMP_MAIL_PATH },
    { name: page.breadcrumbName, path: page.path },
  ]
  return [articleSchema(page), createFAQPageSchema({ path: page.path, items: page.faqs }), breadcrumbSchema(trail, page.path)]
}
