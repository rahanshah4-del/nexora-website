// Shared by src/pages/public/AboutPage.jsx and scripts/prerender.mjs (static
// HTML for crawlers), so the About page reads the same with or without JS.

export const companyCards = [
  { title: 'Software company in Pakistan', text: 'Nexora Solution builds cloud business software for POS, ERP, CRM, transport, school and WhatsApp-led operations.' },
  { title: 'Business-first product thinking', text: 'Every module is designed around daily owner visibility, staff access, records, reports and practical workflows.' },
  { title: 'Support for growing teams', text: 'We help businesses move from scattered manual work into one shared workspace with guided onboarding and support.' },
]

export const team = [
  { title: 'Product & Engineering', text: 'Builds Nexora platform features, security controls, public website systems and business modules.' },
  { title: 'Implementation Support', text: 'Guides setup, onboarding, data preparation, staff roles and first workflow launch.' },
  { title: 'Business Operations', text: 'Supports service requests, client communication, reviews, proposals and ongoing coordination.' },
]

export const trustSignals = [
  { value: '2019-2026', label: 'Business software experience timeline' },
  { value: 'Pakistan', label: 'Area served and local market focus' },
  { value: 'Multi-module', label: 'POS, ERP, CRM, transport and WhatsApp workflows' },
  { value: 'Owner-led', label: 'Built for visibility, permissions and accountability' },
]
