/**
 * Help Center content: one article per product module, platform feature, free
 * tool and general topic. Pure data, so the React pages (HelpCenterPage,
 * HelpArticlePage) and scripts/prerender.mjs read the same source.
 *
 * Every statement here comes from the shipped product pages
 * (src/lib/helpModulesData.js, src/lib/featurePagesData.js), the free-tool pages
 * (src/lib/toolsPagesData.js) and the plan config (src/lib/platformPlans.js).
 * Nothing is invented: when the product does not do something, the article says so.
 */
import { featurePages } from './featurePagesData.js'
import { HELP_MODULE_FACTS } from './helpModulesData.js'
import { TOOL_PAGE_CONTENT } from './toolsPagesData.js'
import { TOOL_LINKS } from './toolsLaunch.js'
import { defaultPlatformPlans, planPriceSentence } from './platformPlans.js'

export const HELP_CENTER_PATH = '/help-center'
export const HELP_LAST_UPDATED = '2026-10-05'
export const HELP_WHATSAPP = 'https://wa.me/923194329754'
export const HELP_EMAIL = 'support@nexorasolution.online'

export const HELP_GROUPS = Object.freeze([
  { id: 'start', title: 'Getting started', text: 'Create your workspace, understand the trial and plans, and find support.' },
  { id: 'modules', title: 'Product modules', text: 'How each Nexora module works, what it covers and what it does not.' },
  { id: 'platform', title: 'Platform features', text: 'Roles, reports, stock and email tools that work across modules.' },
  { id: 'tools', title: 'Free tools', text: 'Invoice, quotation and receipt makers that run in your browser. No signup.' },
  { id: 'services', title: 'Services', text: 'Custom software, apps and business services from the Nexora team.' },
])

const planBasic = defaultPlatformPlans.find((p) => p.id === 'basic')
const planStandard = defaultPlatformPlans.find((p) => p.id === 'standard')

// ───────────────────────────── helpers ─────────────────────────────

