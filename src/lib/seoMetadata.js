import { absoluteUrl } from './seoStructuredData.js'

const HOST = 'https://nexorasolution.online'
const DEFAULT_OG_IMAGE = `${HOST}/nexora-brand-logo.png`

function buildPage({ path, title, description, keyword, image, section, ...extra }) {
  return {
    path,
    title,
    description,
    keywords: keyword ? `${keyword}, Nexora Solution, Pakistan software` : 'Nexora Solution, software company, Pakistan',
    canonical: absoluteUrl(path),
    ogTitle: title,
    ogDescription: description,
    ogImage: image || DEFAULT_OG_IMAGE,
    twitterCard: 'summary_large_image',
    robots: 'index,follow',
    section,
    ...extra,
  }
}

export const seoMetadata = {
  '/': buildPage({
    path: '/',
    title: 'Nexora Solution — POS, ERP & CRM Software Pakistan | Free 1-Month Trial',
    description: 'Nexora is Pakistan\'s #1 AI-powered POS, ERP & CRM software for restaurants, retail stores, schools and businesses. Free 1-month trial. PKR pricing. Works offline. Local support. Try free today.',
    keyword: 'POS Software Pakistan',
    image: `${HOST}/nexora-brand-logo.png`,
    softwareApplication: {
      name: 'Nexora Business Suite',
      description: 'AI-powered business operating system for restaurants, retail, pharmacy, CRM and ERP — POS, billing, inventory, school management, transport, WhatsApp CRM and property ERP.',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
    },
    faqItems: [
      { question: 'What is Nexora Solution?', answer: 'Nexora Solution is Pakistan\'s AI-powered business operating system offering POS, CRM, ERP and automation software for restaurants, retail stores, pharmacies, schools, transport fleets and growing enterprises — all from one unified platform.' },
      { question: 'Who is Nexora built for?', answer: 'Nexora is built for Pakistani businesses of every size — from a single-counter restaurant or retail shop to multi-branch schools, pharmacy chains and transport fleets. Our modules adapt to your workflow, not the other way around.' },
      { question: 'What does Nexora cost?', answer: 'Plans start at PKR 1,000/month (50% off for new users). Every plan includes a 1-month free trial, cloud sync, free updates, free data migration, free staff training and a 30-day money-back guarantee. Yearly billing saves 20%. Enterprise plans are custom-priced.' },
      { question: 'Does Nexora work offline?', answer: 'The POS modules support offline mode so you can keep billing even when the internet is down. Once you reconnect, all data syncs automatically to the cloud.' },
      { question: 'How do I get started?', answer: 'Sign up for a free 1-month trial at nexorasolution.online/signup — no credit card required. Or book a live demo and our team will walk you through the modules that fit your business.' },
    ],
  }),
  '/services': buildPage({
    path: '/business-services/',
    title: 'Business Management Software Pakistan | Nexora Services',
    description: 'Request Nexora business services for software setup, support, bookkeeping, marketing and growth while keeping your operations running smoothly.',
    keyword: 'Business Management Software',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/business-services': buildPage({
    path: '/business-services/',
    title: 'Business Management Software Pakistan | Nexora Business Services',
    description: 'Request Nexora business services for software setup, support, bookkeeping, marketing and growth while keeping your operations running smoothly.',
    keyword: 'Business Management Software',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/software-development': buildPage({
    path: '/software-development',
    title: 'Custom Software Development Services | Nexora Solution',
    description: 'Professional custom software development — business websites, e-commerce, CRM, ERP, POS, mobile apps, AI solutions, API integration, and cloud services. Build with Nexora.',
    keyword: 'Custom Software Development Pakistan, Software Development Services, Web Development, Mobile App Development, CRM Development, ERP Solutions Pakistan',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/seo-services': buildPage({
    path: '/seo-services',
    title: 'SEO Services Pakistan | Google Ranking & Organic Traffic | Nexora',
    description: 'Professional SEO services — technical SEO, on-page optimization, keyword research, content strategy, link building, and local SEO. Get ranked on Google and grow organic traffic.',
    keyword: 'SEO Services Pakistan, Google Ranking, Search Engine Optimization, Local SEO, Technical SEO, Content Marketing',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/mobile-app-development': buildPage({
    path: '/mobile-app-development',
    title: 'Mobile App Development | iOS & Android Apps | Nexora Solution',
    description: 'Custom mobile app development for iOS and Android. Flutter, Swift, Kotlin — beautiful UI, offline-first, AI-powered features, push notifications, and seamless backend integration.',
    keyword: 'Mobile App Development Pakistan, iOS App Development, Android App Development, Flutter Development, Cross-Platform Apps',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/ecommerce-development': buildPage({
    path: '/ecommerce-development',
    title: 'E-commerce Development | Online Store Development | Nexora',
    description: 'Custom e-commerce website development with secure payments, inventory management, order tracking, admin dashboard, and mobile commerce. Built to sell 24/7.',
    keyword: 'E-commerce Development Pakistan, Online Store Development, Ecommerce Website, Shopping Cart Development',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/crm-development': buildPage({
    path: '/crm-development',
    title: 'Custom CRM Development | Tailored CRM Software | Nexora',
    description: 'Custom CRM development tailored to your sales workflow. Lead management, visual pipeline, WhatsApp integration, automation, mobile CRM, and sales analytics.',
    keyword: 'Custom CRM Development Pakistan, CRM Software, Sales Pipeline, Lead Management, WhatsApp CRM',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/erp-development': buildPage({
    path: '/erp-development',
    title: 'ERP Solutions | Enterprise Resource Planning | Nexora',
    description: 'Custom ERP solutions unifying finance, HR, inventory, procurement, and operations. Real-time dashboards, multi-branch, cloud-native architecture.',
    keyword: 'ERP Solutions Pakistan, Enterprise Resource Planning, Custom ERP Development, Business Management Software',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/cloud-solutions': buildPage({
    path: '/cloud-solutions',
    title: 'Cloud Solutions | DevOps & Serverless Architecture | Nexora',
    description: 'Cloud migration, serverless architecture, CI/CD pipelines, managed hosting on Cloudflare, AWS, Google Cloud. Enterprise security, global CDN, 24/7 support.',
    keyword: 'Cloud Solutions Pakistan, Cloud Migration, Serverless Architecture, DevOps, Cloudflare, AWS',
    image: `${HOST}/nexora-brand-logo.png`,
  }),
  '/usa': buildPage({ path: '/usa', title: 'Business Software for US Companies | POS, CRM, ERP | Nexora Solution', description: 'Nexora provides AI-powered POS, CRM, ERP, and custom software development for US businesses. Restaurant POS, retail management, school ERP, and enterprise solutions.', keyword: 'business software USA, POS software United States, CRM software America, ERP solutions US' }),
  '/uk': buildPage({ path: '/uk', title: 'Business Software for UK Companies | POS, CRM, ERP | Nexora Solution', description: 'AI-powered POS, CRM, ERP and custom software development for UK businesses. Restaurant POS, retail management, school MIS, and enterprise solutions. GDPR compliant.', keyword: 'business software UK, POS software United Kingdom, CRM software Britain, ERP solutions UK' }),
  '/canada': buildPage({ path: '/canada', title: 'Business Software for Canadian Companies | POS, CRM, ERP | Nexora', description: 'AI-powered POS, CRM, ERP and custom software for Canadian businesses. Bilingual support, PIPEDA compliant, GST/HST ready. Restaurant POS, retail management, school ERP.', keyword: 'business software Canada, POS software Canadian, CRM software Canada, ERP solutions Toronto' }),
  '/australia': buildPage({ path: '/australia', title: 'Business Software for Australian Companies | POS, CRM, ERP | Nexora', description: 'AI-powered POS, CRM, ERP and custom software for Australian businesses. GST compliant, hospitality-focused. Restaurant POS, retail management, school ERP.', keyword: 'business software Australia, POS software Australian, CRM software Sydney, ERP solutions Melbourne' }),
  '/uae': buildPage({ path: '/uae', title: 'Business Software UAE | POS, CRM, ERP Dubai Abu Dhabi | Nexora', description: 'Leading AI-powered POS, CRM, ERP and custom software for UAE businesses in Dubai, Abu Dhabi, Sharjah. VAT compliant, Arabic/English, cloud-native.', keyword: 'business software UAE, POS software Dubai, CRM software Abu Dhabi, ERP solutions UAE, VAT compliant software UAE' }),
  '/saudi-arabia': buildPage({ path: '/saudi-arabia', title: 'Business Software Saudi Arabia | POS, CRM, ERP Riyadh Jeddah | Nexora', description: 'AI-powered POS, CRM, ERP and custom software for Saudi businesses. ZATCA compliant, Arabic-first, Vision 2030 ready. Restaurant POS & enterprise solutions.', keyword: 'business software Saudi Arabia, POS software Riyadh, CRM software Jeddah, ERP solutions KSA, ZATCA compliant software' }),
  '/bahrain': buildPage({ path: '/bahrain', title: 'Business Software Bahrain | POS, CRM, ERP Manama | Nexora Solution', description: 'AI-powered POS, CRM, ERP and custom software for Bahrain businesses. VAT compliant, Arabic/English, cloud-native. Restaurant POS, retail, and enterprise solutions.', keyword: 'business software Bahrain, POS software Manama, CRM software Bahrain, ERP solutions Bahrain' }),
  '/qatar': buildPage({ path: '/qatar', title: 'Business Software Qatar | POS, CRM, ERP Doha | Nexora Solution', description: 'AI-powered POS, CRM, ERP and custom software for Qatar businesses. Tax compliant, Arabic/English, cloud-native. Restaurant POS, retail, and enterprise solutions in Doha.', keyword: 'business software Qatar, POS software Doha, CRM software Qatar, ERP solutions Qatar' }),
  '/oman': buildPage({ path: '/oman', title: 'Business Software Oman | POS, CRM, ERP Muscat | Nexora Solution', description: 'AI-powered POS, CRM, ERP and custom software for Oman businesses. VAT compliant, Arabic/English, cloud-native. Restaurant POS, retail, and enterprise solutions in Muscat.', keyword: 'business software Oman, POS software Muscat, CRM software Oman, ERP solutions Oman' }),
  '/kuwait': buildPage({ path: '/kuwait', title: 'Business Software Kuwait | POS, CRM, ERP Kuwait City | Nexora', description: 'AI-powered POS, CRM, ERP and custom software for Kuwait businesses. Arabic/English, cloud-native. Restaurant POS, retail, and enterprise solutions in Kuwait City.', keyword: 'business software Kuwait, POS software Kuwait City, CRM software Kuwait, ERP solutions Kuwait' }),
  '/pakistan': buildPage({ path: '/pakistan', title: 'Best Business Software in Pakistan | POS, CRM, ERP | Nexora Solution', description: 'Pakistan\'s leading AI-powered POS, CRM, ERP & business software. Restaurant POS, retail management, school ERP, WhatsApp CRM. 50+ businesses trust Nexora.', keyword: 'business software Pakistan, POS software Pakistan, CRM software Lahore, ERP solutions Karachi, restaurant POS Islamabad' }),
  '/india': buildPage({ path: '/india', title: 'Business Software India | POS, CRM, ERP Mumbai Delhi Bangalore | Nexora', description: 'AI-powered POS, CRM, ERP and custom software for Indian businesses. GST compliant, multi-language, cloud-native. Restaurant POS, retail, school ERP. Serving across India.', keyword: 'business software India, POS software Mumbai, CRM software Delhi, ERP solutions Bangalore, GST compliant software India' }),
  '/api-integration': buildPage({
    path: '/api-integration',
    title: 'API Integration Services | Connect Your Software | Nexora',
    description: 'Professional API integration — payment gateways, WhatsApp Business API, SMS, shipping carriers, legacy systems. RESTful APIs, webhooks, real-time sync.',
    keyword: 'API Integration Pakistan, Payment Gateway Integration, WhatsApp API, REST API Development, Webhook Integration',
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
  '/faq': buildPage({
    path: '/faq',
    title: 'FAQ | Nexora Solution',
    description: 'Get answers to frequently asked questions about Nexora POS, CRM, ERP, pricing, and business software in Pakistan.',
    keyword: 'Nexora FAQ',
  }),
  '/support-center': buildPage({
    path: '/support-center',
    title: 'Support Center | Nexora Solution',
    description: 'Get support for Nexora POS, CRM, ERP and business software. Contact us via WhatsApp, email, or browse documentation.',
    keyword: 'Nexora Support Center',
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
  '/solutions/crm': buildPage({
    path: '/solutions/crm',
    title: 'CRM Software Pakistan | Nexora CRM System',
    description: 'Nexora CRM helps Pakistani businesses track leads, customers, invoices, tasks and sales teams from one cloud dashboard.',
    keyword: 'CRM Software Pakistan',
  }),
  '/solutions/property-erp': buildPage({
    path: '/solutions/property-erp',
    title: 'Property ERP Software Pakistan | Nexora Property Management',
    description: 'Nexora Property ERP Pakistan helps agencies manage tenants, rent collection, leases, maintenance and owner reporting.',
    keyword: 'Property ERP Software',
  }),
  '/solutions/medical-store-pos': buildPage({
    path: '/solutions/medical-store-pos',
    title: 'Medical Store POS Pakistan | Nexora Pharmacy Software',
    description: 'Nexora Medical Store POS Pakistan handles pharmacy billing, medicine inventory, batch expiry control and daily sales reports.',
    keyword: 'Medical Store POS Pakistan',
  }),
  '/solutions/reports': buildPage({
    path: '/solutions/reports',
    title: 'Business Reports Software Pakistan | Nexora Analytics',
    description: 'Nexora Reports Pakistan provides KPI dashboards, PDF reports, Excel exports and business intelligence for growing teams.',
    keyword: 'Business Reports Software',
  }),
  '/solutions/email-marketing': buildPage({
    path: '/solutions/email-marketing',
    title: 'Email Marketing Software Pakistan | Nexora Campaigns',
    description: 'Nexora Email Marketing helps Pakistani businesses send campaigns, track opens, manage subscribers and grow engagement.',
    keyword: 'Email Marketing Software Pakistan',
  }),
  '/solutions/inventory-management': buildPage({
    path: '/solutions/inventory-management',
    title: 'Inventory Management Software Pakistan | Nexora Stock Control',
    description: 'Nexora Inventory Management helps Pakistan businesses track stock, purchases, suppliers and warehouse movement.',
    keyword: 'Inventory Management Software Pakistan',
  }),
  '/solutions/team-permissions': buildPage({
    path: '/solutions/team-permissions',
    title: 'Team Management Software Pakistan | Nexora Permissions',
    description: 'Nexora Team & Permissions helps Pakistani businesses control roles, access rights and team member visibility.',
    keyword: 'Team Management Software Pakistan',
  }),
  '/solutions/reports-analytics': buildPage({
    path: '/solutions/reports-analytics',
    title: 'Reports and Analytics Software Pakistan | Nexora BI',
    description: 'Nexora Reports & Analytics provides KPI dashboards, BI tools, PDF exports and business insights for Pakistani teams.',
    keyword: 'Business Analytics Software Pakistan',
  }),
}

export const solutionPathMap = {
  pos: seoMetadata['/restaurant-pos'],
  'retail-pos': seoMetadata['/retail-pos'],
  'school-erp': seoMetadata['/school-erp'],
  'transport-rental': seoMetadata['/transport'],
  'whatsapp-crm': seoMetadata['/whatsapp-crm'],
  crm: seoMetadata['/solutions/crm'],
  'property-erp': seoMetadata['/solutions/property-erp'],
  'medical-store-pos': seoMetadata['/solutions/medical-store-pos'],
  reports: seoMetadata['/solutions/reports'],
  'email-marketing': seoMetadata['/solutions/email-marketing'],
  'inventory-management': seoMetadata['/solutions/inventory-management'],
  'team-permissions': seoMetadata['/solutions/team-permissions'],
  'reports-analytics': seoMetadata['/solutions/reports-analytics'],
}

export function getSeoForPath(pathname) {
  if (seoMetadata[pathname]) return seoMetadata[pathname]
  return seoMetadata['/']
}

export function getSeoForSolutionSlug(slug) {
  return solutionPathMap[slug] || seoMetadata['/']
}
