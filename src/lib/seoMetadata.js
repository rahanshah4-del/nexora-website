const HOST = 'https://nexorasolution.online'
const DEFAULT_OG_IMAGE = `${HOST}/nexora-brand-logo.png`

function buildPage({ path, title, description, keyword, image, section }) {
  return {
    path,
    title,
    description,
    keywords: keyword ? `${keyword}, Nexora Solution, Pakistan software` : 'Nexora Solution, software company, Pakistan',
    canonical: `${HOST}${path}`,
    ogTitle: title,
    ogDescription: description,
    ogImage: image || DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
    robots: 'index,follow',
    section,
  }
}

export const seoMetadata = {
  '/': buildPage({
    path: '/',
    title: 'Nexora POS Software Pakistan | Nexora Solution',
    description: 'Nexora offers Pakistan’s leading POS software for restaurant, retail, school ERP and WhatsApp CRM teams with unified business workflows.',
    keyword: 'POS Software Pakistan',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/services': buildPage({
    path: '/services',
    title: 'Business Management Software Pakistan | Nexora Services',
    description: 'Request Nexora business services for software setup, support, bookkeeping, marketing and growth while keeping your operations running smoothly.',
    keyword: 'Business Management Software',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/business-services': buildPage({
    path: '/services',
    title: 'Business Management Software Pakistan | Nexora Services',
    description: 'Request Nexora business services for software setup, support, bookkeeping, marketing and growth while keeping your operations running smoothly.',
    keyword: 'Business Management Software',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/features': buildPage({
    path: '/features',
    title: 'Nexora Features | POS, CRM, ERP and WhatsApp Software Pakistan',
    description: 'Explore the features behind Nexora POS, CRM, school ERP, WhatsApp automation, transport and retail operations for Pakistani businesses.',
    keyword: 'Business Management Software',
  }),
  '/industries': buildPage({
    path: '/industries',
    title: 'Industry Software Solutions Pakistan | Nexora',
    description: 'See how Nexora serves restaurants, retail, schools, transport and service teams with tailored software workflows and cloud management.',
    keyword: 'ERP Software Pakistan',
  }),
  '/upgrade-business': buildPage({
    path: '/upgrade-business',
    title: 'Upgrade Business Software Pakistan | Nexora',
    description: 'Learn how Nexora can help your business upgrade from manual operations to modern POS, ERP, CRM and WhatsApp-driven workflows in Pakistan.',
    keyword: 'Business Management Software',
  }),
  '/contact': buildPage({
    path: '/contact',
    title: 'Contact WhatsApp CRM and POS Software Pakistan | Nexora Solution',
    description: 'Get in touch with Nexora for a demo, support, pricing or onboarding of POS, ERP, CRM and transport software in Pakistan.',
    keyword: 'WhatsApp CRM',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/about': buildPage({
    path: '/about',
    title: 'About Nexora Solution | Pakistani Software Company',
    description: 'Nexora Solution builds POS, ERP, CRM and business software for Pakistani teams who need modern, reliable operations systems.',
    keyword: 'Software Company Pakistan',
  }),
  '/pricing': buildPage({
    path: '/pricing',
    title: 'Pricing for POS and ERP Software Pakistan | Nexora Solution',
    description: 'Explore Nexora pricing plans for Pakistan businesses with free trial, Free Forever, Standard and Enterprise software options.',
    keyword: 'ERP Software Pakistan',
  }),
  '/privacy-policy': buildPage({
    path: '/privacy-policy',
    title: 'Privacy Policy | Nexora Solution',
    description: 'Review Nexora Solution privacy practices for user data, business information, support contacts and secure SaaS operations.',
    keyword: 'Privacy Policy',
  }),
  '/terms': buildPage({
    path: '/terms',
    title: 'Terms of Service | Nexora Solution',
    description: 'Read Nexora Solution terms of service for software subscriptions, support, payment terms and service usage policies.',
    keyword: 'Terms of Service',
  }),
  '/refund-policy': buildPage({
    path: '/refund-policy',
    title: 'Refund Policy | Nexora Solution',
    description: 'Review Nexora Solution refund and service review policy for subscriptions, setup, business services and custom software work.',
    keyword: 'Refund Policy',
  }),
  '/sitemap': buildPage({
    path: '/sitemap',
    title: 'HTML Sitemap | Nexora Solution',
    description: 'Browse Nexora Solution public pages, software solutions, blog articles, legal pages and SEO feeds from one HTML sitemap.',
    keyword: 'Nexora Sitemap',
  }),
  '/help-center': buildPage({
    path: '/help-center',
    title: 'Help Center | Nexora Solution',
    description: 'Get help with Nexora Solution software, pricing, business services, onboarding, demos and support contact options.',
    keyword: 'Nexora Help Center',
  }),
  '/documentation': buildPage({
    path: '/documentation',
    title: 'Documentation | Nexora Solution',
    description: 'Browse Nexora public documentation for POS, ERP, CRM, WhatsApp CRM, blog guides and support resources.',
    keyword: 'Nexora Documentation',
  }),
  '/projects': buildPage({
    path: '/projects',
    title: 'Software Projects and Use Cases Pakistan | Nexora Solution',
    description: 'Discover Nexora software projects, case studies and business workflows built for restaurants, retail, schools, transport and WhatsApp CRM.',
    keyword: 'Inventory Management Software',
  }),
  '/restaurant-pos': buildPage({
    path: '/restaurant-pos',
    title: 'Restaurant POS Pakistan | Nexora POS Software',
    description: 'Nexora Restaurant POS Pakistan helps restaurants run billing, menus, kitchen display, staff roles and cash reporting with speed.',
    keyword: 'Restaurant POS Pakistan',
  }),
  '/retail-pos': buildPage({
    path: '/retail-pos',
    title: 'Retail POS Software Pakistan | Nexora Retail POS',
    description: 'Nexora Retail POS Software provides barcode sales, inventory control, invoices and retail analytics for Pakistan stores.',
    keyword: 'Retail POS Software',
  }),
  '/school-erp': buildPage({
    path: '/school-erp',
    title: 'School ERP Pakistan | Nexora School Management Software',
    description: 'Nexora School ERP Pakistan organizes students, attendance, fees, exams and communication for modern schools and academies.',
    keyword: 'School ERP Pakistan',
  }),
  '/transport': buildPage({
    path: '/transport',
    title: 'Transport Management Software Pakistan | Nexora Fleet and Rental',
    description: 'Nexora Transport Management Software helps Pakistan fleet and rental teams manage bookings, customers, dues, invoices and reports.',
    keyword: 'Transport Management Software',
  }),
  '/whatsapp-crm': buildPage({
    path: '/whatsapp-crm',
    title: 'WhatsApp CRM Software Pakistan | Nexora WhatsApp CRM',
    description: 'Nexora WhatsApp CRM Pakistan turns conversations into leads, broadcasts, follow-ups and sales workflows for business teams.',
    keyword: 'WhatsApp CRM',
  }),
}

export const solutionPathMap = {
  pos: seoMetadata['/restaurant-pos'],
  'retail-pos': seoMetadata['/retail-pos'],
  'school-erp': seoMetadata['/school-erp'],
  'transport-rental': seoMetadata['/transport'],
  'whatsapp-crm': seoMetadata['/whatsapp-crm'],
}

export function getSeoForPath(pathname) {
  if (seoMetadata[pathname]) return seoMetadata[pathname]
  return seoMetadata['/']
}

export function getSeoForSolutionSlug(slug) {
  return solutionPathMap[slug] || seoMetadata['/']
}
