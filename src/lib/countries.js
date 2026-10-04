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
    slug: 'uk',
    name: 'United Kingdom',
    flag: '🇬🇧',
    region: 'Europe',
    currency: 'GBP',
    timezone: 'GMT / BST',
    population: '67M',
    businessStyle: 'SME & Enterprise',

    seoTitle: 'Business Software for UK Companies | POS, CRM, ERP',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for UK businesses. Restaurant POS, retail management, school MIS. GDPR compliant.',
    seoKeywords: 'business software UK, POS software United Kingdom, CRM software Britain, ERP solutions UK, restaurant POS London, retail POS UK, GDPR compliant software',

    heroHeading: 'Business Software for',
    heroHighlight: 'UK Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software solutions for British businesses. GDPR-compliant, cloud-native, with dedicated UK support. Trusted across England, Scotland, Wales & NI.',

    whyNexora: 'UK businesses choose Nexora for our full GDPR compliance, cost-effective pricing (3x more affordable than domestic alternatives), and AI-powered automation that reduces operational costs by 30-50%. Our cloud infrastructure ensures fast performance across the UK.',

    localEdge: 'Fully GDPR compliant with data processing agreements available. Our infrastructure includes European data residency options. UK-specific VAT handling and Making Tax Digital (MTD) compatible invoicing.',

    faqs: [
      { q: 'Is Nexora GDPR compliant for UK businesses?', a: 'Yes — Nexora is fully GDPR compliant. We provide Data Processing Agreements (DPA), maintain data encryption at rest and in transit, and offer EU/UK data residency options. Our infrastructure partners (Google Cloud, Cloudflare) are GDPR and ISO 27001 certified.' },
      { q: 'Do you support UK VAT and Making Tax Digital?', a: 'Yes. Our invoicing and billing modules support UK VAT rates, VAT registration numbers, and are compatible with HMRC\'s Making Tax Digital (MTD) requirements. We generate MTD-compliant digital records.' },
      { q: 'How much does Nexora cost in GBP?', a: 'Plans start at approximately £10/month (Basic), £30/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. All plans include a 1-month free trial and free data migration.' },
      { q: 'Do you have UK-based support?', a: 'We provide support during UK business hours (GMT/BST). Enterprise customers get a dedicated account manager. 24/7 email and WhatsApp support is also available for all plans.' },
      { q: 'Can Nexora integrate with UK accounting software?', a: 'Yes — we integrate with Xero, QuickBooks, Sage, FreeAgent, and most UK accounting platforms. Our API allows seamless connection with your existing financial stack.' },
      { q: 'Is Nexora suitable for UK restaurant and retail businesses?', a: 'Absolutely. Our Restaurant POS supports split bills, service charge, VAT, and tipping workflows common in UK hospitality. Retail POS handles GBP pricing, VAT receipts, and barcode scanning used in British retail.' },
    ],

    ctaHeading: 'Ready to grow your UK business?',
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
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Canadian businesses. Bilingual support, PIPEDA compliant, GST/HST ready.',
    seoKeywords: 'business software Canada, POS software Canadian, CRM software Canada, ERP solutions Toronto, restaurant POS Canada, retail POS Vancouver',

    heroHeading: 'Business Software for',
    heroHighlight: 'Canadian Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Canada. PIPEDA compliant, GST/HST ready, with bilingual English/French support capabilities.',

    whyNexora: 'Canadian businesses choose Nexora for PIPEDA-compliant infrastructure, GST/HST/PST tax handling, and 3-5x cost advantage over domestic vendors. Our AI automation helps businesses from Toronto to Vancouver operate more efficiently.',

    localEdge: 'PIPEDA compliant with Canadian data residency options. Built-in GST/HST/PST tax calculation for all provinces. Bilingual interface capabilities (English/French).',

    faqs: [
      { q: 'Is Nexora compliant with Canadian privacy laws?', a: 'Yes — Nexora is PIPEDA compliant. We use AES-256 encryption, maintain Canadian data residency options, and our infrastructure partners are ISO 27001 certified.' },
      { q: 'Does Nexora handle Canadian taxes (GST/HST/PST)?', a: 'Yes. Our POS and invoicing modules handle GST (5%), HST (13-15%), and provincial PST rates automatically based on the province of sale. Tax reports are generated for CRA filing.' },
      { q: 'How much does Nexora cost in CAD?', a: 'Plans start at approximately CAD $16/month (Basic), CAD $48/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. All plans include a 1-month free trial.' },
      { q: 'Do you support French language for Quebec businesses?', a: 'Yes — our platform supports English and French interfaces. We can configure bilingual dashboards suitable for Quebec-based businesses and government requirements.' },
      { q: 'Can Nexora handle multi-province retail operations?', a: 'Absolutely. Our Retail POS and ERP modules support multi-location management with province-specific tax rules, multi-currency (CAD/USD), and consolidated reporting across all Canadian provinces.' },
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
    slug: 'uae',
    name: 'UAE',
    flag: '🇦🇪',
    region: 'Middle East',
    currency: 'AED',
    timezone: 'GST (UTC+4)',
    population: '9.4M',
    businessStyle: 'Enterprise & SMB',

    seoTitle: 'Business Software UAE | POS, CRM, ERP | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for UAE businesses in Dubai, Abu Dhabi and Sharjah. VAT on invoices, AED pricing, WhatsApp CRM.',
    seoKeywords: 'business software UAE, POS software Dubai, CRM software Abu Dhabi, ERP solutions UAE, restaurant POS Dubai, retail POS Sharjah, VAT invoicing software UAE',

    heroHeading: 'Business Software for',
    heroHighlight: 'UAE Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Dubai, Abu Dhabi, Sharjah, and all Emirates. Configurable VAT on invoices, cloud access from any device, WhatsApp CRM.',

    whyNexora: 'UAE businesses choose Nexora for one cloud platform covering POS, CRM and ERP, configurable VAT on invoices and receipts, and SMB-friendly pricing. Our team has delivered custom software projects for 50+ businesses across the Emirates, and our WhatsApp CRM fits how UAE customers communicate.',

    localEdge: 'Set a 5% tax rate for UAE VAT on POS receipts and invoices, and choose AED as your workspace currency. Runs on Cloudflare\'s global network for fast access in the region. WhatsApp CRM for customer follow-ups. Need FTA-specific reports or an Arabic interface? We build those as custom software projects.',

    faqs: [
      { q: 'Can Nexora add UAE VAT to invoices?', a: 'Yes. You can set a 5% tax rate so VAT is calculated on POS receipts and invoices, and reports show the tax collected. Please confirm your FTA filing requirements with your accountant; FTA-specific report formats can be built as a custom project.' },
      { q: 'Does Nexora support Arabic language?', a: 'The Nexora interface is in English today, and you can enter menu items, products and customer names in Arabic. Our AI assistant can answer questions in Arabic. A full Arabic interface is available as a custom software project.' },
      { q: 'How much does Nexora cost in AED?', a: 'Plans start at AED 44/month (Basic), AED 132/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. All plans include a 1-month free trial and free setup.' },
      { q: 'Do you have UAE-based support and presence?', a: 'We provide support during UAE business hours (9 AM - 6 PM GST, Sunday - Thursday). We have delivered custom software projects for 50+ businesses across Dubai, Abu Dhabi, and Sharjah. WhatsApp support available 24/7.' },
      { q: 'Is Nexora suitable for Dubai restaurants and retail?', a: 'Absolutely. Our Restaurant POS handles dine-in, takeaway and delivery orders with KOT, tables, service charge and VAT on receipts. Retail POS supports barcode billing, stock and VAT receipts, with AED as your workspace currency.' },
      { q: 'How do UAE customers pay for Nexora?', a: 'Subscriptions can be paid by card or PayPal through our payment partner Paddle. Inside the POS you record cash, card and bank transfer payments from your own customers. Integration with a specific UAE payment gateway can be built as a custom project.' },
    ],

    ctaHeading: 'Ready to transform your UAE business?',
    ctaSubtext: 'Start a free 1-month trial. No credit card.',
  },
  {
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    flag: '🇸🇦',
    region: 'Middle East',
    currency: 'SAR',
    timezone: 'AST (UTC+3)',
    population: '36M',
    businessStyle: 'Enterprise & Government',

    seoTitle: 'Business Software Saudi Arabia | POS, CRM, ERP',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Saudi businesses in Riyadh, Jeddah and Dammam. Cloud POS, CRM and custom development.',
    seoKeywords: 'business software Saudi Arabia, POS software Riyadh, CRM software Jeddah, ERP solutions KSA, restaurant POS Saudi, custom software Saudi Arabia, Vision 2030',

    heroHeading: 'Business Software for',
    heroHighlight: 'Saudi Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Riyadh, Jeddah, Dammam, and all KSA regions. Cloud platform plus custom development for Saudi requirements.',

    whyNexora: 'Saudi businesses choose Nexora for one cloud platform covering POS, CRM and ERP, role-based staff access, and a team that also builds custom software for local requirements. Our AI automation helps KSA companies work faster as they digitise.',

    localEdge: 'Set a 15% tax rate for VAT on receipts and invoices and choose SAR as your workspace currency. ZATCA (Fatoorah) e-invoicing integration and an Arabic interface are not part of the standard plans; we build them as custom software projects. WhatsApp CRM for customer engagement.',

    spotlight: {
      eyebrow: 'AI-Powered CRM',
      heading: 'AI-Powered CRM for Saudi Arabia',
      body: 'Nexora CRM gives Saudi sales and service teams one dashboard for leads, customer records, pipeline stages, invoices and follow-up tasks — with the same cloud access available across Nexora\'s platform in Saudi Arabia.',
      links: [
        { to: '/crm/', label: 'Explore Nexora CRM' },
        { to: '/pricing', label: 'View Pricing' },
      ],
    },

    faqs: [
      { q: 'Does Nexora support ZATCA e-invoicing?', a: 'Not in the standard plans yet. Nexora calculates VAT on receipts and invoices, but ZATCA Fatoorah Phase 2 integration (QR codes, invoice hashing, real-time reporting) is offered as a custom software project. Contact us to scope it.' },
      { q: 'Does Nexora support a full Arabic interface?', a: 'The Nexora interface is in English today, and you can enter data in Arabic. Our AI assistant can answer questions in Arabic. A full Arabic, right-to-left interface is available as a custom software project.' },
      { q: 'How much does Nexora cost in SAR?', a: 'Plans start at SAR 45/month (Basic), SAR 135/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. All plans include a 1-month free trial.' },
      { q: 'Is Nexora aligned with Saudi Vision 2030?', a: 'Yes — Nexora supports Saudi Vision 2030 digital transformation goals. Our cloud-native, AI-powered platform helps Saudi businesses digitize operations, reduce paper usage, and adopt world-class technology — key pillars of Vision 2030.' },
      { q: 'Do you work with larger companies in KSA?', a: 'Yes. Our Enterprise plan is custom-priced, and our development team builds custom integrations and features for larger businesses. Contact us to discuss your requirements.' },
      { q: 'Can Nexora handle large-scale Saudi retail and restaurant chains?', a: 'Absolutely. Our multi-branch architecture supports 50+ locations from one dashboard. Centralized inventory, consolidated financials, and role-based access for large Saudi retail and F&B groups.' },
    ],

    ctaHeading: 'Ready to digitize your Saudi business?',
    ctaSubtext: 'Start a free 1-month trial. No credit card.',
  },
  {
    slug: 'bahrain',
    name: 'Bahrain',
    flag: '🇧🇭',
    region: 'Middle East',
    currency: 'BHD',
    timezone: 'AST (UTC+3)',
    population: '1.5M',
    businessStyle: 'SMB & Financial',

    seoTitle: 'Business Software Bahrain | POS, CRM, ERP | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Bahrain businesses. VAT on invoices, BHD pricing, cloud-native platform.',
    seoKeywords: 'business software Bahrain, POS software Manama, CRM software Bahrain, ERP solutions Bahrain, restaurant POS Bahrain, VAT invoicing software Bahrain',

    heroHeading: 'Business Software for',
    heroHighlight: 'Bahrain Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Manama and all Bahrain governorates. Configurable VAT on invoices, cloud access from any device.',

    whyNexora: 'Bahrain businesses choose Nexora for one cloud platform covering POS, CRM and ERP, configurable VAT on invoices, and SMB-friendly pricing. Our AI automation helps Bahrain companies compete regionally.',

    localEdge: 'Set a 10% tax rate for Bahrain VAT on receipts and invoices and choose BHD as your workspace currency. Runs on Cloudflare\'s global network. We already serve security companies in Bahrain (Alqudabea Security).',

    faqs: [
      { q: 'Can Nexora add Bahrain VAT to invoices?', a: 'Yes. You can set a 10% tax rate so VAT is calculated on POS receipts and invoices, and reports show the tax collected. Please confirm your NBR filing requirements with your accountant; NBR-specific report formats can be built as a custom project.' },
      { q: 'Do you have Bahrain-based clients?', a: 'Yes — we serve Bahrain-based security companies (Alqudabea Security Services W.L.L.) with our full platform including guard management, shift scheduling, and HR modules. Our solutions are proven in the Bahrain market.' },
      { q: 'How much does Nexora cost in BHD?', a: 'Plans start at BHD 4/month (Basic), BHD 12/month (Standard), and custom Enterprise pricing. New users get 50% off the first subscription with code WELCOME-NEXORA. All plans include a 1-month free trial.' },
      { q: 'Does Nexora support Arabic for Bahrain businesses?', a: 'The Nexora interface is in English today, and you can enter data in Arabic. Our AI assistant can answer questions in Arabic. A full Arabic interface is available as a custom software project.' },
    ],

    ctaHeading: 'Ready to grow your Bahrain business?',
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

    seoTitle: 'Business Software Qatar | POS, CRM, ERP | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Qatar businesses in Doha. Tax compliant, Arabic/English, cloud-native platform.',
    seoKeywords: 'business software Qatar, POS software Doha, CRM software Qatar, ERP solutions Qatar, restaurant POS Doha, retail POS Qatar',

    heroHeading: 'Business Software for',
    heroHighlight: 'Qatar Companies',
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

    seoTitle: 'Business Software Oman | POS, CRM, ERP | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Oman businesses in Muscat. VAT compliant, Arabic/English, cloud-native platform.',
    seoKeywords: 'business software Oman, POS software Muscat, CRM software Oman, ERP solutions Oman, restaurant POS Muscat, VAT compliant software Oman',

    heroHeading: 'Business Software for',
    heroHighlight: 'Oman Companies',
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
export const FEATURED_COUNTRY_SLUGS = ['usa', 'pakistan', 'uae', 'saudi-arabia', 'bahrain']
export const FEATURED_COUNTRIES = FEATURED_COUNTRY_SLUGS.map((slug) => COUNTRIES.find((c) => c.slug === slug)).filter(Boolean)
export const NOINDEX_COUNTRY_PATHS = COUNTRIES.filter((c) => !FEATURED_COUNTRY_SLUGS.includes(c.slug)).map((c) => `/${c.slug}`)

export function getCountry(slug) {
  return COUNTRIES.find(c => c.slug === slug) || null
}
