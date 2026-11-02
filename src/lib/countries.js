import { planPriceSentence } from './platformPlans.js'

/**
 * Country landing page configuration.
 * Add one object to `COUNTRIES` array to create a new country page.
 * The CountryPage component automatically renders all sections from this data.
 */

export const COUNTRIES = [
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
    seoDescription: 'POS, CRM, ERP and business software built in Multan for Pakistani businesses. Restaurant, retail, pharmacy and school software with PKR pricing and a 1-month free trial.',
    seoKeywords: 'business software Pakistan, POS software Pakistan, CRM software Lahore, ERP solutions Karachi, restaurant POS Islamabad, retail POS Pakistan, school ERP Pakistan',

    heroHeading: 'Business Software for',
    heroHighlight: 'Pakistani Companies',
    heroSubtitle: 'POS, CRM, ERP and custom software for businesses in Pakistan. A Restaurant POS that keeps billing when the internet drops, plans priced in rupees, and a team in Multan you can message on WhatsApp in Urdu or English.',

    whyNexora: 'Nexora is built by a team in Multan, so support, pricing and setup are in Pakistan, in rupees and in your time zone. One cloud platform covers the counter and the back office: Restaurant POS, Retail POS, Pharmacy POS, School ERP, CRM, WhatsApp CRM, Transport & Fleet and Property ERP, with staff roles so each person sees only what they need. Every plan starts with a 1-month free trial.',

    localEdge: 'The Restaurant POS keeps taking orders when the internet drops and syncs to the cloud when the connection returns. Bills record cash, card, JazzCash, Easypaisa and bank transfer payments, and the Restaurant POS settings have fields for your sales tax number and FBR POS ID so they print on the receipt. The Nexora AI assistant understands Roman Urdu ("aap", "ji") as well as English. The interface itself is in English; there is no Urdu-script interface yet.',

    services: ['Restaurant POS', 'Retail POS', 'School ERP', 'WhatsApp CRM', 'Custom CRM', 'ERP Solutions'],

    extraSections: [
      {
        heading: 'Sales tax and receipts in Pakistan',
        paragraphs: [
          'Sales tax in Pakistan is split between authorities. Tax on goods is generally collected federally through the FBR, while tax on services is generally handled by the provincial revenue authorities in Punjab, Sindh, Khyber Pakhtunkhwa and Balochistan, each with its own rates and rules. What applies to you depends on what you sell and where, so confirm it with your accountant.',
          'In Nexora you set your own tax rate and label, and the Restaurant POS prints your sales tax number and FBR POS ID on every receipt if you enter them in settings. Nexora does not connect to the FBR system, issue FBR digital invoices or file returns. If you are required to do those, use the FBR-approved route or your tax consultant alongside Nexora.',
        ],
        links: [
          { to: '/tools/pakistan-invoice-generator', label: 'Free Pakistan invoice generator' },
          { to: '/pricing', label: 'See plans' },
        ],
      },
      {
        heading: 'Which module fits which Pakistani business',
        paragraphs: [
          'Restaurants and cafes use the Restaurant POS for kitchen order tickets, table management, billing and a menu imported from a photo with AI. Shops use the Retail POS for barcode billing, several cashiers, stock, suppliers and a customer ledger. Medical stores use Pharmacy POS (PharmaFlow) for medicine batches, expiry dates and prescription billing.',
          'Schools use the School ERP for student records, fees, attendance, exams and staff payroll, with fee reminders sent on WhatsApp. Rent-a-car and transport businesses use Transport & Fleet for vehicles, bookings, customer ledgers and dues, and property dealers use Property ERP for tenants, rent and maintenance. We also build custom software, mobile apps and online stores.',
        ],
        links: [
          { to: '/restaurant-pos', label: 'Restaurant POS' },
          { to: '/pharmacy-pos', label: 'Pharmacy POS' },
          { to: '/school-erp', label: 'School ERP' },
          { to: '/retail-pos', label: 'Retail POS' },
        ],
      },
      {
        heading: 'Pricing, payment and getting started',
        paragraphs: [
          'Plans start at PKR 2,000 per month (Basic) and PKR 5,999 per month (Standard), and Enterprise is priced to order. Every plan includes a 1-month free trial with free setup, data migration and staff training, so you can load your menu, products or students and run real bills before you pay. It is a trial, not free forever.',
          'To start, message us on WhatsApp with the kind of business you run and how many people use the counter or the office, and we will tell you which module fits. Ask us how to pay when the trial ends; we will tell you the options that work for you.',
        ],
        links: [{ to: '/multan', label: 'Our head office in Multan' }],
      },
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
        { to: '/abbottabad', label: 'School ERP and POS in Abbottabad' },
        { to: '/pricing', label: 'View pricing' },
      ],
    },

    faqs: [
      { q: 'Where is Nexora based in Pakistan?', a: 'Nexora Solution is a Pakistani software company with its head office in Multan. We serve businesses online across Pakistan, so you can use it from Karachi, Lahore, Islamabad, Peshawar or any other city. Support is by WhatsApp and email.' },
      { q: 'Does Nexora work without internet (offline)?', a: 'The Restaurant POS keeps taking orders and printing bills when the internet drops, and syncs to the cloud when the connection returns. The other modules run in the browser and need an internet connection.' },
      { q: 'What payment methods can I record in the POS?', a: 'The POS records cash, card, JazzCash, Easypaisa and bank transfer payments against each bill. These are records of how your customer paid; Nexora does not process the payment for you.' },
      { q: 'Does Nexora support Urdu?', a: 'The interface is in English. The Nexora AI assistant understands Roman Urdu as well as English, and our support team replies on WhatsApp in Urdu or English. There is no Urdu-script interface yet.' },
      { q: 'Does Nexora connect to the FBR or file sales tax returns?', a: 'No. You can enter your sales tax number and FBR POS ID in the Restaurant POS settings so they print on receipts, and you set the tax rate yourself, but Nexora does not connect to the FBR system, issue FBR digital invoices or file returns.' },
      { q: 'How much does Nexora cost in Pakistan?', a: `${planPriceSentence()} All plans include a 1-month free trial, free setup, free data migration and free staff training.` },
      { q: 'Which businesses is Nexora built for?', a: 'Restaurants and cafes, retail shops, medical stores, schools, rent-a-car and transport businesses and property dealers, plus sales teams that work on WhatsApp. If your business is different, tell us on WhatsApp and we will say whether a module fits or whether it would be custom work.' },
    ],

    ctaHeading: 'Ready to grow your Pakistani business?',
    ctaSubtext: 'Start a free 1-month trial. PKR pricing. No credit card.',
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
