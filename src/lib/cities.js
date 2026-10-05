import { planPriceSentence } from './platformPlans.js'

/**
 * City landing pages (local SEO). One object per city; CityPage.jsx renders it
 * and scripts/prerender.mjs reads the same data for the static HTML, so the
 * two cannot drift. Only state facts that are true: Nexora's head office is in
 * Multan (see SITE_ADDRESS in seoStructuredData.js), and the product list below
 * matches the modules on the site. No client names, counts or ratings.
 */

export const CITIES = [
  {
    slug: 'multan',
    name: 'Multan',
    nameUrdu: 'ملتان',
    province: 'Punjab',

    seoTitle: 'POS & Business Software in Multan | Nexora Solution',
    seoDescription: 'Nexora Solution is a Multan software company: restaurant, retail and pharmacy POS, school ERP, CRM and custom software. Free 1-month trial.',
    seoKeywords: 'POS software in Multan, restaurant software in Multan, software company in Multan, software house in Multan, billing software Multan, ERP software Multan, school software Multan, pharmacy software Multan',

    hero: {
      eyebrow: 'Head office in Multan · Punjab, Pakistan',
      headingA: 'POS and business software',
      headingB: 'made in Multan',
      subtitle: 'Nexora Solution builds restaurant POS, retail POS, pharmacy POS, school ERP, CRM and custom software for businesses in Multan. Our team works from Al Noor Plaza, so the people who build the product are in your own city.',
    },

    facts: [
      { value: '2019', label: 'Building business software since' },
      { value: 'Multan', label: 'Head office: Al Noor Plaza' },
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'Offline', label: 'Restaurant POS keeps billing without internet' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Nexora Solution is a software company based in Multan. Since 2019 we have been building cloud software that replaces registers, spreadsheets and scattered WhatsApp messages with one shared workspace: sales, stock, customers, staff access and reports in one dashboard that the owner can open from a phone or a laptop.',
        'The platform is called Nexora. It is one login with several business modules: Restaurant POS, Retail POS, Pharmacy POS (PharmaFlow), School ERP, CRM, WhatsApp CRM, and a Transport and Fleet module. You pick the module your business needs, invite your team, and give each person only the screens their job requires.',
        'Besides the ready-made modules, we also build custom software for companies that need something specific: a tailored CRM, an ERP, a mobile app, an online store or an integration with the tools they already use. If you are looking for a software house in Multan that can both sell you a working product today and build what is missing, that is the gap Nexora fills.',
      ],
    },

    arts: {
      eyebrow: 'The city we build for',
      heading: 'Multan is a city of makers, and its businesses run on trust',
      intro: 'Multan is called the City of Saints. Its shrines are covered in blue glazed tiles, its bazaars have traded for centuries, and its craftspeople are known across Pakistan. Software for this city has to respect how business is actually done here: by relationship, by credit, by the same customer coming back for years.',
      items: [
        {
          key: 'pottery',
          title: 'Blue pottery (kashi kari)',
          text: 'Multani blue pottery and tilework are famous worldwide. A pottery workshop deals with many small items, custom orders and walk-in customers, so it needs item-wise stock, quotations that turn into invoices, and a clear customer ledger.',
        },
        {
          key: 'lamp',
          title: 'Camel-skin lamps and khussa',
          text: 'Hand-painted camel-skin lamps and Multani khussa are sold from small shops and workshops. Barcode billing, item-wise stock and daily sales reports are what keep these counters tidy.',
        },
        {
          key: 'ajrak',
          title: 'Ajrak, cloth and bazaars',
          text: 'Hussain Agahi, Chowk Bazaar and the old city markets sell cloth, ajrak and everyday goods all day. Multi-counter billing and customer accounts help a busy shop stay accurate on a crowded day.',
        },
        {
          key: 'mango',
          title: 'Mangoes and Multani food',
          text: 'Multan is known for its mangoes, Sohan halwa, sohbat and lassi. Restaurants, sweet shops and fruit traders need fast billing and KOT during the rush, and clear purchase records during the season.',
        },
      ],
    },

    business: {
      heading: 'Which Nexora module fits your Multan business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add a second module later without starting over.',
      items: [
        { title: 'Restaurants, sweet shops and cafes', text: 'KOT and kitchen display, table management, split bills and an offline-ready POS for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Shops, marts and showrooms', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger for retail shops.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Medical stores and pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts at the counter.', label: 'Pharmacy POS', to: '/pharmacy-pos' },
        { title: 'Schools, academies and tuition centres', text: 'Student records, fee collection, attendance, exams, parent portal and staff payroll in one school ERP.', label: 'School ERP', to: '/school-erp' },
        { title: 'Transport, rent-a-car and fleets', text: 'Vehicles, rental bookings, customer ledgers, payments and dues managed from one fleet workspace.', label: 'Transport & Fleet', to: '/transport-fleet' },
        { title: 'Sales teams, traders and exporters', text: 'Track leads, follow-ups and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
      ],
    },

    why: {
      heading: 'Why Multan businesses choose Nexora',
      items: [
        { title: 'A team in your own city', text: 'Our head office is in Multan. Call or message on WhatsApp and you reach the people who build and support the product, in Urdu or English.' },
        { title: 'Works when the internet or power drops', text: 'Multan summers bring load-shedding and patchy connections. The Restaurant POS keeps taking orders offline and syncs when you are back online.' },
        { title: 'Pakistani payments', text: 'Record cash, card, JazzCash, Easypaisa and bank transfer sales in your POS. Nexora plans can be paid by JazzCash, Easypaisa or bank transfer.' },
        { title: 'Prices in rupees, trial first', text: 'Every plan starts with a free month, with no credit card needed. After that you pay in PKR, monthly or yearly.' },
        { title: 'Owner visibility', text: 'See today’s sales, stock and staff activity from your phone, even when you are not at the shop.' },
        { title: 'Roles and permissions', text: 'A cashier sees the billing screen, a manager sees reports, and the owner sees everything. Nobody gets more access than their job needs.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every area of Multan',
      text: 'Nexora opens in a browser, so it works the same wherever your shop or office is. Businesses can use it from Multan Cantt, Gulgasht Colony, Bosan Road, Nawan Shehr, Hussain Agahi, Shah Rukn-e-Alam Colony, Mumtazabad, Wapda Town and Vehari Road, as well as from the rest of Punjab and Pakistan. Setup, data migration and staff training are free on every plan.',
      list: ['Multan Cantt', 'Gulgasht Colony', 'Bosan Road', 'Nawan Shehr', 'Hussain Agahi', 'Shah Rukn-e-Alam Colony', 'Mumtazabad', 'Wapda Town', 'Vehari Road'],
    },

    pricingHeading: 'Simple pricing in rupees',
    pricingNote: 'Every plan includes a 1-month free trial, free setup, free data migration and free staff training. Full details are on the pricing page.',

    steps: [
      { title: 'Message us on WhatsApp or call', text: 'Tell us what kind of business you run and how many people use the counter or the office.' },
      { title: 'Start the free month', text: 'Create your account, pick the module that fits, and add your menu, products, students or customers. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test bills, and start using Nexora for real sales.' },
    ],

    faqs: [
      { q: 'Is Nexora Solution a software company in Multan?', a: 'Yes. Nexora Solution’s head office is at Al Noor Plaza, Multan, Punjab. We build the Nexora platform and custom software from here, and we support customers across Multan and the rest of Pakistan.' },
      { q: 'Which POS software is best for a restaurant in Multan?', a: 'It depends on your setup, so try before you decide. Nexora’s Restaurant POS covers KOT, kitchen display, table management and billing, works offline, and comes with a free first month, so you can run it in your own restaurant before paying.' },
      { q: 'Can I use Nexora for a pharmacy or medical store in Multan?', a: 'Yes. The Pharmacy POS (PharmaFlow) handles medicine search, batch and expiry tracking, supplier purchases and itemized receipts at the counter.' },
      { q: 'Does Nexora work during load-shedding or when the internet is down?', a: 'The Restaurant POS is built to keep billing offline and syncs automatically when the connection returns. Other modules are cloud-based and need an internet connection.' },
      { q: 'How much does Nexora cost in Multan?', a: `${planPriceSentence()} Every plan includes a 1-month free trial, and prices are in Pakistani rupees.` },
      { q: 'Do you build custom software for businesses in Multan?', a: 'Yes. Besides the ready-made modules, we build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need on WhatsApp and we will say whether a module already covers it or what a custom build would involve.' },
      { q: 'Can a school or academy in Multan manage fees and attendance with Nexora?', a: 'Yes. The School ERP covers student and parent records, fee collection, attendance (manual or with a biometric device), exams and staff payroll.' },
      { q: 'How do I get started?', a: 'Message us on WhatsApp at 0319 4329754 or use the contact page. We will help you start the free month, move your existing data and train your staff.' },
    ],

    ctaHeading: 'Ready to run your Multan business on Nexora?',
    ctaSubtext: 'Start the free month today, or message us and we will show you the module that fits your shop, restaurant, pharmacy or school.',
  },
  {
    slug: 'texas',
    name: 'Texas',
    parent: { to: '/usa', label: 'United States' },
    theme: { pattern: 'star', primary: '#0b2a5b', accent: '#b91c1c', warm: '#b91c1c' },

    seoTitle: 'Free Texas Invoice Generator & Business Software | Nexora',
    seoDescription: 'Make a free Texas invoice or estimate in three steps with sales tax, then download PDF or Excel. Plus CRM, ERP and custom software from Nexora.',
    seoKeywords: 'Texas invoice template, free invoice generator Texas, Texas contractor invoice, Texas estimate template, invoice software Houston, invoice generator Dallas, business software Texas',

    hero: {
      eyebrow: 'Howdy, y’all · Free for Texas businesses',
      headingA: 'Free Texas',
      headingB: 'invoice generator',
      subtitle: 'Howdy! Make an invoice or estimate in three steps, add your sales tax, and download a PDF or Excel file. No signup, no watermark, no fuss. Nexora also builds CRM, ERP and custom software for Texas companies from Houston to El Paso.',
      primaryCta: { label: 'Make a free invoice', to: '/tools/invoice-generator' },
      secondaryCta: { label: 'Contractor invoice generator', to: '/tools/contractor-invoice-generator' },
    },

    facts: [
      { value: '$0', label: 'Free invoice, estimate and receipt tools' },
      { value: 'PDF + Excel', label: 'Download in the format you need' },
      { value: '6.25% + local', label: 'Texas state sales tax, plus up to 2% local' },
      { value: 'No signup', label: 'What you type stays on your device' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Howdy, and thanks for stopping by. Nexora Solution is a software company that has been building business software since 2019. Our head office is in Multan, Pakistan, and we work with customers remotely, so a business in Houston or Dallas gets the same product as one anywhere else. We do not have a Texas office, and we would rather say so plainly.',
        'We make two kinds of things. The first is a set of free business tools that run in your browser: an invoice generator, a contractor invoice generator, a quotation generator, a thermal receipt generator and an invoice-on-letterhead tool. You pick United States as your region, add your sales tax, and download a PDF or an Excel file. You do not need an account.',
        'The second is the Nexora platform: cloud CRM, ERP and point-of-sale modules, plus custom software and mobile apps for companies that need something built around how they work. If you already use the free tools and your business is growing out of them, this is the next step.',
      ],
    },

    arts: {
      eyebrow: 'How Texas does business',
      heading: 'Texas bills by the hour, the part and the load',
      intro: 'Texas runs on contractors, repair shops, restaurants, haulers and independent consultants. Most of them are small crews that quote a job, do the work, and want to get paid quick. Here are the invoices y’all need most, and which free tool fits each one.',
      items: [
        { key: 'wrench', title: 'Contractors and home services', text: 'Roofers, plumbers, electricians and remodelers bill labor hours and materials on the same job. Put each on its own line, record deposits and payments, and send a clean PDF from the truck.' },
        { key: 'truck', title: 'Trucking and hauling', text: 'Owner-operators and small fleets invoice by load, mile or day. Add the pickup and delivery details in the notes and send a clean PDF the same day.' },
        { key: 'fork', title: 'Restaurants and food trucks', text: 'Catering orders and event bookings need a quote first and an invoice after. For the counter, the thermal receipt generator makes 58mm and 80mm receipt layouts.' },
        { key: 'home', title: 'Freelancers and consultants', text: 'Designers, developers and consultants working across Austin, Dallas and Houston can invoice by project or by hour and keep their payment details on every invoice.' },
      ],
    },

    business: {
      eyebrow: 'Free tools',
      heading: 'Pick the invoice or document you need',
      intro: 'Every tool uses the same editor. Choose United States as your region, set your tax, and download.',
      items: [
        { title: 'Contractor and auto-repair invoices', text: 'Labor hours and materials on separate lines, with the option to tax the parts and not the labor, plus your payment details.', label: 'Contractor invoice', to: '/tools/contractor-invoice-generator', cta: 'Open contractor invoice generator' },
        { title: 'Any invoice, in three steps', text: 'Add your business, your client and your line items, pick the tax, and download a PDF or an Excel file.', label: 'Invoice generator', to: '/tools/invoice-generator', cta: 'Open invoice generator' },
        { title: 'Estimates and quotes', text: 'Send a quotation to your customer, and turn it into an invoice when they say yes.', label: 'Quotation generator', to: '/tools/quotation-generator', cta: 'Open quotation generator' },
        { title: 'Receipts for the counter', text: 'Receipt layouts for 58mm and 80mm thermal printers, for a shop counter or a food truck window.', label: 'Thermal receipts', to: '/tools/thermal-receipt-generator', cta: 'Open receipt generator' },
        { title: 'Your own letterhead', text: 'Print an invoice onto paper that already has your logo and address.', label: 'Letterhead invoice', to: '/tools/invoice-on-letterhead', cta: 'Open letterhead tool' },
        { title: 'Sales teams and growing companies', text: 'Track leads, follow-ups and customers in a cloud CRM once spreadsheets stop being enough.', label: 'Nexora CRM', to: '/crm', cta: 'See Nexora CRM' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'Sales tax',
        heading: 'Texas sales tax on your invoice',
        paragraphs: [
          'The Texas state sales tax rate is 6.25%. Cities, counties and other local jurisdictions can add up to 2%, so the highest combined rate is 8.25%. The rate you charge depends on where the sale is sourced, so use the rate that applies to your customer’s location.',
          'In the free tools you add a tax line at the percentage you choose, and it appears on the invoice and in the total. The advanced editor lets you switch the tax off on individual lines, which is useful when you tax materials but not labor. Whether a particular service or repair is taxable in Texas is a question for the Texas Comptroller or your accountant. We are a software company, not a tax advisor, and the tools do not decide that for you.',
        ],
        links: [
          { to: 'https://comptroller.texas.gov/taxes/sales/', label: 'Texas Comptroller: sales tax' },
          { to: '/tools/contractor-invoice-generator', label: 'Contractor invoice example' },
        ],
      },
      {
        eyebrow: 'Beyond invoicing',
        heading: 'CRM, ERP and POS: what fits a Texas business today',
        paragraphs: [
          'The CRM, ERP and custom development work is location-independent, and we are happy to talk about it for a Texas company: leads and pipeline, internal tools, customer portals, mobile apps and integrations.',
          'Nexora’s point-of-sale modules were first built and tested for shops, restaurants and pharmacies in Pakistan. If you are looking for a POS for a Texas restaurant or store, talk to us before you sign up. Tell us how you handle tips, sales tax and receipt printers, and we will tell you honestly whether the module fits today or what a custom build would involve.',
        ],
      },
    ],

    why: {
      heading: 'Why Texans use Nexora’s free tools',
      items: [
        { title: 'Free, with no watermark', text: 'The invoice, quotation and receipt tools cost nothing and do not stamp our name over your documents.' },
        { title: 'Private by design', text: 'The tools run in your browser. What you type stays on your device, and you do not create an account.' },
        { title: 'PDF and Excel', text: 'Download a PDF to send, or an Excel file when your accountant wants the numbers.' },
        { title: 'US region built in', text: 'Pick United States and you get USD, an EIN field and a sales tax line instead of GST or VAT.' },
        { title: 'Estimate to invoice', text: 'Quote a job, then turn the same document into an invoice instead of typing it twice.' },
        { title: 'A real company behind it', text: 'Nexora has been building business software since 2019, and the same team can build you something custom.' },
      ],
    },

    areas: {
      heading: 'Free tools from Houston to El Paso',
      text: 'The tools run in a browser, so they work the same in every part of the state. Contractors, shops and freelancers use invoice generators in all of the cities below, and the CRM and custom software work is done remotely wherever you are.',
      list: ['Houston', 'Dallas', 'Fort Worth', 'Austin', 'San Antonio', 'El Paso', 'Plano', 'Arlington', 'Corpus Christi', 'Lubbock'],
    },

    stepsHeading: 'Get your first invoice done in three steps',
    steps: [
      { title: 'Open the invoice generator', text: 'Choose the invoice, contractor invoice or quotation tool. No account is needed.' },
      { title: 'Choose United States and add tax', text: 'Add your business and client details, your line items and your Texas sales tax rate.' },
      { title: 'Download the PDF or Excel file', text: 'Send it to your customer, and keep a copy for your records.' },
    ],

    faqHeading: 'Questions from Texas businesses',
    faqs: [
      { q: 'Is the Texas invoice generator really free?', a: 'Yes. The invoice, quotation, receipt and letterhead tools are free, with no signup and no watermark. You can download your documents as PDF or Excel files.' },
      { q: 'Does it add Texas sales tax?', a: 'You choose the tax percentage. The Texas state rate is 6.25%, local jurisdictions can add up to 2%, and the highest combined rate is 8.25%. Check the rate for your customer’s location with the Texas Comptroller. We do not give tax advice.' },
      { q: 'Which Texas businesses can use it?', a: 'Contractors, home service companies, repair shops, haulers, caterers, freelancers and consultants. Any business that bills for labor, parts or projects can use it.' },
      { q: 'Can I make an estimate and turn it into an invoice?', a: 'Yes. Create a quotation, send it to your customer, and when they accept, turn the same document into an invoice.' },
      { q: 'Does Nexora have an office in Texas?', a: 'No. Our head office is in Multan, Pakistan, and we work with US customers remotely, by WhatsApp and email. The free tools need no support at all, and we answer questions about CRM, ERP and custom software on request.' },
      { q: 'Can I use Nexora’s POS for a Texas restaurant or store?', a: 'Talk to us first. The POS modules were built for Pakistani businesses, so tell us about your tipping, sales tax and printer needs, and we will say honestly whether it fits today.' },
      { q: 'Do you build custom software for Texas companies?', a: 'Yes. We build CRM, ERP, mobile apps, online stores and integrations, working remotely. Describe what you need and we will tell you what it would involve.' },
      { q: 'Where is my invoice data stored?', a: 'The free tools run in your browser. What you type stays on your device, and you do not need an account to use them.' },
    ],

    ctaHeading: 'Ready to get ’er done, y’all?',
    ctaSubtext: 'Open the free invoice generator and have your first Texas invoice done in minutes, or message us about CRM, ERP or custom software for your company.',
    cta: {
      primary: { label: 'Make a free invoice', to: '/tools/invoice-generator' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Remote-first. We work with Texas businesses online.',
  },
  {
    slug: 'coimbatore',
    name: 'Coimbatore',
    nameLocal: 'கோயம்புத்தூர்',
    parent: { to: '/india', label: 'India' },
    theme: { primary: '#166534', accent: '#e0a100', warm: '#b3121e' },

    seoTitle: 'Restaurant Billing Software in Coimbatore | Nexora',
    seoDescription: 'Restaurant POS and billing software for Coimbatore: KOT, tables, a GST tax line and offline billing. Plus retail, pharmacy and school software. Free trial.',
    seoKeywords: 'restaurant billing software in Coimbatore, billing software in Coimbatore, supermarket billing software Coimbatore, kirana billing software Coimbatore, GST billing software Coimbatore, POS software Coimbatore, pharmacy billing software Coimbatore',

    hero: {
      eyebrow: 'வணக்கம் கோவை · Vanakkam, Kovai',
      headingA: 'Restaurant billing software',
      headingB: 'in Coimbatore',
      subtitle: 'Vanakkam! Nexora’s Restaurant POS handles KOT, tables, bills with a GST tax line and offline billing, so your counter keeps moving in Gandhipuram, RS Puram, Peelamedu or anywhere in Kovai. We also make retail, pharmacy and school software, and a free GST invoice tool.',
      primaryCta: { label: 'Start the free trial', to: '/restaurant-pos' },
      secondaryCta: { label: 'Free GST invoice generator', to: '/tools/gst-invoice-generator' },
    },

    facts: [
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'Offline', label: 'Restaurant POS keeps billing without internet' },
      { value: 'GST', label: 'A GST-labelled tax line on every bill' },
      { value: 'Free', label: 'GST invoice generator, no signup' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Vanakkam, and welcome. Nexora Solution is a software company that has been building business software since 2019. Our head office is in Multan, Pakistan, and we work with customers remotely. We do not have a Coimbatore office, and we would rather say that plainly than pretend.',
        'The Nexora platform is one login with several modules: Restaurant POS, Retail POS, Pharmacy POS (PharmaFlow), School ERP, CRM, WhatsApp CRM and a Transport and Fleet module. You choose the one your business needs, add your team, and give each person only the screens their job requires. For restaurants the key parts are KOT and kitchen display, table management, split and merged bills, and a POS that keeps taking orders when the internet drops.',
        'We also build custom software and mobile apps, and we offer a set of free tools that run in your browser. One of them is a GST invoice generator with CGST, SGST and IGST lines, which many Coimbatore traders and workshops can start using today with no account.',
      ],
    },

    arts: {
      eyebrow: 'நம்ம கோவை · Namma Kovai',
      heading: 'Kovai runs on mills, motors and good food',
      intro: 'Coimbatore is called the Manchester of South India for its textile mills, and it is just as well known for pumps, motors and engineering workshops. It is also a city that takes its food seriously: Kongu meals on a banana leaf, filter coffee, bakeries and biryani. Whatever the trade, the work is the same: bill fast, keep stock right, and get the GST paperwork clean.',
      items: [
        { key: 'meal', title: 'Meals, bakeries and filter coffee', text: 'Mess halls, family restaurants, bakeries and coffee shops all have a rush hour. KOT, table view and fast bills keep the line moving, and the kitchen sees each order as it comes in.' },
        { key: 'cart', title: 'Kirana shops and supermarkets', text: 'Neighbourhood grocery stores and supermarkets need barcode billing, stock levels and a customer ledger for the regulars who pay at month end.' },
        { key: 'cog', title: 'Pumps, motors and workshops', text: 'Engineering units and workshops quote a job, deliver the work and invoice with GST. The quotation tool and GST invoice generator cover that without any software to install.' },
        { key: 'cloth', title: 'Textile and garment traders', text: 'Traders around Oppanakara Street and the mills send B2B invoices with GSTIN, HSN and place of supply. The free GST invoice generator handles CGST, SGST and IGST.' },
      ],
    },

    business: {
      eyebrow: 'Products',
      heading: 'Which Nexora module fits your Coimbatore business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add another later without starting over.',
      items: [
        { title: 'Restaurants, messes, bakeries and cafes', text: 'KOT and kitchen display, table management, split bills and offline-ready billing for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Kirana shops, supermarkets and showrooms', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Medical stores and pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts.', label: 'Pharmacy POS', to: '/pharmacy-pos' },
        { title: 'Schools, colleges and coaching centres', text: 'Student records, fee collection, attendance, exams, parent portal and staff payroll in one school ERP.', label: 'School ERP', to: '/school-erp' },
        { title: 'GST invoices for traders and workshops', text: 'A free tool with GSTIN, CGST, SGST and IGST lines, a UPI QR option and amounts in lakh and crore.', label: 'GST invoice generator', to: '/tools/gst-invoice-generator', cta: 'Open the free tool' },
        { title: 'Sales teams and growing companies', text: 'Track leads, follow-ups and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'GST',
        heading: 'GST on your restaurant bill, and what to check first',
        paragraphs: [
          'In the Restaurant POS you set a tax rate and label it GST, and it shows as a line on the bill and in the total. You can also add a service charge. The POS uses a single tax rate on a bill.',
          'If your business needs the tax shown as separate CGST and SGST on the printed bill, or reports prepared for GST returns, ask us before you sign up and we will tell you honestly whether it is covered today. For B2B invoices with CGST, SGST and IGST lines, the free GST invoice generator already does that. We are a software company, not a tax advisor, so confirm rates and rules with your chartered accountant.',
        ],
        links: [
          { to: '/tools/gst-invoice-generator', label: 'GST invoice generator' },
          { to: '/restaurant-pos', label: 'Restaurant POS' },
        ],
      },
    ],

    why: {
      heading: 'Why Coimbatore businesses try Nexora',
      items: [
        { title: 'Keeps billing when the internet drops', text: 'The Restaurant POS keeps taking orders offline and syncs when the connection returns.' },
        { title: 'Free month, no card', text: 'Every plan starts with a 1-month free trial, free setup, free data migration and free staff training.' },
        { title: 'One account, several modules', text: 'Start with the restaurant POS, and add retail, CRM or school software later on the same login.' },
        { title: 'Roles and permissions', text: 'A cashier sees billing, a manager sees reports, and the owner sees everything.' },
        { title: 'See sales from your phone', text: 'The owner can check the day’s sales and stock from anywhere, not just at the counter.' },
        { title: 'Free GST tool', text: 'Make GST invoices and download them as PDF or Excel with no signup and no watermark.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every part of Kovai',
      text: 'Nexora opens in a browser, so it works the same wherever your shop, restaurant or office is. Businesses can use it from Gandhipuram, RS Puram, Peelamedu, Saibaba Colony, Race Course, Singanallur, Ukkadam, Town Hall, Avinashi Road and Saravanampatti, as well as from the rest of Tamil Nadu and India. Setup, data migration and staff training are free on every plan.',
      list: ['Gandhipuram', 'RS Puram', 'Peelamedu', 'Saibaba Colony', 'Race Course', 'Singanallur', 'Ukkadam', 'Town Hall', 'Avinashi Road', 'Saravanampatti'],
    },

    pricingNote: 'Plans are listed in Pakistani rupees on the pricing page for now. Message us and we will confirm the current price for India.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Message us on WhatsApp', text: 'Tell us what kind of business you run and how many people use the counter.' },
      { title: 'Start the free month', text: 'Create your account, pick the module, and add your menu, products or customers. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test bills, and start billing for real.' },
    ],

    faqHeading: 'Questions from Coimbatore businesses',
    faqs: [
      { q: 'Which is the best restaurant billing software in Coimbatore?', a: 'It depends on your restaurant, so try before you decide. Nexora’s Restaurant POS covers KOT, kitchen display, table management and billing with a GST-labelled tax line, works offline, and comes with a free first month so you can run it in your own restaurant.' },
      { q: 'Does Nexora have an office in Coimbatore?', a: 'No. Our head office is in Multan, Pakistan, and we support customers remotely by WhatsApp and email. The software is cloud-based, so it works the same anywhere.' },
      { q: 'Does the POS show CGST and SGST separately?', a: 'The Restaurant POS applies one tax rate that you label GST, plus an optional service charge. If you need CGST and SGST shown separately on the printed bill, ask us first. For B2B invoices, the free GST invoice generator has CGST, SGST and IGST lines.' },
      { q: 'Can I use Nexora for a kirana shop or supermarket?', a: 'Yes. The Retail POS handles barcode billing, multi-counter checkout, stock control, suppliers and a customer ledger.' },
      { q: 'Does it work when the internet is down?', a: 'The Restaurant POS keeps billing offline and syncs when the connection returns. Other modules are cloud-based and need internet.' },
      { q: 'How much does it cost in India?', a: 'Every plan starts with a 1-month free trial. The pricing page currently shows plans in Pakistani rupees, so message us and we will confirm the current price for India.' },
      { q: 'Is the GST invoice generator really free?', a: 'Yes. It is free with no signup and no watermark, and you can download PDF or Excel. What you type stays on your device.' },
      { q: 'Do you build custom software for businesses in Coimbatore?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations, working remotely. Tell us what you need and we will say what it would involve.' },
    ],

    ctaHeading: 'வாங்க, தொடங்கலாம்! Ready to start in Kovai?',
    ctaSubtext: 'Start the free month today, or message us and we will show you the module that fits your restaurant, shop, workshop or school.',
    cta: {
      primary: { label: 'Start the free trial', to: '/restaurant-pos' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Remote-first. We work with Coimbatore businesses online.',
  },
  {
    slug: 'lahore',
    name: 'Lahore',
    nameLocal: 'لاہور',
    parent: { to: '/pakistan', label: 'Pakistan' },
    theme: { primary: '#0f6b4a', accent: '#c9a227', warm: '#8c3b2a' },

    seoTitle: 'Pharmacy Software in Lahore | Medical Store POS | Nexora',
    seoDescription: 'Pharmacy POS for Lahore medical stores: batch and expiry tracking, supplier purchases and itemized receipts. Plus school ERP and restaurant POS software.',
    seoKeywords: 'pharmacy software in Lahore, medical store software Lahore, pharmacy POS Lahore, pharmacy management software Lahore, school management software Lahore, restaurant POS Lahore, POS software in Lahore',

    hero: {
      eyebrow: 'لاہور لاہور اے · Lahore Lahore ae',
      headingA: 'Pharmacy software',
      headingB: 'in Lahore',
      subtitle: 'Nexora’s Pharmacy POS (PharmaFlow) gives Lahore medical stores fast medicine search, batch and expiry tracking, supplier purchases and itemized receipts. We also make school ERP and restaurant POS, and our team works from Pakistan, so support comes in Urdu and English.',
      primaryCta: { label: 'Start the free trial', to: '/pharmacy-pos' },
      secondaryCta: { label: 'See Restaurant POS', to: '/restaurant-pos' },
    },

    facts: [
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'Expiry', label: 'Batch and near-expiry tracking for medicines' },
      { value: 'PKR', label: 'Plans priced in Pakistani rupees' },
      { value: 'Urdu + English', label: 'Support by WhatsApp and email' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Assalam-o-alaikum, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We work with customers in Lahore remotely, by WhatsApp, phone and email. We do not have a Lahore office, and we would rather say so plainly.',
        'The Nexora platform is one login with several modules: Restaurant POS, Retail POS, Pharmacy POS (PharmaFlow), School ERP, CRM, WhatsApp CRM and a Transport and Fleet module. You choose the one your business needs, add your team, and give each person only the screens their job requires. For a pharmacy that means medicine search at the counter, stock with batches and expiry dates, supplier purchases and a receipt for every sale.',
        'We also build custom software and mobile apps, and we offer free business tools that run in your browser, including invoice and quotation generators. If you are a Lahore business looking for a software house that can both sell you a working product today and build what is missing, that is the gap we fill.',
      ],
    },

    arts: {
      eyebrow: 'لاہور · The city we build for',
      heading: 'Lahore is a city of hospitals, schools and bazaars',
      intro: 'Lahore is the cultural capital of Pakistan. The Walled City, the Badshahi Mosque, Lahore Fort and Shalimar Gardens have drawn visitors for centuries, and the city is still crowded with trade: Anarkali, Liberty Market, Urdu Bazaar and the food streets. It is also a city of big hospitals, universities, schools and academies. Whatever the trade, a Lahore business needs to bill fast, keep stock right, and know what happened today.',
      items: [
        { key: 'pill', title: 'Pharmacies and clinics', text: 'Medical stores sit next to every large hospital and in every neighbourhood. They need fast medicine search, batch and expiry dates, supplier purchases and receipts that show every item.' },
        { key: 'book', title: 'Schools, academies and tuition centres', text: 'Lahore’s schools, colleges and academies collect fees, track attendance, run exams and talk to parents every week. A school ERP keeps all of it in one place.' },
        { key: 'dish', title: 'Restaurants and the food streets', text: 'From Gawalmandi and Fort Road to cafes in Gulberg and DHA, Lahore eats late and in a rush. KOT, table view and fast bills keep the kitchen and the counter in step.' },
        { key: 'bazaar', title: 'Bazaars and retail shops', text: 'Cloth, books, shoes, mobiles and groceries sell all day in Anarkali, Liberty and Urdu Bazaar. Barcode billing, stock levels and a customer ledger keep a busy shop accurate.' },
      ],
    },

    business: {
      eyebrow: 'Products',
      heading: 'Which Nexora module fits your Lahore business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add another later without starting over.',
      items: [
        { title: 'Medical stores and pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts at the counter.', label: 'Pharmacy POS', to: '/pharmacy-pos' },
        { title: 'Schools, colleges and academies', text: 'Student records, fee collection, attendance, exams, parent portal and staff payroll in one school ERP.', label: 'School ERP', to: '/school-erp' },
        { title: 'Restaurants, cafes and bakeries', text: 'KOT and kitchen display, table management, split bills and offline-ready billing for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Retail shops and marts', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Transport and rent-a-car', text: 'Vehicles, rental bookings, customer ledgers, payments and dues managed from one fleet workspace.', label: 'Transport & Fleet', to: '/transport-fleet' },
        { title: 'Sales teams and traders', text: 'Track leads, follow-ups and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'FBR and PRA',
        heading: 'Tax rules in Punjab, and what to check first',
        paragraphs: [
          'Many Lahore businesses have to follow FBR or Punjab Revenue Authority rules for POS invoicing, and those rules have been changing. The Restaurant POS lets you set tax labels such as PRA Sales Tax and record your FBR POS ID in the settings. Nexora does not currently send your invoices to FBR or PRA automatically.',
          'If you need live FBR or PRA integration, ask us before you sign up and we will tell you honestly what is covered today. We are a software company, not a tax advisor, so confirm your obligations with the FBR, the PRA or your accountant.',
        ],
        links: [
          { to: '/blog/fbr-pos-integration-guide-pakistan', label: 'Read: FBR POS integration' },
          { to: '/restaurant-pos', label: 'Restaurant POS' },
        ],
      },
    ],

    why: {
      heading: 'Why Lahore businesses try Nexora',
      items: [
        { title: 'Urdu and English support', text: 'Message us on WhatsApp or call, and you reach the people who build and support the product.' },
        { title: 'Expiry stays in view', text: 'Pharmacy POS watches batches and near-expiry medicines so stock does not quietly become a loss.' },
        { title: 'Works through load-shedding', text: 'The Restaurant POS keeps taking orders offline and syncs when the connection returns.' },
        { title: 'Pakistani payments', text: 'Record cash, card, JazzCash, Easypaisa and bank transfer sales. Nexora plans can be paid by JazzCash, Easypaisa or bank transfer.' },
        { title: 'Rupee pricing, free month first', text: 'Every plan starts with a free month, free setup, free data migration and free staff training.' },
        { title: 'Roles and permissions', text: 'A cashier sees billing, a manager sees reports, and the owner sees everything, from a phone or a laptop.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every part of Lahore',
      text: 'Nexora opens in a browser, so it works the same wherever your shop, pharmacy, school or office is. Businesses can use it from Gulberg, DHA, Johar Town, Model Town, Bahria Town, Allama Iqbal Town, Wapda Town, Shadman, Garden Town, Samanabad, Township and Lahore Cantt, as well as from the Walled City, Mall Road and the rest of Punjab. Setup, data migration and staff training are free on every plan.',
      list: ['Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Bahria Town', 'Allama Iqbal Town', 'Wapda Town', 'Shadman', 'Garden Town', 'Samanabad', 'Township', 'Lahore Cantt'],
    },

    pricingHeading: 'Simple pricing in rupees',
    pricingNote: 'Every plan includes a 1-month free trial, free setup, free data migration and free staff training. Full details are on the pricing page.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Message us on WhatsApp', text: 'Tell us what kind of business you run and how many people use the counter or the office.' },
      { title: 'Start the free month', text: 'Create your account, pick the module, and add your medicines, students, menu or products. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test bills, and start working for real.' },
    ],

    faqHeading: 'Questions from Lahore businesses',
    faqs: [
      { q: 'Which is the best pharmacy software in Lahore?', a: 'It depends on your store, so try before you decide. Nexora’s Pharmacy POS (PharmaFlow) covers medicine search, batch and expiry tracking, supplier purchases and itemized receipts, and comes with a free first month so you can run it at your own counter.' },
      { q: 'Does Nexora have an office in Lahore?', a: 'No. Our head office is at Al Noor Plaza, Multan, and we support Lahore customers by WhatsApp, phone and email. The software is cloud-based, so it works the same anywhere in Pakistan.' },
      { q: 'Does Nexora connect to FBR or PRA?', a: 'Not automatically. The Restaurant POS has tax labels such as PRA Sales Tax and a field for your FBR POS ID, but it does not send invoices to FBR or PRA by itself. If you need live integration, ask us first. We are not tax advisors, so confirm your obligations with the authority or your accountant.' },
      { q: 'Can a school or academy in Lahore manage fees and attendance with Nexora?', a: 'Yes. The School ERP covers student and parent records, fee collection, attendance (manual or with a biometric device), exams and staff payroll.' },
      { q: 'Does it work when there is load-shedding or no internet?', a: 'The Restaurant POS keeps billing offline and syncs when the connection returns. The other modules are cloud-based and need an internet connection.' },
      { q: 'How much does Nexora cost in Lahore?', a: `${planPriceSentence()} Every plan includes a 1-month free trial, and prices are in Pakistani rupees.` },
      { q: 'Can I use Nexora for a restaurant, cafe or retail shop in Lahore?', a: 'Yes. The Restaurant POS covers KOT, kitchen display, table management and billing, and the Retail POS covers barcode billing, multi-counter checkout, stock and a customer ledger.' },
      { q: 'Do you build custom software for businesses in Lahore?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need on WhatsApp and we will say what it would involve.' },
    ],

    ctaHeading: 'آؤ جی، شروع کریئے · Ready to start in Lahore?',
    ctaSubtext: 'Start the free month today, or message us and we will show you the module that fits your pharmacy, school, restaurant or shop.',
    cta: {
      primary: { label: 'Start the free trial', to: '/pharmacy-pos' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Our head office is in Multan. We work with Lahore businesses by WhatsApp, phone and email.',
  },
  {
    slug: 'uk',
    name: 'United Kingdom',
    nameLocal: 'Cymru · Alba · England',
    parent: null,
    theme: { primary: '#14213d', accent: '#b8860b', warm: '#c8102e' },

    seoTitle: 'Free Invoice Generator UK & Business Software | Nexora',
    seoDescription: 'Free UK invoice generator with VAT and CIS deduction, PDF or Excel, no signup. Plus POS, CRM and ERP software from Nexora with a free first month.',
    seoKeywords: 'free invoice generator UK, CIS invoice generator, sole trader invoice template, UK invoice template, self-employed invoice, VAT invoice generator, business software UK, POS software UK',

    hero: {
      eyebrow: 'Free tools · POS · CRM · ERP',
      headingA: 'A free invoice generator',
      headingB: 'for UK businesses',
      subtitle: 'Make an invoice in pounds with VAT and the CIS deduction, then download a PDF or Excel file with no signup. When you outgrow single documents, Nexora also makes POS, CRM and ERP software for cafes, shops, tradespeople and schools. We are a software company from Pakistan and we work with UK customers online.',
      primaryCta: { label: 'Free CIS invoice generator', to: '/tools/cis-invoice-generator' },
      secondaryCta: { label: 'Free invoice generator', to: '/tools/invoice-generator' },
    },

    facts: [
      { value: '£ GBP', label: 'Invoices open in pounds with British dates' },
      { value: 'VAT + CIS', label: 'VAT and the CIS deduction on one invoice' },
      { value: 'No signup', label: 'Free tools, no watermark, data stays on your device' },
      { value: '1 month', label: 'Free trial on every Nexora plan' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Hello, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We do not have an office in the United Kingdom, and we would rather tell you that plainly than let a flag on a page suggest otherwise. We work with UK customers online, by WhatsApp and email.',
        'The Nexora platform is one login with several modules: Restaurant POS, Retail POS, Pharmacy POS, School ERP, CRM, WhatsApp CRM, Transport and Fleet, and Property ERP. You pick the module your business needs, add your team, and give each person only the screens their job requires. Nexora AI is built into the modules, and we also make custom software, ERP systems, mobile apps and online stores.',
        'We start with free tools because most small UK businesses need a good invoice before they need software. The free invoice generator and the CIS invoice generator run in your browser, so what you type stays on your device. If you later want billing, stock, customers and staff in one place, the platform is there with a free first month.',
      ],
    },

    arts: {
      eyebrow: 'Britain, in brief',
      heading: 'From the corner shop to the building site',
      intro: 'Britain runs on small businesses: the corner shop, the pub with a kitchen, the café that does a proper breakfast, and the sole trader with a van who is on site by seven. Many of them invoice from a spreadsheet and keep the receipts in a shoebox. Their paperwork has its own rules, from VAT to the Construction Industry Scheme, and a tool that fits those rules saves real time on a Friday afternoon.',
      items: [
        { key: 'trade', title: 'Tradespeople and subcontractors', text: 'Electricians, plasterers, joiners and builders bill labour and materials, and many work under the Construction Industry Scheme. An invoice that shows VAT and the deduction clearly gets paid with fewer phone calls.' },
        { key: 'cafe', title: 'Cafes, pubs and takeaways', text: 'Tables, tabs, kitchen tickets and a till that does not freeze at the Sunday lunch rush. The Restaurant POS covers KOT, kitchen display and split bills.' },
        { key: 'shop', title: 'Corner shops and high-street retail', text: 'Barcode scanning, stock levels, suppliers and a customer ledger, from the newsagent to the independent gift shop.' },
        { key: 'school', title: 'Schools, tutors and clubs', text: 'Fees, attendance, exams and parent messages for independent schools, tuition centres and after-school clubs, in one place.' },
      ],
    },

    business: {
      eyebrow: 'Free tools and products',
      heading: 'Start free, then add what your business needs',
      intro: 'The free tools need no account. The platform modules share one Nexora login, so you can add another later without starting over.',
      items: [
        { title: 'CIS and trade invoices', text: 'Labour and materials on separate lines, VAT where it applies, and the CIS deduction shown before the amount payable.', label: 'CIS invoice generator', to: '/tools/cis-invoice-generator', cta: 'Make a CIS invoice' },
        { title: 'Sole traders and small firms', text: 'A plain UK invoice with an optional VAT number, sort code and account number, as PDF or Excel.', label: 'Free invoice generator', to: '/tools/invoice-generator', cta: 'Make an invoice' },
        { title: 'Cafes, pubs and takeaways', text: 'KOT and kitchen display, table management, split bills and offline-ready billing.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Shops and retailers', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Sales teams and agencies', text: 'Leads, customers, invoices and follow-ups in a CRM, with WhatsApp conversations in a shared inbox.', label: 'CRM', to: '/crm' },
        { title: 'Schools and tuition centres', text: 'Student records, fees, attendance, exams, parent portal and staff payroll.', label: 'School ERP', to: '/school-erp' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'VAT, CIS and what we cover',
        heading: 'What to check before you rely on Nexora in the UK',
        paragraphs: [
          'The free invoice tools show VAT, a CIS deduction and the amount payable, and they open in pounds with British dates. They make documents only. They do not submit anything to HMRC, file CIS returns or make Making Tax Digital submissions, and Nexora does not currently connect to Xero, QuickBooks or Sage.',
          'The platform plans are priced in Pakistani rupees for now, and the POS modules were built first for Pakistan. The Restaurant POS applies one tax rate that you can label VAT; if you need something more specific, such as tips or a particular receipt layout, ask us first and we will say honestly what is covered today. We are a software company, not tax advisors, so check VAT and CIS rules on GOV.UK or with your accountant.',
        ],
        links: [
          { to: '/tools/cis-invoice-generator', label: 'CIS invoice generator' },
          { to: '/restaurant-pos', label: 'Restaurant POS' },
        ],
      },
    ],

    why: {
      heading: 'Why UK businesses try Nexora',
      items: [
        { title: 'Free to start', text: 'The invoice tools are free with no signup, no watermark and no trial that runs out.' },
        { title: 'Your data stays with you', text: 'The free tools keep your documents in your own browser instead of on our servers.' },
        { title: 'One account, several modules', text: 'Start with the till or the CRM, and add retail, school or fleet later on the same login.' },
        { title: 'Free month, no card', text: 'Every plan starts with a 1-month free trial, free setup, free data migration and free staff training.' },
        { title: 'Roles and permissions', text: 'A cashier sees billing, a manager sees reports, and the owner sees everything.' },
        { title: 'Software we can build', text: 'If a module does not fit, we build custom software, mobile apps and integrations.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every part of the UK',
      text: 'Nexora opens in a browser, so it works the same wherever your shop, site or office is. Businesses can use the free tools and the platform from London, Manchester, Birmingham, Leeds, Glasgow, Edinburgh, Cardiff, Belfast, Bristol, Liverpool, Sheffield and Newcastle, and from every town in between, across England, Scotland, Wales and Northern Ireland.',
      list: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Edinburgh', 'Cardiff', 'Belfast', 'Bristol', 'Liverpool', 'Sheffield', 'Newcastle'],
    },

    pricingNote: 'Plans are listed in Pakistani rupees on the pricing page for now. Message us and we will confirm the current price in pounds.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Open a free tool', text: 'Make your first invoice in a few minutes. There is nothing to sign up for.' },
      { title: 'Start the free month', text: 'When you want billing, stock or customers in one place, create an account and pick a module.' },
      { title: 'Message us if you need help', text: 'Ask on WhatsApp or email about setup, moving your data or what is covered today.' },
    ],

    faqHeading: 'Questions from UK businesses',
    faqs: [
      { q: 'Is there a free CIS invoice generator?', a: 'Yes. Nexora’s CIS invoice generator is free with no signup and no watermark. It shows labour and materials on separate lines, VAT if you add it, and the CIS deduction before the amount payable, and you can download a PDF or Excel file.' },
      { q: 'Can a sole trader use the free invoice generator?', a: 'Yes. It works for sole traders and small firms, opens in pounds with British dates, and treats the VAT number as optional. Leave VAT off if you are not registered.' },
      { q: 'Does Nexora have an office in the UK?', a: 'No. Our head office is at Al Noor Plaza, Multan, and we support customers online by WhatsApp and email. The software runs in a browser, so it works the same anywhere.' },
      { q: 'Does Nexora connect to HMRC, Xero or QuickBooks?', a: 'Not at the moment. The free tools make invoices only, and Nexora does not file returns or make Making Tax Digital submissions. You still file through your own accounting software or accountant.' },
      { q: 'How much does Nexora cost in pounds?', a: 'Every plan starts with a 1-month free trial, but the pricing page currently shows plans in Pakistani rupees. Message us and we will confirm the current price in pounds.' },
      { q: 'Is the Restaurant POS ready for a UK cafe or pub?', a: 'It covers KOT, kitchen display, table management, split bills and billing with one tax rate you can label VAT, and it keeps working offline. It was built first for Pakistan, so ask us about tips or a specific receipt layout before you sign up.' },
      { q: 'Can I use Nexora for a shop, school or agency?', a: 'Yes. The Retail POS, School ERP and CRM run on the same account, and you can add them later without starting over.' },
      { q: 'Do you build custom software for UK companies?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations, working remotely. Tell us what you need and we will say what it would involve.' },
    ],

    ctaHeading: 'Ready to get started? Cheers.',
    ctaSubtext: 'Make an invoice for free today, or start the free month and we will show you the module that fits your café, shop, trade or school.',
    cta: {
      primary: { label: 'Start the free trial', to: '/restaurant-pos' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Remote-first. We work with UK businesses online.',
  },
  {
    slug: 'toronto',
    name: 'Toronto',
    nameLocal: 'Bienvenue · Welcome',
    parent: { to: '/canada', label: 'Canada' },
    theme: { primary: '#b3141c', accent: '#0e5a8a', warm: '#b3141c' },

    seoTitle: 'Free HST Invoice Generator Toronto & Ontario | Nexora',
    seoDescription: 'Free invoice generator for Toronto and Ontario businesses: add 13% HST, bill in CAD, download PDF or Excel with no signup. Plus POS, CRM and ERP software.',
    seoKeywords: 'invoice template Ontario, free invoice generator Ontario, HST invoice generator, free invoice generator Toronto, Toronto contractor invoice, restaurant POS Toronto, business software Toronto',

    hero: {
      eyebrow: 'Bienvenue · Welcome · Toronto',
      headingA: 'A free HST invoice generator',
      headingB: 'for Toronto and Ontario',
      subtitle: 'Make an invoice in Canadian dollars, add HST to the lines that need it, and download a PDF or Excel file with no signup. When single documents are not enough, Nexora also makes POS, CRM and ERP software for restaurants, shops, contractors and schools. We are a software company from Pakistan and we work with Toronto customers online.',
      primaryCta: { label: 'Free invoice generator', to: '/tools/invoice-generator' },
      secondaryCta: { label: 'Contractor invoice generator', to: '/tools/contractor-invoice-generator' },
    },

    facts: [
      { value: 'CAD', label: 'Invoices in Canadian dollars, with any 160+ currency on offer' },
      { value: 'HST 13%', label: 'Add Ontario HST under Taxes, on the lines you choose' },
      { value: 'No signup', label: 'Free tools, no watermark, data stays on your device' },
      { value: '1 month', label: 'Free trial on every Nexora plan' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Hello, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We do not have an office in Toronto or anywhere else in Canada, and we would rather say so plainly. We work with Canadian customers online, by WhatsApp and email.',
        'The Nexora platform is one login with several modules: Restaurant POS, Retail POS, Pharmacy POS, School ERP, CRM, WhatsApp CRM, Transport and Fleet, and Property ERP. You pick the module your business needs, add your team, and give each person only the screens their job requires. Nexora AI is built into the modules, and we also make custom software, ERP systems, mobile apps and online stores.',
        'Most small businesses in the Greater Toronto Area need a clean invoice before they need software, so we start with free tools. The invoice generators run in your browser, so what you type stays on your device. If you later want billing, stock, customers and staff in one place, the platform is there with a free first month.',
      ],
    },

    arts: {
      eyebrow: 'The city we build for',
      heading: 'Toronto runs on small businesses from every corner of the world',
      intro: 'Toronto is one of the most multicultural cities on earth. You can eat your way from Chinatown on Spadina to Little India on Gerrard, from Greektown on the Danforth to the stalls of St. Lawrence Market and the laneways of Kensington Market. The same variety shows up in the work: restaurants and bakeries, renovation crews across the GTA, independent shops on Queen West and tutors and schools in every neighbourhood. Many of them invoice from a template and chase the HST by hand.',
      items: [
        { key: 'dish', title: 'Restaurants, bakeries and food stalls', text: 'Dine-in, takeout and delivery all at once. The Restaurant POS covers KOT, kitchen display, tables, split bills and offline-ready billing.' },
        { key: 'hammer', title: 'Contractors and renovation crews', text: 'Labour and materials on separate lines, with HST on the lines that carry it. The contractor invoice generator is built for that.' },
        { key: 'shop', title: 'Independent shops and markets', text: 'From Queen West boutiques to market stalls: barcode billing, stock levels, suppliers and a customer ledger.' },
        { key: 'school', title: 'Schools, tutors and language centres', text: 'Fees, attendance, exams and parent messages in one School ERP, for tuition centres and community schools.' },
      ],
    },

    business: {
      eyebrow: 'Free tools and products',
      heading: 'Start free, then add what your business needs',
      intro: 'The free tools need no account. The platform modules share one Nexora login, so you can add another later without starting over.',
      items: [
        { title: 'Invoices with HST', text: 'Add 13% HST under Taxes, bill in CAD and download a PDF or Excel file. No signup, no watermark.', label: 'Free invoice generator', to: '/tools/invoice-generator', cta: 'Make an invoice' },
        { title: 'Contractors and trades', text: 'Hours and materials on separate lines, with tax on chosen lines and a balance that shrinks as payments arrive.', label: 'Contractor invoice generator', to: '/tools/contractor-invoice-generator', cta: 'Bill a job' },
        { title: 'Restaurants and cafes', text: 'KOT and kitchen display, table management, split bills and offline-ready billing.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Shops and retailers', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Sales teams and agencies', text: 'Leads, customers, invoices and follow-ups in a CRM, with WhatsApp conversations in a shared inbox.', label: 'CRM', to: '/crm' },
        { title: 'Schools and tutoring', text: 'Student records, fees, attendance, exams, parent portal and staff payroll.', label: 'School ERP', to: '/school-erp' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'HST and what we cover',
        heading: 'What to check before you rely on Nexora in Canada',
        paragraphs: [
          'Ontario’s HST is 13%. In the invoice generator you add it yourself under Taxes and switch it on for the lines it applies to; the tool does not look up rates, check whether you must register, or send anything to the Canada Revenue Agency. If you are unsure whether you have to collect HST, the CRA’s guidance on canada.ca or your accountant is the place to check.',
          'The platform plans are priced in Pakistani rupees for now, and the POS modules were built first for Pakistan. The Restaurant POS applies one tax rate that you can label HST; if you need tips, a particular receipt layout or something else, ask us first and we will say honestly what is covered today. We are a software company, not tax advisors.',
        ],
        links: [
          { to: '/tools/invoice-generator', label: 'Free invoice generator' },
          { to: '/restaurant-pos', label: 'Restaurant POS' },
        ],
      },
    ],

    why: {
      heading: 'Why Toronto businesses try Nexora',
      items: [
        { title: 'Free to start', text: 'The invoice tools are free with no signup, no watermark and no trial that runs out.' },
        { title: 'Your data stays with you', text: 'The free tools keep your documents in your own browser instead of on our servers.' },
        { title: 'One account, several modules', text: 'Start with the till or the CRM, and add retail, school or fleet later on the same login.' },
        { title: 'Free month, no card', text: 'Every plan starts with a 1-month free trial, free setup, free data migration and free staff training.' },
        { title: 'Roles and permissions', text: 'A cashier sees billing, a manager sees reports, and the owner sees everything.' },
        { title: 'Software we can build', text: 'If a module does not fit, we build custom software, mobile apps and integrations.' },
      ],
    },

    areas: {
      heading: 'Cloud software for the whole GTA',
      text: 'Nexora opens in a browser, so it works the same wherever your shop, site or office is. Businesses can use the free tools and the platform from Downtown, North York, Scarborough, Etobicoke, Mississauga, Brampton, Markham, Vaughan, Richmond Hill, Oakville, Hamilton and Ottawa, and from every town in Ontario.',
      list: ['Downtown Toronto', 'North York', 'Scarborough', 'Etobicoke', 'Mississauga', 'Brampton', 'Markham', 'Vaughan', 'Richmond Hill', 'Oakville', 'Hamilton', 'Ottawa'],
    },

    pricingNote: 'Plans are listed in Pakistani rupees on the pricing page for now. Message us and we will confirm the current price in Canadian dollars.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Open a free tool', text: 'Make your first invoice in a few minutes. There is nothing to sign up for.' },
      { title: 'Start the free month', text: 'When you want billing, stock or customers in one place, create an account and pick a module.' },
      { title: 'Message us if you need help', text: 'Ask on WhatsApp or email about setup, moving your data or what is covered today.' },
    ],

    faqHeading: 'Questions from Toronto businesses',
    faqs: [
      { q: 'Is there a free invoice generator for Ontario with HST?', a: 'Yes. Nexora’s invoice generator is free with no signup and no watermark. Bill in Canadian dollars, add HST at 13% under Taxes, choose which lines it applies to, and download a PDF or Excel file.' },
      { q: 'Does the tool work out HST for me?', a: 'It calculates the tax you add on each line, but it does not look up rates, decide whether you must register or file anything with the Canada Revenue Agency. Check canada.ca or ask your accountant.' },
      { q: 'Does Nexora have an office in Toronto?', a: 'No. Our head office is at Al Noor Plaza, Multan, and we support customers online by WhatsApp and email. The software runs in a browser, so it works the same anywhere in Canada.' },
      { q: 'Can a contractor bill labour and materials with HST?', a: 'Yes. The contractor invoice generator keeps labour and materials on separate lines and lets you switch tax on or off for each line.' },
      { q: 'How much does Nexora cost in Canadian dollars?', a: 'Every plan starts with a 1-month free trial, but the pricing page currently shows plans in Pakistani rupees. Message us and we will confirm the current price in Canadian dollars.' },
      { q: 'Is the Restaurant POS ready for a Toronto restaurant?', a: 'It covers KOT, kitchen display, table management, split bills and billing with one tax rate you can label HST, and it keeps working offline. It was built first for Pakistan, so ask us about tips or a specific receipt layout before you sign up.' },
      { q: 'Can I use Nexora for a shop, school or agency?', a: 'Yes. The Retail POS, School ERP and CRM run on the same account, and you can add them later without starting over.' },
      { q: 'Do you build custom software for Canadian companies?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations, working remotely. Tell us what you need and we will say what it would involve.' },
    ],

    ctaHeading: 'Ready to get started, eh?',
    ctaSubtext: 'Make an invoice for free today, or start the free month and we will show you the module that fits your restaurant, shop, crew or school.',
    cta: {
      primary: { label: 'Start the free trial', to: '/restaurant-pos' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Remote-first. We work with Toronto and Canadian businesses online.',
  },
  {
    slug: 'dhaka',
    name: 'Dhaka',
    nameLocal: 'ঢাকা',
    parent: null,
    theme: { primary: '#0b5d45', accent: '#d62839', warm: '#d62839' },

    seoTitle: 'Pharmacy Software in Dhaka, Bangladesh | Nexora',
    seoDescription: 'Pharmacy POS for Dhaka medicine shops with batch and expiry tracking, plus a free VAT invoice generator in BDT. Restaurant POS, CRM and ERP too.',
    seoKeywords: 'pharmacy software Bangladesh, pharmacy management software Dhaka, pharmacy POS software Bangladesh, free invoice generator Bangladesh, restaurant POS Dhaka, business software Dhaka',

    hero: {
      eyebrow: 'ঢাকায় স্বাগতম · Welcome to Dhaka',
      headingA: 'Pharmacy software',
      headingB: 'for Dhaka',
      subtitle: 'Nexora’s Pharmacy POS (PharmaFlow) gives medicine shops fast search, batch and expiry tracking, supplier purchases and itemised receipts. We also make a free invoice generator that works in BDT with VAT, plus restaurant POS, school ERP and CRM. We are a software company from Pakistan and we work with Bangladeshi customers online.',
      primaryCta: { label: 'Start the free trial', to: '/pharmacy-pos' },
      secondaryCta: { label: 'Free invoice generator', to: '/tools/invoice-generator' },
    },

    facts: [
      { value: 'Expiry', label: 'Batch and near-expiry tracking for medicines' },
      { value: 'BDT', label: 'Free invoices in taka, with any 160+ currency on offer' },
      { value: 'No signup', label: 'Free tools, no watermark, data stays on your device' },
      { value: '1 month', label: 'Free trial on every Nexora plan' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Assalamu alaikum, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We do not have an office in Dhaka or anywhere else in Bangladesh, and we would rather say so plainly. We work with Bangladeshi customers online, by WhatsApp and email.',
        'The Nexora platform is one login with several modules: Pharmacy POS (PharmaFlow), Restaurant POS, Retail POS, School ERP, CRM, WhatsApp CRM, Transport and Fleet, and Property ERP. You pick the module your business needs, add your team, and give each person only the screens their job requires. Nexora AI is built into the modules, and we also make custom software, ERP systems, mobile apps and online stores.',
        'Many small shops start with a paper bill book or a spreadsheet, so we begin with free tools. The invoice generator runs in your browser and keeps what you type on your own device. If you later want billing, stock, customers and staff in one place, the platform is there with a free first month.',
      ],
    },

    arts: {
      eyebrow: 'ঢাকা · The city we build for',
      heading: 'Dhaka is a city of rickshaws, riverboats and busy bazaars',
      intro: 'Dhaka has been a trading city for centuries. Old Dhaka’s lanes around Chawkbazar and Islampur still sell cloth, books and spices, the launches at Sadarghat cross the Buriganga all day, and Ahsan Manzil, Lalbagh Fort and Star Mosque are reminders of how old the city is. Painted rickshaws, nakshi kantha embroidery, Jamdani saris and alpona patterns give the city its colour. Behind every counter, a business needs to bill fast, keep stock right and know what happened today.',
      items: [
        { key: 'pill', title: 'Pharmacies and clinics', text: 'Medicine shops sit beside every hospital and in every neighbourhood. They need fast medicine search, batch and expiry dates, supplier purchases and receipts that list every item.' },
        { key: 'dish', title: 'Restaurants and the food lanes', text: 'From Old Dhaka’s biryani and bakarkhani to cafes in Gulshan and Dhanmondi, kitchens are busy and fast. KOT, table view and quick bills keep the kitchen and the counter in step.' },
        { key: 'shop', title: 'Bazaars, boutiques and retail', text: 'Cloth, Jamdani, shoes, books and groceries sell all day. Barcode billing, stock levels and a customer ledger keep a crowded shop accurate.' },
        { key: 'book', title: 'Schools, coaching centres and tutors', text: 'Fees, attendance, exams and parent messages for schools and coaching centres, in one School ERP.' },
      ],
    },

    business: {
      eyebrow: 'Products',
      heading: 'Which Nexora module fits your Dhaka business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add another later without starting over.',
      items: [
        { title: 'Medicine shops and pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemised receipts at the counter.', label: 'Pharmacy POS', to: '/pharmacy-pos' },
        { title: 'Invoices in taka with VAT', text: 'Choose BDT, add a VAT line under Taxes and download a PDF or Excel file. No signup, no watermark.', label: 'Free invoice generator', to: '/tools/invoice-generator', cta: 'Make an invoice' },
        { title: 'Restaurants, cafes and sweet shops', text: 'KOT and kitchen display, table management, split bills and offline-ready billing.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Retail shops and marts', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Schools and coaching centres', text: 'Student records, fees, attendance, exams, parent portal and staff payroll in one school ERP.', label: 'School ERP', to: '/school-erp' },
        { title: 'Sales teams and agencies', text: 'Leads, customers, invoices and follow-ups in a CRM, with WhatsApp conversations in a shared inbox.', label: 'CRM', to: '/crm' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'VAT, Mushak and what we cover',
        heading: 'What to check before you rely on Nexora in Bangladesh',
        paragraphs: [
          'In the invoice generator you choose BDT and add a VAT line yourself under Taxes; the standard VAT rate in Bangladesh is 15%, but your own rate can differ, so check with the National Board of Revenue (NBR) or your accountant. The tool does not produce the NBR’s Mushak forms, such as the Mushak 6.3 tax invoice, and it does not connect to the NBR.',
          'The platform plans are priced in Pakistani rupees for now, the interface is in English, and Nexora does not connect to bKash, Nagad or Rocket. The POS modules were built first for Pakistan. The Restaurant POS applies one tax rate that you can label VAT. If you need something specific, ask us first and we will say honestly what is covered today. We are a software company, not tax advisors.',
        ],
        links: [
          { to: '/tools/invoice-generator', label: 'Free invoice generator' },
          { to: '/pharmacy-pos', label: 'Pharmacy POS' },
        ],
      },
    ],

    why: {
      heading: 'Why Dhaka businesses try Nexora',
      items: [
        { title: 'Expiry stays in view', text: 'Pharmacy POS watches batches and near-expiry medicines so stock does not quietly become a loss.' },
        { title: 'Free to start', text: 'The invoice tool is free with no signup, no watermark and no trial that runs out.' },
        { title: 'Keeps billing when the internet drops', text: 'The Restaurant POS keeps taking orders offline and syncs when the connection returns.' },
        { title: 'Free month, no card', text: 'Every plan starts with a 1-month free trial, free setup, free data migration and free staff training.' },
        { title: 'Roles and permissions', text: 'A cashier sees billing, a manager sees reports, and the owner sees everything.' },
        { title: 'Software we can build', text: 'If a module does not fit, we build custom software, mobile apps and integrations.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every part of Dhaka',
      text: 'Nexora opens in a browser, so it works the same wherever your shop, pharmacy, school or office is. Businesses can use it from Gulshan, Banani, Dhanmondi, Mirpur, Uttara, Mohammadpur, Motijheel, Old Dhaka, Bashundhara, Badda, Farmgate and Tejgaon, and from Chattogram, Sylhet, Khulna, Rajshahi and the rest of Bangladesh.',
      list: ['Gulshan', 'Banani', 'Dhanmondi', 'Mirpur', 'Uttara', 'Mohammadpur', 'Motijheel', 'Old Dhaka', 'Bashundhara', 'Badda', 'Farmgate', 'Tejgaon'],
    },

    pricingNote: 'Plans are listed in Pakistani rupees on the pricing page for now. Message us and we will confirm the current price in taka.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Open a free tool or message us', text: 'Make your first invoice in a few minutes, or tell us on WhatsApp what kind of business you run.' },
      { title: 'Start the free month', text: 'Create your account, pick the module, and add your medicines, menu, students or products. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test bills, and start working for real.' },
    ],

    faqHeading: 'Questions from Dhaka businesses',
    faqs: [
      { q: 'Which is the best pharmacy software in Bangladesh?', a: 'It depends on your shop, so try before you decide. Nexora’s Pharmacy POS (PharmaFlow) covers medicine search, batch and expiry tracking, supplier purchases and itemised receipts, and comes with a free first month so you can run it at your own counter.' },
      { q: 'Does Nexora have an office in Dhaka?', a: 'No. Our head office is at Al Noor Plaza, Multan, Pakistan, and we support customers online by WhatsApp and email. The software runs in a browser, so it works the same anywhere.' },
      { q: 'Is there a free invoice generator in BDT?', a: 'Yes. Choose BDT, add a VAT line under Taxes if you need one, and download a PDF or Excel file. It has no signup or watermark, and your data stays in your browser.' },
      { q: 'Does it produce NBR Mushak invoices?', a: 'No. The tool makes general invoices only. It does not produce the Mushak forms or connect to the NBR, so check your obligations with the NBR or your accountant.' },
      { q: 'Does Nexora support Bangla or bKash?', a: 'Not yet. The interface is in English, and Nexora does not connect to bKash, Nagad or Rocket. Tell us before you sign up if either is essential.' },
      { q: 'How much does Nexora cost in taka?', a: 'Every plan starts with a 1-month free trial, but the pricing page currently shows plans in Pakistani rupees. Message us and we will confirm the current price in taka.' },
      { q: 'Can I use Nexora for a restaurant, shop or school?', a: 'Yes. The Restaurant POS, Retail POS and School ERP run on the same account, and you can add them later without starting over.' },
      { q: 'Do you build custom software for businesses in Bangladesh?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations, working remotely. Tell us what you need and we will say what it would involve.' },
    ],

    ctaHeading: 'চলুন শুরু করি · Ready to start in Dhaka?',
    ctaSubtext: 'Start the free month today, or message us and we will show you the module that fits your pharmacy, restaurant, shop or school.',
    cta: {
      primary: { label: 'Start the free trial', to: '/pharmacy-pos' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Remote-first. We work with Bangladeshi businesses online.',
  },
  {
    slug: 'sevilla',
    name: 'Sevilla',
    nameLocal: 'Sevilla',
    lang: 'es',
    parent: null,
    theme: { primary: '#1d4f91', accent: '#b0123a', warm: '#b0123a' },

    seoTitle: 'Factura de autónomo gratis con IVA e IRPF | Nexora Sevilla',
    seoDescription: 'Generador de facturas gratis con IVA e IRPF en euros, PDF o Excel y sin registro. TPV para bares y restaurantes, CRM y ERP de Nexora, con un mes gratis.',
    seoKeywords: 'factura autónomo IVA IRPF, generador de facturas gratis, plantilla factura autónomo, factura gratis sin registro, programa TPV restaurante, TPV bar Sevilla, software para empresas Sevilla',

    hero: {
      eyebrow: '¡Bienvenidos a Sevilla!',
      headingA: 'Facturas gratis para autónomos',
      headingB: 'con IVA e IRPF',
      subtitle: 'Haz tu factura en euros, añade el IVA y la retención del IRPF, y descárgala en PDF o Excel sin registrarte. Cuando necesites más, Nexora ofrece TPV para bares y restaurantes, CRM y ERP. Somos una empresa de software de Pakistán y atendemos a clientes de España en línea.',
      primaryCta: { label: 'Generador de facturas gratis', to: '/tools/invoice-generator' },
      secondaryCta: { label: 'TPV para restaurantes', to: '/restaurant-pos' },
    },

    facts: [
      { value: 'IVA + IRPF', label: 'El IVA y la retención del IRPF en la misma factura' },
      { value: 'EUR', label: 'Facturas en euros, y más de 160 monedas disponibles' },
      { value: 'Sin registro', label: 'Herramientas gratis, sin marca de agua y tus datos se quedan en tu dispositivo' },
      { value: '1 mes', label: 'Prueba gratuita en todos los planes de Nexora' },
    ],

    intro: {
      heading: 'Sobre Nexora Solution',
      paragraphs: [
        'Hola, y bienvenidos. Nexora Solution es una empresa de software de Pakistán que crea software de gestión desde 2019. Nuestra oficina central está en Al Noor Plaza, en Multán. No tenemos oficina en Sevilla ni en ningún otro lugar de España, y preferimos decirlo claramente. Trabajamos con clientes de España en línea, por WhatsApp y correo electrónico.',
        'La plataforma Nexora es un solo acceso con varios módulos: TPV para restaurantes, TPV para tiendas, TPV para farmacias, ERP para colegios, CRM, CRM de WhatsApp, Transporte y Flotas, y ERP inmobiliario. Eliges el módulo que necesita tu negocio, añades a tu equipo y das a cada persona solo las pantallas que necesita. Nexora AI está integrada en los módulos, y también hacemos software a medida, sistemas ERP, apps móviles y tiendas en línea.',
        'Muchos autónomos y pequeños negocios necesitan una buena factura antes que un programa de gestión, así que empezamos con herramientas gratuitas. El generador de facturas funciona en tu navegador y lo que escribes se queda en tu dispositivo. Si más adelante quieres facturación, stock, clientes y equipo en un mismo sitio, la plataforma te espera con un primer mes gratis.',
      ],
    },

    arts: {
      eyebrow: 'La ciudad para la que construimos',
      heading: 'Sevilla vive de sus bares, sus talleres y su gente',
      intro: 'Sevilla huele a azahar en primavera. La Giralda, el Real Alcázar, la Plaza de España y los patios de Santa Cruz atraen a visitantes todo el año, y la Feria de Abril y la Semana Santa llenan la ciudad de color. Triana sigue trabajando la cerámica, y en cada barrio hay una barra de tapas con el camarero apuntando comandas a toda velocidad. Detrás de cada barra, taller o despacho hay un negocio que necesita cobrar rápido, llevar bien el stock y saber qué ha pasado hoy.',
      items: [
        { key: 'dish', title: 'Bares de tapas y restaurantes', text: 'Barra, mesas, terraza y cocina a la vez. El TPV para restaurantes incluye comandas de cocina (KOT), pantalla de cocina, gestión de mesas, cuentas divididas y facturación que sigue funcionando sin internet.' },
        { key: 'pen', title: 'Autónomos y profesionales', text: 'Fontaneros, diseñadores, electricistas, consultores y traductores facturan con IVA y retención de IRPF. El generador de facturas calcula ambos sobre cada línea.' },
        { key: 'shop', title: 'Comercios y artesanía', text: 'Desde las tiendas de Triana y la calle Sierpes hasta los pequeños talleres: facturación con código de barras, control de stock, proveedores y ficha de cliente.' },
        { key: 'book', title: 'Academias y centros de formación', text: 'Matrículas, cuotas, asistencia, exámenes y mensajes a las familias en un único ERP para colegios.' },
      ],
    },

    business: {
      eyebrow: 'Herramientas y productos',
      heading: 'Empieza gratis y añade lo que tu negocio necesite',
      intro: 'Las herramientas gratuitas no piden cuenta. Los módulos de la plataforma comparten un único acceso de Nexora, así que puedes añadir otro más adelante sin empezar de cero.',
      items: [
        { title: 'Factura con IVA e IRPF', text: 'Elige euros, añade el IVA y el IRPF como retención y descarga un PDF o un Excel. Sin registro y sin marca de agua.', label: 'Generador de facturas', to: '/tools/invoice-generator', cta: 'Hacer una factura' },
        { title: 'Presupuestos para clientes', text: 'Prepara un presupuesto con validez, añade impuestos y conviértelo en factura cuando el cliente lo acepte.', label: 'Generador de presupuestos', to: '/tools/quotation-generator', cta: 'Hacer un presupuesto' },
        { title: 'Bares, restaurantes y cafeterías', text: 'Comandas de cocina, pantalla de cocina, gestión de mesas, cuentas divididas y facturación con modo sin conexión.', label: 'TPV para restaurantes', to: '/restaurant-pos', cta: 'Ver el TPV' },
        { title: 'Tiendas y comercios', text: 'Facturación con código de barras, varias cajas, control de stock, proveedores y cuenta de clientes.', label: 'TPV para tiendas', to: '/retail-pos', cta: 'Ver el TPV' },
        { title: 'Equipos comerciales y agencias', text: 'Clientes potenciales, clientes, facturas y seguimientos en un CRM, con las conversaciones de WhatsApp en una bandeja compartida.', label: 'CRM', to: '/crm', cta: 'Ver el CRM' },
        { title: 'Colegios y academias', text: 'Fichas de alumnos, cuotas, asistencia, exámenes, portal de familias y nóminas del personal.', label: 'ERP para colegios', to: '/school-erp', cta: 'Ver el ERP' },
      ],
      footer: {
        text: '¿Necesitas algo hecho a medida para tu empresa? También creamos',
        links: [
          { to: '/software-development', label: 'software a medida' },
          { to: '/erp-development', label: 'sistemas ERP' },
          { to: '/mobile-app-development', label: 'apps móviles' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'IVA, IRPF y lo que cubrimos',
        heading: 'Qué comprobar antes de usar Nexora en España',
        paragraphs: [
          'En el generador de facturas eliges euros y añades tú mismo el IVA y el IRPF en Impuestos; el IRPF se marca como retención, de modo que se resta del importe a pagar. Por ejemplo, con 1.000 € de base, un 21 % de IVA y un 15 % de IRPF, el total es 1.210 € y el cliente paga 1.060 €. Los tipos son solo un ejemplo: el tuyo puede ser distinto, así que confírmalo con la Agencia Tributaria o con tu gestor.',
          'La herramienta hace documentos y nada más. No genera facturas con el sistema Verifactu ni facturas electrónicas Facturae, y no se conecta con la Agencia Tributaria. La interfaz está en inglés por ahora, los planes de la plataforma se muestran en rupias pakistaníes y los TPV se crearon primero para Pakistán. El TPV de restaurantes aplica un solo tipo de impuesto que puedes etiquetar como IVA; si necesitas algo concreto, pregúntanos antes y te diremos con honestidad qué está cubierto hoy. Somos una empresa de software, no asesores fiscales.',
        ],
        links: [
          { to: '/tools/invoice-generator', label: 'Generador de facturas' },
          { to: '/restaurant-pos', label: 'TPV para restaurantes' },
        ],
      },
    ],

    why: {
      heading: 'Por qué los negocios de Sevilla prueban Nexora',
      items: [
        { title: 'Gratis para empezar', text: 'Las herramientas de facturas no piden registro, no llevan marca de agua y no caducan.' },
        { title: 'Tus datos se quedan contigo', text: 'Las herramientas gratuitas guardan tus documentos en tu propio navegador, no en nuestros servidores.' },
        { title: 'Sigue facturando sin internet', text: 'El TPV de restaurantes sigue tomando comandas sin conexión y sincroniza cuando vuelve.' },
        { title: 'Un mes gratis, sin tarjeta', text: 'Todos los planes empiezan con un mes de prueba, configuración, migración de datos y formación del personal gratis.' },
        { title: 'Roles y permisos', text: 'El camarero ve la caja, el encargado ve los informes y el dueño lo ve todo.' },
        { title: 'Software a medida', text: 'Si un módulo no encaja, creamos software a medida, apps móviles e integraciones.' },
      ],
    },

    areas: {
      heading: 'Software en la nube para toda Sevilla',
      text: 'Nexora funciona en el navegador, así que sirve igual donde esté tu bar, taller o despacho. Puedes usarlo desde Triana, Nervión, Los Remedios, Santa Cruz, El Arenal, La Macarena, Heliópolis, Bellavista, Sevilla Este, Dos Hermanas, Alcalá de Guadaíra y el resto de Andalucía y de España.',
      list: ['Triana', 'Nervión', 'Los Remedios', 'Santa Cruz', 'El Arenal', 'La Macarena', 'Heliópolis', 'Bellavista', 'Sevilla Este', 'Dos Hermanas', 'Alcalá de Guadaíra', 'Mairena del Aljarafe'],
    },

    pricingNote: 'Los planes se muestran por ahora en rupias pakistaníes en la página de precios. Escríbenos y te confirmaremos el precio actual en euros.',

    stepsHeading: 'Empieza en tres pasos',
    steps: [
      { title: 'Abre una herramienta gratis', text: 'Haz tu primera factura en unos minutos. No hay nada que registrar.' },
      { title: 'Empieza el mes gratis', text: 'Cuando quieras facturación, stock o clientes en un solo sitio, crea tu cuenta y elige un módulo.' },
      { title: 'Escríbenos si necesitas ayuda', text: 'Pregúntanos por WhatsApp o correo sobre la configuración, el traslado de tus datos o lo que está cubierto hoy.' },
    ],

    faqHeading: 'Preguntas de negocios de Sevilla',
    faqs: [
      { q: '¿Hay un generador de facturas gratis para autónomos con IVA e IRPF?', a: 'Sí. El generador de facturas de Nexora es gratuito, sin registro y sin marca de agua. Eliges euros, añades el IVA, añades el IRPF como retención y descargas un PDF o un Excel.' },
      { q: '¿Cómo se pone el IRPF en la factura?', a: 'En Impuestos añade uno llamado IRPF con el porcentaje que te corresponda y marca la opción de retención. Se resta del total y la factura muestra el importe a pagar. Confirma el porcentaje con tu gestor o con la Agencia Tributaria.' },
      { q: '¿Nexora tiene oficina en Sevilla?', a: 'No. Nuestra oficina central está en Al Noor Plaza, Multán, Pakistán, y atendemos a los clientes en línea por WhatsApp y correo. El software funciona en el navegador, así que sirve igual en cualquier lugar de España.' },
      { q: '¿Cumple Verifactu o genera facturas Facturae?', a: 'No. El generador hace facturas en PDF o Excel, pero no usa Verifactu ni Facturae y no se conecta con la Agencia Tributaria. Consulta con tu gestor qué necesitas.' },
      { q: '¿Está disponible en español?', a: 'Todavía no. La interfaz de las herramientas y de la plataforma está en inglés. Dínoslo antes de registrarte si el español es imprescindible.' },
      { q: '¿Cuánto cuesta Nexora en euros?', a: 'Todos los planes empiezan con un mes de prueba gratuito, pero la página de precios muestra por ahora los planes en rupias pakistaníes. Escríbenos y te confirmaremos el precio actual en euros.' },
      { q: '¿Sirve el TPV para un bar o restaurante de Sevilla?', a: 'Incluye comandas de cocina, pantalla de cocina, gestión de mesas, cuentas divididas y facturación con un tipo de impuesto que puedes etiquetar como IVA, y sigue funcionando sin conexión. Se creó primero para Pakistán, así que pregúntanos por propinas o por un formato de ticket concreto antes de registrarte.' },
      { q: '¿Hacéis software a medida para empresas de España?', a: 'Sí. Creamos CRM, ERP, apps móviles, tiendas en línea e integraciones a medida, trabajando en remoto. Cuéntanos qué necesitas y te diremos qué supondría.' },
    ],

    ctaHeading: '¿Empezamos? ¡Vamos allá!',
    ctaSubtext: 'Haz una factura gratis hoy o empieza el mes gratuito y te mostraremos el módulo que encaja con tu bar, tienda, taller o academia.',
    cta: {
      primary: { label: 'Empezar la prueba gratuita', to: '/restaurant-pos' },
      secondary: { label: 'Escríbenos por WhatsApp' },
    },
    contactNote: 'Trabajo en remoto. Atendemos a negocios de España en línea.',
  },
  {
    slug: 'islamabad',
    name: 'Islamabad',
    nameLocal: 'اسلام آباد',
    parent: { to: '/pakistan', label: 'Pakistan' },
    theme: { primary: '#1f6b45', accent: '#b36a1d', warm: '#b36a1d' },

    seoTitle: 'Property Management Software in Islamabad | Nexora',
    seoDescription: 'Property ERP for Islamabad agencies and landlords: tenants, rent, leases and maintenance. Plus restaurant POS, school ERP and CRM from a Pakistani team.',
    seoKeywords: 'property management software Islamabad, real estate software Islamabad, rent management software Pakistan, restaurant POS Islamabad, POS software Islamabad, school management software Islamabad, CRM software Islamabad',

    hero: {
      eyebrow: 'اسلام آباد میں خوش آمدید · Welcome to Islamabad',
      headingA: 'Property management software',
      headingB: 'in Islamabad',
      subtitle: 'Nexora’s Property ERP helps Islamabad agencies and landlords manage tenants, rent collection, leases, maintenance and owner reports in one place. We also make restaurant POS, retail POS, school ERP and CRM, and our team works from Pakistan, so support comes in Urdu and English.',
      primaryCta: { label: 'Start the free trial', to: '/property-erp' },
      secondaryCta: { label: 'See Restaurant POS', to: '/restaurant-pos' },
    },

    facts: [
      { value: 'Rent + leases', label: 'Tenants, rent collection and leases in one place' },
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'PKR', label: 'Plans priced in Pakistani rupees' },
      { value: 'Urdu + English', label: 'Support by WhatsApp and email' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Assalam-o-alaikum, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We work with customers in Islamabad and Rawalpindi remotely, by WhatsApp, phone and email. We do not have an Islamabad office, and we would rather say so plainly.',
        'The Nexora platform is one login with several modules: Property ERP, Restaurant POS, Retail POS, Pharmacy POS (PharmaFlow), School ERP, CRM, WhatsApp CRM and a Transport and Fleet module. You choose the one your business needs, add your team, and give each person only the screens their job requires. For a property business that means tenants, rent collection, leases, maintenance and owner reporting in one workspace instead of a notebook and a spreadsheet.',
        'We also build custom software and mobile apps, and we offer free business tools that run in your browser, including invoice and quotation generators. If you are an Islamabad business looking for a software house that can sell you a working product today and build what is missing, that is the gap we fill.',
      ],
    },

    arts: {
      eyebrow: 'اسلام آباد · The city we build for',
      heading: 'Islamabad is a planned city between the Margalla Hills and its busy twin',
      intro: 'Islamabad was built at the foot of the Margalla Hills, with a grid of lettered sectors, wide green belts and landmarks such as the Faisal Mosque and the Pakistan Monument. Daman-e-Koh, Saidpur Village and Rawal Lake are a short drive from the Blue Area and the cafes of F-6 and F-7. Next door, Rawalpindi’s Saddar and Raja Bazaar keep the old city’s trade alive. Rents, offices, restaurants, schools and shops all change hands here every day, and each of them needs clean records.',
      items: [
        { key: 'home', title: 'Property agents, landlords and rentals', text: 'Apartments, houses and offices are let and re-let across the sectors, Bahria Town and DHA. Tenants, rent due dates, leases and maintenance are easier to follow when they live in one system.' },
        { key: 'dish', title: 'Cafes and restaurants', text: 'From F-6 and F-7 cafes to food streets in Rawalpindi, kitchens run fast. KOT, table view and quick bills keep the kitchen and the counter in step.' },
        { key: 'book', title: 'Schools, academies and universities', text: 'Fees, attendance, exams and parent messages for schools and academies, kept in one School ERP.' },
        { key: 'shop', title: 'Markets, marts and retail shops', text: 'Barcode billing, stock levels and a customer ledger for marts and shops, from Jinnah Super to the neighbourhood store.' },
      ],
    },

    business: {
      eyebrow: 'Products',
      heading: 'Which Nexora module fits your Islamabad business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add another later without starting over.',
      items: [
        { title: 'Agencies, landlords and property managers', text: 'Tenants, rent collection, leases, maintenance and owner reports in one property workspace.', label: 'Property ERP', to: '/property-erp' },
        { title: 'Restaurants, cafes and bakeries', text: 'KOT and kitchen display, table management, split bills and offline-ready billing for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Retail shops and marts', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Schools, colleges and academies', text: 'Student records, fee collection, attendance, exams, parent portal and staff payroll in one school ERP.', label: 'School ERP', to: '/school-erp' },
        { title: 'Medical stores and pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts.', label: 'Pharmacy POS', to: '/pharmacy-pos' },
        { title: 'Sales teams and agencies', text: 'Track leads, follow-ups and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'FBR and property',
        heading: 'What to check first',
        paragraphs: [
          'Many Islamabad businesses have to follow FBR rules for POS invoicing, and those rules have been changing. The Restaurant POS lets you set tax labels and record your FBR POS ID in the settings. Nexora does not currently send your invoices to FBR automatically. If you need live FBR integration, ask us before you sign up and we will tell you honestly what is covered today.',
          'The Property ERP covers tenants, rent collection, leases, maintenance and owner reporting. If you sell plots, run a housing society or need installment plans and file tracking, ask us first and we will say what is covered today. We are a software company, not tax or legal advisors, so confirm your obligations with the FBR, the relevant authority or your accountant.',
        ],
        links: [
          { to: '/blog/fbr-pos-integration-guide-pakistan', label: 'Read: FBR POS integration' },
          { to: '/property-erp', label: 'Property ERP' },
        ],
      },
    ],

    why: {
      heading: 'Why Islamabad businesses try Nexora',
      items: [
        { title: 'Urdu and English support', text: 'Message us on WhatsApp or call, and you reach the people who build and support the product.' },
        { title: 'Rent and leases in one place', text: 'Property ERP keeps tenants, due dates, leases and maintenance together, with reports for owners.' },
        { title: 'Works through load-shedding', text: 'The Restaurant POS keeps taking orders offline and syncs when the connection returns.' },
        { title: 'Pakistani payments', text: 'Nexora plans can be paid by JazzCash, Easypaisa or bank transfer.' },
        { title: 'Rupee pricing, free month first', text: 'Every plan starts with a free month, free setup, free data migration and free staff training.' },
        { title: 'Roles and permissions', text: 'A cashier sees billing, a manager sees reports, and the owner sees everything, from a phone or a laptop.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every sector of Islamabad and Rawalpindi',
      text: 'Nexora opens in a browser, so it works the same wherever your office, cafe or shop is. Businesses can use it from F-6, F-7, F-8, F-10, F-11, G-9, G-10, G-11, I-8, I-9 and E-11, from the Blue Area, DHA, Bahria Town and Gulberg Greens, and from Saddar and Raja Bazaar in Rawalpindi. Setup, data migration and staff training are free on every plan.',
      list: ['F-6', 'F-7', 'F-8', 'F-10', 'F-11', 'G-9', 'G-10', 'G-11', 'I-8', 'I-9', 'E-11', 'Blue Area', 'DHA', 'Bahria Town', 'Gulberg Greens', 'Saddar'],
    },

    pricingHeading: 'Simple pricing in rupees',
    pricingNote: 'Every plan includes a 1-month free trial, free setup, free data migration and free staff training. Full details are on the pricing page.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Message us on WhatsApp', text: 'Tell us what kind of business you run and how many people use the system.' },
      { title: 'Start the free month', text: 'Create your account, pick the module, and add your properties, tenants, menu or products. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test entries, and start working for real.' },
    ],

    faqHeading: 'Questions from Islamabad businesses',
    faqs: [
      { q: 'Is there property management software for Islamabad?', a: 'Yes. Nexora’s Property ERP helps agencies and landlords manage tenants, rent collection, leases, maintenance and owner reporting, and every plan starts with a free first month so you can try it with your own properties.' },
      { q: 'Does Nexora have an office in Islamabad?', a: 'No. Our head office is at Al Noor Plaza, Multan, and we support Islamabad and Rawalpindi customers by WhatsApp, phone and email. The software is cloud-based, so it works the same anywhere in Pakistan.' },
      { q: 'Can Property ERP handle plot sales or a housing society?', a: 'Property ERP is built for tenants, rent, leases, maintenance and owner reports. If you need plot files, installments or society management, ask us first and we will tell you honestly what is covered today.' },
      { q: 'Does Nexora connect to FBR?', a: 'Not automatically. The Restaurant POS has tax labels and a field for your FBR POS ID, but it does not send invoices to FBR by itself. If you need live integration, ask us first. We are not tax advisors, so confirm your obligations with the FBR or your accountant.' },
      { q: 'Can I use Nexora for a restaurant or cafe in Islamabad?', a: 'Yes. The Restaurant POS covers KOT, kitchen display, table management and billing, and keeps billing offline when the internet drops.' },
      { q: 'How much does Nexora cost in Islamabad?', a: `${planPriceSentence()} Every plan includes a 1-month free trial, and prices are in Pakistani rupees.` },
      { q: 'Can a school or academy in Islamabad use Nexora?', a: 'Yes. The School ERP covers student and parent records, fee collection, attendance, exams and staff payroll.' },
      { q: 'Do you build custom software for businesses in Islamabad?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need on WhatsApp and we will say what it would involve.' },
    ],

    ctaHeading: 'آئیے شروع کریں · Ready to start in Islamabad?',
    ctaSubtext: 'Start the free month today, or message us and we will show you the module that fits your properties, cafe, school or shop.',
    cta: {
      primary: { label: 'Start the free trial', to: '/property-erp' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Our head office is in Multan. We work with Islamabad and Rawalpindi businesses by WhatsApp, phone and email.',
  },
  {
    slug: 'karachi',
    name: 'Karachi',
    nameLocal: 'کراچی',
    parent: { to: '/pakistan', label: 'Pakistan' },
    theme: { primary: '#0b6e8a', accent: '#d7263d', warm: '#d7263d' },

    seoTitle: 'Rent a Car & Fleet Software in Karachi | Nexora Fleet',
    seoDescription: 'Fleet and rental software for Karachi: vehicles, bookings, customer ledgers and dues. Plus restaurant POS, retail POS and CRM from a Pakistani team.',
    seoKeywords: 'rent a car software Karachi, fleet management software Karachi, car rental software Pakistan, transport software Karachi, restaurant POS Karachi, POS software Karachi, retail POS Karachi',

    hero: {
      eyebrow: 'کراچی میں خوش آمدید · Welcome to Karachi',
      headingA: 'Rent a car and fleet software',
      headingB: 'in Karachi',
      subtitle: 'Nexora Fleet & Rental helps Karachi rental companies and transport operators manage vehicles, bookings, customer ledgers, payments and dues from one workspace. We also make restaurant POS, retail POS, pharmacy POS, school ERP and CRM, and our team works from Pakistan, so support comes in Urdu and English.',
      primaryCta: { label: 'Start the free trial', to: '/transport-fleet' },
      secondaryCta: { label: 'See Restaurant POS', to: '/restaurant-pos' },
    },

    facts: [
      { value: 'Bookings + dues', label: 'Rentals, payments and pending dues in one place' },
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'PKR', label: 'Plans priced in Pakistani rupees' },
      { value: 'Urdu + English', label: 'Support by WhatsApp and email' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Assalam-o-alaikum, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We work with customers in Karachi remotely, by WhatsApp, phone and email. We do not have a Karachi office, and we would rather say so plainly.',
        'The Nexora platform is one login with several modules: Fleet & Rental, Restaurant POS, Retail POS, Pharmacy POS (PharmaFlow), School ERP, CRM, WhatsApp CRM and Property ERP. You choose the one your business needs, add your team, and give each person only the screens their job requires. For a rental company that means vehicles, bookings, customer ledgers, payments, dues and reports in one workspace instead of a register and a spreadsheet.',
        'We also build custom software and mobile apps, and we offer free business tools that run in your browser, including invoice and quotation generators. If you are a Karachi business looking for a software house that can sell you a working product today and build what is missing, that is the gap we fill.',
      ],
    },

    arts: {
      eyebrow: 'کراچی · The city we build for',
      heading: 'Karachi never stops moving, and neither do its businesses',
      intro: 'Karachi is Pakistan’s port city and its biggest market. The Quaid’s Mausoleum, Frere Hall and Empress Market stand in a city where Clifton and Do Darya face the Arabian Sea, Burns Road serves nihari and haleem late into the night, and the brightly painted trucks and buses are a folk art of their own. Cars are rented out, goods move through Keamari and Port Qasim, and shops in Bolton Market, Zainab Market and Saddar open early. Whatever the trade, a Karachi business needs to bill fast, keep records straight and know what happened today.',
      items: [
        { key: 'truck', title: 'Rent-a-car and transport companies', text: 'Cars, vans and buses go out and come back all day. Bookings, customer balances and pending dues are easier to control when every vehicle and customer sits in one system.' },
        { key: 'dish', title: 'Restaurants and food streets', text: 'From Burns Road and Boat Basin to Do Darya and cafes in Clifton and DHA, kitchens run late and fast. KOT, table view and quick bills keep the kitchen and the counter in step.' },
        { key: 'shop', title: 'Markets, wholesalers and retail shops', text: 'Barcode billing, stock levels and a customer ledger for marts and shops, from Saddar and Zainab Market to the neighbourhood store.' },
        { key: 'pill', title: 'Pharmacies and clinics', text: 'Medical stores sit beside every hospital. They need fast medicine search, batch and expiry dates, supplier purchases and itemized receipts.' },
      ],
    },

    business: {
      eyebrow: 'Products',
      heading: 'Which Nexora module fits your Karachi business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add another later without starting over.',
      items: [
        { title: 'Rent-a-car, bike rental and fleet operators', text: 'Vehicles, rental bookings, customer ledgers, payments and dues, with reports on revenue and utilization.', label: 'Fleet & Rental', to: '/transport-fleet' },
        { title: 'Restaurants, cafes and bakeries', text: 'KOT and kitchen display, table management, split bills and offline-ready billing for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Retail shops and marts', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Medical stores and pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts at the counter.', label: 'Pharmacy POS', to: '/pharmacy-pos' },
        { title: 'Schools, colleges and academies', text: 'Student records, fee collection, attendance, exams, parent portal and staff payroll in one school ERP.', label: 'School ERP', to: '/school-erp' },
        { title: 'Sales teams and traders', text: 'Track leads, follow-ups and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'FBR, SRB and what we cover',
        heading: 'Tax rules in Sindh, and what to check first',
        paragraphs: [
          'Many Karachi businesses have to follow FBR or Sindh Revenue Board rules for POS invoicing, and those rules have been changing. The Restaurant POS lets you set tax labels of your own and record your FBR POS ID in the settings. Nexora does not currently send your invoices to the FBR or the SRB automatically.',
          'The Fleet & Rental module covers vehicles, bookings, customers, payments, dues and reports. It does not include live vehicle tracking, so ask us first if you need that. If you need live FBR or SRB integration, ask us before you sign up and we will tell you honestly what is covered today. We are a software company, not a tax advisor, so confirm your obligations with the FBR, the SRB or your accountant.',
        ],
        links: [
          { to: '/blog/fbr-pos-integration-guide-pakistan', label: 'Read: FBR POS integration' },
          { to: '/transport-fleet', label: 'Fleet & Rental' },
        ],
      },
    ],

    why: {
      heading: 'Why Karachi businesses try Nexora',
      items: [
        { title: 'Urdu and English support', text: 'Message us on WhatsApp or call, and you reach the people who build and support the product.' },
        { title: 'Dues stay visible', text: 'Fleet & Rental records payments, refunds and pending dues against each customer, so money does not quietly go missing.' },
        { title: 'Works through load-shedding', text: 'The Restaurant POS keeps taking orders offline and syncs when the connection returns.' },
        { title: 'Pakistani payments', text: 'Nexora plans can be paid by JazzCash, Easypaisa or bank transfer.' },
        { title: 'Rupee pricing, free month first', text: 'Every plan starts with a free month, free setup, free data migration and free staff training.' },
        { title: 'Roles and permissions', text: 'A counter staff sees billing, a manager sees reports, and the owner sees everything, from a phone or a laptop.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every part of Karachi',
      text: 'Nexora opens in a browser, so it works the same wherever your garage, shop, restaurant or office is. Businesses can use it from Clifton, DHA, Gulshan-e-Iqbal, Gulistan-e-Johar, North Nazimabad, PECHS, Saddar, Korangi, Landhi, SITE, Malir, Federal B Area and Bahria Town Karachi, as well as from Keamari and the rest of Sindh. Setup, data migration and staff training are free on every plan.',
      list: ['Clifton', 'DHA', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar', 'North Nazimabad', 'PECHS', 'Saddar', 'Korangi', 'Landhi', 'SITE', 'Malir', 'Federal B Area'],
    },

    pricingHeading: 'Simple pricing in rupees',
    pricingNote: 'Every plan includes a 1-month free trial, free setup, free data migration and free staff training. Full details are on the pricing page.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Message us on WhatsApp', text: 'Tell us what kind of business you run and how many people use the system.' },
      { title: 'Start the free month', text: 'Create your account, pick the module, and add your vehicles, customers, menu or products. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test entries, and start working for real.' },
    ],

    faqHeading: 'Questions from Karachi businesses',
    faqs: [
      { q: 'Is there rent a car software for Karachi?', a: 'Yes. Nexora Fleet & Rental covers vehicles, rental bookings, customer ledgers, payments, dues and reports, and every plan starts with a free first month so you can try it with your own fleet.' },
      { q: 'Does Nexora have an office in Karachi?', a: 'No. Our head office is at Al Noor Plaza, Multan, and we support Karachi customers by WhatsApp, phone and email. The software is cloud-based, so it works the same anywhere in Pakistan.' },
      { q: 'Does the fleet module track vehicles live?', a: 'No. It manages vehicles, bookings, customers, payments and dues, but it does not include live GPS tracking. If you need that, ask us first.' },
      { q: 'Does Nexora connect to FBR or SRB?', a: 'Not automatically. The Restaurant POS has tax labels and a field for your FBR POS ID, but it does not send invoices to the FBR or the SRB by itself. If you need live integration, ask us first. We are not tax advisors, so confirm your obligations with the authority or your accountant.' },
      { q: 'Can I use Nexora for a restaurant or retail shop in Karachi?', a: 'Yes. The Restaurant POS covers KOT, kitchen display, table management and billing, and the Retail POS covers barcode billing, multi-counter checkout, stock and a customer ledger.' },
      { q: 'How much does Nexora cost in Karachi?', a: `${planPriceSentence()} Every plan includes a 1-month free trial, and prices are in Pakistani rupees.` },
      { q: 'Does it work when there is load-shedding or no internet?', a: 'The Restaurant POS keeps billing offline and syncs when the connection returns. The other modules are cloud-based and need an internet connection.' },
      { q: 'Do you build custom software for businesses in Karachi?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need on WhatsApp and we will say what it would involve.' },
    ],

    ctaHeading: 'چلیں شروع کریں · Ready to start in Karachi?',
    ctaSubtext: 'Start the free month today, or message us and we will show you the module that fits your fleet, restaurant, shop or pharmacy.',
    cta: {
      primary: { label: 'Start the free trial', to: '/transport-fleet' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Our head office is in Multan. We work with Karachi businesses by WhatsApp, phone and email.',
  },
  {
    slug: 'uae',
    name: 'United Arab Emirates',
    nameLocal: 'الإمارات العربية المتحدة',
    parent: { to: '/', label: 'Home' },
    theme: { primary: '#0f2a4a', accent: '#b8862b', warm: '#b8862b' },

    seoTitle: 'Free UAE VAT Invoice Generator & Business Software | Nexora',
    seoDescription: 'Free UAE VAT invoice generator with TRN and 5% VAT in AED, plus POS, CRM and property software for Dubai, Abu Dhabi and Sharjah. 1-month free trial.',
    seoKeywords: 'UAE VAT invoice generator, tax invoice UAE, free invoice generator UAE, restaurant POS Dubai, retail POS UAE, CRM software UAE, property management software Dubai, rent a car software Dubai, business software UAE',

    hero: {
      eyebrow: 'مرحبًا بكم · Welcome to the Emirates',
      headingA: 'Invoices, POS and CRM',
      headingB: 'for businesses in the UAE',
      subtitle: 'Start with a free Tax Invoice in dirhams with your TRN and 5% VAT, no signup. When one document is not enough, Nexora also makes restaurant POS, retail POS, CRM, property and rental software that you can try free for a month.',
      primaryCta: { label: 'Make a free VAT invoice', to: '/tools/uae-vat-invoice-generator' },
      secondaryCta: { label: 'See Restaurant POS', to: '/restaurant-pos' },
    },

    facts: [
      { value: 'AED + 5% VAT', label: 'Invoices in dirhams with a TRN field' },
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'No signup', label: 'Free invoice, quotation and receipt tools' },
      { value: 'English', label: 'Interface, with Arabic names allowed in your data' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Hello, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We do not have an office in the UAE, and we work with Emirates businesses online, by WhatsApp and email.',
        'Most small UAE businesses need a correct Tax Invoice before they need software, so we start with a free tool. The UAE VAT invoice generator opens in dirhams with a TRN field for you and your client and VAT at 5%. It runs in your browser, so what you type stays on your device.',
        'If you outgrow single documents, the Nexora platform is one login with several modules: Restaurant POS, Retail POS, Pharmacy POS, School ERP, CRM, WhatsApp CRM, Transport & Fleet and Property ERP. We also build custom software, mobile apps and online stores.',
      ],
    },

    arts: {
      eyebrow: 'الإمارات · The place we build for',
      heading: 'Seven emirates, one very busy market',
      intro: 'The UAE is a federation of seven emirates: Abu Dhabi, Dubai, Sharjah, Ajman, Umm Al Quwain, Ras Al Khaimah and Fujairah. Business here moves between old and new, from the souks of Deira and the Al Fahidi district to glass towers along Sheikh Zayed Road, and from the Sheikh Zayed Grand Mosque in Abu Dhabi to the book fair in Sharjah. Free zones, mainland companies, traders and freelancers all need tidy paperwork, and most of them work across several languages.',
      items: [
        { key: 'dish', title: 'Restaurants, cafes and cloud kitchens', text: 'Shawarma counters, karak cafes and fine-dining rooms all need quick bills. The Restaurant POS covers KOT, kitchen display, tables, split bills and a tax rate you can set to 5%.' },
        { key: 'key', title: 'Property and rentals', text: 'Landlords and managers track tenants, rent collection, leases, maintenance and owner reports in the Property ERP, and sales teams follow leads in the CRM.' },
        { key: 'shop', title: 'Retail, groceries and trading', text: 'Barcode billing, stock, suppliers and a customer ledger for shops, groceries and traders, with VAT shown on the receipt.' },
        { key: 'car', title: 'Rent-a-car and transport', text: 'Vehicles, rental bookings, customer ledgers, payments and dues sit in one place in Transport & Fleet, with no live GPS tracking.' },
      ],
    },

    business: {
      eyebrow: 'Products',
      heading: 'Which Nexora module fits your UAE business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add another later without starting over.',
      items: [
        { title: 'Freelancers, traders and small firms', text: 'A Tax Invoice in AED with TRN fields and 5% VAT, as a PDF or Excel file. No signup, no watermark.', label: 'UAE VAT invoice generator', to: '/tools/uae-vat-invoice-generator', cta: 'Make a Tax Invoice' },
        { title: 'Restaurants, cafes and bakeries', text: 'KOT and kitchen display, table management, split bills and offline-ready billing for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Shops, groceries and supermarkets', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and a customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Landlords and property managers', text: 'Tenants, rent collection, leases, maintenance and owner reports.', label: 'Property ERP', to: '/property-erp' },
        { title: 'Sales teams and agencies', text: 'Track leads and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
        { title: 'Rent-a-car and fleet operators', text: 'Vehicles, rental bookings, customer ledgers, payments and dues, with revenue and utilization reports.', label: 'Transport & Fleet', to: '/transport-fleet' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'VAT, TRN and what we cover',
        heading: 'UAE VAT on your invoices, and what to check first',
        paragraphs: [
          'The standard UAE VAT rate is 5%. In the free invoice tool and in the POS and CRM invoices you set the tax rate yourself, so you can use 5%, 0% or switch VAT off for a line. The tool does not decide which treatment a supply deserves, so check with your tax agent or the Federal Tax Authority.',
          'Nexora does not connect to the Federal Tax Authority, file VAT returns or send structured e-invoices. If you need an integration like that, ask us before you subscribe and we will tell you honestly whether it is a custom project.',
        ],
        links: [
          { to: '/tools/uae-vat-invoice-generator', label: 'UAE VAT invoice generator' },
          { to: '/tools/quotation-generator', label: 'Quotation generator' },
        ],
      },
    ],

    why: {
      heading: 'Why UAE businesses try Nexora',
      items: [
        { title: 'Free tool first', text: 'Make a Tax Invoice or a quotation today without creating an account.' },
        { title: 'A free month on every plan', text: 'Every plan starts with a free first month, free setup, free data migration and free staff training.' },
        { title: 'Many modules, one login', text: 'POS, CRM, property, school and fleet software share one account, so you add what you need.' },
        { title: 'Arabic names in your data', text: 'Type customer and product names in Arabic. PDF downloads cannot yet draw Arabic, so use Print and Save as PDF for those.' },
        { title: 'Roles and permissions', text: 'A counter staff sees billing, a manager sees reports, and the owner sees everything, from a phone or a laptop.' },
        { title: 'We say what is not built', text: 'No FTA integration, no Arabic interface and no UAE office. We would rather tell you now than after you sign up.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every emirate',
      text: 'Nexora opens in a browser, so it works the same wherever your shop, restaurant, office or garage is. Businesses can use it from any emirate and neighbourhood, including those below. We are online only and have no UAE office.',
      list: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Umm Al Quwain', 'Fujairah', 'Al Ain', 'Deira', 'Business Bay', 'Jumeirah Lakes Towers', 'Al Quoz'],
    },

    pricingHeading: 'Plans and pricing',
    pricingNote: 'Plans are listed in Pakistani rupees on the pricing page for now. Message us and we will confirm the current price in dirhams.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Try the free tool', text: 'Make a Tax Invoice in dirhams with your TRN and see how the tool feels.' },
      { title: 'Start the free month', text: 'Create your account, pick the module, and add your menu, products, tenants or customers. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test entries, and start working for real.' },
    ],

    faqHeading: 'Questions from UAE businesses',
    faqs: [
      { q: 'Is there a free UAE VAT invoice generator?', a: 'Yes. Open the free UAE VAT invoice generator, add your TRN, your client and the lines, and download a PDF or Excel file. VAT is set to 5% and there is no signup or watermark.' },
      { q: 'Does Nexora have an office in the UAE?', a: 'No. Our head office is at Al Noor Plaza, Multan, and we support UAE customers by WhatsApp and email. The software is cloud-based, so it works the same in any emirate.' },
      { q: 'Does Nexora connect to the Federal Tax Authority?', a: 'No. Nexora calculates VAT on invoices and receipts, but it does not file returns or send e-invoices to the FTA. If you need that, ask us first.' },
      { q: 'Is the interface available in Arabic?', a: 'No, the interface is in English today. You can type customer and product names in Arabic. A full Arabic interface would be a custom project.' },
      { q: 'Can I use Nexora for a restaurant or shop in Dubai?', a: 'Yes. The Restaurant POS covers KOT, kitchen display, table management and billing, and the Retail POS covers barcode billing, multi-counter checkout, stock and a customer ledger. You set the tax rate, such as 5% for VAT.' },
      { q: 'Is there software for property and rental management in the UAE?', a: 'Nexora Property ERP covers tenants, rent collection, leases, maintenance and owner reports, and the CRM tracks leads. It does not file with any government property system.' },
      { q: 'How much does Nexora cost in dirhams?', a: `${planPriceSentence()} Plans are priced in Pakistani rupees today. Message us and we will confirm a price in dirhams.` },
      { q: 'Do you build custom software for businesses in the UAE?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need on WhatsApp and we will say whether a ready-made module already covers it.' },
    ],

    ctaHeading: 'Ready to start in the UAE?',
    ctaSubtext: 'Make a free Tax Invoice today, or message us and we will show you the module that fits your restaurant, shop, property portfolio or fleet.',
    cta: {
      primary: { label: 'Make a free VAT invoice', to: '/tools/uae-vat-invoice-generator' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Our head office is in Multan. We work with UAE businesses online, by WhatsApp and email.',
  },
  {
    slug: 'bahrain',
    name: 'Bahrain',
    nameLocal: 'مملكة البحرين',
    parent: { to: '/', label: 'Home' },
    theme: { primary: '#8c0f1f', accent: '#c9a24a', warm: '#8c0f1f' },

    seoTitle: 'Business Software Bahrain: POS, CRM & Free Invoices | Nexora',
    seoDescription: 'POS, CRM and property software for Bahrain businesses, plus a free invoice maker for BHD with 10% VAT. Try any plan free for a month. Cloud-based.',
    seoKeywords: 'POS system Bahrain, restaurant POS Bahrain, CRM software Bahrain, VAT invoice Bahrain, invoice software Bahrain, business software Manama, rent a car software Bahrain, property management software Bahrain',

    hero: {
      eyebrow: 'أهلاً وسهلاً · Welcome to Bahrain',
      headingA: 'POS, CRM and invoices',
      headingB: 'for businesses in Bahrain',
      subtitle: 'Make a free invoice in Bahraini dinars with 10% VAT and no signup. When single documents are not enough, Nexora also makes restaurant POS, retail POS, CRM, property and rental software that you can try free for a month.',
      primaryCta: { label: 'Make a free invoice in BHD', to: '/tools/invoice-generator' },
      secondaryCta: { label: 'See Restaurant POS', to: '/restaurant-pos' },
    },

    facts: [
      { value: 'BHD + VAT', label: 'Invoices in dinars with a tax rate you set' },
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'No signup', label: 'Free invoice, quotation and receipt tools' },
      { value: 'English', label: 'Interface, with Arabic names allowed in your data' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Hello, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We do not have an office in Bahrain, and we work with Bahrain businesses online, by WhatsApp and email.',
        'Bahrain is a small market with big ambitions, and most small businesses here need a clear invoice and a simple till before anything else. The free invoice generator lets you pick BHD, which uses three decimals, and add VAT under Taxes. It runs in your browser, so what you type stays on your device.',
        'If you outgrow single documents, the Nexora platform is one login with several modules: Restaurant POS, Retail POS, Pharmacy POS, School ERP, CRM, WhatsApp CRM, Transport & Fleet and Property ERP. We also build custom software, and our portfolio includes a website for Alqudabea Security in Bahrain.',
      ],
    },

    arts: {
      eyebrow: 'البحرين · The island we build for',
      heading: 'An island of pearls, souks and fast-moving shops',
      intro: 'Bahrain is an archipelago whose name means two seas. Its history runs from the pearl divers and the UNESCO-listed Pearling Path in Muharraq to Qal’at al-Bahrain, the ancient fort, and from the Manama souq to the cafes of Adliya and the towers of the Financial Harbour. Racing fans know Sakhir, and the King Fahd Causeway ties the island to Saudi Arabia. Business here is compact and personal, and customers expect quick, clear service.',
      items: [
        { key: 'dish', title: 'Restaurants, cafes and sweet shops', text: 'Machboos kitchens, halwa shops and cafes in Adliya and Muharraq need quick bills. The Restaurant POS covers KOT, kitchen display, tables, split bills and a tax rate you can set to 10%.' },
        { key: 'shop', title: 'Shops, groceries and traders', text: 'Barcode billing, stock, suppliers and a customer ledger for shops and traders, with the tax rate shown on the receipt.' },
        { key: 'key', title: 'Property and rentals', text: 'Landlords and managers track tenants, rent collection, leases, maintenance and owner reports in the Property ERP, and sales teams follow leads in the CRM.' },
        { key: 'car', title: 'Rent-a-car and transport', text: 'Vehicles, rental bookings, customer ledgers, payments and dues sit in one place in Transport & Fleet, with no live GPS tracking.' },
      ],
    },

    business: {
      eyebrow: 'Products',
      heading: 'Which Nexora module fits your Bahrain business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add another later without starting over.',
      items: [
        { title: 'Freelancers, traders and small firms', text: 'Choose BHD, add VAT under Taxes and download a PDF or Excel invoice. No signup, no watermark.', label: 'Free invoice generator', to: '/tools/invoice-generator', cta: 'Make an invoice' },
        { title: 'Restaurants, cafes and bakeries', text: 'KOT and kitchen display, table management, split bills and offline-ready billing for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Shops, groceries and supermarkets', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and a customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Landlords and property managers', text: 'Tenants, rent collection, leases, maintenance and owner reports.', label: 'Property ERP', to: '/property-erp' },
        { title: 'Sales teams and agencies', text: 'Track leads and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
        { title: 'Rent-a-car and fleet operators', text: 'Vehicles, rental bookings, customer ledgers, payments and dues, with revenue and utilization reports.', label: 'Transport & Fleet', to: '/transport-fleet' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'VAT, the NBR and what we cover',
        heading: 'Bahrain VAT on your invoices, and what to check first',
        paragraphs: [
          'Bahrain’s standard VAT rate is 10%, according to published guides to the National Bureau for Revenue. In the free invoice tool and in the POS and CRM invoices you set the tax rate yourself, so you can use 10%, 0% or switch VAT off for a line. Which rate applies to a supply is your decision with your tax adviser, not the tool’s.',
          'Nexora does not connect to the National Bureau for Revenue, file VAT returns or send e-invoices. The free invoice tool has no Bahrain preset yet, so you set the currency to BHD and add the tax yourself. If you need an integration, ask us before you subscribe and we will tell you honestly whether it is a custom project.',
        ],
        links: [
          { to: '/tools/invoice-generator', label: 'Free invoice generator' },
          { to: '/tools/quotation-generator', label: 'Quotation generator' },
        ],
      },
    ],

    why: {
      heading: 'Why Bahrain businesses try Nexora',
      items: [
        { title: 'Free tool first', text: 'Make an invoice or a quotation today without creating an account.' },
        { title: 'A free month on every plan', text: 'Every plan starts with a free first month, free setup, free data migration and free staff training.' },
        { title: 'Many modules, one login', text: 'POS, CRM, property, school and fleet software share one account, so you add what you need.' },
        { title: 'Arabic names in your data', text: 'Type customer and product names in Arabic. PDF downloads cannot yet draw Arabic, so use Print and Save as PDF for those.' },
        { title: 'Roles and permissions', text: 'A counter staff sees billing, a manager sees reports, and the owner sees everything, from a phone or a laptop.' },
        { title: 'We say what is not built', text: 'No NBR integration, no Arabic interface and no Bahrain office. We would rather tell you now than after you sign up.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every part of Bahrain',
      text: 'Nexora opens in a browser, so it works the same wherever your shop, restaurant, office or garage is. Businesses can use it from the places below and anywhere else on the island. We are online only and have no Bahrain office.',
      list: ['Manama', 'Muharraq', 'Riffa', 'Hamad Town', 'Isa Town', 'Sitra', 'Seef', 'Juffair', 'Adliya', 'Budaiya', 'Sakhir', 'Amwaj Islands'],
    },

    pricingHeading: 'Plans and pricing',
    pricingNote: 'Plans are listed in Pakistani rupees on the pricing page for now. Message us and we will confirm the current price in Bahraini dinars.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Try the free tool', text: 'Make an invoice in BHD with VAT and see how the tool feels.' },
      { title: 'Start the free month', text: 'Create your account, pick the module, and add your menu, products, tenants or customers. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test entries, and start working for real.' },
    ],

    faqHeading: 'Questions from Bahrain businesses',
    faqs: [
      { q: 'Is there a free invoice generator for Bahrain?', a: 'Yes. Open the free invoice generator, choose BHD as the currency, add VAT under Taxes, and download a PDF or Excel file. There is no signup or watermark, and BHD is shown with three decimals.' },
      { q: 'Does Nexora have an office in Bahrain?', a: 'No. Our head office is at Al Noor Plaza, Multan, and we support Bahrain customers by WhatsApp and email. The software is cloud-based, so it works the same anywhere.' },
      { q: 'Does Nexora connect to the National Bureau for Revenue?', a: 'No. Nexora calculates VAT on invoices and receipts, but it does not file returns or send e-invoices to the NBR. If you need that, ask us first.' },
      { q: 'Is the interface available in Arabic?', a: 'No, the interface is in English today. You can type customer and product names in Arabic. A full Arabic interface would be a custom project.' },
      { q: 'Can I use Nexora for a restaurant or shop in Manama?', a: 'Yes. The Restaurant POS covers KOT, kitchen display, table management and billing, and the Retail POS covers barcode billing, multi-counter checkout, stock and a customer ledger. You set the tax rate, such as 10% for VAT.' },
      { q: 'Is there software for property and rental management in Bahrain?', a: 'Nexora Property ERP covers tenants, rent collection, leases, maintenance and owner reports, and the CRM tracks leads. It does not file with any government property system.' },
      { q: 'How much does Nexora cost in Bahraini dinars?', a: `${planPriceSentence()} Plans are priced in Pakistani rupees today. Message us and we will confirm a price in dinars.` },
      { q: 'Do you build custom software for businesses in Bahrain?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations, and our portfolio includes a website for Alqudabea Security in Bahrain. Tell us what you need on WhatsApp and we will say whether a ready-made module already covers it.' },
    ],

    ctaHeading: 'Ready to start in Bahrain?',
    ctaSubtext: 'Make a free invoice today, or message us and we will show you the module that fits your restaurant, shop, property portfolio or fleet.',
    cta: {
      primary: { label: 'Make a free invoice', to: '/tools/invoice-generator' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Our head office is in Multan. We work with Bahrain businesses online, by WhatsApp and email.',
  },
  {
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    nameLocal: 'المملكة العربية السعودية',
    parent: { to: '/', label: 'Home' },
    theme: { primary: '#0b4d2c', accent: '#c9a24a', warm: '#0b6b3a' },

    seoTitle: 'Business Software Saudi Arabia: POS, CRM & ERP | Nexora',
    seoDescription: 'POS, CRM and property software for Saudi businesses in Riyadh, Jeddah and Dammam, with a tax rate you set. Honest note on ZATCA. Free first month.',
    seoKeywords: 'POS system Saudi Arabia, restaurant POS Riyadh, CRM software Saudi Arabia, business software Riyadh, ZATCA invoice requirements, retail POS Jeddah, property management software Saudi, rent a car software Saudi Arabia',

    hero: {
      eyebrow: 'أهلاً وسهلاً · Welcome to Saudi Arabia',
      headingA: 'POS, CRM and ERP',
      headingB: 'for businesses in Saudi Arabia',
      subtitle: 'Nexora makes restaurant POS, retail POS, CRM, property and rental software that you can try free for a month, with a tax rate you set yourself. We are upfront about ZATCA: Nexora is not an approved e-invoicing solution, and this page explains what that means for you.',
      primaryCta: { label: 'Start the free trial', to: '/restaurant-pos' },
      secondaryCta: { label: 'Try the free quotation maker', to: '/tools/quotation-generator' },
    },

    facts: [
      { value: 'SAR + 15% VAT', label: 'A tax rate you set yourself on invoices and receipts' },
      { value: '1 month', label: 'Free trial on every plan' },
      { value: 'Not ZATCA-approved', label: 'No Fatoorah e-invoicing integration' },
      { value: 'English', label: 'Interface, with Arabic names allowed in your data' },
    ],

    intro: {
      heading: 'About Nexora Solution',
      paragraphs: [
        'Hello, and welcome. Nexora Solution is a Pakistani software company that has been building business software since 2019. Our head office is at Al Noor Plaza, Multan. We do not have an office in Saudi Arabia, and we work with Saudi businesses online, by WhatsApp and email.',
        'The Nexora platform is one login with several modules: Restaurant POS, Retail POS, Pharmacy POS, School ERP, CRM, WhatsApp CRM, Transport & Fleet and Property ERP. You choose the one your business needs, add your team, and use it in a browser on a phone or a laptop.',
        'Please read the ZATCA section below before you decide. Saudi Arabia has strict electronic invoicing rules, and Nexora does not yet meet them, so we would rather you know that now. We also build custom software, mobile apps and online stores.',
      ],
    },

    arts: {
      eyebrow: 'المملكة · The kingdom we build for',
      heading: 'From Riyadh’s towers to Jeddah’s old town',
      intro: 'Saudi Arabia is a huge and fast-changing market. Riyadh grows around the Kingdom Centre and the old mud-brick district of Diriyah, Jeddah looks out on the Red Sea from the historic Al-Balad quarter, and Dammam and Khobar serve the Eastern Province. Coffee is poured from a dallah, kabsa feeds big tables, and the working week runs Sunday to Thursday. Vision 2030 has opened new shops, cafes and services in every city, and each of them needs quick, tidy billing.',
      items: [
        { key: 'dish', title: 'Restaurants, cafes and coffee shops', text: 'From kabsa kitchens to specialty coffee, the Restaurant POS covers KOT, kitchen display, tables, split bills and a tax rate you set.' },
        { key: 'shop', title: 'Retail, groceries and wholesalers', text: 'Barcode billing, multi-counter checkout, stock, suppliers and a customer ledger for shops and traders.' },
        { key: 'key', title: 'Property and rentals', text: 'Landlords and managers track tenants, rent collection, leases, maintenance and owner reports in the Property ERP, and sales teams follow leads in the CRM.' },
        { key: 'car', title: 'Rent-a-car and transport', text: 'Vehicles, rental bookings, customer ledgers, payments and dues sit in one place in Transport & Fleet, with no live GPS tracking.' },
      ],
    },

    business: {
      eyebrow: 'Products',
      heading: 'Which Nexora module fits your Saudi business',
      intro: 'Match your business to a module. Every one of them runs on the same Nexora account, so you can add another later without starting over.',
      items: [
        { title: 'Restaurants, cafes and bakeries', text: 'KOT and kitchen display, table management, split bills and offline-ready billing for dine-in, takeaway and delivery.', label: 'Restaurant POS', to: '/restaurant-pos' },
        { title: 'Shops, groceries and supermarkets', text: 'Barcode billing, multi-counter checkout, stock control, suppliers and a customer ledger.', label: 'Retail POS', to: '/retail-pos' },
        { title: 'Pharmacies', text: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts.', label: 'Pharmacy POS', to: '/pharmacy-pos' },
        { title: 'Landlords and property managers', text: 'Tenants, rent collection, leases, maintenance and owner reports.', label: 'Property ERP', to: '/property-erp' },
        { title: 'Sales teams and agencies', text: 'Track leads and customers in a CRM, and talk to customers on WhatsApp from a shared inbox.', label: 'CRM', to: '/crm' },
        { title: 'Rent-a-car and fleet operators', text: 'Vehicles, rental bookings, customer ledgers, payments and dues, with revenue and utilization reports.', label: 'Transport & Fleet', to: '/transport-fleet' },
      ],
      footer: {
        text: 'Need something built for your company? We also make',
        links: [
          { to: '/software-development', label: 'custom software' },
          { to: '/erp-development', label: 'ERP systems' },
          { to: '/mobile-app-development', label: 'mobile apps' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'ZATCA, Fatoorah and what we cover',
        heading: 'ZATCA e-invoicing: what it asks for and where Nexora stands',
        paragraphs: [
          'The standard VAT rate in Saudi Arabia is 15%. According to published guides to ZATCA’s Fatoorah rules, invoices must be issued electronically, must be in Arabic, and simplified invoices to consumers need a QR code. In the integration phase, which is rolling out in waves, standard invoices to businesses are also sent to ZATCA’s platform in a set XML format. Details and your wave depend on your business, so check ZATCA’s own site.',
          'Nexora calculates VAT at a rate you set, but it is not a ZATCA-approved solution. It does not produce the QR code or XML, connect to Fatoorah or print Arabic invoices. If your business must issue ZATCA invoices, use an approved solution for that step. We can still help with POS, CRM and property work, and a ZATCA integration would be a custom project that we would scope honestly with you first.',
        ],
        links: [
          { to: '/software-development', label: 'Ask about a custom project' },
          { to: '/tools/quotation-generator', label: 'Quotation generator' },
        ],
      },
    ],

    why: {
      heading: 'Why Saudi businesses try Nexora',
      items: [
        { title: 'A free month on every plan', text: 'Every plan starts with a free first month, free setup, free data migration and free staff training.' },
        { title: 'Many modules, one login', text: 'POS, CRM, property, school and fleet software share one account, so you add what you need.' },
        { title: 'Quotations without signup', text: 'Make a quotation with a validity date in your browser, with no account and no watermark.' },
        { title: 'Arabic names in your data', text: 'Type customer and product names in Arabic. PDF downloads cannot yet draw Arabic, so use Print and Save as PDF for those.' },
        { title: 'Roles and permissions', text: 'A counter staff sees billing, a manager sees reports, and the owner sees everything, from a phone or a laptop.' },
        { title: 'We say what is not built', text: 'No ZATCA integration, no Arabic interface and no Saudi office. We would rather tell you now than after you sign up.' },
      ],
    },

    areas: {
      heading: 'Cloud software for every region of the kingdom',
      text: 'Nexora opens in a browser, so it works the same wherever your shop, restaurant, office or garage is. Businesses can use it from the cities below and anywhere else in the kingdom. We are online only and have no Saudi office.',
      list: ['Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Makkah', 'Madinah', 'Taif', 'Abha', 'Tabuk', 'Buraydah', 'Jubail', 'Yanbu'],
    },

    pricingHeading: 'Plans and pricing',
    pricingNote: 'Plans are listed in Pakistani rupees on the pricing page for now. Message us and we will confirm the current price in Saudi riyals.',

    stepsHeading: 'Get started in three steps',
    steps: [
      { title: 'Message us on WhatsApp', text: 'Tell us what kind of business you run, and ask about ZATCA if invoicing is your main need.' },
      { title: 'Start the free month', text: 'Create your account, pick the module, and add your menu, products, tenants or customers. We help with the data move.' },
      { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test entries, and start working for real.' },
    ],

    faqHeading: 'Questions from Saudi businesses',
    faqs: [
      { q: 'Is Nexora ZATCA compliant?', a: 'No. Nexora is not an approved e-invoicing solution. It calculates VAT at a rate you set, but it does not produce ZATCA QR codes or XML, connect to Fatoorah or print Arabic invoices. A ZATCA integration would be a custom project.' },
      { q: 'What does ZATCA e-invoicing require?', a: 'According to published guides, invoices are issued electronically in Arabic, simplified consumer invoices carry a QR code, and in the integration phase standard invoices are sent to ZATCA’s platform in a set format. Check ZATCA’s website for the rules and wave that apply to you.' },
      { q: 'Does Nexora have an office in Saudi Arabia?', a: 'No. Our head office is at Al Noor Plaza, Multan, and we support Saudi customers by WhatsApp and email. The software is cloud-based, so it works the same anywhere.' },
      { q: 'Is the interface available in Arabic?', a: 'No, the interface is in English today. You can type customer and product names in Arabic. A full Arabic interface would be a custom project.' },
      { q: 'Can I use Nexora for a restaurant or shop in Riyadh?', a: 'Yes, for the POS and management side. The Restaurant POS covers KOT, kitchen display, table management and billing, and the Retail POS covers barcode billing, stock and a customer ledger. You set the tax rate, such as 15% for VAT, but the invoices are not ZATCA e-invoices.' },
      { q: 'Is there software for property and rental management in Saudi Arabia?', a: 'Nexora Property ERP covers tenants, rent collection, leases, maintenance and owner reports, and the CRM tracks leads. It does not file with any government property system.' },
      { q: 'How much does Nexora cost in Saudi riyals?', a: `${planPriceSentence()} Plans are priced in Pakistani rupees today. Message us and we will confirm a price in riyals.` },
      { q: 'Do you build custom software for businesses in Saudi Arabia?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need on WhatsApp and we will say whether a ready-made module already covers it, and what a ZATCA integration would involve.' },
    ],

    ctaHeading: 'Ready to start in Saudi Arabia?',
    ctaSubtext: 'Start the free month today, or message us and we will show you the module that fits your restaurant, shop, property portfolio or fleet.',
    cta: {
      primary: { label: 'Start the free trial', to: '/restaurant-pos' },
      secondary: { label: 'Message us on WhatsApp' },
    },
    contactNote: 'Our head office is in Multan. We work with Saudi businesses online, by WhatsApp and email.',
  },
  {
    slug: 'indonesia',
    name: 'Indonesia',
    nameLocal: 'Indonesia',
    lang: 'id',
    parent: null,
    theme: { primary: '#1f3a5f', accent: '#b3261e', warm: '#b3261e' },

    seoTitle: 'Aplikasi Kasir, Invoice Gratis & CRM untuk UMKM | Nexora',
    seoDescription: 'Buat invoice gratis tanpa daftar, lalu coba aplikasi kasir restoran, kasir toko, CRM WhatsApp dan software rental mobil. Uji coba gratis 1 bulan.',
    seoKeywords: 'aplikasi invoice gratis, aplikasi kasir restoran, aplikasi kasir toko, aplikasi kasir berbasis web, CRM WhatsApp, software rental mobil, software manajemen properti, aplikasi untuk UMKM',

    hero: {
      eyebrow: 'Selamat datang · Welcome to Indonesia',
      headingA: 'Invoice gratis, aplikasi kasir dan CRM',
      headingB: 'untuk UMKM di Indonesia',
      subtitle: 'Buat invoice dalam rupiah tanpa daftar, lalu coba aplikasi kasir restoran, kasir toko, CRM WhatsApp, software rental mobil dan manajemen properti dari Nexora. Setiap paket punya uji coba gratis selama satu bulan. Tampilan aplikasi masih berbahasa Inggris.',
      primaryCta: { label: 'Buat invoice gratis', to: '/tools/invoice-generator' },
      secondaryCta: { label: 'Lihat POS Restoran', to: '/restaurant-pos' },
    },

    facts: [
      { value: 'Rupiah', label: 'Invoice dalam IDR dengan pajak yang Anda atur' },
      { value: '1 bulan', label: 'Uji coba gratis di setiap paket' },
      { value: 'Tanpa daftar', label: 'Alat gratis untuk invoice, penawaran dan struk' },
      { value: 'Bahasa Inggris', label: 'Tampilan aplikasi, nama pelanggan boleh berbahasa Indonesia' },
    ],

    intro: {
      heading: 'Tentang Nexora Solution',
      paragraphs: [
        'Halo, dan selamat datang. Nexora Solution adalah perusahaan perangkat lunak dari Pakistan yang membuat software bisnis sejak 2019. Kantor pusat kami ada di Al Noor Plaza, Multan. Kami tidak punya kantor di Indonesia, dan melayani pelanggan Indonesia secara online lewat WhatsApp dan email.',
        'Banyak UMKM butuh invoice yang rapi sebelum butuh software besar, jadi kami mulai dari alat gratis. Pembuat invoice gratis berjalan di browser Anda, jadi data yang Anda ketik tetap ada di perangkat Anda. Anda bisa memilih mata uang IDR dan menambahkan pajak sendiri.',
        'Jika kebutuhan Anda bertambah, platform Nexora memiliki beberapa modul dengan satu akun: POS Restoran, POS Toko, POS Apotek, ERP Sekolah, CRM, CRM WhatsApp, Transport & Fleet dan Property ERP. Kami juga membuat software khusus, aplikasi mobile dan toko online.',
      ],
    },

    arts: {
      eyebrow: 'Nusantara · Tempat kami membangun',
      heading: 'Ribuan pulau, jutaan usaha kecil',
      intro: 'Indonesia adalah negara kepulauan dengan ribuan usaha kecil, dari warung dan kedai kopi sampai toko kelontong, bengkel dan penyewaan mobil. Jakarta ramai di sekitar Monas, Yogyakarta menjaga batik dan keraton, Bali menyambut wisatawan, dan Surabaya, Bandung, Medan serta Makassar punya pasarnya sendiri. Semua usaha itu butuh pencatatan yang jelas dan struk yang cepat.',
      items: [
        { key: 'dish', title: 'Restoran, warung dan kedai kopi', text: 'Dari warung makan sampai kafe, POS Restoran mencakup KOT, layar dapur, manajemen meja, pisah tagihan dan tarif pajak yang Anda atur.' },
        { key: 'shop', title: 'Toko, minimarket dan grosir', text: 'Penagihan dengan barcode, banyak kasir, stok, pemasok dan buku piutang pelanggan untuk toko dan pedagang.' },
        { key: 'key', title: 'Properti dan kos-kosan', text: 'Pemilik dan pengelola mencatat penyewa, pembayaran sewa, kontrak, perawatan dan laporan pemilik di Property ERP, sementara tim penjualan memantau prospek di CRM.' },
        { key: 'car', title: 'Rental mobil dan transportasi', text: 'Kendaraan, pemesanan rental, buku piutang pelanggan, pembayaran dan tunggakan ada di satu tempat di Transport & Fleet, tanpa pelacakan GPS langsung.' },
      ],
    },

    business: {
      eyebrow: 'Produk',
      heading: 'Modul Nexora mana yang cocok untuk usaha Anda',
      intro: 'Cocokkan usaha Anda dengan satu modul. Semuanya berjalan di akun Nexora yang sama, jadi Anda bisa menambah modul lain nanti tanpa mulai dari awal.',
      items: [
        { title: 'Freelancer, pedagang dan usaha kecil', text: 'Pilih mata uang IDR, tambahkan pajak di bagian Taxes, lalu unduh invoice PDF atau Excel. Tanpa daftar dan tanpa watermark.', label: 'Pembuat invoice gratis', to: '/tools/invoice-generator', cta: 'Buat invoice' },
        { title: 'Restoran, kafe dan toko roti', text: 'KOT dan layar dapur, manajemen meja, pisah tagihan, dan penagihan yang tetap jalan saat offline untuk makan di tempat, bawa pulang dan antar.', label: 'POS Restoran', to: '/restaurant-pos', cta: 'Lihat POS Restoran' },
        { title: 'Toko, minimarket dan supermarket', text: 'Penagihan dengan barcode, banyak kasir, kontrol stok, pemasok dan buku piutang pelanggan.', label: 'POS Toko', to: '/retail-pos', cta: 'Lihat POS Toko' },
        { title: 'Pemilik properti dan kos-kosan', text: 'Penyewa, pembayaran sewa, kontrak, perawatan dan laporan untuk pemilik.', label: 'Property ERP', to: '/property-erp', cta: 'Lihat Property ERP' },
        { title: 'Tim penjualan dan agensi', text: 'Pantau prospek dan pelanggan di CRM, dan balas pelanggan di WhatsApp dari satu kotak masuk bersama.', label: 'CRM', to: '/crm', cta: 'Lihat CRM' },
        { title: 'Rental mobil dan armada', text: 'Kendaraan, pemesanan rental, buku piutang pelanggan, pembayaran dan tunggakan, dengan laporan pendapatan dan pemakaian.', label: 'Transport & Fleet', to: '/transport-fleet', cta: 'Lihat Transport & Fleet' },
      ],
      footer: {
        text: 'Butuh sesuatu yang dibuat khusus untuk perusahaan Anda? Kami juga membuat',
        links: [
          { to: '/software-development', label: 'software khusus' },
          { to: '/erp-development', label: 'sistem ERP' },
          { to: '/mobile-app-development', label: 'aplikasi mobile' },
        ],
      },
    },

    extraSections: [
      {
        eyebrow: 'PPN, faktur pajak dan batasan kami',
        heading: 'PPN di invoice Anda, dan apa yang perlu dicek dulu',
        paragraphs: [
          'Di Indonesia, PPN umumnya dikenal sebagai 11%, tetapi aturan tarif dan dasar pengenaannya pernah berubah, jadi periksa aturan terbaru di situs Direktorat Jenderal Pajak atau tanyakan ke konsultan pajak Anda. Di alat invoice gratis dan di invoice POS maupun CRM, Anda mengatur tarif pajak sendiri, termasuk 0% atau mematikan pajak untuk satu baris.',
          'Nexora tidak terhubung dengan Coretax, tidak membuat faktur pajak elektronik, dan tidak melaporkan SPT atau PPN. Invoice dari alat gratis kami bukan faktur pajak resmi. Jika Anda membutuhkan integrasi seperti itu, tanyakan dulu sebelum berlangganan, dan kami akan jujur apakah itu proyek khusus.',
        ],
        links: [
          { to: '/tools/invoice-generator', label: 'Pembuat invoice gratis' },
          { to: '/tools/quotation-generator', label: 'Pembuat penawaran' },
        ],
      },
    ],

    why: {
      heading: 'Mengapa UMKM Indonesia mencoba Nexora',
      items: [
        { title: 'Mulai dari alat gratis', text: 'Buat invoice atau penawaran hari ini tanpa membuat akun.' },
        { title: 'Satu bulan gratis di setiap paket', text: 'Setiap paket dimulai dengan satu bulan gratis, termasuk pemasangan, pemindahan data dan pelatihan staf. Ini uji coba, bukan gratis selamanya.' },
        { title: 'Banyak modul, satu akun', text: 'POS, CRM, properti, sekolah dan armada memakai akun yang sama, jadi Anda menambah modul sesuai kebutuhan.' },
        { title: 'Peran dan izin akses', text: 'Kasir hanya melihat penagihan, manajer melihat laporan, dan pemilik melihat semuanya, dari ponsel atau laptop.' },
        { title: 'Berjalan di browser', text: 'Tidak perlu memasang program di PC. POS Restoran tetap menerima pesanan saat internet putus dan menyinkronkannya kembali nanti.' },
        { title: 'Kami jujur soal yang belum ada', text: 'Belum ada tampilan bahasa Indonesia, belum ada integrasi Coretax, dan tidak ada kantor di Indonesia. Lebih baik Anda tahu sekarang.' },
      ],
    },

    areas: {
      heading: 'Software cloud untuk seluruh Indonesia',
      text: 'Nexora berjalan di browser, jadi sama saja di mana pun warung, toko, kafe, kantor atau bengkel Anda berada. Usaha di kota-kota di bawah ini dan di mana pun di Indonesia bisa memakainya. Kami hanya online dan tidak punya kantor di Indonesia.',
      list: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Yogyakarta', 'Denpasar', 'Makassar', 'Palembang', 'Malang', 'Tangerang', 'Bekasi'],
    },

    pricingHeading: 'Paket dan harga',
    pricingNote: 'Harga paket saat ini tercantum dalam rupee Pakistan di halaman harga. Hubungi kami dan kami akan konfirmasi harga terbaru dalam rupiah.',

    stepsHeading: 'Mulai dalam tiga langkah',
    steps: [
      { title: 'Coba alat gratis', text: 'Buat invoice dalam rupiah dan lihat apakah alatnya cocok untuk Anda.' },
      { title: 'Mulai bulan gratis', text: 'Buat akun, pilih modul, lalu masukkan menu, produk, penyewa atau pelanggan Anda. Kami bantu memindahkan data.' },
      { title: 'Latih tim dan mulai bekerja', text: 'Tambahkan staf dengan peran yang tepat, coba beberapa transaksi, lalu mulai bekerja sungguhan.' },
    ],

    faqHeading: 'Pertanyaan dari pelaku usaha di Indonesia',
    faqs: [
      { q: 'Apakah ada aplikasi invoice gratis untuk Indonesia?', a: 'Ya. Buka pembuat invoice gratis, pilih IDR sebagai mata uang, tambahkan pajak di bagian Taxes, lalu unduh PDF atau Excel. Tanpa daftar dan tanpa watermark. Tampilannya berbahasa Inggris.' },
      { q: 'Apakah aplikasi kasir Nexora gratis selamanya?', a: 'Tidak. Setiap paket punya uji coba gratis selama satu bulan, setelah itu berbayar. Yang gratis tanpa batas waktu adalah alat invoice, penawaran dan struk di browser.' },
      { q: 'Apakah Nexora punya kantor di Indonesia?', a: 'Tidak. Kantor pusat kami ada di Al Noor Plaza, Multan, dan kami melayani pelanggan Indonesia lewat WhatsApp dan email. Karena berbasis cloud, aplikasinya sama di mana pun.' },
      { q: 'Apakah tampilan aplikasi tersedia dalam bahasa Indonesia?', a: 'Belum. Tampilan aplikasi berbahasa Inggris. Nama produk, menu dan pelanggan boleh Anda ketik dalam bahasa Indonesia. Tampilan penuh bahasa Indonesia akan menjadi proyek khusus.' },
      { q: 'Apakah Nexora terhubung dengan Coretax atau e-Faktur?', a: 'Tidak. Nexora menghitung pajak sesuai tarif yang Anda atur, tetapi tidak membuat atau melaporkan faktur pajak ke Coretax. Jika Anda membutuhkannya, tanyakan dulu kepada kami.' },
      { q: 'Apakah bisa dipakai untuk restoran atau toko di Jakarta?', a: 'Bisa. POS Restoran mencakup KOT, layar dapur, manajemen meja dan penagihan, sedangkan POS Toko mencakup penagihan dengan barcode, banyak kasir, stok dan buku piutang pelanggan. Anda mengatur tarif pajaknya.' },
      { q: 'Berapa harga Nexora dalam rupiah?', a: `${planPriceSentence()} Harga saat ini dalam rupee Pakistan. Hubungi kami dan kami akan konfirmasi harga dalam rupiah.` },
      { q: 'Apakah Nexora membuat software khusus untuk perusahaan di Indonesia?', a: 'Ya. Kami membuat CRM, ERP, aplikasi mobile, toko online dan integrasi sesuai kebutuhan. Ceritakan kebutuhan Anda lewat WhatsApp dan kami akan bilang apakah modul yang sudah ada sudah cukup.' },
    ],

    ctaHeading: 'Siap mulai di Indonesia?',
    ctaSubtext: 'Buat invoice gratis hari ini, atau hubungi kami dan kami tunjukkan modul yang cocok untuk restoran, toko, properti atau armada Anda.',
    cta: {
      primary: { label: 'Buat invoice gratis', to: '/tools/invoice-generator' },
      secondary: { label: 'Hubungi kami lewat WhatsApp' },
    },
    contactNote: 'Kantor pusat kami di Multan. Kami melayani usaha di Indonesia secara online lewat WhatsApp dan email.',
  },
]

export function getCity(slug) {
  return CITIES.find((city) => city.slug === slug) || null
}
