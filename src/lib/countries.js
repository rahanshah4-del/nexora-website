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

    seoTitle: 'Free Invoice Generator & POS for Small Business | Nexora',
    seoDescription: 'Free invoice generator for small business with sales tax lines and PDF download, plus cloud POS and CRM for US small businesses. 1-month free trial.',
    seoKeywords: 'free invoice generator, invoice generator for small business, create invoice for small business, invoice maker software, POS systems for small business, POS system for small businesses, small business software USA, restaurant POS software US, free invoice generator USA, quotation generator, cloud POS for small business, CRM for small business',

    heroHeading: 'Free Invoice Generator &',
    heroHighlight: 'POS for US Small Businesses',
    heroCta: { label: 'Make a free invoice', to: '/tools/invoice-generator' },
    heroSubtitle: 'Create a free invoice with sales tax lines and download it as a PDF today. When you are ready, run your counter and customers on Nexora\'s cloud POS and CRM for small businesses.',

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
        { to: '/peshawar', label: 'POS software in Peshawar' },
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

    seoTitle: 'Free GST Invoice Generator & Billing Software India | Nexora',
    seoDescription: 'Make a free GST invoice with GSTIN, CGST/SGST/IGST and a UPI QR code, then run restaurant POS, billing, CRM and school ERP on Nexora. 1-month free trial.',
    seoKeywords: 'free GST invoice generator, GST invoice bill, GST tax invoice, invoice bill generator, billing software India, restaurant POS software India, billing and inventory software, hotel billing software, retail POS India, school ERP India',

    heroHeading: 'Free GST Invoice Generator &',
    heroHighlight: 'Billing Software for India',
    heroCta: { label: 'Make a free GST invoice', to: '/tools/gst-invoice-generator' },
    heroSubtitle: 'Create a free GST invoice online with your GSTIN, CGST, SGST or IGST and a UPI QR code, and download it as a PDF or Excel file. When one-off bills are not enough, run your counter, kitchen, customers and school on Nexora.',

    whyNexora: 'Nexora is one cloud platform for the counter and the back office: restaurant and retail POS, CRM and ERP modules, with staff roles so each person sees only what they need. The Restaurant POS keeps billing when the internet drops, sends kitchen order tickets to the kitchen and imports your menu from a photo with AI. Start with a 1-month free trial and see the current plans on the pricing page.',

    localEdge: 'The free GST invoice tool opens already set up for India: rupee amounts with lakh and crore grouping, GSTIN fields for you and your client, the title Tax Invoice, GST at 18% that you can change per line, and a UPI QR code for payment. In the Restaurant POS you set your own tax rate and label, and it prints on every bill. Nexora does not file GST returns, create e-invoice (IRN) references or e-way bills, so keep using the government portal or your accountant for those.',

    spotlight: {
      eyebrow: 'Free tool · No signup',
      heading: 'Free GST invoice generator for Indian businesses',
      body: 'Make a GST invoice online in three steps: add your GSTIN, your client, line items and tax lines, then download it as a PDF or Excel file, or share it on WhatsApp. The same free tools include a quotation generator and a thermal receipt generator for 58mm and 80mm printers, so a cash bill or a quote takes minutes. If you are in Coimbatore, see our local page too.',
      links: [
        { to: '/tools/gst-invoice-generator', label: 'Free GST Invoice Generator' },
        { to: '/tools/invoice-generator', label: 'Invoice Generator' },
        { to: '/tools/quotation-generator', label: 'Quotation Generator' },
        { to: '/tools/thermal-receipt-generator', label: 'Thermal Receipt Generator' },
        { to: '/coimbatore', label: 'Software in Coimbatore' },
      ],
    },

    faqs: [
      { q: 'Does Nexora serve businesses in India?', a: 'Yes. Nexora is cloud software you open in a browser — and, for the Restaurant POS, in a Windows app — so you can sign up and start the 1-month free trial from anywhere in India. The interface is in English.' },
      { q: 'Is the GST invoice generator really free?', a: 'Yes. The GST Invoice Generator, Invoice Generator, Quotation Generator and Thermal Receipt Generator are free to use, with no signup. You add your GSTIN, items and tax lines and download a PDF or Excel file.' },
      { q: 'Does it handle CGST, SGST and IGST?', a: 'You choose the tax lines on each invoice: CGST and SGST for a sale inside one state, or IGST for a sale to another state. GST starts at 18% and you can change the rate for any line.' },
      { q: 'Does Nexora file GST returns or create e-invoices?', a: 'No. The tools make the invoice document only. Nexora does not file returns, generate an e-invoice reference number (IRN) or an e-way bill, or look up HSN and SAC codes. Businesses that need those use the government portal or their accountant.' },
      { q: 'Can I put a UPI QR code on my invoice?', a: 'Yes. In the invoice tool, under How to pay, choose UPI (India), enter your UPI ID and the QR code is printed on the invoice.' },
      { q: 'Does the Restaurant POS work if the internet goes down?', a: 'Yes. Orders keep saving on the counter during an internet outage and sync to the cloud when the connection returns. Bills and kitchen copies print on 58mm thermal printers.' },
      { q: 'How much does Nexora cost?', a: 'Every plan starts with a 1-month free trial, so you can set up and try Nexora before you pay. The current plans and prices are on the pricing page.' },
      { q: 'Does Nexora support Hindi?', a: 'The interface is in English. The Nexora AI assistant replies in the language you write to it, including Hindi.' },
    ],

    ctaHeading: 'Ready to try Nexora?',
    ctaSubtext: 'Start a free 1-month trial. No credit card.',
  },
]

/** Helper to get country by slug */
/**
 * Markets Nexora focuses on (owner decision 2026-10-04: Pakistan, the Gulf, and
 * the USA as the priority market for growth; India added 2026-10-11 after its
 * copy was rewritten to match the product). The other country pages stay
 * reachable but are noindex,follow (src/config/noindexPages.js) and are not
 * linked from the footer or HTML sitemap. A page may only be listed here once
 * its copy states things that are true of the product.
 */
export const FEATURED_COUNTRY_SLUGS = ['usa', 'pakistan', 'india']
export const FEATURED_COUNTRIES = FEATURED_COUNTRY_SLUGS.map((slug) => COUNTRIES.find((c) => c.slug === slug)).filter(Boolean)
export const NOINDEX_COUNTRY_PATHS = COUNTRIES.filter((c) => !FEATURED_COUNTRY_SLUGS.includes(c.slug)).map((c) => `/${c.slug}`)

export function getCountry(slug) {
  return COUNTRIES.find(c => c.slug === slug) || null
}
