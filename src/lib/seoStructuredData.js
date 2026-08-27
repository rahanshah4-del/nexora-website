export const SITE_URL = 'https://nexorasolution.online'
export const SITE_NAME = 'Nexora Solution'
export const SITE_PHONE = '03194329754'
export const SITE_PHONE_E164 = '+923194329754'
export const SITE_WHATSAPP = 'https://wa.me/923194329754'
export const DEFAULT_LOGO = `${SITE_URL}/nexora-brand-logo.png`
export const ORGANIZATION_SOCIAL_PROFILES = [
  'https://www.facebook.com/nexorasolution',
  'https://www.instagram.com/nexorasolution',
  'https://www.linkedin.com/company/nexorasolution',
  'https://www.youtube.com/@nexorasolution',
  SITE_WHATSAPP,
]

function cleanPath(path = '/') {
  const value = String(path || '/').split('?')[0].split('#')[0]
  if (!value || value === '/') return '/'
  return `/${value.replace(/^\/+/, '').replace(/\/+$/, '')}`
}

export function canonicalPath(path = '/') {
  const value = String(path || '/')
  const hashIndex = value.indexOf('#')
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value
  const queryIndex = withoutHash.indexOf('?')
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : ''
  const rawPath = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const clean = !rawPath || rawPath === '/' ? '/' : `/${rawPath.replace(/^\/+/, '').replace(/\/+$/, '')}/`
  return `${clean}${search}${hash}`
}

export function absoluteUrl(path = '/') {
  const value = String(path || '')
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value)
    const rawPath = url.pathname || '/'
    const normalizedPath = rawPath === '/' ? '/' : `/${rawPath.replace(/^\/+/, '').replace(/\/+$/, '')}/`
    url.pathname = normalizedPath
    return url.toString()
  }
  return `${SITE_URL}${canonicalPath(value)}`
}

function idFor(path = '/', suffix = '') {
  return `${absoluteUrl(path)}#${suffix}`
}

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject).filter((item) => item !== undefined)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, compactObject(item)])
      .filter(([, item]) => item !== undefined && item !== null && item !== ''),
  )
}

export function createContactPointSchema({
  telephone = SITE_PHONE_E164,
  contactType = 'customer support',
  areaServed = 'PK',
  availableLanguage = ['English', 'Urdu'],
} = {}) {
  return compactObject({
    '@type': 'ContactPoint',
    telephone,
    contactType,
    areaServed,
    availableLanguage,
  })
}

export function createOrganizationSchema() {
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_LOGO,
    description: 'Nexora Solution is a Pakistan software company building POS, ERP, CRM and business management systems.',
    telephone: SITE_PHONE,
    contactPoint: [createContactPointSchema()],
    sameAs: ORGANIZATION_SOCIAL_PROFILES,
    areaServed: {
      '@type': 'Country',
      name: 'Pakistan',
    },
    knowsAbout: ['POS Software', 'ERP Software', 'CRM Software', 'WhatsApp CRM', 'Business Management Software'],
  })
}

export function createWebSiteSchema() {
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-PK',
  })
}

export function createLocalBusinessSchema() {
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#localbusiness`,
    name: SITE_NAME,
    url: SITE_URL,
    image: DEFAULT_LOGO,
    telephone: SITE_PHONE,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PK',
      addressRegion: 'Punjab',
      addressLocality: 'Lahore',
    },
    priceRange: '$$',
    areaServed: 'Pakistan',
    contactPoint: [createContactPointSchema()],
    sameAs: ORGANIZATION_SOCIAL_PROFILES,
  })
}

export function createWebPageSchema({ path = '/', title = SITE_NAME, description = '', image = DEFAULT_LOGO, language = 'en-PK' } = {}) {
  const url = absoluteUrl(path)
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    image,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    inLanguage: language,
  })
}

function labelFromPathSegment(segment = '') {
  return String(segment || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function createBreadcrumbListSchema({ path = '/', title = '' } = {}) {
  const clean = cleanPath(path)
  const segments = clean === '/' ? [] : clean.slice(1).split('/').filter(Boolean)
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: absoluteUrl('/'),
    },
    ...segments.map((segment, index) => {
      const itemPath = `/${segments.slice(0, index + 1).join('/')}`
      return {
        '@type': 'ListItem',
        position: index + 2,
        name: index === segments.length - 1 && title ? title.replace(/\s+\|\s+Nexora.*$/i, '') : labelFromPathSegment(segment),
        item: absoluteUrl(itemPath),
      }
    }),
  ]
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': idFor(clean, 'breadcrumb'),
    itemListElement: items,
  })
}

export function createFAQPageSchema({ path = '/', items = [] } = {}) {
  const questions = (Array.isArray(items) ? items : [])
    .map((item) => (Array.isArray(item) ? { question: item[0], answer: item[1] } : item))
    .filter((item) => item?.question && item?.answer)
  if (!questions.length) return null
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': idFor(path, 'faq'),
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: String(item.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: String(item.answer),
      },
    })),
  })
}

export function createSoftwareApplicationSchema({
  path = '/',
  name = SITE_NAME,
  description = '',
  applicationCategory = 'BusinessApplication',
  operatingSystem = 'Web',
  image = DEFAULT_LOGO,
} = {}) {
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': idFor(path, 'software'),
    name,
    url: absoluteUrl(path),
    description,
    applicationCategory,
    operatingSystem,
    image,
    publisher: { '@id': `${SITE_URL}/#organization` },
    provider: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PKR',
      availability: 'https://schema.org/InStock',
    },
    areaServed: 'Pakistan',
  })
}

export function createArticleSchema({ language = 'en-PK',
  path = '/',
  headline = '',
  description = '',
  image = DEFAULT_LOGO,
  authorName = SITE_NAME,
  authorUrl = SITE_URL,
  datePublished = '',
  dateModified = '',
  category = '',
  tags = [],
  wordCount,
} = {}) {
  const url = absoluteUrl(path)
  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@id': `${url}#webpage` },
    headline,
    description,
    image: absoluteUrl(image),
    datePublished,
    dateModified,
    articleSection: category,
    keywords: Array.isArray(tags) ? tags.join(', ') : tags,
    wordCount,
    inLanguage: language,
    author: {
      '@type': 'Organization',
      name: authorName,
      url: authorUrl,
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
  })
}

export function schemasForPage({ path = '/', title = '', description = '', image = DEFAULT_LOGO, faqItems = [], softwareApplication = null } = {}) {
  return [
    createWebPageSchema({ path, title, description, image }),
    createBreadcrumbListSchema({ path, title }),
    softwareApplication ? createSoftwareApplicationSchema({ path, description, image, ...softwareApplication }) : null,
    faqItems?.length ? createFAQPageSchema({ path, items: faqItems }) : null,
  ].filter(Boolean)
}