const dedupe = (faqs) => {
  const seen = new Set()
  return faqs.filter((f) => {
    const key = f.q.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const factsFaqs = (key) => (HELP_MODULE_FACTS[key]?.faqs || []).map(([q, a]) => ({ q, a }))

/** Feature-guide sections from the supporting feature pages of one pillar. */
function guideSections(pillar) {
  return Object.entries(featurePages)
    .filter(([, page]) => page.pillar === pillar)
    .map(([key, page]) => ({
      id: key.split('/').pop(),
      heading: page.title,
      blocks: [
        { p: page.intro },
        { list: page.capabilities.map(([title, text]) => ({ title, text })) },
        { link: { to: `/${key}`, label: `Read more: ${page.badge}` } },
      ],
    }))
}

function moduleArticle({ slug, factsKey, pillar, title, product, seoTitle, seoDescription, keywords, summary, route, startSteps, extraFaqs = [], notes = [], related = [], links = [] }) {
  const facts = HELP_MODULE_FACTS[factsKey]
  const sections = [
    {
      id: 'overview',
      heading: `What is ${product}?`,
      blocks: [
        { p: facts.description },
        { p: `Open the product page for screenshots, plans and pricing, or start the free trial and try it with your own data.` },
        { links: [{ to: route, label: `${product} product page` }, { to: '/signup', label: 'Start the free trial' }] },
      ],
    },
    startSteps ? { id: 'get-started', heading: `Getting started with ${product}`, blocks: [{ steps: startSteps }] } : null,
    {
      id: 'what-you-can-do',
      heading: 'What you can do',
      blocks: [{ list: facts.features.map(([t, text]) => ({ title: t, text })) }],
    },
    ...(pillar ? guideSections(pillar) : []),
    facts.useCases.length ? { id: 'who-its-for', heading: 'Who it is for', blocks: [{ p: `Typical users: ${facts.useCases.join(', ')}.` }, facts.benefits.length ? { list: facts.benefits.map((b) => ({ title: b, text: '' })) } : null].filter(Boolean) } : null,
    notes.length ? { id: 'good-to-know', heading: 'Good to know', blocks: notes.map((callout) => ({ callout })) } : null,
  ].filter(Boolean)
  return {
    slug,
    group: 'modules',
    title,
    summary,
    seoTitle,
    seoDescription,
    keywords,
    icon: slug,
    productPath: route,
    sections,
    faqs: dedupe([...extraFaqs, ...factsFaqs(factsKey)]),
    related,
    links,
  }
}

const trialQ = { q: 'Is there a free trial?', a: 'Yes. Every plan starts with a 1-month free trial, and the trial gives you access to all Nexora modules so you can try it on real work before choosing a plan. No credit card is required.' }
const helpQ = { q: 'How do I get help with setup?', a: 'Message us on WhatsApp or email support@nexorasolution.online. Setup, data migration and staff training are free on every plan, and we can help you set up your first workspace.' }

// ───────────────────────────── module articles ─────────────────────────────

const MODULES = [
  moduleArticle({
    slug: 'restaurant-pos',
    factsKey: 'pos',
    pillar: 'restaurant-pos',
    title: 'Restaurant POS',
    product: 'Nexora Restaurant POS',
    route: '/restaurant-pos',
    seoTitle: 'Restaurant POS Help: KOT, Tables & Billing | Nexora',
    seoDescription: 'How Nexora Restaurant POS works: billing, KOT and kitchen display, tables, AI menu import, food cost and offline billing, with answers to common questions.',
    keywords: 'restaurant POS help, KOT system guide, kitchen display, restaurant billing software FAQ',
    summary: 'Billing, KOT and kitchen display, tables, menu, food stock and daily reports for restaurants, cafes and cloud kitchens.',
    startSteps: [
      { title: 'Create your account', text: 'Sign up and open your workspace. The free month includes every module.' },
      { title: 'Add your menu and tables', text: 'Import your menu from a photo with AI menu import or add items by hand, then set up your floor areas and tables.' },
      { title: 'Add staff and take orders', text: 'Create owner, manager, cashier and kitchen roles, then take your first dine-in, takeaway or delivery order.' },
    ],
    extraFaqs: [
      { q: 'How does the kitchen display work?', a: 'Every order creates a Kitchen Order Ticket. The kitchen display shows tickets in live Pending, Preparing and Ready columns, and staff move each one forward until it is served. Dine-in tickets show the table, and takeaway and delivery tickets show the order type.' },
      { q: 'Can I merge or split tables?', a: 'Yes. Tables are organized into named floor areas, each with a live status. You can merge tables for a larger party, split a table into a new one during service, and open the table’s order in one tap.' },
      { q: 'How is food cost calculated?', a: 'Menu items are linked to recipes, and ingredient stock is tied to those recipes. Food cost is calculated per recipe from real ingredient and order data, compared with a healthy range, and low-stock ingredients are flagged with a suggested reorder amount.' },
      { q: 'What is on a restaurant receipt?', a: 'The receipt shows subtotal, discount, service charge, tax, total, paid and due. Dine-in, takeaway, delivery and quick-bill orders all use the same checkout flow.' },
      { q: 'Can several staff members use it at once?', a: 'Yes. Staff roles give owners, managers, cashiers and kitchen staff only the screens they need, and orders sync to the cloud so every counter sees the same data.' },
    ],
    notes: ['Bills and kitchen copies are formatted for 58mm thermal printers. Nexora does not file tax returns or connect to a government e-invoicing system; you set your own tax rate and label.'],
    related: ['retail-pos', 'team-permissions', 'thermal-receipt-generator', 'getting-started'],
    links: [{ to: '/download/restaurant-pos', label: 'Download the Windows app' }],
  }),
  moduleArticle({
    slug: 'retail-pos',
    factsKey: 'retail-pos',
    pillar: 'retail-pos',
    title: 'Retail POS',
    product: 'Nexora Retail POS',
    route: '/retail-pos',
    seoTitle: 'Retail POS Help: Billing, Stock & Reports | Nexora',
    seoDescription: 'How Nexora Retail POS works: barcode billing, till sessions, promo codes, inventory control, customer records and daily closing reports, with FAQs.',
    keywords: 'retail POS help, barcode billing, till session, inventory control FAQ',
    summary: 'Barcode billing, till sessions, stock control, customer records and daily closing reports for shops and stores.',
    startSteps: [
      { title: 'Create your account', text: 'Sign up and open your workspace.' },
      { title: 'Add products and suppliers', text: 'Add products with categories, prices and SKUs or barcodes, and keep your suppliers in the same workspace.' },
      { title: 'Open the till and sell', text: 'Open a till session with a starting cash count, search or scan items, apply a promo code or tax, and print the receipt.' },
    ],
    extraFaqs: [
      { q: 'Can I search products by barcode?', a: 'Yes. You can find any product by name, SKU or barcode, add it to the cart and check out without leaving the billing screen.' },
      { q: 'What is a till session?', a: 'Opening the counter with a starting cash count. At the end of the day the closing report reconciles opening cash, closing cash, gross sales, discounts and dues.' },
      { q: 'How do discounts and promo codes work?', a: 'Active promo codes can be applied at checkout, and discount rules can be set as a percentage or a fixed amount. Tax defaults can be configured alongside them so totals stay consistent.' },
      { q: 'Do I have to save every customer?', a: 'No. Every sale starts as a walk-in. You can search a saved customer or add one by name and phone mid-sale, and only a saved customer can carry a balance due.' },
      { q: 'How do I keep stock accurate?', a: 'Every sale, purchase and stock adjustment updates one live stock count. Products are flagged when stock needs attention, you can raise purchase orders and returns, and every stock movement is logged and filterable by type.' },
      { q: 'What reports does it give me?', a: 'A daily closing report with a payment-method breakdown across cash, card and mobile wallet, plus items sold. You can print it as a thermal receipt or export it as CSV.' },
    ],
    related: ['restaurant-pos', 'inventory-management', 'thermal-receipt-generator', 'getting-started'],
  }),
  moduleArticle({
    slug: 'pharmacy-pos',
    factsKey: 'medical-store-pos',
    pillar: 'pharmacy-pos',
    title: 'Pharmacy POS',
    product: 'Nexora Pharmacy POS',
    route: '/pharmacy-pos',
    seoTitle: 'Pharmacy POS Help: Medicine Stock & Expiry | Nexora',
    seoDescription: 'How Nexora Pharmacy POS works: medicine search, batch and expiry tracking, supplier purchases, receipts and daily reports, with answers to common questions.',
    keywords: 'pharmacy POS help, medicine inventory, batch and expiry tracking, supplier purchases',
    summary: 'Medicine search, batch and expiry tracking, supplier purchases, receipts and daily reports for pharmacies.',
    startSteps: [
      { title: 'Create your account', text: 'Sign up and open your workspace.' },
      { title: 'Add your medicine catalog', text: 'Add medicine names, categories, prices and stock levels, and your suppliers.' },
      { title: 'Open the counter', text: 'Start a till session, search medicines by name, and print a receipt for every sale.' },
    ],
    extraFaqs: [
      { q: 'How does the counter search work?', a: 'You search medicines by name to keep the counter moving during busy hours. Each sale is printed and recorded against the medicine stock it draws from.' },
      { q: 'How are batches and expiry dates handled?', a: 'Batches and expiry dates are monitored as part of medicine inventory, and medicines approaching expiry are surfaced before they become unsellable. It is part of the same workspace as stock levels and supplier purchases.' },
      { q: 'Can I record supplier purchases and payments?', a: 'Yes. You can raise purchase orders against supplier records, return stock to a supplier, and record payments by cash, bank transfer, cheque or mobile wallet.' },
      { q: 'Which payment methods can the counter accept?', a: 'The counter accepts cash and mobile wallet payments, and every sale gets an itemized receipt.' },
    ],
    notes: ['Nexora Pharmacy POS tracks stock, batches and sales. It does not connect to any drug-regulator system, so keep following the record-keeping rules that apply to your pharmacy.'],
    related: ['retail-pos', 'inventory-management', 'getting-started'],
  }),
  moduleArticle({
    slug: 'school-erp',
    factsKey: 'school-erp',
    pillar: 'school-erp',
    title: 'School ERP',
    product: 'Nexora School ERP',
    route: '/school-erp',
    seoTitle: 'School ERP Help: Students, Fees & Attendance | Nexora',
    seoDescription: 'How Nexora School ERP works: student records, attendance with manual or device marking, fee approval workflow, exams, payroll and parent updates, with FAQs.',
    keywords: 'school ERP help, student records, school fee management, attendance, school payroll',
    summary: 'Students, attendance, fees, exams, payroll and parent updates in one school system.',
    startSteps: [
      { title: 'Create your account', text: 'Sign up and open your school workspace.' },
      { title: 'Add classes and students', text: 'Record students with admission and roll numbers, class and section, and the parent or guardian on the same record.' },
      { title: 'Set up fees, attendance and staff', text: 'Create monthly fee records, choose manual or device attendance, and add staff to payroll.' },
    ],
    extraFaqs: [
      { q: 'What does a student record hold?', a: 'Each student has an admission number and a roll number, a class and section, the parent or guardian’s contact details on the same record, and a status and created date for office record-keeping.' },
      { q: 'How does attendance work?', a: 'One attendance workflow covers students and staff. You can mark attendance manually by date, status and note, or connect an attendance device and see recent auto-punches as they arrive. The device setup guide is available in English and Urdu.' },
      { q: 'How are school fees handled?', a: 'Fee bills are tied to a fee month for recurring billing and start as pending approval, not paid. Approvals go through the same Approval Center as other billing, and collection trends show on the School Reports dashboard.' },
      { q: 'Can I run staff payroll in it?', a: 'Yes. Add staff by role, set pay as Daily, Hourly, Monthly or Custom, record gross pay and deductions for each entry, and keep a payroll transaction history.' },
    ],
    related: ['team-permissions', 'reports', 'getting-started'],
  }),
  moduleArticle({
    slug: 'crm',
    factsKey: 'crm',
    pillar: 'crm',
    title: 'CRM',
    product: 'Nexora CRM',
    route: '/crm',
    seoTitle: 'CRM Help: Leads, Pipeline & Invoices | Nexora',
    seoDescription: 'How Nexora CRM works: a five-stage lead pipeline, AI lead scoring, customer records with wallet balance, invoices and follow-up tasks, with answers to FAQs.',
    keywords: 'CRM help, lead pipeline, AI lead scoring, CRM invoices, follow-up tasks',
    summary: 'Leads, a five-stage pipeline, customers, invoices and follow-up tasks for sales and service teams.',
    startSteps: [
      { title: 'Create your account', text: 'Sign up and open your CRM workspace.' },
      { title: 'Add leads and customers', text: 'Capture leads, move them through the pipeline and convert them into customer records.' },
      { title: 'Invoice and follow up', text: 'Create invoices linked to customers, then plan follow-up tasks with reminders.' },
    ],
    extraFaqs: [
      { q: 'What are the pipeline stages?', a: 'Every lead moves through five stages: New Lead, Contacted, Qualified, Proposal and Negotiation. A kanban board shows every lead’s stage, and you can search and filter by stage.' },
      { q: 'What does AI lead scoring do?', a: 'It gives each lead a score, priority and prediction built from signals such as reply speed, meetings and activity, so the team can work the right leads first. The scoring explains itself.' },
      { q: 'What is on a customer record?', a: 'Name, email, phone, company and type, a status and creation date, and a wallet balance that updates automatically from sales. Customers link directly to invoices.' },
      { q: 'What invoice statuses are there?', a: 'An invoice moves through Draft, Approved, Overdue or Cancelled. You can add line items manually or use recommended items, and record payment by cash, card, bank transfer, cheque or mobile wallet.' },
      { q: 'How do reminders work?', a: 'Follow-ups appear on a shared board with an agent workload view. Automatic email reminders go out for upcoming and overdue follow-ups, and reminder notifications also go out over WhatsApp.' },
    ],
    related: ['whatsapp-crm', 'team-permissions', 'email-marketing', 'getting-started'],
  }),
  moduleArticle({
    slug: 'whatsapp-crm',
    factsKey: 'whatsapp-crm',
    title: 'WhatsApp CRM',
    product: 'Nexora WhatsApp CRM',
    route: '/whatsapp-crm',
    seoTitle: 'WhatsApp CRM Help: Broadcasts & Follow-ups | Nexora',
    seoDescription: 'How Nexora WhatsApp CRM works: broadcasts, team follow-ups, automation and customer tracking that turn WhatsApp conversations into leads, with FAQs.',
    keywords: 'WhatsApp CRM help, WhatsApp broadcasts, follow-ups, customer tracking',
    summary: 'Broadcasts, follow-ups, automation and customer tracking that turn WhatsApp conversations into leads.',
    startSteps: [
      { title: 'Create your account', text: 'Sign up and open your workspace.' },
      { title: 'Bring in your contacts', text: 'Link conversations with customer records so every chat has a history.' },
      { title: 'Follow up as a team', text: 'Assign follow-ups, send targeted broadcasts and review response reports.' },
    ],
    extraFaqs: [
      { q: 'What can I send as a broadcast?', a: 'Targeted updates to customers and prospects. Campaign activity can be connected with customer follow-up and reporting, so you can measure outreach and response rates.' },
      { q: 'Does it replace the normal CRM?', a: 'No. WhatsApp CRM focuses on conversations. The Nexora CRM covers leads, pipeline, invoices and tasks, and both run on the same account.' },
    ],
    related: ['crm', 'email-marketing', 'getting-started'],
  }),
  moduleArticle({
    slug: 'transport-fleet',
    factsKey: 'transport-rental',
    pillar: 'transport-fleet',
    title: 'Transport & Fleet',
    product: 'Nexora Fleet & Rental',
    route: '/transport-fleet',
    seoTitle: 'Fleet & Rental Help: Bookings, Ledger & Dues | Nexora',
    seoDescription: 'How Nexora Fleet & Rental works: vehicle records, rental bookings with deposits and refunds, customer ledgers and payments and dues, with FAQs.',
    keywords: 'fleet management help, rental bookings, customer ledger, rent a car software FAQ',
    summary: 'Vehicles, rental bookings, customer ledgers, payments and dues for car rental and transport operators.',
    startSteps: [
      { title: 'Create your account', text: 'Sign up and open your fleet workspace.' },
      { title: 'Add vehicles and customers', text: 'Create a record for every vehicle with registration, transmission and fuel type, and add your rental customers.' },
      { title: 'Book, collect and track dues', text: 'Create bookings with dates, rate and deposit, collect payments, and watch outstanding dues in the ledger.' },
    ],
    extraFaqs: [
      { q: 'What does a vehicle record hold?', a: 'Registration, transmission and fuel type, whether the vehicle comes with a driver, and an availability status you can filter across the fleet. Removing a vehicle needs an explicit confirmation.' },
      { q: 'What is on a rental booking?', a: 'Customer, vehicle, dates, rate and driver on one record, with total, advance paid and security deposit. Refund status, amount, method and date are recorded against the booking, and cancellation fines are tracked and marked as retained when applied.' },
      { q: 'How does the customer ledger work?', a: 'Every rental customer has their own record with full booking history and outstanding dues across all their bookings. A dedicated view lists every customer who currently owes money.' },
      { q: 'How are payments and dues tracked?', a: 'A fleet-wide view compares what was collected with what was billed today, tracks dues across every customer, ties payment status to booking status, and accounts for cancellations and refunds.' },
    ],
    notes: ['Nexora Fleet & Rental manages vehicles, bookings, customers, payments and dues. It does not include live GPS tracking.'],
    related: ['crm', 'team-permissions', 'getting-started'],
  }),
  moduleArticle({
    slug: 'property-erp',
    factsKey: 'property-erp',
    title: 'Property ERP',
    product: 'Nexora Property ERP',
    route: '/property-erp',
    seoTitle: 'Property ERP Help: Tenants, Rent & Leases | Nexora',
    seoDescription: 'How Nexora Property ERP works: tenant and owner records, rent collection, lease tracking, maintenance requests and portfolio reports, with common questions.',
    keywords: 'property management help, rent collection, lease tracking, maintenance requests',
    summary: 'Tenants, rent collection, leases, maintenance requests and owner reports for property teams.',
    startSteps: [
      { title: 'Create your account', text: 'Sign up and open your workspace, then choose Rentals, Sales or Both.' },
      { title: 'Add properties, owners and tenants', text: 'Keep tenants and owners in one directory, linked to the properties and contracts they belong to.' },
      { title: 'Collect rent and manage upkeep', text: 'Record rent payments, track lease dates and renewals, and assign maintenance requests.' },
    ],
    related: ['crm', 'team-permissions', 'reports', 'getting-started'],
    notes: ['Nexora Property ERP does not file with any government property or tenancy registry.'],
  }),
]

// ───────────────────────────── platform features ─────────────────────────────

function platformArticle({ slug, factsKey, title, seoTitle, seoDescription, keywords, summary, extraFaqs = [], notes = [], related = [], links = [] }) {
  const facts = HELP_MODULE_FACTS[factsKey]
  return {
    slug,
    group: 'platform',
    title,
    summary,
    seoTitle,
    seoDescription,
    keywords,
    icon: slug,
    sections: [
      { id: 'overview', heading: `What is ${title}?`, blocks: [{ p: facts.description }] },
      { id: 'what-you-can-do', heading: 'What you can do', blocks: [{ list: facts.features.map(([t, text]) => ({ title: t, text })) }] },
      notes.length ? { id: 'good-to-know', heading: 'Good to know', blocks: notes.map((callout) => ({ callout })) } : null,
    ].filter(Boolean),
    faqs: dedupe([...extraFaqs, ...factsFaqs(factsKey)]),
    related,
    links,
  }
}

const PLATFORM = [
  platformArticle({
    slug: 'team-permissions',
    factsKey: 'team-permissions',
    title: 'Team & Permissions',
    seoTitle: 'Team & Permissions Help: Roles and Access | Nexora',
    seoDescription: 'How roles and permissions work in Nexora: add team members, set module-level and action-level access, and review activity with audit logs.',
    keywords: 'team permissions, role based access, audit logs, staff roles',
    summary: 'Add team members and control what each person can see and do.',
    extraFaqs: [
      { q: 'How many team members can I add?', a: `It depends on your plan. Basic includes up to 2 team members and Standard up to 5 users, Enterprise has unlimited users, and the free trial has unlimited users while it runs.` },
    ],
    related: ['getting-started', 'pricing-and-trial', 'restaurant-pos'],
  }),
  platformArticle({
    slug: 'reports',
    factsKey: 'reports',
    title: 'Reports & Analytics',
    seoTitle: 'Reports & Analytics Help: Dashboards & Exports | Nexora',
    seoDescription: 'How reporting works in Nexora: KPI dashboards, analytics across modules, PDF reports and Excel exports, controlled by role and workspace.',
    keywords: 'business reports, KPI dashboard, PDF report, Excel export',
    summary: 'KPI dashboards, PDF reports and Excel exports across your modules.',
    extraFaqs: [
      { q: 'Which reports come with each module?', a: 'Each module has its own reports, for example a daily closing report in Retail POS, a cashier-wise end-of-day report in Restaurant POS, fee collection trends in School ERP and revenue, dues and utilization reports in Fleet & Rental.' },
    ],
    related: ['team-permissions', 'retail-pos', 'restaurant-pos'],
  }),
  platformArticle({
    slug: 'inventory-management',
    factsKey: 'inventory-management',
    title: 'Inventory Management',
    seoTitle: 'Inventory Management Help: Stock & Purchases | Nexora',
    seoDescription: 'How inventory works in Nexora: product catalog, stock control with reorder alerts, purchase orders, supplier records and stock reports.',
    keywords: 'inventory management, stock control, purchase orders, supplier records',
    summary: 'Product stock, purchase orders, supplier records and low-stock alerts.',
    related: ['retail-pos', 'pharmacy-pos', 'restaurant-pos'],
  }),
  platformArticle({
    slug: 'email-marketing',
    factsKey: 'email-marketing',
    title: 'Email Marketing',
    seoTitle: 'Email Marketing Help: Campaigns & Lists | Nexora',
    seoDescription: 'How email marketing works in Nexora: campaigns, subscriber lists, templates, open and click tracking, and engagement reports.',
    keywords: 'email marketing, email campaigns, subscriber lists, open tracking',
    summary: 'Campaigns, subscriber lists, templates and open and click tracking.',
    related: ['crm', 'whatsapp-crm'],
  }),
]

// ───────────────────────────── free tools ─────────────────────────────

function toolArticle(link) {
  const page = TOOL_PAGE_CONTENT[link.path]
  const stepsSection = page.sections.find((s) => s.blocks.some((b) => b.steps))
  const steps = stepsSection ? stepsSection.blocks.find((b) => b.steps).steps : null
  return {
    slug: link.path.split('/').pop(),
    group: 'tools',
    title: link.label,
    summary: page.valueProp,
    seoTitle: `${link.label} Help: How It Works | Nexora`,
    seoDescription: `How to use the free ${link.label.toLowerCase()}: the steps, what it includes and answers to common questions. No signup, runs in your browser.`,
    keywords: `${link.label.toLowerCase()} help, how to use ${link.label.toLowerCase()}`,
    icon: link.key,
    toolPath: link.path,
    sections: [
      {
        id: 'overview',
        heading: `What is the ${link.label}?`,
        blocks: [{ p: page.lead }, { links: [{ to: link.path, label: `Open the ${link.label}` }] }],
      },
      steps ? { id: 'how-it-works', heading: 'How it works', blocks: [{ steps }] } : null,
      {
        id: 'privacy',
        heading: 'Your data and privacy',
        blocks: [{ p: 'The free tools run in your browser. What you type stays on your device, and there is no account, watermark or time limit. Export a JSON backup from the editor menu before you clear your browser data.' }],
      },
    ].filter(Boolean),
    faqs: page.faqs.map((f) => ({ q: f.question, a: f.answer })),
    related: ['free-tools', link.key === 'invoice' ? 'quotation-generator' : 'invoice-generator'],
    links: [],
  }
}

const TOOL_ARTICLES = TOOL_LINKS.map(toolArticle)

const TOOLS_HUB_ARTICLE = {
  slug: 'free-tools',
  group: 'tools',
  title: 'Free Tools Overview',
  summary: 'Invoice, quotation and receipt makers that run in your browser, with no signup and no watermark.',
  seoTitle: 'Free Business Tools Help: Invoices & Quotes | Nexora',
  seoDescription: 'A guide to the free Nexora tools: invoice, GST, CIS, UAE VAT, contractor, quotation, thermal receipt and letterhead generators, and which one to choose.',
  keywords: 'free invoice generator help, free business tools, quotation generator, receipt generator',
  icon: 'free-tools',
  sections: [
    {
      id: 'overview',
      heading: 'What are the free tools?',
      blocks: [
        { p: 'The free tools are document makers that open in your browser. They share one editor, so you can switch document type later without losing anything, and you can download a PDF or Excel file.' },
        { list: ['No signup and no watermark', 'Your data stays on your device', 'PDF, Excel, print, WhatsApp or email'].map((title) => ({ title, text: '' })) },
        { links: [{ to: '/tools', label: 'Open the free tools hub' }] },
      ],
    },
    {
      id: 'which-tool',
      heading: 'Which tool should I use?',
      blocks: [{ list: TOOL_LINKS.map((t) => ({ title: t.label, text: `${t.blurb}.`, to: `/help-center/${t.path.split('/').pop()}` })) }],
    },
    {
      id: 'limits',
      heading: 'What the tools do not do',
      blocks: [{ callout: 'The tools make documents. They do not file tax returns, connect to a tax authority or give tax advice, and an invoice from them is not a government e-invoice. Check the rules for your country.' }],
    },
  ],
  faqs: [
    { q: 'Are the free tools really free?', a: 'Yes. There is no signup, no trial that runs out and no watermark. Documents carry only your own details and design.' },
    { q: 'Where is my data stored?', a: 'In your browser on this device only. Nothing is uploaded, so export a JSON backup from the editor menu before clearing your browser data.' },
    { q: 'Can I use a free tool without the Nexora platform?', a: 'Yes. They are independent of the paid modules. If your needs grow, the Nexora CRM, Restaurant POS and Retail POS can take over.' },
    { q: 'Do the tools work on a phone?', a: 'Yes. They open in any modern browser on a phone or a laptop.' },
  ],
  related: ['invoice-generator', 'quotation-generator', 'getting-started'],
  links: [],
}

// ───────────────────────────── general topics ─────────────────────────────

const GETTING_STARTED = {
  slug: 'getting-started',
  group: 'start',
  title: 'Getting Started with Nexora',
  summary: 'Create an account, choose your module, add your data and team, and go live.',
  seoTitle: 'Getting Started with Nexora: Setup Guide | Nexora Help',
  seoDescription: 'A step-by-step guide to starting with Nexora: create your account, choose a module, add your data and team, and go live, with answers to common questions.',
  keywords: 'getting started Nexora, Nexora setup, Nexora free trial',
  icon: 'getting-started',
  sections: [
    {
      id: 'overview',
      heading: 'What is Nexora?',
      blocks: [
        { p: 'Nexora is one cloud platform with several modules: Restaurant POS, Retail POS, Pharmacy POS, School ERP, CRM, WhatsApp CRM, Transport & Fleet and Property ERP. You use it in a browser on a phone or a laptop, and you can add another module later without starting over.' },
      ],
    },
    {
      id: 'steps',
      heading: 'Get started in three steps',
      blocks: [
        {
          steps: [
            { title: 'Create your account', text: 'Open the sign-up page, create your account and pick the module that fits your business.' },
            { title: 'Add your data', text: 'Add your menu, products, students, tenants or customers. We help with the data move, and it is free.' },
            { title: 'Train the team and go live', text: 'Add staff with the right roles, run a few test entries, then start working for real.' },
          ],
        },
        { links: [{ to: '/signup', label: 'Create a free account' }, { to: '/pricing', label: 'See plans' }] },
      ],
    },
    {
      id: 'pick-a-module',
      heading: 'Which module should I pick?',
      blocks: [
        {
          list: [
            { title: 'Restaurants, cafes and cloud kitchens', text: 'Restaurant POS.', to: '/help-center/restaurant-pos' },
            { title: 'Shops and stores', text: 'Retail POS.', to: '/help-center/retail-pos' },
            { title: 'Pharmacies and medical stores', text: 'Pharmacy POS.', to: '/help-center/pharmacy-pos' },
            { title: 'Schools and academies', text: 'School ERP.', to: '/help-center/school-erp' },
            { title: 'Sales teams and agencies', text: 'CRM and WhatsApp CRM.', to: '/help-center/crm' },
            { title: 'Car rental and transport', text: 'Transport & Fleet.', to: '/help-center/transport-fleet' },
            { title: 'Landlords and property managers', text: 'Property ERP.', to: '/help-center/property-erp' },
          ],
        },
      ],
    },
  ],
  faqs: [
    trialQ,
    helpQ,
    { q: 'What do I need to start?', a: 'A Nexora business account and a modern browser on a phone or a laptop. The Restaurant POS also has a free Windows installer.' },
    { q: 'Can I try it with my real data?', a: 'Yes. The free month is meant for that. Set up your menu, products or customers and run real work before you choose a plan.' },
    { q: 'Is there a mobile app?', a: 'Nexora runs in the browser on phones and laptops, and the Restaurant POS has a Windows desktop app. Native mobile apps for your own customers can be built as a custom project.' },
    { q: 'What language is the interface in?', a: 'The interface is in English. You can type names, menu items and customer details in other languages, including Arabic, Urdu and Bahasa Indonesia. PDF downloads cannot yet draw Arabic, Urdu or Hebrew text, so use your browser’s Print and Save as PDF for those.' },
    { q: 'Does Nexora work offline?', a: 'The Restaurant POS and Retail POS keep taking orders when the internet drops and sync when the connection returns. The other modules are cloud-based and need an internet connection.' },
    { q: 'Where is Nexora based?', a: 'Nexora Solution is a Pakistani software company building business software since 2019, based in Multan, Punjab, Pakistan. We support customers worldwide online, by WhatsApp and email, and we do not have local offices outside Pakistan.' },
  ],
  related: ['pricing-and-trial', 'restaurant-pos', 'support-and-contact'],
  links: [],
}

const PRICING = {
  slug: 'pricing-and-trial',
  group: 'start',
  title: 'Pricing, Trial & Billing',
  summary: 'The 1-month free trial, the Basic, Standard and Enterprise plans, and how to pay.',
  seoTitle: 'Nexora Pricing, Trial & Billing Help | Nexora',
  seoDescription: 'How Nexora pricing works: the 1-month free trial, Basic, Standard and Enterprise plans, yearly savings, and how to pay. Answers to common billing questions.',
  keywords: 'Nexora pricing, Nexora free trial, Nexora plans, billing help',
  icon: 'pricing-and-trial',
  sections: [
    {
      id: 'trial',
      heading: 'The 1-month free trial',
      blocks: [
        { p: 'Every plan starts with a free month. During the trial you get full access to all Nexora modules, unlimited users and storage, and the premium features, and no credit card is required. Setup, data migration and staff training are free.' },
        { links: [{ to: '/signup', label: 'Start the free trial' }] },
      ],
    },
    {
      id: 'plans',
      heading: 'The plans',
      blocks: [
        {
          list: [
            { title: `${planBasic.name}`, text: `${planBasic.description} One module, up to 2 team members, 5 GB cloud storage, role and permission management, dashboard and reports, invoicing and email support.` },
            { title: `${planStandard.name}`, text: 'Everything in Basic, with up to 5 users, 20 GB storage and priority support.' },
            { title: 'Enterprise', text: 'Everything in Standard with unlimited users, custom integrations, dedicated support and custom development. Priced to fit.' },
          ],
        },
        { p: `${planPriceSentence()} Yearly billing saves 20% compared with paying monthly. The pricing page always has the current figures.` },
        { links: [{ to: '/pricing', label: 'See the pricing page' }] },
      ],
    },
    {
      id: 'currency',
      heading: 'Currency and payment',
      blocks: [
        { p: 'Plans are priced in Pakistani rupees today. If you are outside Pakistan, message us and we will confirm the price in your currency. Subscriptions can be paid by JazzCash, Easypaisa or bank transfer.' },
      ],
    },
  ],
  faqs: [
    trialQ,
    { q: 'How much does Nexora cost?', a: `${planPriceSentence()} Prices are in Pakistani rupees, and the pricing page lists the current figures.` },
    { q: 'Do I need a credit card for the trial?', a: 'No. The free trial does not require a credit card.' },
    { q: 'Is there a discount for yearly billing?', a: 'Yes. Paying yearly saves 20% compared with paying monthly, and new users may be offered a welcome discount, which is shown on the pricing page.' },
    { q: 'Can I pay in my own currency?', a: 'Plans are priced in Pakistani rupees today. Message us on WhatsApp and we will confirm a price in your currency.' },
    { q: 'What happens after the trial?', a: 'You choose a plan to keep using Nexora. If you do nothing, you do not get charged, because the trial needs no credit card.' },
    { q: 'Can I add another module later?', a: 'Yes. All modules share one account, so you can add another module without starting over. The Basic plan includes one module, and the Standard plan includes one module with more users and storage. Ask us about a plan that covers several modules.' },
    { q: 'Is setup really free?', a: 'Yes. Setup, data migration and staff training are free on every plan.' },
  ],
  related: ['getting-started', 'team-permissions', 'support-and-contact'],
  links: [],
}

const AI_ARTICLE = {
  slug: 'nexora-ai',
  group: 'modules',
  title: 'Nexora AI',
  summary: 'The AI features built into the modules, and the Nexora AI assistant.',
  seoTitle: 'Nexora AI Help: AI Menu Import & Lead Scoring | Nexora',
  seoDescription: 'What Nexora AI does today: AI menu import from a photo, AI lead scoring in the CRM and the Nexora AI assistant. Plain answers to common questions.',
  keywords: 'Nexora AI, AI menu import, AI lead scoring, AI assistant',
  icon: 'nexora-ai',
  productPath: '/ai',
  sections: [
    {
      id: 'overview',
      heading: 'What is Nexora AI?',
      blocks: [
        { p: 'Nexora AI is the set of AI features built into the modules, plus the AI assistant on the website that answers questions about Nexora. It saves typing and helps teams decide what to do next.' },
        { links: [{ to: '/ai', label: 'Nexora AI product page' }] },
      ],
    },
    {
      id: 'features',
      heading: 'What it does today',
      blocks: [
        {
          list: [
            { title: 'AI menu import', text: 'In Restaurant POS, upload a photo of your existing menu and Nexora reads the items, prices and categories. You review them and import in one step.' },
            { title: 'AI lead scoring', text: 'In the CRM, each lead gets a score, priority and prediction built from reply speed, meetings and activity signals.' },
            { title: 'AI assistant', text: 'The Nexora AI assistant on the website answers questions about the products and can point you to the right page or to support.' },
          ],
        },
        { callout: 'AI results are suggestions. Review imported menu items and treat lead scores as a guide, not a guarantee.' },
      ],
    },
  ],
  faqs: [
    { q: 'Can AI import my menu from a photo?', a: 'Yes. Upload a photo of your menu in Restaurant POS and Nexora’s AI extracts items, prices and categories. You review them and import in one step.' },
    { q: 'What does AI lead scoring use?', a: 'Signals such as reply speed, meetings and activity. It produces a score, a priority and a prediction, and explains the result.' },
    { q: 'Is AI available on every plan?', a: 'AI features are part of the modules they belong to. Check the pricing page or ask us on WhatsApp for what your plan includes.' },
    { q: 'Can I trust the AI output without checking?', a: 'No. Always review imported items and treat scores as guidance.' },
  ],
  related: ['restaurant-pos', 'crm', 'getting-started'],
  links: [],
}

const SUPPORT = {
  slug: 'support-and-contact',
  group: 'start',
  title: 'Support & Contact',
  summary: 'How to reach the Nexora team on WhatsApp or email, and what we can help with.',
  seoTitle: 'Nexora Support & Contact | Nexora Help Center',
  seoDescription: 'How to contact Nexora support by WhatsApp or email, what we help with, and where to find setup, billing and product answers.',
  keywords: 'Nexora support, contact Nexora, Nexora WhatsApp, Nexora help',
  icon: 'support-and-contact',
  sections: [
    {
      id: 'contact',
      heading: 'Contact the team',
      blocks: [
        {
          list: [
            { title: 'WhatsApp', text: '+92 319 432 9754. The fastest way to ask a question or book a demo.', external: HELP_WHATSAPP },
            { title: 'Email', text: `${HELP_EMAIL} for product support, and hello@nexorasolution.online for sales.`, external: `mailto:${HELP_EMAIL}` },
            { title: 'Contact page', text: 'Send a message from the website.', to: '/contact' },
          ],
        },
      ],
    },
    {
      id: 'help-with',
      heading: 'What we can help with',
      blocks: [
        {
          list: [
            { title: 'Setup and training', text: 'Setting up your menu, products, tables, staff and roles. Setup, data migration and staff training are free on every plan.' },
            { title: 'Plans and billing', text: 'Choosing a plan, yearly billing and your currency.' },
            { title: 'Custom work', text: 'Features, integrations or apps that a ready-made module does not cover. We will tell you honestly whether it is a custom project.' },
          ],
        },
      ],
    },
    {
      id: 'company',
      heading: 'About the company',
      blocks: [{ p: 'Nexora Solution is a Pakistani software company that has been building business software since 2019, based in Multan, Punjab, Pakistan. We support customers worldwide online and do not have local offices outside Pakistan.' }],
    },
  ],
  faqs: [
    { q: 'How do I contact Nexora support?', a: `Message us on WhatsApp at +92 319 432 9754 or email ${HELP_EMAIL}.` },
    helpQ,
    { q: 'Where is Nexora located?', a: 'Multan, Punjab, Pakistan. We support customers worldwide online, and we do not have offices in other countries.' },
    { q: 'Can I book a demo?', a: 'Yes. Message us on WhatsApp and our team will walk you through the module that fits your business.' },
    { q: 'Do you build custom software?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need and we will say whether a ready-made module already covers it.' },
  ],
  related: ['getting-started', 'pricing-and-trial', 'custom-software-and-services'],
  links: [],
}

const SERVICES = {
  slug: 'custom-software-and-services',
  group: 'services',
  title: 'Custom Software & Services',
  summary: 'Custom software, ERP, mobile apps, online stores and SEO from the Nexora team.',
  seoTitle: 'Custom Software & Services Help | Nexora Help Center',
  seoDescription: 'What Nexora builds beyond the modules: custom software, ERP systems, mobile apps, online stores and business services, and how a project starts.',
  keywords: 'custom software, ERP development, mobile app development, ecommerce development',
  icon: 'custom-software-and-services',
  sections: [
    {
      id: 'overview',
      heading: 'What we build',
      blocks: [
        {
          list: [
            { title: 'Custom software', text: 'Software built around how your company already works.', to: '/software-development' },
            { title: 'ERP development', text: 'Custom ERP systems when a ready-made module is not enough.', to: '/erp-development' },
            { title: 'CRM development', text: 'A CRM shaped around your sales process.', to: '/crm-development' },
            { title: 'Mobile apps', text: 'Android and iOS apps for your customers or your staff.', to: '/mobile-app-development' },
            { title: 'Online stores', text: 'E-commerce websites with catalogue, cart and checkout.', to: '/ecommerce-development' },
            { title: 'SEO services', text: 'Search engine optimization for your website.', to: '/seo-services' },
            { title: 'Business services', text: 'Setup, support and managed operations.', to: '/business-services' },
          ],
        },
      ],
    },
    {
      id: 'how-it-starts',
      heading: 'How a project starts',
      blocks: [
        {
          steps: [
            { title: 'Tell us what you need', text: 'Message us on WhatsApp or use the contact page and describe the job.' },
            { title: 'We check what exists', text: 'We tell you honestly whether a ready-made module already covers it or whether it is a custom project.' },
            { title: 'Scope and build', text: 'We agree the scope with you, then build and deliver it.' },
          ],
        },
      ],
    },
  ],
  faqs: [
    { q: 'Do you build integrations with government or tax systems?', a: 'Nexora modules do not connect to tax authority systems today. If you need an integration like that, ask us first and we will scope it honestly as a custom project.' },
    { q: 'Can you build an Arabic or local-language interface?', a: 'The standard interface is in English. A full interface in another language would be a custom project.' },
    { q: 'How do I start a custom project?', a: 'Message us on WhatsApp or send the contact form with a short description of what you need.' },
  ],
  related: ['support-and-contact', 'getting-started'],
  links: [],
}

// ───────────────────────────── exports ─────────────────────────────

export const HELP_ARTICLES = Object.freeze([
  GETTING_STARTED,
  PRICING,
  SUPPORT,
  ...MODULES,
  AI_ARTICLE,
  ...PLATFORM,
  TOOLS_HUB_ARTICLE,
  ...TOOL_ARTICLES,
  SERVICES,
].map((article) => ({ ...article, path: `${HELP_CENTER_PATH}/${article.slug}` })))

export const HELP_ARTICLE_BY_SLUG = Object.freeze(Object.fromEntries(HELP_ARTICLES.map((a) => [a.slug, a])))
export const HELP_ARTICLE_BY_PATH = Object.freeze(Object.fromEntries(HELP_ARTICLES.map((a) => [a.path, a])))
export const HELP_ARTICLE_PATHS = Object.freeze(HELP_ARTICLES.map((a) => a.path))

export function articlesInGroup(groupId) {
  return HELP_ARTICLES.filter((a) => a.group === groupId)
}

/** Paths the sitemap, the prerender and the router all read. */
export function helpCenterSitemapPaths() {
  return [HELP_CENTER_PATH, ...HELP_ARTICLE_PATHS]
}

/** Every question and answer, for search and the hub's popular list. */
export function allHelpFaqs() {
  return HELP_ARTICLES.flatMap((article) => article.faqs.map((f) => ({ ...f, article: article.slug, articleTitle: article.title, path: article.path })))
}

/** Plain text of an article, for search. */
export function articleSearchText(article) {
  const parts = [article.title, article.summary]
  for (const s of article.sections) {
    parts.push(s.heading)
    for (const b of s.blocks) {
      if (b.p) parts.push(b.p)
      if (b.callout) parts.push(b.callout)
      if (b.list) b.list.forEach((i) => parts.push(i.title, i.text))
      if (b.steps) b.steps.forEach((i) => parts.push(i.title, i.text))
    }
  }
  article.faqs.forEach((f) => parts.push(f.q, f.a))
  return parts.join(' ').toLowerCase()
}

/** Quick links on the hub: the questions people ask first. */
export const HELP_POPULAR = Object.freeze([
  { slug: 'pricing-and-trial', q: 'Is there a free trial?' },
  { slug: 'getting-started', q: 'Does Nexora work offline?' },
  { slug: 'restaurant-pos', q: 'Can I upload my existing menu instead of typing it?' },
  { slug: 'pricing-and-trial', q: 'Can I pay in my own currency?' },
  { slug: 'free-tools', q: 'Are the free tools really free?' },
  { slug: 'support-and-contact', q: 'How do I contact Nexora support?' },
])
