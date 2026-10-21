// Shared by src/pages/public/AboutPage.jsx and scripts/prerender.mjs (static
// HTML for crawlers), so the About page reads the same with or without JS.

export const aboutHeadline = 'Nexora Solution builds cloud POS, ERP and CRM software for businesses worldwide.'
export const aboutIntro = 'We are a software company based in Multan, Pakistan. We build modern business software that helps restaurants, retail stores, schools, transport operations and sales teams move faster with fewer manual tasks.'

export const companyCards = [
  { title: 'Software company in Multan, Pakistan', text: 'Nexora Solution builds cloud business software for POS, ERP, CRM, transport, school and WhatsApp-led operations.' },
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
  { value: 'Worldwide', label: 'Cloud software you can start from anywhere, with Pakistan as our home market' },
  { value: 'Multi-module', label: 'POS, ERP, CRM, transport and WhatsApp workflows' },
  { value: 'Owner-led', label: 'Built for visibility, permissions and accountability' },
]

// Longer-form sections for the About page. Everything here is a fact already
// stated elsewhere on the site or visible in the product; no customer counts,
// founding year or other numbers are claimed.
export const aboutSections = [
  {
    heading: 'Who builds Nexora',
    paragraphs: [
      'Nexora Solution is a founder-led software company. Rahan Shah, founder and CEO, builds the platform himself, from the restaurant POS desktop app to the school ERP, and writes about what he learns implementing software for real businesses. You can read his profile and articles on our author page.',
      'The team works from Multan, Punjab, Pakistan. Product engineering, implementation support and business operations sit close together, so the people who hear a customer problem are the same people who can change the software.',
    ],
  },
  {
    heading: 'What we build',
    paragraphs: [
      'Nexora is one cloud workspace with separate modules, so a business only switches on what it needs. Restaurant POS covers tables, kitchen orders, menus and receipts. Retail POS covers billing, barcodes, discounts, customer records and store reports. Pharmacy POS adds medicine inventory with batch and expiry tracking and supplier purchases.',
      'School ERP handles admissions, student records, attendance, fee management and payroll. Property ERP and Transport and Fleet management cover rentals, bookings, customer ledgers and dues. CRM and WhatsApp CRM keep leads, follow-ups, invoices and customer conversations in one place, with an AI assistant to answer questions about the product.',
    ],
  },
  {
    heading: 'How the platform is built',
    paragraphs: [
      'Each business gets its own workspace, and staff see only what their role allows: owners get full visibility, while cashiers, teachers or sales staff get the permissions you assign. Sign-in supports passkeys as well as email and password. The software runs in the cloud on Google Firebase and Cloudflare infrastructure, so there is nothing to host yourself, and a Windows desktop app is available for restaurant counters.',
    ],
  },
  {
    heading: 'Free tools and guides',
    paragraphs: [
      'Alongside the paid software we publish free tools that anyone can use without an account, including invoice, receipt and quotation generators and GeoLint, an audit that checks whether AI crawlers can read a website. Our blog explains the same topics in plain language: how to create an invoice, how POS billing works, and how to choose business software.',
    ],
  },
  {
    heading: 'Who we work with',
    paragraphs: [
      'Pakistan is our home market, so Nexora supports local workflows such as PKR pricing and WhatsApp-led operations. The software is cloud-based, so businesses elsewhere can use it too. Every new business account starts with a free 30-day trial, and our team helps with setup, data preparation and the first workflow launch over WhatsApp or email.',
    ],
  },
]
