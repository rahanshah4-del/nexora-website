import { planPriceSentence } from './platformPlans.js'

/**
 * Country landing page configuration.
 * Add one object to `COUNTRIES` array to create a new country page.
 * The CountryPage component automatically renders all sections from this data.
 */

export const COUNTRIES = [
  {
    slug: 'usa',
    name: 'United States',
    flag: '🇺🇸',
    region: 'North America',
    currency: 'USD',
    timezone: 'EST / PST',
    population: '334M',
    businessStyle: 'Enterprise & SMB',

    seoTitle: 'US Small Business Software: POS, CRM & Invoicing | Nexora',
    seoDescription: 'Cloud restaurant POS, CRM and business software for US small businesses, plus a free invoice and quote generator with sales tax lines. 1-month free trial.',
    seoKeywords: 'small business software USA, restaurant POS software US, free invoice generator USA, quotation generator, cloud POS for small business, CRM for small business',

    heroHeading: 'Business Software for',
    heroHighlight: 'US Small Businesses',
    heroSubtitle: 'Cloud restaurant POS, CRM and business tools that run in your browser — plus a free invoice, quote and receipt generator you can use today.',

    whyNexora: 'Nexora is one cloud platform for the counter and the back office: restaurant and retail POS, CRM and ERP modules, with staff roles so each person sees only what they need. The Restaurant POS keeps billing when the internet drops, sends kitchen order tickets to the kitchen and imports your menu from a photo with AI. Start with a 1-month free trial and see the current plans on the pricing page.',

    localEdge: 'Sales tax in the US depends on your state, county and city, so you enter the rate that applies to you — Nexora does not look rates up automatically. On the Restaurant POS you set one tax rate under your own label, such as Sales Tax, and it prints on every bill. The free invoice and quotation tools below let you add a sales tax line and choose United States as your region. Tip tracking is not part of the Restaurant POS yet.',

    spotlight: {
      eyebrow: 'Free tools',
      heading: 'Free invoice and quote generator for US businesses',
      body: 'Create a professional invoice or quotation in three steps, choose United States as your region, add a sales tax line and download it as a PDF or Excel file. You can also make receipts for thermal printers or print on your own letterhead.',
      links: [
        { to: '/tools/invoice-generator', label: 'Free Invoice Generator' },
        { to: '/tools/contractor-invoice-generator', label: 'Contractor Invoice Generator' },
        { to: '/texas', label: 'Texas businesses' },
        { to: '/tools/quotation-generator', label: 'Quotation Generator' },
        { to: '/tools/thermal-receipt-generator', label: 'Thermal Receipt Generator' },
        { to: '/tools/invoice-on-letterhead', label: 'Invoice on Letterhead' },
      ],
    },

    faqs: [
      { q: 'Does Nexora serve businesses in the United States?', a: 'Yes. Nexora is cloud software you open in a browser — and, for the Restaurant POS, in a Windows app — so you can sign up and start the 1-month free trial from anywhere in the US. The interface is in English.' },
      { q: 'How much does Nexora cost?', a: 'Every plan starts with a 1-month free trial, so you can set up and try Nexora before you pay. The current plans and prices are on the pricing page.' },
      { q: 'Are the invoice and quote tools really free?', a: 'Yes. The Invoice Generator, Quotation Generator, Thermal Receipt Generator and Invoice on Letterhead tools are free to use. Choose United States as your region, add a sales tax line and download a PDF or Excel file.' },
      { q: 'Does Nexora handle US sales tax?', a: 'You set one tax rate under your own label, such as Sales Tax, and it prints on receipts and invoices. Because sales tax differs by state, county and city, you enter the rate for your location; Nexora does not look rates up for you. Tip tracking is not part of the Restaurant POS yet.' },
      { q: 'Does the Restaurant POS work if the internet goes down?', a: 'Yes. Orders keep saving on the counter during an internet outage and sync to the cloud when the connection returns.' },
      { q: 'Can I import my restaurant menu instead of typing it?', a: 'Yes. Upload a photo of your menu and Nexora\'s AI reads the items, prices and categories. You review them and import in one step.' },
      { q: 'How do I get help setting up?', a: 'Book a demo on WhatsApp or contact us, and our team will help you set up your menu, tables and staff.' },
    ],

    ctaHeading: 'Ready to try Nexora?',
    ctaSubtext: 'Start a free 1-month trial. No credit card.',
  },
  {
    slug: 'canada',
    name: 'Canada',
    flag: '🇨🇦',
    region: 'North America',
    currency: 'CAD',
    timezone: 'EST / PST',
    population: '39M',
    businessStyle: 'SMB & Enterprise',

    seoTitle: 'Business Software for Canadian Companies | Nexora',
    seoDescription: 'POS, CRM, ERP and custom software for Canadian businesses, plus free invoice tools with HST. One cloud platform with a free first month.',
    seoKeywords: 'business software Canada, POS software Canadian, CRM software Canada, free invoice generator Canada, restaurant POS Canada',

    heroHeading: 'Business Software for',
    heroHighlight: 'Canadian Companies',
    heroSubtitle: 'POS, CRM, ERP and custom software for businesses across Canada, plus free invoice tools. We are a software company from Pakistan and we work with Canadian customers online.',

    whyNexora: 'Nexora is one cloud platform for the counter and the back office: restaurant and retail POS, CRM and ERP modules, with staff roles so each person sees only what they need. Start with a 1-month free trial, or begin with the free invoice tools, which need no signup.',

    localEdge: 'Canadian sales taxes differ by province, so you enter the rate that applies to you; Nexora does not look rates up or file anything with the Canada Revenue Agency. The Restaurant POS applies one tax rate under your own label, such as HST. The platform is English only for now, and plans are priced in Pakistani rupees, so ask us for the current price in Canadian dollars.',

    spotlight: {
      eyebrow: 'Free tools',
      heading: 'Free invoice generator for Canadian businesses',
      body: 'Create an invoice in Canadian dollars, add HST or GST under Taxes and download a PDF or Excel file with no signup. See the Toronto page for local detail.',
      links: [
        { to: '/tools/invoice-generator', label: 'Free Invoice Generator' },
        { to: '/tools/contractor-invoice-generator', label: 'Contractor Invoice Generator' },
        { to: '/toronto', label: 'Toronto businesses' },
        { to: '/tools/quotation-generator', label: 'Quotation Generator' },
      ],
    },

    faqs: [
      { q: 'Does Nexora handle Canadian taxes?', a: 'You add the tax that applies to you, such as 13% HST in Ontario, as a tax line on the invoice or as the POS tax rate. Nexora does not look up provincial rates, split GST and PST automatically or prepare returns for the CRA.' },
      { q: 'How much does Nexora cost in CAD?', a: 'Every plan starts with a 1-month free trial. The pricing page currently shows plans in Pakistani rupees, so message us and we will confirm the current price in Canadian dollars.' },
      { q: 'Do you support French for Quebec businesses?', a: 'Not yet. The interface is in English, so tell us before you sign up if French is essential.' },
      { q: 'Does Nexora have an office in Canada?', a: 'No. Our head office is in Multan, Pakistan, and we support customers online by WhatsApp and email.' },
      { q: 'Is there a free invoice tool for Canadian businesses?', a: 'Yes. The free invoice generator works in Canadian dollars, has no signup or watermark and downloads as PDF or Excel. Your data stays in your browser.' },
    ],

    ctaHeading: 'Ready to scale your Canadian business?',
    ctaSubtext: 'Start a free 1-month trial. No credit card.',
  },
  {
    slug: 'australia',
    name: 'Australia',
    flag: '🇦🇺',
    region: 'Oceania',
    currency: 'AUD',
    timezone: 'AEST',
    population: '26M',
    businessStyle: 'SMB & Hospitality',

    seoTitle: 'Business Software for Australian Companies | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Australian businesses. GST compliant, hospitality-focused, free trial available.',
    seoKeywords: 'business software Australia, POS software Australian, CRM software Sydney, ERP solutions Melbourne, restaurant POS Australia, retail POS Brisbane',

    heroHeading: 'Business Software for',
    heroHighlight: 'Australian Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Australia. GST compliant, hospitality-optimized, with dedicated support during AEST business hours.',

    whyNexora: 'Australian businesses choose Nexora for our hospitality-optimized POS (split bills, surcharge handling, tipping), GST-compliant invoicing, and 3-5x cost advantage. Our AI automation is perfect for restaurants, cafes, and retail chains across Australia.',

    localEdge: 'GST compliant invoicing and reporting. Hospitality-optimized POS with split bills, surcharge, and tipping workflows. Cloud infrastructure with Asia-Pacific edge nodes for sub-50ms Australian latency.',

    faqs: [
      { q: 'Does Nexora handle Australian GST?', a: 'Yes — our POS, invoicing, and ERP modules include 10% GST calculation, GST-registered business number fields, and BAS-ready tax reports. All invoices are GST compliant.' },
      { q: 'Is Nexora suitable for Australian cafes and restaurants?', a: 'Absolutely. Our Restaurant POS supports split bills, weekend/public holiday surcharges, tipping, table management, and EFTPOS integration — all essential for Australian hospitality. 50+ restaurants use it daily.' },
      { q: 'How much does Nexora cost in AUD?', a: 'Plans start at approximately AUD $18/month (Basic), AUD $55/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. Free 1-month trial included.' },
      { q: 'Do you support during AEST business hours?', a: 'Yes — we provide support coverage aligned with Australian Eastern, Central, and Western time zones. 24/7 email and WhatsApp support also available.' },
      { q: 'Can Nexora handle multi-venue hospitality groups?', a: 'Yes — our cloud platform manages multiple venues from one dashboard. Consolidated reporting, centralized menu management, and cross-venue inventory tracking for hospitality groups.' },
    ],

    ctaHeading: 'Ready to grow your Australian business?',
    ctaSubtext: 'Start a free 1-month trial. No credit card.',
  },
  {
    slug: 'qatar',
    name: 'Qatar',
    flag: '🇶🇦',
    region: 'Middle East',
    currency: 'QAR',
    timezone: 'AST (UTC+3)',
    population: '2.9M',
    businessStyle: 'Enterprise & SMB',

    seoTitle: 'ERP Software & POS System in Qatar | Nexora',
    seoDescription: 'ERP software, POS system and CRM for Qatar businesses in Doha. Arabic and English, cloud-based, with a free 1-month trial.',
    seoKeywords: 'ERP software in Qatar, POS system Qatar, ERP software companies in Qatar, business software Qatar, POS software Doha, CRM software Qatar, ERP solutions Qatar, restaurant POS Doha, retail POS Qatar',

    heroHeading: 'ERP Software & POS System for',
    heroHighlight: 'Qatar Businesses',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Doha and all Qatar municipalities. Tax compliant, Arabic/English bilingual, cloud-native architecture.',

    whyNexora: 'Qatar businesses choose Nexora for our enterprise-grade cloud infrastructure, bilingual Arabic/English interface, and AI-powered automation that drives efficiency. Our WhatsApp CRM is essential for Qatar\'s relationship-driven business culture.',

    localEdge: 'Qatar tax-compliant invoicing. Bilingual Arabic/English interface. Cloud infrastructure with Middle East edge nodes. WhatsApp Business API integration for Qatar\'s WhatsApp-first business communication culture.',

    spotlight: {
      eyebrow: 'POS for Qatar',
      heading: 'POS Software Built for Qatar Businesses',
      body: 'Nexora Restaurant POS handles tables, billing, receipts and daily sales, and Nexora Retail POS covers barcode billing, inventory control and store reporting — both available with the same bilingual Arabic/English interface and cloud access already built into Nexora\'s platform for Qatar.',
      links: [
        { to: '/restaurant-pos', label: 'Explore Restaurant POS' },
        { to: '/retail-pos', label: 'Explore Retail POS' },
        { to: '/pricing', label: 'View Pricing' },
      ],
    },

    faqs: [
      { q: 'Is Nexora suitable for Qatar businesses?', a: 'Yes — Nexora serves businesses across Doha, Al Rayyan, Al Wakrah, and all Qatar municipalities. Our platform handles Qatar\'s tax requirements, supports Arabic/English, and integrates with local business workflows.' },
      { q: 'How much does Nexora cost in QAR?', a: 'Plans start at QAR 44/month (Basic), QAR 132/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. All plans include a 1-month free trial.' },
      { q: 'Does Nexora support Arabic language for Qatar?', a: 'Yes — full Arabic/English bilingual interface with RTL support. Our AI speaks Arabic naturally. All documents, invoices, and reports can be generated in Arabic.' },
      { q: 'Is Nexora suitable for Qatar\'s hospitality sector?', a: 'Absolutely. Our Restaurant POS handles the specific needs of Qatar F&B — table management, split bills, service charge, delivery integration, and multi-lingual menus. 50+ restaurants trust our platform.' },
    ],

    ctaHeading: 'Ready to elevate your Qatar business?',
    ctaSubtext: 'Start a free 1-month trial. Arabic/English support. No credit card.',
  },
  {
    slug: 'oman',
    name: 'Oman',
    flag: '🇴🇲',
    region: 'Middle East',
    currency: 'OMR',
    timezone: 'GST (UTC+4)',
    population: '4.5M',
    businessStyle: 'SMB & Enterprise',

    seoTitle: 'ERP Software & POS System in Oman | Nexora',
    seoDescription: 'ERP software, POS system and CRM for Oman businesses in Muscat. Arabic and English, cloud-based, with a free 1-month trial.',
    seoKeywords: 'ERP software in Oman, POS system Oman, business software Oman, POS software Muscat, CRM software Oman, ERP solutions Oman, restaurant POS Muscat, VAT compliant software Oman',

    heroHeading: 'ERP Software & POS System for',
    heroHighlight: 'Oman Businesses',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Muscat and all Oman governorates. Oman VAT compliant, Arabic/English, cloud-native architecture.',

    whyNexora: 'Oman businesses choose Nexora for full Oman VAT (5%) compliance, bilingual Arabic/English interface, and cost-effective pricing. Our AI automation helps Omani companies modernize operations in line with Oman Vision 2040.',

    localEdge: 'Oman VAT (5%) compliant with tax authority-compatible reports. Bilingual Arabic/English interface. Cloud infrastructure with Middle East edge nodes. WhatsApp CRM — essential for Oman\'s business communication.',

    faqs: [
      { q: 'Is Nexora compliant with Oman VAT?', a: 'Yes — our POS, invoicing, and ERP modules include 5% Oman VAT calculation with tax authority-compatible reports. All invoices meet Oman Tax Authority requirements.' },
      { q: 'How much does Nexora cost in OMR?', a: 'Plans start at OMR 4/month (Basic), OMR 12/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. All plans include a 1-month free trial.' },
      { q: 'Does Nexora support Arabic for Oman businesses?', a: 'Yes — full bilingual Arabic/English interface with RTL support. Our AI chatbot communicates naturally in Arabic. All business documents can be generated in Arabic or English.' },
    ],

    ctaHeading: 'Ready to modernize your Oman business?',
    ctaSubtext: 'Start a free 1-month trial. Oman VAT compliant. Arabic/English. No credit card.',
  },
  {
    slug: 'kuwait',
    name: 'Kuwait',
    flag: '🇰🇼',
    region: 'Middle East',
    currency: 'KWD',
    timezone: 'AST (UTC+3)',
    population: '4.3M',
    businessStyle: 'Enterprise & SMB',

    seoTitle: 'Business Software Kuwait | POS, CRM, ERP | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Kuwait businesses in Kuwait City. Arabic/English, cloud-native platform.',
    seoKeywords: 'business software Kuwait, POS software Kuwait City, CRM software Kuwait, ERP solutions Kuwait, restaurant POS Kuwait, retail POS Kuwait',

    heroHeading: 'Business Software for',
    heroHighlight: 'Kuwait Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Kuwait City and all governorates. Arabic/English bilingual, cloud-native, enterprise-grade security.',

    whyNexora: 'Kuwait businesses choose Nexora for our enterprise-grade cloud infrastructure, bilingual Arabic/English interface, and AI-powered automation. Our WhatsApp CRM aligns perfectly with Kuwait\'s mobile-first business communication culture.',

    localEdge: 'Kuwait tax-compatible invoicing. Bilingual Arabic/English interface. Cloud infrastructure with Middle East edge nodes. WhatsApp Business API — critical for Kuwait\'s 99% WhatsApp penetration rate.',

    faqs: [
      { q: 'Is Nexora suitable for Kuwait businesses?', a: 'Yes — Nexora serves businesses across Kuwait City, Hawalli, Farwaniya, and all Kuwait governorates. Our platform supports Arabic/English, handles Kuwait\'s business requirements, and integrates with local workflows.' },
      { q: 'How much does Nexora cost in KWD?', a: 'Plans start at KWD 4/month (Basic), KWD 11/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. All plans include a 1-month free trial.' },
      { q: 'Does Nexora support Arabic language?', a: 'Yes — full Arabic/English bilingual interface with RTL support. Our AI speaks Arabic fluently. All business documents can be generated in Arabic or English.' },
      { q: 'Can Nexora handle large Kuwait restaurant groups?', a: 'Absolutely. Our multi-branch Restaurant POS supports 50+ locations with centralized management, consolidated reporting, and AI-powered analytics — ideal for Kuwait\'s growing F&B sector.' },
    ],

    ctaHeading: 'Ready to transform your Kuwait business?',
    ctaSubtext: 'Start a free 1-month trial. Arabic/English. No credit card.',
  },
  {
    slug: 'pakistan',
    name: 'Pakistan',
    flag: '🇵🇰',
    region: 'South Asia',
    currency: 'PKR',
    timezone: 'PKT (UTC+5)',
    population: '241M',
    businessStyle: 'SMB & Enterprise',

    seoTitle: 'Best Business Software in Pakistan | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and business software for Pakistan. Restaurant POS, retail, school ERP, WhatsApp CRM. Free trial.',
    seoKeywords: 'business software Pakistan, POS software Pakistan, CRM software Lahore, ERP solutions Karachi, restaurant POS Islamabad, retail POS Pakistan, school ERP Pakistan',

    heroHeading: 'Business Software for',
    heroHighlight: 'Pakistani Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software built for Pakistani businesses. Urdu/English support, offline-first, local payment gateways, and 50+ successful implementations across Pakistan.',

    whyNexora: 'Pakistani businesses choose Nexora because we are built in Pakistan for Pakistan. Urdu/English bilingual, offline-first (works without internet), local payment methods (JazzCash, Easypaisa), and priced for the Pakistani market. 50+ businesses from Karachi to Peshawar trust Nexora.',

    localEdge: 'Urdu/English bilingual interface with Roman Urdu AI chatbot. Offline-first POS — keeps billing during load shedding. Record JazzCash, Easypaisa, bank transfer, card and cash payments. Pakistan-based support team. Built for Pakistani business realities.',

    faqs: [
      { q: 'Where is Nexora based in Pakistan?', a: 'Nexora Solution is a Pakistani software company serving businesses across Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Peshawar, Quetta, Multan, and all major cities. We understand Pakistani business challenges deeply.' },
      { q: 'Does Nexora work without internet (offline)?', a: 'Yes — our POS modules are offline-first. You can keep billing even during load shedding or internet downtime. All data syncs automatically when you reconnect. This is a core feature built for Pakistani business realities.' },
      { q: 'What Pakistani payment methods does Nexora support?', a: 'Your POS records cash, card, JazzCash, Easypaisa and bank transfer payments. Nexora subscriptions can be paid by JazzCash, Easypaisa or bank transfer.' },
      { q: 'Does Nexora support Urdu language?', a: 'Ji bilkul! Our AI chatbot speaks Roman Urdu naturally ("aap", "ji", "shukriya"). Our interface is Urdu/English bilingual. We are building Urdu script (نستعلیق) support for future releases.' },
      { q: 'How much does Nexora cost in Pakistan?', a: `${planPriceSentence()} All plans include 1-month free trial, free setup, free data migration, and free staff training.` },
      { q: 'Which Pakistani businesses use Nexora?', a: '50+ businesses across Pakistan use Nexora — including a 40-table restaurant in Karachi, a 3-branch retail chain in Lahore, and a 1,200-student school in Islamabad. We serve restaurants, retail stores, schools, and service businesses nationwide.' },
    ],

    spotlight: {
      eyebrow: 'Head office',
      heading: 'Nexora is based in Multan',
      body: 'Our head office is in Multan. If your business is in Multan, see the local page: which module fits a restaurant, shop, pharmacy or school in the city, how pricing works in rupees, and how to start the free month.',
      links: [
        { to: '/multan', label: 'Software company in Multan' },
        { to: '/lahore', label: 'Pharmacy software in Lahore' },
        { to: '/islamabad', label: 'Property software in Islamabad' },
        { to: '/karachi', label: 'Rent a car software in Karachi' },
        { to: '/pricing', label: 'View pricing' },
      ],
    },

    ctaHeading: 'Ready to grow your Pakistani business?',
    ctaSubtext: 'Start a free 1-month trial. PKR pricing. Urdu support. No credit card.',
  },
  {
    slug: 'india',
    name: 'India',
    flag: '🇮🇳',
    region: 'South Asia',
    currency: 'INR',
    timezone: 'IST (UTC+5:30)',
    population: '1.4B',
    businessStyle: 'SMB & Enterprise',

    seoTitle: 'Business Software India | POS, CRM, ERP | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Indian businesses. GST compliant, multi-language. Serving Mumbai, Delhi & Bangalore.',
    seoKeywords: 'business software India, POS software Mumbai, CRM software Delhi, ERP solutions Bangalore, restaurant POS India, retail POS India, GST compliant software India, school ERP India',

    heroHeading: 'Business Software for',
    heroHighlight: 'Indian Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Mumbai, Delhi, Bangalore, and all Indian states. GST compliant, multi-language, built for Indian scale.',

    whyNexora: 'Indian businesses choose Nexora for full GST compliance, cost-effective pricing (5-10x more affordable than domestic alternatives), and AI-powered automation that handles India\'s scale. Our platform serves businesses from startups to enterprises across all Indian states.',

    localEdge: 'Full GST compliant invoicing with HSN/SAC codes, CGST/SGST/IGST calculation, and GSTR-1/GSTR-3B compatible reports. Multi-language support (English, Hindi, regional). Cloud infrastructure with Mumbai edge nodes. WhatsApp Business API for India\'s WhatsApp-first commerce.',

    faqs: [
      { q: 'Is Nexora GST compliant for Indian businesses?', a: 'Yes — our POS, invoicing, and ERP modules include full GST compliance: HSN/SAC codes, CGST/SGST/IGST auto-calculation, GSTIN validation, and GSTR-1/GSTR-3B compatible tax reports. E-invoicing support for applicable businesses.' },
      { q: 'How much does Nexora cost in INR?', a: 'Plans start at approximately ₹830/month (Basic), ₹2,500/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. This is 5-10x more affordable than comparable Indian SaaS products. Free 1-month trial included.' },
      { q: 'Does Nexora support Indian languages?', a: 'Yes — our AI chatbot supports Hindi (रोमन और देवनागरी), English, and regional languages. We are expanding multi-language interface support. WhatsApp CRM supports Hindi and English templates.' },
      { q: 'Can Nexora handle India-scale operations?', a: 'Absolutely. Our cloud-native architecture scales horizontally to handle thousands of transactions per minute. Multi-branch, multi-GSTIN, multi-currency — built for Indian business complexity from Kirana stores to enterprise chains.' },
      { q: 'Does Nexora support Indian payment gateways?', a: 'Yes — we integrate with Razorpay, Paytm, PhonePe, Google Pay, UPI, and major Indian bank gateways. All payment flows are PCI-DSS compliant with secure tokenization.' },
      { q: 'Is Nexora suitable for Indian restaurants (cloud kitchens, QSR, dine-in)?', a: 'Yes — our Restaurant POS supports all Indian F&B models: cloud kitchens (Zomato/Swiggy integration), QSR chains, fine dining, and cafe chains. Features include KOT, table management, GST billing, and AI sales analytics.' },
    ],

    ctaHeading: 'Ready to scale your Indian business?',
    ctaSubtext: 'Start a free 1-month trial. GST compliant. INR pricing. No credit card.',
  },
]

/** Helper to get country by slug */
/**
 * Markets Nexora focuses on (owner decision 2026-10-04: Pakistan, the Gulf, and
 * the USA as the priority market for growth). The other country pages stay
 * reachable but are noindex,follow (src/config/noindexPages.js) and are not
 * linked from the footer or HTML sitemap. A page may only be listed here once
 * its copy states things that are true of the product.
 */
export const FEATURED_COUNTRY_SLUGS = ['usa', 'pakistan']
export const FEATURED_COUNTRIES = FEATURED_COUNTRY_SLUGS.map((slug) => COUNTRIES.find((c) => c.slug === slug)).filter(Boolean)
export const NOINDEX_COUNTRY_PATHS = COUNTRIES.filter((c) => !FEATURED_COUNTRY_SLUGS.includes(c.slug)).map((c) => `/${c.slug}`)

export function getCountry(slug) {
  return COUNTRIES.find(c => c.slug === slug) || null
}
