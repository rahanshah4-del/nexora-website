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
        { title: 'Transport, rent-a-car and fleets', text: 'Vehicles, drivers, bookings and expenses managed from one transport and fleet workspace.', label: 'Transport & Fleet', to: '/transport-fleet' },
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
]

export function getCity(slug) {
  return CITIES.find((city) => city.slug === slug) || null
}
