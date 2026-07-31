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

    seoTitle: 'Business Software for US Companies | POS, CRM, ERP | Nexora Solution',
    seoDescription: 'Nexora provides AI-powered POS, CRM, ERP, and custom software development for US businesses. Restaurant POS, retail management, school ERP, and enterprise solutions. Free trial available globally.',
    seoKeywords: 'business software USA, POS software United States, CRM software America, ERP solutions US, restaurant POS USA, retail POS America',

    heroHeading: 'Business Software for',
    heroHighlight: 'American Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software solutions trusted by businesses across the United States. Enterprise-grade security, cloud-native architecture, 24/7 support.',

    whyNexora: 'US businesses choose Nexora for our enterprise-grade cloud infrastructure (Cloudflare + Firebase), AI-powered features (DeepSeek & Gemini), and cost-effective pricing that delivers 3-5x value compared to domestic vendors. No long-term contracts — monthly billing, cancel anytime.',

    localEdge: 'Our cloud infrastructure runs on Cloudflare\'s global edge network with multiple US data centers, ensuring sub-50ms latency for American users. All data is encrypted at rest and in transit with SOC 2 compliant infrastructure.',

    faqs: [
      { q: 'Does Nexora serve businesses in the United States?', a: 'Yes — Nexora serves businesses across all 50 US states. Our cloud infrastructure runs on Cloudflare\'s global edge network with US data centers, ensuring fast performance. All pricing is available in USD, and we offer US business hours support.' },
      { q: 'Is Nexora compliant with US data privacy regulations?', a: 'Yes. Nexora follows SOC 2 security standards, uses AES-256 encryption, and supports CCPA compliance requirements. Our infrastructure is hosted on Google Cloud and Cloudflare — both SOC 2 and ISO 27001 certified.' },
      { q: 'How much does Nexora cost in USD?', a: 'Plans start at approximately $12/month (Basic), $36/month (Standard), and custom Enterprise pricing. All plans include a 7-day free trial, cloud sync, free updates, and 30-day money-back guarantee. No hidden fees.' },
      { q: 'What payment methods do you accept for US customers?', a: 'We accept all major credit/debit cards (Visa, Mastercard, Amex), PayPal, Stripe, and bank wire transfers. All payments are processed in USD through secure PCI-compliant gateways.' },
      { q: 'Do you offer support during US business hours?', a: 'Yes — we provide support coverage aligned with US Eastern, Central, Mountain, and Pacific time zones. Enterprise customers get a dedicated account manager. 24/7 WhatsApp and email support is also available.' },
      { q: 'Can Nexora integrate with US-specific tools?', a: 'Absolutely. We integrate with QuickBooks, Xero, Stripe, PayPal, Square, Shopify, Salesforce, HubSpot, and most US-based SaaS platforms. Our API-first architecture makes integration straightforward.' },
    ],

    ctaHeading: 'Ready to transform your US business?',
    ctaSubtext: 'Start a free 7-day trial. No credit card. Cancel anytime. 30-day money-back guarantee.',
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

    seoTitle: 'Business Software for UK Companies | POS, CRM, ERP | Nexora Solution',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software development for UK businesses. Restaurant POS, retail management, school MIS, and enterprise solutions. GDPR compliant. Free trial.',
    seoKeywords: 'business software UK, POS software United Kingdom, CRM software Britain, ERP solutions UK, restaurant POS London, retail POS UK, GDPR compliant software',

    heroHeading: 'Business Software for',
    heroHighlight: 'UK Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software solutions for British businesses. GDPR-compliant, cloud-native, with dedicated UK support. Trusted across England, Scotland, Wales & NI.',

    whyNexora: 'UK businesses choose Nexora for our full GDPR compliance, cost-effective pricing (3x more affordable than domestic alternatives), and AI-powered automation that reduces operational costs by 30-50%. Our cloud infrastructure ensures fast performance across the UK.',

    localEdge: 'Fully GDPR compliant with data processing agreements available. Our infrastructure includes European data residency options. UK-specific VAT handling and Making Tax Digital (MTD) compatible invoicing.',

    faqs: [
      { q: 'Is Nexora GDPR compliant for UK businesses?', a: 'Yes — Nexora is fully GDPR compliant. We provide Data Processing Agreements (DPA), maintain data encryption at rest and in transit, and offer EU/UK data residency options. Our infrastructure partners (Google Cloud, Cloudflare) are GDPR and ISO 27001 certified.' },
      { q: 'Do you support UK VAT and Making Tax Digital?', a: 'Yes. Our invoicing and billing modules support UK VAT rates, VAT registration numbers, and are compatible with HMRC\'s Making Tax Digital (MTD) requirements. We generate MTD-compliant digital records.' },
      { q: 'How much does Nexora cost in GBP?', a: 'Plans start at approximately £10/month (Basic), £30/month (Standard), and custom Enterprise pricing. 50% OFF for new users. All plans include a 7-day free trial, free data migration, and 30-day money-back guarantee.' },
      { q: 'Do you have UK-based support?', a: 'We provide support during UK business hours (GMT/BST). Enterprise customers get a dedicated account manager. 24/7 email and WhatsApp support is also available for all plans.' },
      { q: 'Can Nexora integrate with UK accounting software?', a: 'Yes — we integrate with Xero, QuickBooks, Sage, FreeAgent, and most UK accounting platforms. Our API allows seamless connection with your existing financial stack.' },
      { q: 'Is Nexora suitable for UK restaurant and retail businesses?', a: 'Absolutely. Our Restaurant POS supports split bills, service charge, VAT, and tipping workflows common in UK hospitality. Retail POS handles GBP pricing, VAT receipts, and barcode scanning used in British retail.' },
    ],

    ctaHeading: 'Ready to grow your UK business?',
    ctaSubtext: 'Start a free 7-day trial. GDPR compliant. No credit card. 30-day money-back guarantee.',
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

    seoTitle: 'Business Software for Canadian Companies | POS, CRM, ERP | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Canadian businesses. Bilingual support, PIPEDA compliant, GST/HST ready. Restaurant POS, retail management, school ERP. Free trial.',
    seoKeywords: 'business software Canada, POS software Canadian, CRM software Canada, ERP solutions Toronto, restaurant POS Canada, retail POS Vancouver',

    heroHeading: 'Business Software for',
    heroHighlight: 'Canadian Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Canada. PIPEDA compliant, GST/HST ready, with bilingual English/French support capabilities.',

    whyNexora: 'Canadian businesses choose Nexora for PIPEDA-compliant infrastructure, GST/HST/PST tax handling, and 3-5x cost advantage over domestic vendors. Our AI automation helps businesses from Toronto to Vancouver operate more efficiently.',

    localEdge: 'PIPEDA compliant with Canadian data residency options. Built-in GST/HST/PST tax calculation for all provinces. Bilingual interface capabilities (English/French).',

    faqs: [
      { q: 'Is Nexora compliant with Canadian privacy laws?', a: 'Yes — Nexora is PIPEDA compliant. We use AES-256 encryption, maintain Canadian data residency options, and our infrastructure partners are SOC 2 and ISO 27001 certified.' },
      { q: 'Does Nexora handle Canadian taxes (GST/HST/PST)?', a: 'Yes. Our POS and invoicing modules handle GST (5%), HST (13-15%), and provincial PST rates automatically based on the province of sale. Tax reports are generated for CRA filing.' },
      { q: 'How much does Nexora cost in CAD?', a: 'Plans start at approximately CAD $16/month (Basic), CAD $48/month (Standard), and custom Enterprise pricing. 50% OFF for new users. All plans include free trial and money-back guarantee.' },
      { q: 'Do you support French language for Quebec businesses?', a: 'Yes — our platform supports English and French interfaces. We can configure bilingual dashboards suitable for Quebec-based businesses and government requirements.' },
      { q: 'Can Nexora handle multi-province retail operations?', a: 'Absolutely. Our Retail POS and ERP modules support multi-location management with province-specific tax rules, multi-currency (CAD/USD), and consolidated reporting across all Canadian provinces.' },
    ],

    ctaHeading: 'Ready to scale your Canadian business?',
    ctaSubtext: 'Start a free 7-day trial. PIPEDA compliant. No credit card. 30-day money-back.',
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

    seoTitle: 'Business Software for Australian Companies | POS, CRM, ERP | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Australian businesses. GST compliant, hospitality-focused. Restaurant POS, retail management, school ERP. Free trial available.',
    seoKeywords: 'business software Australia, POS software Australian, CRM software Sydney, ERP solutions Melbourne, restaurant POS Australia, retail POS Brisbane',

    heroHeading: 'Business Software for',
    heroHighlight: 'Australian Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Australia. GST compliant, hospitality-optimized, with dedicated support during AEST business hours.',

    whyNexora: 'Australian businesses choose Nexora for our hospitality-optimized POS (split bills, surcharge handling, tipping), GST-compliant invoicing, and 3-5x cost advantage. Our AI automation is perfect for restaurants, cafes, and retail chains across Australia.',

    localEdge: 'GST compliant invoicing and reporting. Hospitality-optimized POS with split bills, surcharge, and tipping workflows. Cloud infrastructure with Asia-Pacific edge nodes for sub-50ms Australian latency.',

    faqs: [
      { q: 'Does Nexora handle Australian GST?', a: 'Yes — our POS, invoicing, and ERP modules include 10% GST calculation, GST-registered business number fields, and BAS-ready tax reports. All invoices are GST compliant.' },
      { q: 'Is Nexora suitable for Australian cafes and restaurants?', a: 'Absolutely. Our Restaurant POS supports split bills, weekend/public holiday surcharges, tipping, table management, and EFTPOS integration — all essential for Australian hospitality. 50+ restaurants use it daily.' },
      { q: 'How much does Nexora cost in AUD?', a: 'Plans start at approximately AUD $18/month (Basic), AUD $55/month (Standard), and custom Enterprise pricing. 50% OFF for new users. Free 7-day trial included.' },
      { q: 'Do you support during AEST business hours?', a: 'Yes — we provide support coverage aligned with Australian Eastern, Central, and Western time zones. 24/7 email and WhatsApp support also available.' },
      { q: 'Can Nexora handle multi-venue hospitality groups?', a: 'Yes — our cloud platform manages multiple venues from one dashboard. Consolidated reporting, centralized menu management, and cross-venue inventory tracking for hospitality groups.' },
    ],

    ctaHeading: 'Ready to grow your Australian business?',
    ctaSubtext: 'Start a free 7-day trial. GST compliant. No credit card. 30-day money-back.',
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

    seoTitle: 'Business Software UAE | POS, CRM, ERP Dubai Abu Dhabi | Nexora',
    seoDescription: 'Leading AI-powered POS, CRM, ERP and custom software for UAE businesses in Dubai, Abu Dhabi, Sharjah. VAT compliant, Arabic/English, cloud-native. Restaurant POS & retail solutions.',
    seoKeywords: 'business software UAE, POS software Dubai, CRM software Abu Dhabi, ERP solutions UAE, restaurant POS Dubai, retail POS Sharjah, VAT compliant software UAE',

    heroHeading: 'Business Software for',
    heroHighlight: 'UAE Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Dubai, Abu Dhabi, Sharjah, and all Emirates. UAE VAT compliant, Arabic/English bilingual, enterprise-grade.',

    whyNexora: 'UAE businesses choose Nexora for full UAE VAT compliance, bilingual Arabic/English interface, enterprise-grade cloud infrastructure, and 3-5x cost advantage. Our AI automation and WhatsApp CRM are ideal for the UAE market.',

    localEdge: 'Full UAE VAT (5%) compliance with FTA-compatible tax reports. Bilingual Arabic/English interface. Cloud infrastructure with Middle East edge nodes (Dubai, Fujairah). WhatsApp Business API integration — essential for UAE customer communication.',

    faqs: [
      { q: 'Is Nexora UAE VAT compliant?', a: 'Yes — our POS, invoicing, and ERP modules include 5% UAE VAT calculation, TRN (Tax Registration Number) fields, and FTA-compatible tax reports. All invoices meet UAE Federal Tax Authority requirements.' },
      { q: 'Does Nexora support Arabic language?', a: 'Yes — our platform supports bilingual Arabic/English interfaces. Menus, invoices, and reports can be generated in Arabic. Our AI chatbot converses naturally in Arabic using DeepSeek AI.' },
      { q: 'How much does Nexora cost in AED?', a: 'Plans start at AED 44/month (Basic), AED 132/month (Standard), and custom Enterprise pricing. 50% OFF for new users. All plans include free trial, free setup, and money-back guarantee.' },
      { q: 'Do you have UAE-based support and presence?', a: 'We provide support during UAE business hours (9 AM - 6 PM GST, Sunday - Thursday). We serve 50+ businesses across Dubai, Abu Dhabi, and Sharjah. WhatsApp support available 24/7.' },
      { q: 'Is Nexora suitable for Dubai restaurants and retail?', a: 'Absolutely. Our Restaurant POS handles the specific needs of Dubai F&B — split bills, service charge, VAT, delivery integration (Talabat, Deliveroo). Retail POS supports barcode billing, multi-currency, and VAT receipts.' },
      { q: 'Can Nexora integrate with UAE payment gateways?', a: 'Yes — we integrate with Checkout.com, Stripe, PayPal, and UAE bank payment gateways. All payment flows are PCI-DSS compliant with secure tokenization.' },
    ],

    ctaHeading: 'Ready to transform your UAE business?',
    ctaSubtext: 'Start a free 7-day trial. UAE VAT compliant. Arabic/English. No credit card.',
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

    seoTitle: 'Business Software Saudi Arabia | POS, CRM, ERP Riyadh Jeddah | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Saudi businesses in Riyadh, Jeddah, Dammam. ZATCA compliant, Arabic-first, Vision 2030 ready. Restaurant POS & enterprise solutions.',
    seoKeywords: 'business software Saudi Arabia, POS software Riyadh, CRM software Jeddah, ERP solutions KSA, restaurant POS Saudi, ZATCA compliant software, Vision 2030',

    heroHeading: 'Business Software for',
    heroHighlight: 'Saudi Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Riyadh, Jeddah, Dammam, and all KSA regions. ZATCA compliant, Arabic-first, Vision 2030 aligned.',

    whyNexora: 'Saudi businesses choose Nexora for full ZATCA e-invoicing compliance, Arabic-first interface, enterprise-grade security, and alignment with Saudi Vision 2030 digital transformation goals. Our AI automation helps KSA companies scale efficiently.',

    localEdge: 'ZATCA e-invoicing (Fatoorah) Phase 2 compliant. Arabic-first interface with full RTL support. Cloud infrastructure with Middle East edge nodes. WhatsApp Business API — essential for Saudi customer engagement.',

    faqs: [
      { q: 'Is Nexora ZATCA e-invoicing compliant?', a: 'Yes — our invoicing system is ZATCA Fatoorah Phase 2 compliant. We generate QR-coded electronic invoices, maintain invoice hash sequences, and support integration with ZATCA\'s e-invoicing platform for real-time reporting.' },
      { q: 'Does Nexora support full Arabic interface?', a: 'Yes — our platform provides a complete Arabic-first interface with proper RTL (right-to-left) text rendering. Menus, invoices, reports, and dashboards all work natively in Arabic. Our AI speaks fluent Arabic.' },
      { q: 'How much does Nexora cost in SAR?', a: 'Plans start at SAR 45/month (Basic), SAR 135/month (Standard), and custom Enterprise pricing. 50% OFF for new users. All plans include free trial and 30-day money-back guarantee.' },
      { q: 'Is Nexora aligned with Saudi Vision 2030?', a: 'Yes — Nexora supports Saudi Vision 2030 digital transformation goals. Our cloud-native, AI-powered platform helps Saudi businesses digitize operations, reduce paper usage, and adopt world-class technology — key pillars of Vision 2030.' },
      { q: 'Do you serve government and enterprise clients in KSA?', a: 'Yes — we offer enterprise-grade deployment with dedicated infrastructure, SLAs, custom integrations, and on-premise deployment options for government and enterprise clients. Contact our enterprise team for details.' },
      { q: 'Can Nexora handle large-scale Saudi retail and restaurant chains?', a: 'Absolutely. Our multi-branch architecture supports 50+ locations from one dashboard. Centralized inventory, consolidated financials, and role-based access for large Saudi retail and F&B groups.' },
    ],

    ctaHeading: 'Ready to digitize your Saudi business?',
    ctaSubtext: 'Start a free 7-day trial. ZATCA compliant. Arabic-first. No credit card.',
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

    seoTitle: 'Business Software Bahrain | POS, CRM, ERP Manama | Nexora Solution',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Bahrain businesses. VAT compliant, Arabic/English, cloud-native. Restaurant POS, retail, and enterprise solutions in Manama & across Bahrain.',
    seoKeywords: 'business software Bahrain, POS software Manama, CRM software Bahrain, ERP solutions Bahrain, restaurant POS Bahrain, VAT compliant software Bahrain',

    heroHeading: 'Business Software for',
    heroHighlight: 'Bahrain Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Manama and all Bahrain governorates. Bahrain VAT compliant, Arabic/English bilingual, cloud-native.',

    whyNexora: 'Bahrain businesses choose Nexora for full Bahrain VAT (10%) compliance, bilingual Arabic/English interface, and cost-effective pricing that delivers enterprise capabilities at SMB-friendly rates. Our AI automation helps Bahrain companies compete regionally.',

    localEdge: 'Bahrain VAT (10%) compliant with NBR-compatible tax reports. Bilingual Arabic/English interface. Cloud infrastructure with Middle East edge nodes. We already serve security companies in Bahrain (Alqudabea Security).',

    faqs: [
      { q: 'Is Nexora compliant with Bahrain VAT regulations?', a: 'Yes — our POS, invoicing, and ERP modules include 10% Bahrain VAT calculation and NBR (National Bureau for Revenue) compatible tax reports. All invoices meet Bahrain\'s VAT framework requirements.' },
      { q: 'Do you have Bahrain-based clients?', a: 'Yes — we serve Bahrain-based security companies (Alqudabea Security Services W.L.L.) with our full platform including guard management, shift scheduling, and HR modules. Our solutions are proven in the Bahrain market.' },
      { q: 'How much does Nexora cost in BHD?', a: 'Plans start at BHD 4/month (Basic), BHD 12/month (Standard), and custom Enterprise pricing. 50% OFF for new users. All plans include free trial and money-back guarantee.' },
      { q: 'Does Nexora support Arabic for Bahrain businesses?', a: 'Yes — full Arabic/English bilingual interface with RTL support. Our AI chatbot converses naturally in Arabic. All customer-facing documents can be generated in Arabic or English.' },
    ],

    ctaHeading: 'Ready to grow your Bahrain business?',
    ctaSubtext: 'Start a free 7-day trial. Bahrain VAT compliant. Arabic/English. No credit card.',
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

    seoTitle: 'Business Software Qatar | POS, CRM, ERP Doha | Nexora Solution',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Qatar businesses. Tax compliant, Arabic/English, cloud-native. Restaurant POS, retail, and enterprise solutions in Doha & across Qatar.',
    seoKeywords: 'business software Qatar, POS software Doha, CRM software Qatar, ERP solutions Qatar, restaurant POS Doha, retail POS Qatar',

    heroHeading: 'Business Software for',
    heroHighlight: 'Qatar Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Doha and all Qatar municipalities. Tax compliant, Arabic/English bilingual, cloud-native architecture.',

    whyNexora: 'Qatar businesses choose Nexora for our enterprise-grade cloud infrastructure, bilingual Arabic/English interface, and AI-powered automation that drives efficiency. Our WhatsApp CRM is essential for Qatar\'s relationship-driven business culture.',

    localEdge: 'Qatar tax-compliant invoicing. Bilingual Arabic/English interface. Cloud infrastructure with Middle East edge nodes. WhatsApp Business API integration for Qatar\'s WhatsApp-first business communication culture.',

    faqs: [
      { q: 'Is Nexora suitable for Qatar businesses?', a: 'Yes — Nexora serves businesses across Doha, Al Rayyan, Al Wakrah, and all Qatar municipalities. Our platform handles Qatar\'s tax requirements, supports Arabic/English, and integrates with local business workflows.' },
      { q: 'How much does Nexora cost in QAR?', a: 'Plans start at QAR 44/month (Basic), QAR 132/month (Standard), and custom Enterprise pricing. 50% OFF for new users. All plans include free trial and money-back guarantee.' },
      { q: 'Does Nexora support Arabic language for Qatar?', a: 'Yes — full Arabic/English bilingual interface with RTL support. Our AI speaks Arabic naturally. All documents, invoices, and reports can be generated in Arabic.' },
      { q: 'Is Nexora suitable for Qatar\'s hospitality sector?', a: 'Absolutely. Our Restaurant POS handles the specific needs of Qatar F&B — table management, split bills, service charge, delivery integration, and multi-lingual menus. 50+ restaurants trust our platform.' },
    ],

    ctaHeading: 'Ready to elevate your Qatar business?',
    ctaSubtext: 'Start a free 7-day trial. Arabic/English support. No credit card. 30-day money-back.',
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

    seoTitle: 'Business Software Oman | POS, CRM, ERP Muscat | Nexora Solution',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Oman businesses. VAT compliant, Arabic/English, cloud-native. Restaurant POS, retail, and enterprise solutions in Muscat & across Oman.',
    seoKeywords: 'business software Oman, POS software Muscat, CRM software Oman, ERP solutions Oman, restaurant POS Muscat, VAT compliant software Oman',

    heroHeading: 'Business Software for',
    heroHighlight: 'Oman Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Muscat and all Oman governorates. Oman VAT compliant, Arabic/English, cloud-native architecture.',

    whyNexora: 'Oman businesses choose Nexora for full Oman VAT (5%) compliance, bilingual Arabic/English interface, and cost-effective pricing. Our AI automation helps Omani companies modernize operations in line with Oman Vision 2040.',

    localEdge: 'Oman VAT (5%) compliant with tax authority-compatible reports. Bilingual Arabic/English interface. Cloud infrastructure with Middle East edge nodes. WhatsApp CRM — essential for Oman\'s business communication.',

    faqs: [
      { q: 'Is Nexora compliant with Oman VAT?', a: 'Yes — our POS, invoicing, and ERP modules include 5% Oman VAT calculation with tax authority-compatible reports. All invoices meet Oman Tax Authority requirements.' },
      { q: 'How much does Nexora cost in OMR?', a: 'Plans start at OMR 4/month (Basic), OMR 12/month (Standard), and custom Enterprise pricing. 50% OFF for new users. All plans include free trial and money-back guarantee.' },
      { q: 'Does Nexora support Arabic for Oman businesses?', a: 'Yes — full bilingual Arabic/English interface with RTL support. Our AI chatbot communicates naturally in Arabic. All business documents can be generated in Arabic or English.' },
    ],

    ctaHeading: 'Ready to modernize your Oman business?',
    ctaSubtext: 'Start a free 7-day trial. Oman VAT compliant. Arabic/English. No credit card.',
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

    seoTitle: 'Business Software Kuwait | POS, CRM, ERP Kuwait City | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Kuwait businesses. Arabic/English, cloud-native. Restaurant POS, retail, and enterprise solutions in Kuwait City & across Kuwait.',
    seoKeywords: 'business software Kuwait, POS software Kuwait City, CRM software Kuwait, ERP solutions Kuwait, restaurant POS Kuwait, retail POS Kuwait',

    heroHeading: 'Business Software for',
    heroHighlight: 'Kuwait Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Kuwait City and all governorates. Arabic/English bilingual, cloud-native, enterprise-grade security.',

    whyNexora: 'Kuwait businesses choose Nexora for our enterprise-grade cloud infrastructure, bilingual Arabic/English interface, and AI-powered automation. Our WhatsApp CRM aligns perfectly with Kuwait\'s mobile-first business communication culture.',

    localEdge: 'Kuwait tax-compatible invoicing. Bilingual Arabic/English interface. Cloud infrastructure with Middle East edge nodes. WhatsApp Business API — critical for Kuwait\'s 99% WhatsApp penetration rate.',

    faqs: [
      { q: 'Is Nexora suitable for Kuwait businesses?', a: 'Yes — Nexora serves businesses across Kuwait City, Hawalli, Farwaniya, and all Kuwait governorates. Our platform supports Arabic/English, handles Kuwait\'s business requirements, and integrates with local workflows.' },
      { q: 'How much does Nexora cost in KWD?', a: 'Plans start at KWD 4/month (Basic), KWD 11/month (Standard), and custom Enterprise pricing. 50% OFF for new users. All plans include free trial and money-back guarantee.' },
      { q: 'Does Nexora support Arabic language?', a: 'Yes — full Arabic/English bilingual interface with RTL support. Our AI speaks Arabic fluently. All business documents can be generated in Arabic or English.' },
      { q: 'Can Nexora handle large Kuwait restaurant groups?', a: 'Absolutely. Our multi-branch Restaurant POS supports 50+ locations with centralized management, consolidated reporting, and AI-powered analytics — ideal for Kuwait\'s growing F&B sector.' },
    ],

    ctaHeading: 'Ready to transform your Kuwait business?',
    ctaSubtext: 'Start a free 7-day trial. Arabic/English. No credit card. 30-day money-back.',
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

    seoTitle: 'Best Business Software in Pakistan | POS, CRM, ERP | Nexora Solution',
    seoDescription: 'Pakistan\'s leading AI-powered POS, CRM, ERP & business software. Restaurant POS, retail management, school ERP, WhatsApp CRM. 50+ businesses trust Nexora. Free trial, Urdu support.',
    seoKeywords: 'business software Pakistan, POS software Pakistan, CRM software Lahore, ERP solutions Karachi, restaurant POS Islamabad, retail POS Pakistan, school ERP Pakistan',

    heroHeading: 'Pakistan\'s Leading',
    heroHighlight: 'Business Software',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software built for Pakistani businesses. Urdu/English support, offline-first, local payment gateways, and 50+ successful implementations across Pakistan.',

    whyNexora: 'Pakistani businesses choose Nexora because we are built in Pakistan for Pakistan. Urdu/English bilingual, offline-first (works without internet), local payment integrations (JazzCash, Easypaisa), and priced for the Pakistani market. 50+ businesses from Karachi to Peshawar trust Nexora.',

    localEdge: 'Urdu/English bilingual interface with Roman Urdu AI chatbot. Offline-first POS — keeps billing during load shedding. JazzCash, Easypaisa, and local bank integrations. Pakistan-based support team. Built for Pakistani business realities.',

    faqs: [
      { q: 'Where is Nexora based in Pakistan?', a: 'Nexora Solution is a Pakistani software company serving businesses across Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Peshawar, Quetta, Multan, and all major cities. We understand Pakistani business challenges deeply.' },
      { q: 'Does Nexora work without internet (offline)?', a: 'Yes — our POS modules are offline-first. You can keep billing even during load shedding or internet downtime. All data syncs automatically when you reconnect. This is a core feature built for Pakistani business realities.' },
      { q: 'What Pakistani payment methods does Nexora support?', a: 'We integrate with JazzCash, Easypaisa, HBL, UBL, Meezan Bank, and other Pakistani payment gateways. Our POS also supports cash, card, and manual bank transfer payment methods.' },
      { q: 'Does Nexora support Urdu language?', a: 'Ji bilkul! Our AI chatbot speaks Roman Urdu naturally ("aap", "ji", "shukriya"). Our interface is Urdu/English bilingual. We are building Urdu script (نستعلیق) support for future releases.' },
      { q: 'How much does Nexora cost in Pakistan?', a: 'Plans start at PKR 1,000/month (Basic — 50% OFF, was PKR 2,000), PKR 3,000/month (Standard — was PKR 5,999), and Enterprise (custom). All plans include 7-day free trial, free setup, free data migration, and free staff training.' },
      { q: 'Which Pakistani businesses use Nexora?', a: '50+ businesses across Pakistan use Nexora — including a 40-table restaurant in Karachi, a 3-branch retail chain in Lahore, and a 1,200-student school in Islamabad. We serve restaurants, retail stores, schools, and service businesses nationwide.' },
    ],

    ctaHeading: 'Ready to grow your Pakistani business?',
    ctaSubtext: 'Start a free 7-day trial. PKR pricing. Urdu support. No credit card. 50% OFF.',
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

    seoTitle: 'Business Software India | POS, CRM, ERP Mumbai Delhi Bangalore | Nexora',
    seoDescription: 'AI-powered POS, CRM, ERP and custom software for Indian businesses. GST compliant, multi-language, cloud-native. Restaurant POS, retail, school ERP. Serving Mumbai, Delhi, Bangalore & across India.',
    seoKeywords: 'business software India, POS software Mumbai, CRM software Delhi, ERP solutions Bangalore, restaurant POS India, retail POS India, GST compliant software India, school ERP India',

    heroHeading: 'Business Software for',
    heroHighlight: 'Indian Companies',
    heroSubtitle: 'AI-powered POS, CRM, ERP, and custom software for businesses across Mumbai, Delhi, Bangalore, and all Indian states. GST compliant, multi-language, built for Indian scale.',

    whyNexora: 'Indian businesses choose Nexora for full GST compliance, cost-effective pricing (5-10x more affordable than domestic alternatives), and AI-powered automation that handles India\'s scale. Our platform serves businesses from startups to enterprises across all Indian states.',

    localEdge: 'Full GST compliant invoicing with HSN/SAC codes, CGST/SGST/IGST calculation, and GSTR-1/GSTR-3B compatible reports. Multi-language support (English, Hindi, regional). Cloud infrastructure with Mumbai edge nodes. WhatsApp Business API for India\'s WhatsApp-first commerce.',

    faqs: [
      { q: 'Is Nexora GST compliant for Indian businesses?', a: 'Yes — our POS, invoicing, and ERP modules include full GST compliance: HSN/SAC codes, CGST/SGST/IGST auto-calculation, GSTIN validation, and GSTR-1/GSTR-3B compatible tax reports. E-invoicing support for applicable businesses.' },
      { q: 'How much does Nexora cost in INR?', a: 'Plans start at approximately ₹830/month (Basic), ₹2,500/month (Standard), and custom Enterprise pricing. 50% OFF for new users. This is 5-10x more affordable than comparable Indian SaaS products. Free 7-day trial included.' },
      { q: 'Does Nexora support Indian languages?', a: 'Yes — our AI chatbot supports Hindi (रोमन और देवनागरी), English, and regional languages. We are expanding multi-language interface support. WhatsApp CRM supports Hindi and English templates.' },
      { q: 'Can Nexora handle India-scale operations?', a: 'Absolutely. Our cloud-native architecture scales horizontally to handle thousands of transactions per minute. Multi-branch, multi-GSTIN, multi-currency — built for Indian business complexity from Kirana stores to enterprise chains.' },
      { q: 'Does Nexora support Indian payment gateways?', a: 'Yes — we integrate with Razorpay, Paytm, PhonePe, Google Pay, UPI, and major Indian bank gateways. All payment flows are PCI-DSS compliant with secure tokenization.' },
      { q: 'Is Nexora suitable for Indian restaurants (cloud kitchens, QSR, dine-in)?', a: 'Yes — our Restaurant POS supports all Indian F&B models: cloud kitchens (Zomato/Swiggy integration), QSR chains, fine dining, and cafe chains. Features include KOT, table management, GST billing, and AI sales analytics.' },
    ],

    ctaHeading: 'Ready to scale your Indian business?',
    ctaSubtext: 'Start a free 7-day trial. GST compliant. INR pricing. No credit card.',
  },
]

/** Helper to get country by slug */
export function getCountry(slug) {
  return COUNTRIES.find(c => c.slug === slug) || null
}
