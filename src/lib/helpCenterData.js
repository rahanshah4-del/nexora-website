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
import { PLATFORM_EXTRA_SECTIONS, PLATFORM_EXTRA_FAQS } from './helpPlatformExtras.js'
import { PLATFORM_MORE_SECTIONS } from './helpPlatformExtras2.js'

/** Long-form sections for a platform article; the closing "Read Next" section stays last. */
function longFormSections(slug) {
  const main = PLATFORM_EXTRA_SECTIONS[slug] || []
  const more = PLATFORM_MORE_SECTIONS[slug] || []
  return main.length ? [...main.slice(0, -1), ...more, main[main.length - 1]] : more
}

export const HELP_CENTER_PATH = '/help-center'
export const HELP_LAST_UPDATED = '2026-11-02'
export const HELP_WHATSAPP = 'https://wa.me/923194329754'
export const HELP_EMAIL = 'support@nexorasolution.us'

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

function moduleArticle({ slug, factsKey, pillar, title, product, seoTitle, seoDescription, keywords, summary, route, startSteps, extraFaqs = [], extraSections = [], notes = [], related = [], links = [] }) {
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
    ...extraSections,
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
const helpQ = { q: 'How do I get help with setup?', a: 'Message us on WhatsApp or email support@nexorasolution.us. Setup, data migration and staff training are free on every plan, and we can help you set up your first workspace.' }

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
    extraSections: [
      {
        id: 'order-flow',
        heading: 'How an Order Moves Through the Restaurant',
        blocks: [
          { p: 'Every order, whether dine-in, takeaway or delivery, follows the same path. Knowing it makes training new staff quicker.' },
          { steps: [
            { title: 'Order is taken', text: 'The cashier or waiter adds items to a table or to a takeaway or delivery order. Dine-in orders are tied to a table in a named floor area.' },
            { title: 'Kitchen Order Ticket is created', text: 'The order creates a KOT. On the kitchen display it appears in the Pending column, with the table shown for dine-in or the order type for takeaway and delivery.' },
            { title: 'Kitchen moves it forward', text: 'Kitchen staff move the ticket from Pending to Preparing to Ready until it is served.' },
            { title: 'Bill and payment', text: 'The receipt shows subtotal, discount, service charge, tax, total, paid and due. Every order type uses the same checkout flow.' },
          ] },
        ],
      },
      {
        id: 'setup-checklist',
        heading: 'Setup Checklist for Your First Day',
        blocks: [
          { p: 'Do these in order before the first busy service, and run a few practice orders first.' },
          { list: [
            { title: 'Menu', text: 'Import it from a photo with AI menu import or add items by hand, then check prices.' },
            { title: 'Floor areas and tables', text: 'Create your areas and tables so dine-in orders have a place to attach.' },
            { title: 'Roles', text: 'Create owner, manager, cashier and kitchen roles so each person sees only their screens.' },
            { title: 'Tax label and rate', text: 'Set your own tax rate and label. Nexora does not file returns or connect to a government e-invoicing system.' },
            { title: 'Printer', text: 'Bills and kitchen copies are formatted for 58mm thermal printers. Print one of each before opening.' },
            { title: 'Recipes and stock', text: 'Link menu items to recipes and enter ingredient stock if you want food cost and low-stock flags.' },
          ] },
        ],
      },
      {
        id: 'troubleshooting',
        heading: 'Common Questions During Service',
        blocks: [
          { list: [
            { title: 'A table is occupied but empty', text: 'Open the table’s order from the floor view in one tap and check or close it.' },
            { title: 'A big group arrives', text: 'Merge tables for the larger party. You can also split a table into a new one during service.' },
            { title: 'Internet drops', text: 'The Restaurant POS keeps billing offline and syncs when the connection returns.' },
            { title: 'A kitchen ticket is stuck', text: 'Move it to the next column on the kitchen display so the status matches the food.' },
          ] },
          { links: [{ to: '/blog/restaurant-kot-table-management-best-practices', label: 'Read: KOT and table management best practices' }] },
        ],
      },
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
    extraSections: [
      {
        id: 'counter-flow',
        heading: 'From Delivery to Counter Sale',
        blocks: [
          { p: 'Pharmacy POS follows a medicine from the day it arrives to the day it sells. Each step feeds the next, which is how the stock stays right.' },
          { steps: [
            { title: 'Receive from the supplier', text: 'Raise a purchase order against a supplier record and record the delivery with its batch and expiry date.' },
            { title: 'Stock updates', text: 'Stock levels, batches and expiry dates sit in the same workspace, so what you received is what the counter sees.' },
            { title: 'Sell at the counter', text: 'Search the medicine by name, add it to the sale and print an itemized receipt. The sale is recorded against the stock it draws from.' },
            { title: 'Review the day', text: 'Daily reports show what sold. Medicines approaching expiry are surfaced before they become unsellable.' },
          ] },
        ],
      },
      {
        id: 'setup-checklist',
        heading: 'Setup Checklist Before You Open the Counter',
        blocks: [
          { list: [
            { title: 'Medicine catalog', text: 'Add names, categories, prices and stock levels. We help with the data move, free on every plan.' },
            { title: 'Suppliers', text: 'Add your suppliers so purchases and payments are recorded against the right one.' },
            { title: 'Batches and expiry', text: 'Enter batch and expiry dates for current stock, because the warnings only work if they are recorded.' },
            { title: 'Staff roles', text: 'Limit cashiers to billing and give the owner reports and stock.' },
            { title: 'Practice sales', text: 'Run a few test bills and print the receipt before you start with real customers.' },
          ] },
        ],
      },
      {
        id: 'good-practice',
        heading: 'Habits That Keep Stock Accurate',
        blocks: [
          { p: 'The software can only track what you enter. A few habits make the numbers reliable.' },
          { list: [
            { title: 'Record purchases the same day', text: 'Stock that arrives but is not entered cannot be sold or tracked.' },
            { title: 'Record returns to suppliers', text: 'You can return stock to a supplier in the system so levels stay true.' },
            { title: 'Check expiry weekly', text: 'Look at the near-expiry list on a fixed day and act on it.' },
            { title: 'Use supplier payments', text: 'Record payments by cash, bank transfer, cheque or mobile wallet to see what you owe.' },
          ] },
          { links: [{ to: '/lahore', label: 'Pharmacy software in Lahore' }, { to: '/tools/pakistan-invoice-generator', label: 'Free Pakistan invoice generator' }] },
        ],
      },
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
      { q: 'What does WhatsApp CRM mean?', a: 'It is a tool that brings WhatsApp customer conversations into a shared workspace with leads, stages, templates and follow-ups, so the whole team can see and manage them.' },
      { q: 'Can I use it without a WhatsApp API?', a: 'Yes. A manual mode lets your team prepare messages and log conversations in the CRM while sending through WhatsApp itself.' },
      { q: 'Do templates support customer names?', a: 'Yes. Templates support placeholders that are filled in when the message is prepared.' },
      { q: 'Is there a free trial?', a: 'Yes. Every product starts with a free 1-month trial, and setup, data migration and staff training are free on every plan.' },
      { q: 'Does it replace the normal CRM?', a: 'No. WhatsApp CRM focuses on conversations. The Nexora CRM covers leads, pipeline, invoices and tasks, and both run on the same account.' },
    ],
    extraSections: [
      {
        id: "what-is-whatsapp-crm",
        heading: "What a WhatsApp CRM Is",
        blocks: [
          { p: "A WhatsApp CRM is a customer relationship tool built around WhatsApp conversations. For many businesses in Pakistan, WhatsApp is where customers ask prices, send addresses, confirm orders and chase deliveries. The problem is that these chats live on one person’s phone. When that person is away, nobody knows what was promised, and when they leave, the history leaves with them." },
          { p: "A WhatsApp CRM brings those conversations into a shared workspace. Messages sit next to the customer’s record, leads move through stages, follow-ups have owners and due dates, and the team can see what is happening without scrolling through personal chats." },
          { p: "People searching for WhatsApp CRM software, tools or price are usually asking one question: how do we stop losing leads in chats? The answer is a simple habit supported by a shared system: every enquiry becomes a lead, every lead has a next step, and every next step has a person and a date." }
        ],
      },
      {
        id: "whatsapp-vs-business-app",
        heading: "WhatsApp Business App vs a WhatsApp CRM",
        blocks: [
          { p: "The WhatsApp Business app is a good start. It gives you a business profile, labels, quick replies and a catalogue. It works well for one person on one phone. Its limits show when several people need to answer the same customers, when you want a record of each lead’s stage, or when you need reminders and reports." },
          { p: "A CRM adds the team layer: a shared inbox, lead stages, templates, follow-up tasks and a history that does not depend on one handset. You can keep using WhatsApp as the channel your customers like, and use the CRM as the place where your team organises the work." }
        ],
      },
      {
        id: "inbox-and-manual-mode",
        heading: "The Inbox and Manual Mode",
        blocks: [
          { p: "Nexora WhatsApp CRM has an inbox where conversations are listed with the customer, the latest message and who is handling it. Staff can reply from the workspace and keep notes against the conversation." },
          { p: "It also supports a manual mode that does not require a WhatsApp API connection. In manual mode your team prepares messages and logs conversations in the CRM, and the message is sent through WhatsApp itself. This is useful for small businesses that want structure and follow-up discipline before they decide whether to connect an official API." },
          { p: "If you are unsure which mode suits you, begin with manual mode on a small set of leads, see whether the team sticks to the routine, and then decide." }
        ],
      },
      {
        id: "leads-first-message-to-won",
        heading: "Leads: From First Message to Won or Lost",
        blocks: [
          { p: "Every new enquiry should become a lead. A lead records who the person is, where they came from, what they asked for and the stage they are at. Stages follow the real journey: a first message, a reply, a conversation about needs, a quote, and a final result of won or lost." },
          { p: "Marking leads as won or lost matters more than it seems. Without it you cannot tell whether your WhatsApp effort works. After a few weeks you can see how many enquiries became customers, how long it took and where leads tend to stall." },
          { p: "Add a short reason when a lead is lost: price, timing, went elsewhere, no reply. After a month the reasons form a pattern, and that pattern tells you what to change." }
        ],
      },
      {
        id: "templates-and-placeholders",
        heading: "Templates with Placeholders",
        blocks: [
          { p: "Many replies are the same: a greeting, a price list, directions, a payment reminder. Typing them again and again wastes time and leads to inconsistent wording. Templates let you write a message once and reuse it." },
          { p: "Placeholders make a template personal. Instead of writing a customer’s name by hand, you insert a placeholder and the name is filled in when the message is prepared. A greeting that begins with the customer’s own name feels far warmer than a generic one." },
          { p: "Keep templates short, polite and specific. One template for first reply, one for a quote, one for a payment reminder and one for a thank-you cover most situations. Review them every few months so the wording stays current." }
        ],
      },
      {
        id: "follow-ups-and-reminders",
        heading: "Follow-ups That Actually Happen",
        blocks: [
          { p: "Most lost sales are not rejections, they are silence. The customer asked, you answered, and then nobody wrote again. Follow-ups fix this by giving each lead a next step with a date and an owner." },
          { p: "In Nexora, follow-ups appear on a shared board and reminders are sent so they are not forgotten. Overdue follow-ups stand out, which lets a manager see at a glance where attention is needed." },
          { p: "A good rhythm is to follow up the next day after a quote, again after three days, and once more after a week. After that, ask politely if they still need help, and close the lead if there is no interest." }
        ],
      },
      {
        id: "broadcasts-and-consent",
        heading: "Broadcasts and Respecting Customers",
        blocks: [
          { p: "Broadcasts let you send an update to many customers: a new arrival, an offer, a holiday notice. Use them with care. Send only to people who have dealt with you or agreed to hear from you, keep messages relevant and short, and let people say they do not want more. Customers who feel spammed will block you, and that hurts your reputation." },
          { p: "Follow WhatsApp’s own rules for business messaging, which can change, and check the current policy before large campaigns." }
        ],
      },
      {
        id: "price-free-and-choosing",
        heading: "Price, Free Options and Choosing a Tool",
        blocks: [
          { p: "Free tools are fine for very small volumes. As your team grows, ask what the tool does beyond sending messages: does it keep lead stages, assign owners, send reminders and give reports? Does it work with your customer records and invoices? Can the whole team use it without sharing a phone?" },
          { p: "Nexora products start with a free 1-month trial, and setup, data migration and staff training are free on every plan, so you can test the workflow with real leads before you decide." }
        ],
      },
      {
        id: "daily-routine-whatsapp",
        heading: "A Daily Routine for a Small Sales Team",
        blocks: [
          { p: "Morning: open the inbox, reply to anything waiting, and assign new enquiries as leads. Late morning: work through today’s follow-ups. Afternoon: send quotes and update stages. End of day: mark won and lost leads, log a reason for each loss and set tomorrow’s follow-ups." },
          { p: "Ten minutes at the end of the day keeps the system honest. Teams that skip it find their board out of date within a week, and then stop trusting it." }
        ],
      },
      {
        id: "whatsapp-privacy-data",
        heading: "Privacy and Data Care",
        blocks: [
          { p: "Chats contain phone numbers, addresses and sometimes payment details. Limit access to staff who need it, avoid sharing screenshots in public groups, and never ask customers to send sensitive financial details over chat. Review who has access whenever someone joins or leaves." },
          { p: "Customers can ask what you hold about them, so keep notes professional and factual." }
        ],
      },
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
      ...longFormSections(slug),
    ].filter(Boolean),
    faqs: dedupe([...extraFaqs, ...(PLATFORM_EXTRA_FAQS[slug] || []), ...factsFaqs(factsKey)]),
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


// Extra help-only sections for tools where a plain "how it works" page would just
// repeat the tool landing page. Facts here are limited to what the tool page
// already states (src/lib/toolsPagesData.js); nothing about tax law is added.
const TOOL_HELP_EXTRAS = {
  pakistan: {
    sections: [
      {
        id: 'which-document',
        heading: 'Which Document Do You Need?',
        blocks: [
          { p: 'Most mistakes with Pakistani invoices start before any numbers are typed, with picking the wrong kind of document. Use this as a quick guide, then open the matching tool.' },
          {
            list: [
              { title: 'Sales tax invoice', text: 'You are registered for sales tax and are selling taxable goods. Leave the registered option ticked, enter your NTN and STRN, and keep the 18% line.', to: '/tools/pakistan-invoice-generator' },
              { title: 'Plain invoice', text: 'You are not registered. Untick the registered option and the Sales Tax Invoice title and tax line disappear.', to: '/tools/pakistan-invoice-generator' },
              { title: 'Quotation first', text: 'The customer wants a price before agreeing. Send a quotation, then turn it into an invoice when they accept.', to: '/tools/quotation-generator' },
              { title: 'Another format', text: 'A client asks for a different layout, or you invoice outside Pakistan. The free invoice generator has more designs and currencies.', to: '/tools/invoice-generator' },
            ],
          },
        ],
      },
      {
        id: 'before-you-send',
        heading: 'Checklist Before You Send an Invoice',
        blocks: [
          { p: 'Take a minute with the finished preview. These are the things that most often cause a buyer to send an invoice back.' },
          {
            steps: [
              { title: 'Numbers run in order', text: 'Each invoice gets the next serial number. Do not reuse a number or skip around, because buyers and accountants match invoices by number.' },
              { title: 'Both NTNs are right', text: 'Check your own NTN and STRN and the customer’s NTN digit by digit. A single wrong digit is the usual reason a registered buyer rejects an invoice.' },
              { title: 'Tax rate fits each line', text: 'The tool applies 18% by default. If one line is taxed differently or not at all, change that line instead of the whole invoice.' },
              { title: 'Total in words matches', text: 'The amount in words with lakh and crore is generated from the total. Read it once against the figure before you print.' },
              { title: 'IBAN is complete', text: 'A Pakistani IBAN is 24 characters starting with PK. The invoice prints it exactly as you type it, so count the characters.' },
            ],
          },
        ],
      },
      {
        id: 'common-problems',
        heading: 'Common Problems and Fixes',
        blocks: [
          {
            list: [
              { title: 'The tax line is missing', text: 'The registered option is unticked. Tick it again and the Sales Tax Invoice title and the tax line return.' },
              { title: 'My details are gone', text: 'Details are saved on this device and in this browser. A different browser, a private window or cleared site data starts blank. Export a JSON backup from the editor menu to keep them.' },
              { title: 'The wrong currency shows', text: 'The tool opens in rupees. If you bill abroad, switch the currency in the editor without redoing the invoice.' },
              { title: 'One line needs a different rate', text: 'Change the rate on that line, or open the advanced editor if you sell both goods and services.' },
            ],
          },
          { callout: 'This tool makes an invoice document. It does not connect to FBR, issue FBR digital invoices or file returns. If you are required to issue digital invoices, use your integrated system for those sales.' },
        ],
      },
      {
        id: 'read-next',
        heading: 'Read Next',
        blocks: [
          { p: 'For the rules behind the document, the blog article explains sales tax invoices and FBR digital invoicing in plain words. For the tool itself, open the generator.' },
          {
            links: [
              { to: '/blog/pakistan-sales-tax-invoice-fbr-digital-invoicing', label: 'Pakistan sales tax invoice and FBR digital invoicing' },
              { to: '/tools/pakistan-invoice-generator', label: 'Open the Pakistan invoice generator' },
            ],
          },
        ],
      },
    ],
    faqs: [
      { q: 'What is the difference between NTN and STRN on an invoice?', a: 'The NTN is your National Tax Number and the STRN is your sales tax registration number. A registered seller puts both on a sales tax invoice, and the tool has a field for each.' },
      { q: 'Can I use this if I am not registered for sales tax?', a: 'Yes. Untick the registered option and the document becomes a plain invoice without the Sales Tax Invoice title or tax line.' },
      { q: 'Does the tool send invoices to FBR?', a: 'No. It makes a document you can download, print or share. It does not connect to FBR or fetch a digital invoice number.' },
      { q: 'Why did my saved business details disappear?', a: 'The free tools keep your details in your browser on that device. Switching browsers or clearing site data removes them, so export a JSON backup from the editor menu first.' },
    ],
    related: ['quotation-generator'],
  },
}

function toolArticle(link) {
  const page = TOOL_PAGE_CONTENT[link.path]
  const stepsSection = page.sections.find((s) => s.blocks.some((b) => b.steps))
  const steps = stepsSection ? stepsSection.blocks.find((b) => b.steps).steps : null
  const extra = TOOL_HELP_EXTRAS[link.key]
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
      ...(extra ? extra.sections.slice(0, 3) : []),
      {
        id: 'editor',
        heading: 'Using the editor',
        blocks: [
          { p: `After the guided steps, the ${link.label} shows your finished document with buttons to download a PDF or Excel file, print, send it on WhatsApp or by email, copy a share link or go back and edit. Every free tool uses the same editor, so one manual covers all of them.` },
          { links: [{ to: '/help-center/editor-manual', label: 'Read the editor user manual' }] },
        ],
      },
      {
        id: 'privacy',
        heading: 'Your data and privacy',
        blocks: [{ p: 'The free tools run in your browser. What you type stays on your device, and there is no account, watermark or time limit. Export a JSON backup from the editor menu before you clear your browser data.' }],
      },
      ...(extra ? extra.sections.slice(3) : []),
    ].filter(Boolean),
    faqs: dedupe([...page.faqs.map((f) => ({ q: f.question, a: f.answer })), ...(extra ? extra.faqs : [])]),
    related: ['editor-manual', 'free-tools', link.key === 'invoice' ? 'quotation-generator' : 'invoice-generator', ...(extra ? extra.related : [])].filter((v, i, a) => a.indexOf(v) === i),
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
      blocks: [{ list: [
        ...TOOL_LINKS.map((t) => ({ title: t.label, text: `${t.blurb}.`, to: `/help-center/${t.path.split('/').pop()}` })),
        { title: 'GeoLint GEO Audit', text: 'Check whether ChatGPT, Claude and Perplexity can reach and read a web page.', to: '/help-center/geolint' },
        { title: 'Editor user manual', text: 'Every button and menu in the document editor, in one place.', to: '/help-center/editor-manual' },
      ] }],
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
  related: ['editor-manual', 'geolint', 'invoice-generator', 'quotation-generator'],
  links: [],
}

const EDITOR_MANUAL = {
  slug: 'editor-manual',
  group: 'tools',
  title: 'Editor User Manual',
  summary: 'Every button and menu in the free document editor: download, print, send, convert, back up and fix common problems.',
  seoTitle: 'Free Invoice Editor User Manual | Nexora',
  seoDescription: 'A complete guide to the free Nexora document editor: the three steps, download PDF or Excel, print, WhatsApp, email, share links, convert, backups and fixes.',
  keywords: 'invoice editor user manual, how to use free invoice generator, download invoice PDF, convert quotation to invoice',
  icon: 'free-tools',
  sections: [
    {
      id: 'overview',
      heading: 'What the editor is',
      blocks: [
        { p: 'All the free document tools, from the invoice generator to the purchase order generator, open the same editor in your browser. You can make an invoice, quotation, receipt, pay stub, purchase order and more, and switch between them without losing what you typed.' },
        { p: 'There is no account, no watermark and no time limit. Your documents are saved in your browser on this device, and nothing is uploaded to a server.' },
        { links: [{ to: '/tools', label: 'Open the free tools' }] },
      ],
    },
    {
      id: 'three-steps',
      heading: 'The three guided steps',
      blocks: [
        { steps: [
          { title: 'Your business', text: 'Enter your business name, address, email and phone, your tax ID if you have one, and a logo. If you want your own letterhead, upload it here and set the area the text may use.' },
          { title: 'Client and items', text: 'Enter the client name (the only required field), then their email, phone and address. Add each item with a description, quantity and price. For WhatsApp, enter the phone with its country code.' },
          { title: 'Design', text: 'Choose a design for the finished document. You can change it later without retyping anything.' },
        ] },
      ],
    },
    {
      id: 'result-screen',
      heading: 'The result screen: download, print and send',
      blocks: [
        { p: 'When the steps are done you see your document with an action bar. Each button does one job.' },
        { list: [
          { title: 'Download PDF', text: 'Creates a PDF you can save, attach or print. If the PDF does not download, use Print and choose Save as PDF.' },
          { title: 'Excel', text: 'Downloads the document as an .xlsx spreadsheet.' },
          { title: 'Print', text: 'Opens your browser print window. Thermal receipts are laid out for 58 mm and 80 mm rolls.' },
          { title: 'WhatsApp', text: 'Opens WhatsApp with a ready message to the client phone number you entered. The message is editable and can contain a share link.' },
          { title: 'Email', text: 'Opens your email program with the same message ready to send to the client email.' },
          { title: 'Copy link', text: 'Copies a share link. The document is stored inside the link itself, not on a server, so anyone with the link can view it and download the PDF.' },
          { title: 'Edit', text: 'Takes you back to the guided steps to change the document.' },
        ] },
        { callout: 'A share link carries the whole document, so treat it like the document itself. Anyone you send it to can open it, and very long documents make very long links.' },
      ],
    },
    {
      id: 'quick-and-advanced',
      heading: 'Quick edit and the advanced editor',
      blocks: [
        { p: 'Use Quick edit on the result screen for small fixes such as a client name, an item or a phone number. Open the Advanced editor when you want full control. It groups settings into sections such as Details, Items, Taxes and adjustments, Payments and deposits, Notes and terms, Signature and stamp, Your business, the WhatsApp and email message, and design settings for layout, fonts and colours.' },
        { p: 'In the advanced editor you can also switch between Edit and Preview, so you see the page as it will print.' },
      ],
    },
    {
      id: 'more-actions',
      heading: 'The More actions menu',
      blocks: [
        { list: [
          { title: 'New document', text: 'Starts a fresh document. Your earlier ones stay saved.' },
          { title: 'Open recent and All documents', text: 'Reopens a saved document. All documents lists everything saved on this device.' },
          { title: 'Edit business details', text: 'Jumps back to the Your business step.' },
          { title: 'Duplicate', text: 'Makes a copy of the document to reuse for a repeat client.' },
          { title: 'Mark as paid', text: 'Appears on an invoice with a balance due and records it as paid.' },
          { title: 'Convert to', text: 'Turns a document into the next one. A quotation or proforma invoice can become an invoice, an invoice can become a receipt, delivery note or credit note, and a purchase order can become an invoice. The result is a new document and the original stays.' },
          { title: 'Print and Download Excel', text: 'Same as the buttons on the result screen.' },
          { title: 'Export JSON backup and Import JSON', text: 'Saves all your data to a file and loads it back, for example on another device.' },
          { title: 'Clear all data', text: 'Deletes everything saved in this browser. Export a backup first.' },
        ] },
      ],
    },
    {
      id: 'your-data',
      heading: 'Where your data is kept',
      blocks: [
        { p: 'Documents, clients, products and settings are saved in your browser on this device. They are not sent to Nexora. That is why clearing your browser data, using another browser or switching devices means starting empty unless you import a backup.' },
        { p: 'If your browser blocks storage, which can happen in some private windows, a Not stored warning appears in the top bar. Your work still works while the page is open, but it is lost when you close it. Export a backup or open the tool in a normal window.' },
        { callout: 'Export a JSON backup now and then. It is the only copy of your documents outside this browser.' },
      ],
    },
    {
      id: 'fixes',
      heading: 'If something goes wrong',
      blocks: [
        { list: [
          { title: 'The PDF does not download', text: 'Use Print and choose Save as PDF as the printer. Also check that your browser is not blocking downloads from the site.' },
          { title: 'WhatsApp opens without the client', text: 'The client phone is missing or has no country code. Add it in the client step and try again.' },
          { title: 'My documents disappeared', text: 'They live in one browser on one device. Check you are in the same browser and window type, then import a JSON backup if you have one.' },
          { title: 'The document number is wrong', text: 'Open the advanced editor and change the document number in the document details.' },
          { title: 'The text does not fit my letterhead', text: 'Change the top and bottom margins in the letterhead step so the text sits inside the clear area.' },
        ] },
      ],
    },
  ],
  faqs: [
    { q: 'Do I need an account to use the editor?', a: 'No. The free tools need no signup and add no watermark.' },
    { q: 'Where are my documents stored?', a: 'In your browser on this device. Nothing is uploaded, so export a JSON backup before clearing your browser data.' },
    { q: 'Can I turn a quotation into an invoice?', a: 'Yes. Open More actions and choose Convert to. You get a new invoice and the quotation stays as it was.' },
    { q: 'Can I use my own letterhead?', a: 'Yes. Upload it in the Your business step and set the margins so your text stays inside the clear area.' },
    { q: 'Does a share link upload my document?', a: 'No. The document is encoded inside the link, so it never sits on a Nexora server. Anyone who has the link can see the document.' },
  ],
  related: ['free-tools', 'invoice-generator', 'quotation-generator', 'thermal-receipt-generator'],
  links: [],
}

const GEOLINT_ARTICLE = {
  slug: 'geolint',
  group: 'tools',
  title: 'GeoLint GEO Audit',
  summary: 'A user manual for GeoLint: run an audit, read the score and apply the fixes, including the WordPress plugin.',
  seoTitle: 'GeoLint User Manual: How to Run a GEO Audit | Nexora',
  seoDescription: 'How to use GeoLint: paste a URL, read the four scores, copy the Fix Pack, install the WordPress plugin and re-run the audit. Free, no signup.',
  keywords: 'GeoLint user manual, how to use GeoLint, GEO audit guide, AI crawler checker help',
  icon: 'free-tools',
  sections: [
    {
      id: 'overview',
      heading: 'What GeoLint does',
      blocks: [
        { p: 'GeoLint is a free GEO audit. It checks whether AI search tools such as ChatGPT, Claude and Perplexity can reach one web page, read its text and find quotable answers. It needs no account and no email address.' },
        { p: 'It audits one page per run. Start with your homepage, then test the pages that matter most to your business.' },
        { links: [{ to: '/tools/geo-audit', label: 'Open GeoLint' }] },
      ],
    },
    {
      id: 'run',
      heading: 'Run your first audit',
      blocks: [
        { steps: [
          { title: 'Open GeoLint', text: 'Go to the GeoLint page and find the address box at the top.' },
          { title: 'Paste a full page address', text: 'Use the whole address, for example https://yourdomain.com/. It must be a public page that opens without a login.' },
          { title: 'Start the audit', text: 'Press the audit button and wait about 20 seconds. GeoLint loads the page as plain HTML and in a real browser, and requests it as each AI search bot.' },
          { title: 'Read your report', text: 'You get a score out of 100, a confidence level and a ranked list of fixes.' },
        ] },
        { callout: 'Each visitor can run only a limited number of audits per minute so the service stays available for everyone. If you see a rate message, wait a minute and try again.' },
      ],
    },
    {
      id: 'report',
      heading: 'How to read the report',
      blocks: [
        { p: 'The score is the sum of four checks, and each one has its own result in the report.' },
        { list: [
          { title: 'Bot access, 30 points', text: 'Reads robots.txt and requests the page as each AI search bot. It shows which bots are allowed, which are blocked by a Disallow rule and which get an error such as 403 or 429 from a firewall.' },
          { title: 'JavaScript, 25 points', text: 'Compares the raw HTML with the rendered page. It shows how much of your text is already in the HTML that many AI crawlers read.' },
          { title: 'Answer structure, 25 points', text: 'Checks whether each heading opens with a direct answer instead of a long introduction.' },
          { title: 'Facts and schema, 20 points', text: 'Counts specific facts, outside sources and JSON-LD structured data, and checks that each type has the fields it needs.' },
        ] },
        { p: 'If a check cannot run, for example because the page blocks every request, GeoLint says so and leaves that check out instead of scoring it zero. The confidence level tells you how much of the score was measured.' },
        { p: 'The fix list is ranked by the points each fix can add, so start at the top.' },
      ],
    },
    {
      id: 'fix',
      heading: 'Apply the fixes',
      blocks: [
        { p: 'You have three ways to apply what the report found.' },
        { list: [
          { title: 'Copy your Fix Pack', text: 'The report builds ready-to-publish files from your page: a robots.txt block, an llms.txt guide and JSON-LD. Copy or download the ones marked as needed and publish them on your site.' },
          { title: 'Use the WordPress plugin', text: 'If your site runs on WordPress, press Fix with WordPress in the report header. The guide shows each step with pictures, and the free plugin applies the robots.txt, llms.txt and schema fixes with one button.' },
          { title: 'Ask Nexora to do it', text: 'If you would rather not edit your site, the done-for-you GEO fix is $50 per website and ends with a before and after score.', to: '/geo/fix-my-website' },
        ] },
        { links: [{ to: '/tools/geo-audit/wordpress', label: 'WordPress install guide' }, { to: '/geo/fix-my-website', label: 'See the done-for-you fix' }] },
      ],
    },
    {
      id: 'download',
      heading: 'Save or share the report',
      blocks: [
        { p: 'Use Download PDF report for a copy you can send to a developer or client, or Download JSON for the raw data. Use Audit another page to test a different address.' },
      ],
    },
    {
      id: 'rerun',
      heading: 'Run it again after a change',
      blocks: [
        { p: 'Audit the same page again after you publish a fix and compare the two scores. Cache plugins and CDNs can show the old file for a short time, so give it a minute.' },
        { p: 'Expect the score to rise, not always to reach 100. A plugin or a file can change bot access and markup, but how much of your text is in the HTML and how each section opens depend on your theme and your writing.' },
      ],
    },
    {
      id: 'limits',
      heading: 'What GeoLint does not do',
      blocks: [
        { callout: 'GeoLint cannot promise that an AI tool will mention your site. It finds the technical reasons you could be left out and the writing habits that make a page hard to quote. It reads one public page per audit and does not keep a copy of your page.' },
      ],
    },
  ],
  faqs: [
    { q: 'Is GeoLint really free?', a: 'Yes. You paste a URL and get the full report with no account, no email address and no watermark.' },
    { q: 'Why does it audit only one page?', a: 'One page per audit keeps the check fast and the service open to everyone. Run it again on your other important pages.' },
    { q: 'Why did a check get left out of my score?', a: 'GeoLint leaves a check out when it could not measure it, for example when a page blocks every request. It would be unfair to count that as zero, so the report says it was not verified.' },
    { q: 'Why is my score not 100 after the WordPress plugin?', a: 'The plugin improves bot access, llms.txt and Organization schema. The JavaScript and answer structure checks depend on your theme and how your pages are written, so they stay the same until you change those.' },
    { q: 'How often should I audit?', a: 'After any change to robots.txt, your firewall or CDN, your site framework or a key page, and about once a quarter otherwise.' },
    { q: 'Does the plugin send my data to Nexora?', a: 'No. The WordPress plugin does not send anything from your site to Nexora, and removing it deletes its saved settings.' },
  ],
  related: ['free-tools', 'editor-manual', 'getting-started'],
  links: [{ to: '/geo', label: 'Read the GEO guides' }],
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
        { p: 'Plans are priced in Pakistani rupees today. If you are outside Pakistan, message us and we will confirm the price in your currency. Subscriptions are paid securely by credit or debit card.' },
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
    {
      id: "what-ai-means",
      heading: "What “AI” Means in Nexora, in Plain Words",
      blocks: [
        { p: "Many software products now say “AI” on their homepage, and it is often hard to tell what is behind the word. In Nexora, AI means specific features that save time on a specific job. It does not mean a robot that runs your business. Two features work today inside the modules, and a third answers questions on the website." },
        { p: "The first reads a photo of a menu and turns it into items, prices and categories. The second looks at how a lead behaves and gives it a score, a hot, warm or cold label and a short explanation. The third is an assistant that answers questions about Nexora. Each of them produces a suggestion that a person checks, which is how AI is best used in a business where mistakes cost money." },
      ],
    },
    {
      id: "menu-import-guide",
      heading: "AI Menu Import: From a Photo to a Working Menu",
      blocks: [
        { p: "Setting up a restaurant menu by hand is slow. A menu with eighty items, each with a name, price and category, can take hours to type, and every typing mistake becomes a wrong price at the counter. AI menu import in Restaurant POS removes most of that typing. You upload a photo of your current menu, Nexora reads the items, prices and categories, and shows you what it found. You review it and import it in one step." },
        {
          steps: [
            { title: "Take a clear photo", text: "Photograph the menu flat, in good light, with all text in focus. Take one photo per page or board if the menu is long." },
            { title: "Upload it in Restaurant POS", text: "Use the menu import option in menu management and add the photo." },
            { title: "Let Nexora read it", text: "The AI extracts item names, prices and categories from the image." },
            { title: "Review every line", text: "Check names, prices and categories against your real menu. Fix anything that was misread, such as a price with a smudged digit." },
            { title: "Import", text: "Confirm, and the items appear in your menu, ready for billing." },
            { title: "Test with one order", text: "Place a test order to confirm that prices and categories look right at the counter." },
          ],
        },
        { p: "A few habits make the result better. Use a photo, not a screenshot of a compressed chat image. Avoid glare from glossy menu cards. Keep decorative backgrounds out of the frame. If a price list is handwritten, expect to correct more lines. After the first import you can edit items normally, so it is fine if the result is ninety percent right." },
        { callout: "Always check prices before you start billing. AI reads images well but not perfectly, and a single wrong digit on a popular item is an expensive mistake." },
      ],
    },
    {
      id: "lead-scoring-guide",
      heading: "AI Lead Scoring: Which Leads Deserve Your Time First",
      blocks: [
        { p: "Every sales team has the same problem: more leads than hours. Without a way to rank them, people chase the loudest or the newest, and serious buyers wait. Lead scoring ranks leads by how likely they are to buy so that your best attention goes to your best opportunities." },
        { p: "In Nexora CRM, each lead receives a seriousness score from 0 to 100 and a hot, warm or cold badge, together with an explanation of why. The score uses signals such as how quickly the lead replies, whether meetings have happened and how active the lead has been. A lead who replies in minutes and has booked a meeting scores higher than one who has not answered in two weeks." },
        {
          list: [
            { title: "Hot leads", text: "Contact these first. They are engaged and showing buying behaviour. A quick, personal response matters most here." },
            { title: "Warm leads", text: "Interested but not yet decided. Nurture them with useful information, a demo or a clear next step." },
            { title: "Cold leads", text: "Quiet or unengaged. Keep them on a slow follow-up schedule and avoid spending prime time on them." },
          ],
        },
        { p: "The explanation is as useful as the number. If a score is low because the lead has not replied for ten days, the next action is obvious: try another channel or a different message. If a score is high because of a meeting, prepare for that conversation." },
      ],
    },
    {
      id: "use-scores-well",
      heading: "How to Use Scores in a Daily Routine",
      blocks: [
        {
          steps: [
            { title: "Start the day with hot leads", text: "Open the CRM and call or message the hot leads before anything else." },
            { title: "Create a follow-up for each", text: "Use the follow-up board to give every hot and warm lead a task and a date." },
            { title: "Read the explanation", text: "Use the stated reasons to decide what to say." },
            { title: "Update after every contact", text: "Notes and activity feed the next score, so keep records current." },
            { title: "Review cold leads weekly", text: "Some will warm up. Move them up when they do." },
          ],
        },
        { p: "Treat the score as a guide to where to look, not as a verdict. A cold lead from a large company that you know is planning a purchase deserves attention whatever the number says. Your knowledge of the customer comes first, and the score makes sure you do not forget the others." },
      ],
    },
    {
      id: "responsible-ai",
      heading: "Using AI Responsibly in a Small Business",
      blocks: [
        {
          list: [
            { title: "Review before you rely", text: "Menu imports and scores are suggestions. Look before you act." },
            { title: "Protect customer data", text: "Do not paste private customer details into places where you are not sure how they are stored." },
            { title: "Keep a human in the loop", text: "Use AI to prepare and prioritise, and let people make the decisions that affect customers." },
            { title: "Do not oversell it", text: "Tell staff what the feature does and does not do, so nobody trusts a score blindly." },
            { title: "Improve the inputs", text: "Good AI results depend on good records: complete lead details, notes and activity." },
          ],
        },
      ],
    },
    {
      id: "menu-vs-manual",
      heading: "Menu Import or Typing by Hand: Which Is Faster?",
      blocks: [
        { p: "For a very small menu of ten or fifteen items, typing may be just as quick. As the menu grows, import wins clearly, because reading a photo takes seconds regardless of size, while typing grows with every item. The real time saving is not only the typing but the checking: reviewing a list on screen against a printed menu is quicker than proofreading your own entries." },
        {
          list: [
            { title: "Under 20 items", text: "Either way works. Import if you already have a good photo." },
            { title: "20 to 100 items", text: "Import, then spend your time reviewing prices and categories." },
            { title: "Over 100 items or several menus", text: "Import page by page, review each batch and import in stages." },
            { title: "Frequent price changes", text: "Edit items directly after the first import. There is no need to re-import." },
          ],
        },
        { p: "Many restaurants use import once at setup, then manage the menu by editing. That is a sensible pattern: AI handles the heavy first load, and your team keeps control after that." },
      ],
    },
    {
      id: "ai-questions-owners-ask",
      heading: "Questions Owners Ask About AI in Their Software",
      blocks: [
        {
          list: [
            { title: "Will AI make mistakes?", text: "Yes, sometimes. That is why imported items are shown for review and why scores come with explanations." },
            { title: "How is my data handled?", text: "If you have concerns about how your data is handled, read the privacy policy and ask the team before using any feature with sensitive records." },
            { title: "Do I need to pay extra for AI?", text: "AI features are part of the modules they belong to. Check the pricing page or ask on WhatsApp for what your plan includes." },
            { title: "Do I need technical skills?", text: "No. Menu import is photo, review, import. Lead scores appear on your leads without any setup." },
            { title: "What if the AI cannot read my menu?", text: "Try a clearer photo, split the menu into smaller parts, or add the difficult items by hand." },
            { title: "What is coming next?", text: "We describe only what works today. New AI features are added to this page when they are live." },
          ],
        },
      ],
    },
    {
      id: "assistant-website",
      heading: "The Nexora AI Assistant on the Website",
      blocks: [
        { p: "The AI assistant on the website answers questions about Nexora’s products, plans and features, and points you to the right page or to the support team. It is a quick way to find out whether a module suits your business before you message us. For anything that depends on your own account, pricing for your situation or a custom request, the team on WhatsApp or email gives the final answer." },
        { p: "Inside the app, the AI Assistant area is where AI features for leads, follow-ups and invoices are being developed. We describe only what already works today on this page, and we update it as features move from preview to live." },
      ],
    },
    {
      id: "ai-and-your-business",
      heading: "Where AI Helps Most, and Where It Does Not",
      blocks: [
        { p: "AI is strongest at repetitive reading and ranking jobs: turning a photo into a list, or ordering a long list of leads. It is weaker at judgement that depends on knowing your customers, your local market and your goals. A sensible approach is to let AI prepare and your team decide." },
        {
          list: [
            { title: "Good fit", text: "Setting up a long menu, ranking many leads, finding the next action on a quiet lead." },
            { title: "Not a fit", text: "Setting your prices, deciding credit limits, replacing a conversation with an important customer." },
            { title: "Worth trying", text: "Run the menu import on one menu page and the lead scoring on your current leads, then compare with your own judgement." },
          ],
        },
        { p: "To see these features in action, start a free 1-month trial of Restaurant POS or the CRM. Setup, data migration and staff training are free on every plan." },
      ],
    },
  ],
  faqs: [
    { q: 'Can AI import my menu from a photo?', a: 'Yes. Upload a photo of your menu in Restaurant POS and Nexora’s AI extracts items, prices and categories. You review them and import in one step.' },
    { q: 'What does AI lead scoring use?', a: 'Signals such as reply speed, meetings and activity. It produces a score, a priority and a prediction, and explains the result.' },
    { q: 'Is AI available on every plan?', a: 'AI features are part of the modules they belong to. Check the pricing page or ask us on WhatsApp for what your plan includes.' },
    { q: 'Can I trust the AI output without checking?', a: 'No. Always review imported items and treat scores as guidance.' },
    { q: 'What photo works best for menu import?', a: 'A flat, well-lit, in-focus photo with all text visible. Avoid glare, shadows and busy backgrounds, and use one photo per page or board.' },
    { q: 'What is the lead score range?', a: 'Each lead gets a seriousness score from 0 to 100 with a hot, warm or cold badge and an explanation.' },
    { q: 'What should I do with a hot lead?', a: 'Contact it first, personally, and create a follow-up task with a date so it does not slip.' },
    { q: 'Does AI replace my sales team or my menu manager?', a: 'No. It prepares and prioritises. People review the results and make the decisions.' },
    { q: 'Can I edit items after an AI import?', a: 'Yes. Imported items behave like any other menu items, so you can edit names, prices and categories.' },
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
            { title: 'Email', text: `${HELP_EMAIL} for product support, and hello@nexorasolution.us for sales.`, external: `mailto:${HELP_EMAIL}` },
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
    {
      id: 'which-channel',
      heading: 'Which Support Channel Should You Use?',
      blocks: [
        { p: 'You can reach the team in three ways, and each one suits a different kind of question. Choosing the right one gets you an answer sooner.' },
        {
          list: [
            { title: 'WhatsApp for quick questions and demos', text: 'Best when you want to ask "does Nexora do this?", book a walkthrough or share a screenshot of a screen you are stuck on. Messages and photos are easy to send from a phone, even from the shop counter.', external: HELP_WHATSAPP },
            { title: 'Email for detailed product support', text: `Write to ${HELP_EMAIL} when the problem needs explaining, such as a report that does not match your records. Email lets you attach files and keeps a written history.`, external: `mailto:${HELP_EMAIL}` },
            { title: 'Contact form for new enquiries', text: 'Use the website form if you are new and want the team to recommend a product. Tell us your business type, how many users and branches you have, and what you use today.', to: '/contact' },
          ],
        },
        { callout: 'For sales and pricing questions the sales email is hello@nexorasolution.us. For product support use the support address above.' },
      ],
    },
    {
      id: 'before-you-write',
      heading: 'What to Include So We Can Help Faster',
      blocks: [
        { p: 'A good support message answers five questions before we have to ask them. Include these and most problems are solved in one reply.' },
        {
          steps: [
            { title: 'Which module are you using?', text: 'For example Restaurant POS, Retail POS, School ERP, CRM or Fleet. Different modules have different screens.' },
            { title: 'What were you trying to do?', text: 'Describe the goal in a sentence, such as "print a daily closing report" or "add a new class".' },
            { title: 'What happened instead?', text: 'Copy any message you saw word for word, and say whether it happens every time or only sometimes.' },
            { title: 'Which device and browser?', text: 'Tell us if you used a phone, tablet or desktop, and the browser or app.' },
            { title: 'A screenshot', text: 'A picture of the screen is worth a long description. Hide customer details if the screenshot shows them.' },
          ],
        },
        { p: 'Please do not send passwords in a message. We will never ask for your password. If we need to look at your account, we will explain what we need and why.' },
      ],
    },
    {
      id: 'setup-training-migration',
      heading: 'Setup, Data Migration and Training',
      blocks: [
        { p: 'Moving a business onto new software is easier with a person to ask. Setup, data migration and staff training are free on every plan, and the team is happy to help you through the first weeks.' },
        {
          list: [
            { title: 'Setup', text: 'Creating your menu, products, tables, classes, vehicles, staff and roles so the workspace matches how your business really runs.' },
            { title: 'Data migration', text: 'Bringing in the records you already keep, such as product lists, customers or students, so you do not start from a blank screen.' },
            { title: 'Staff training', text: 'Showing your cashiers, accountants and managers the screens they will use, so the first real day is calm.' },
          ],
        },
        { p: 'A tip from experience: do the setup with your busiest staff member in the room. The person who answers the phone and serves customers knows which shortcuts and reports matter most.' },
      ],
    },
    {
      id: 'self-help',
      heading: 'Find Answers Yourself First',
      blocks: [
        { p: 'Many questions already have an answer in the Help Center, and finding it yourself is often faster than waiting for a reply. Use the search box at the top of the Help Center, or open the guide for your module.' },
        {
          links: [
            { to: '/help-center/getting-started', label: 'Getting started' },
            { to: '/help-center/pricing-and-trial', label: 'Pricing and trial' },
            { to: '/help-center/team-permissions', label: 'Team & Permissions' },
            { to: '/help-center/reports', label: 'Reports & Analytics' },
            { to: '/help-center/inventory-management', label: 'Inventory Management' },
          ],
        },
      ],
    },
    {
      id: 'common-fixes',
      heading: 'Quick Fixes for Common Problems',
      blocks: [
        {
          list: [
            { title: 'A screen looks empty or outdated', text: 'Refresh the page once. If your connection was lost, wait for the sync indicator to show Synced, then check again.' },
            { title: 'A team member cannot see a module', text: 'Their role probably does not include it. Ask the owner or an admin to enable at least View access for that module.' },
            { title: 'A report total looks wrong', text: 'Check the date range and filters first, then look for pending approvals or refunds in that period.' },
            { title: 'I cannot log in', text: 'Use the email you were invited with. If you still cannot sign in, contact support with that email address and we will check the account.' },
            { title: 'Printing looks off', text: 'Check the paper size in your printer settings. Receipts and reports use different layouts, including a compact thermal one for receipt printers.' },
          ],
        },
      ],
    },
    {
      id: 'help-by-module',
      heading: 'Where to Get Help for Each Product',
      blocks: [
        { p: 'Every Nexora product has its own Help Center guide, product page and feature pages. If your question is about one module, start there and use the support channels above for anything left over.' },
        {
          list: [
            { title: 'Restaurant POS', text: 'Menu setup, tables, KOT and kitchen display, billing, and the cashier end-of-day report.', to: '/help-center/restaurant-pos' },
            { title: 'Retail POS', text: 'Products and barcodes, billing and checkout, discounts and promo codes, customer records and daily closing.', to: '/help-center/retail-pos' },
            { title: 'Pharmacy POS', text: 'Medicine billing, batch and expiry tracking, supplier purchases and reports.', to: '/help-center/pharmacy-pos' },
            { title: 'School ERP', text: 'Admissions, attendance, fee structure and bulk fee generation, payroll and reports.', to: '/help-center/school-erp' },
            { title: 'CRM and WhatsApp CRM', text: 'Leads, deals, tasks, follow-ups, templates and the WhatsApp inbox.', to: '/help-center/crm' },
            { title: 'Platform features', text: 'Team and permissions, reports, inventory and email marketing.', to: '/help-center/team-permissions' },
          ],
        },
      ],
    },
    {
      id: 'plans-trial-support',
      heading: 'Questions About Plans, Trial and Billing',
      blocks: [
        { p: 'Every product starts with a free 1-month trial, and during the trial the number of team members is unlimited. When you are ready, you choose a plan. Basic includes up to 2 team members and Standard up to 5, while Enterprise has unlimited users.' },
        { p: 'If you are unsure which plan fits, message us with your number of staff and branches and we will suggest one. For the full details, including currency and yearly billing, read the pricing and trial guide.' },
        { links: [{ to: '/help-center/pricing-and-trial', label: 'Pricing and trial guide' }, { to: '/pricing', label: 'Pricing page' }] },
      ],
    },
    {
      id: 'feedback-requests',
      heading: 'Feature Requests and Feedback',
      blocks: [
        { p: 'Many Nexora improvements start as a message from a customer. If something feels slow, confusing or missing, tell us. A short description of the situation helps more than a suggested solution: "my cashier cannot find the return button during a rush" tells us more than "move the button".' },
        { p: 'We cannot promise every request, but we always answer honestly. A request may already be possible with a setting, may fit the plan for a future release, or may be a good candidate for a custom project.' },
      ],
    },
    {
      id: 'data-safety-support',
      heading: 'Keeping Your Data Safe When You Ask for Help',
      blocks: [
        {
          list: [
            { title: 'Never share passwords', text: 'Support never needs your password. Anyone asking for it is not Nexora.' },
            { title: 'Hide customer details in screenshots', text: 'Crop or blur names, phone numbers and amounts if they are not needed to explain the problem.' },
            { title: 'Use roles for staff', text: 'Give each person their own login so support questions and activity logs point to the right account.' },
            { title: 'Confirm the channel', text: 'Use the WhatsApp number and email addresses listed on this page and on the contact page.' },
          ],
        },
      ],
    },
    {
      id: 'first-week-checklist',
      heading: 'Your First Week With Nexora: A Checklist',
      blocks: [
        { p: 'Most support questions come from the first week, when everything is new. Following a simple order removes most of them.' },
        {
          steps: [
            { title: 'Day 1: create the workspace', text: 'Sign up, choose your product and enter your business name. Use the name you want customers to see on receipts and invoices.' },
            { title: 'Day 1: add the basics', text: 'Enter a few products, menu items, classes or vehicles so you can try a real sale or record straight away.' },
            { title: 'Day 2: invite your team', text: 'Create a login for each person and pick a role. Test each role once yourself.' },
            { title: 'Day 3: try a full day', text: 'Run one normal day, from the first sale to the closing report, and compare the total with your drawer or register.' },
            { title: 'Day 4: connect the extras', text: 'Set tax, receipts, printers and any promo codes you need.' },
            { title: 'Day 5 to 7: bring in the rest', text: 'Add the remaining records, then review reports at the end of the week.' },
          ],
        },
        { p: 'If any step feels unclear, that is exactly what the free setup and training are for. Message us and we will walk through it with you.' },
      ],
    },
    {
      id: 'glossary',
      heading: 'Words You May Hear From Us',
      blocks: [
        {
          list: [
            { title: 'Workspace', text: 'Your private area in Nexora that holds your business data and team.' },
            { title: 'Module', text: 'A product area such as Restaurant POS, Retail POS or School ERP.' },
            { title: 'Role', text: 'A set of permissions, such as cashier or manager, given to a team member.' },
            { title: 'Cloud sync', text: 'Your data is stored online so every device and teammate sees the same numbers.' },
            { title: 'KOT', text: 'Kitchen order ticket, the slip or screen that tells the kitchen what to cook.' },
            { title: 'SKU', text: 'A short code that identifies one product in your catalog.' },
            { title: 'Approval Center', text: 'The place where expenses and payments wait for sign-off.' },
          ],
        },
      ],
    },
    {
      id: 'symptoms',
      heading: 'Troubleshooting by Symptom',
      blocks: [
        {
          list: [
            { title: 'The page loads slowly', text: 'Check your internet connection first, then refresh. A very old browser can also slow things down, so keep it updated.' },
            { title: 'I saved something but it did not appear', text: 'Wait for the sync indicator to show Synced, then refresh once. Do not enter the same record again before checking, or you may create a duplicate.' },
            { title: 'A number is different on two devices', text: 'One device may not have finished syncing. Refresh both after the connection is stable.' },
            { title: 'I see a permission message', text: 'Your role does not allow that action. Ask the owner or an admin to review your permissions.' },
            { title: 'A bill printed with the wrong size', text: 'Choose the right paper size in the print dialog. Thermal receipts and full-page documents use different layouts.' },
            { title: 'I forgot which plan I am on', text: 'Open your workspace settings, or message us with your account email and we will tell you.' },
          ],
        },
      ],
    },
    {
      id: 'working-hours-response',
      heading: 'What to Expect After You Contact Us',
      blocks: [
        { p: 'We read every message. For sales enquiries and contact-form messages we usually reply within one business day, on WhatsApp or email, with the product that fits and answers to your pricing questions. Urgent problems with a live business are best sent on WhatsApp with a short description and a screenshot.' },
        { p: 'Because the team is based in Pakistan, replies follow Pakistan working days. If you write from another time zone, your message will be waiting for us at the start of our day. We would rather give you a clear, correct answer than a fast but vague one.' },
        { callout: 'Not sure whether something is a support question or a new feature request? Send it anyway. We will tell you honestly whether it is already possible, planned, or a custom project.' },
      ],
    },
  ],
  faqs: [
    { q: 'How do I contact Nexora support?', a: `Message us on WhatsApp at +92 319 432 9754 or email ${HELP_EMAIL}.` },
    helpQ,
    { q: 'Where is Nexora located?', a: 'Multan, Punjab, Pakistan. We support customers worldwide online, and we do not have offices in other countries.' },
    { q: 'Can I book a demo?', a: 'Yes. Message us on WhatsApp and our team will walk you through the module that fits your business.' },
    { q: 'Do you build custom software?', a: 'Yes. We build custom CRM, ERP, mobile apps, online stores and integrations. Tell us what you need and we will say whether a ready-made module already covers it.' },
    { q: 'Is setup really free?', a: 'Yes. Setup, data migration and staff training are free on every plan.' },
    { q: 'How fast will I get a reply?', a: 'For contact-form and sales messages we usually reply within one business day on WhatsApp or email. Urgent problems are best sent on WhatsApp with a screenshot.' },
    { q: 'What should I put in a support message?', a: 'The module you use, what you were trying to do, what happened instead, your device and browser, and a screenshot. Never include your password.' },
    { q: 'Which email do I use for sales and which for support?', a: `Use ${HELP_EMAIL} for product support and hello@nexorasolution.us for sales and pricing.` },
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
    {
      id: 'when-custom',
      heading: 'Ready-Made Module or Custom Build?',
      blocks: [
        { p: 'Most businesses do not need custom software. The Nexora modules for restaurants, retail, pharmacies, schools, fleets, CRM and property already cover the daily work, and they cost less than a build because the software already exists. We would rather tell you that honestly than sell you a project you do not need.' },
        { p: 'Custom work makes sense when your process is unusual, when you need a screen or workflow that no module offers, when you want a branded customer app or online store, or when you must connect Nexora to another system. A good way to decide is to describe your three most painful daily tasks and ask whether a module already handles them.' },
        {
          list: [
            { title: 'Use a module when', text: 'Your business looks like a restaurant, shop, pharmacy, school, rental fleet, property team or sales team, and you mostly need billing, records and reports.' },
            { title: 'Choose custom when', text: 'You need something that does not exist yet, such as a special workflow, a customer-facing app or an integration with another system.' },
            { title: 'Often the best answer is both', text: 'Run on a Nexora module and add a small custom extension around it, which keeps cost and risk low.' },
          ],
        },
      ],
    },
    {
      id: 'service-details',
      heading: 'What Each Service Includes',
      blocks: [
        {
          list: [
            { title: 'Custom software development', text: 'Web and desktop software designed around your company’s process, from planning and design to build, testing and handover.', to: '/software-development' },
            { title: 'ERP development', text: 'Systems that join sales, stock, purchasing, finance and HR when a ready-made module does not cover your structure.', to: '/erp-development' },
            { title: 'CRM development', text: 'A customer and sales system shaped around how your team qualifies leads, follows up and closes.', to: '/crm-development' },
            { title: 'Mobile app development', text: 'Android and iOS apps for your customers or your staff, such as order apps, field sales apps or service apps.', to: '/mobile-app-development' },
            { title: 'E-commerce development', text: 'Online stores with a catalogue, cart and checkout, built so they are fast, searchable and easy for you to manage.', to: '/ecommerce-development' },
            { title: 'SEO services', text: 'Technical and content work that helps customers find your website in search engines.', to: '/seo-services' },
            { title: 'Business services', text: 'Setup, support and managed operations for companies that want help running their tools.', to: '/business-services' },
          ],
        },
      ],
    },
    {
      id: 'project-stages',
      heading: 'The Stages of a Custom Project',
      blocks: [
        { p: 'Software projects go wrong when people skip the early conversation. We follow the same sensible stages every time so you always know what comes next.' },
        {
          steps: [
            { title: 'Discovery', text: 'We listen, ask about your current process and collect examples of the paper forms, spreadsheets and messages you use today.' },
            { title: 'Scope', text: 'We write down what will be built, what will not, and what success looks like, so everyone agrees before work starts.' },
            { title: 'Design', text: 'You see the main screens and flow before any code is written, which is the cheapest time to change your mind.' },
            { title: 'Build in steps', text: 'We deliver working pieces in order of importance, so you can try real screens early instead of waiting for one big handover.' },
            { title: 'Testing with your team', text: 'Your staff use the software with real examples and tell us what feels wrong. We fix it before launch.' },
            { title: 'Launch and support', text: 'We help you go live, train the team and stay available for fixes and improvements afterwards.' },
          ],
        },
      ],
    },
    {
      id: 'how-to-brief',
      heading: 'How to Describe Your Project',
      blocks: [
        { p: 'You do not need technical words. A short message in plain language is the best brief. These questions help you write one:' },
        {
          list: [
            { title: 'Who will use it?', text: 'Owners, staff, customers or all three, and roughly how many people.' },
            { title: 'What problem does it solve?', text: 'Describe what takes too long or goes wrong today.' },
            { title: 'What do you use now?', text: 'Paper, spreadsheets, another software, or WhatsApp messages.' },
            { title: 'What must it connect to?', text: 'Payment methods, printers, an existing website or other systems.' },
            { title: 'When do you need it?', text: 'A date, or a season such as before the new school year.' },
          ],
        },
        { callout: 'Nexora modules do not connect to tax authority systems today. If you need an integration like that, say so in your first message and we will scope it honestly.' },
      ],
    },
    {
      id: 'example-requests',
      heading: 'Examples of What Customers Ask Us to Build',
      blocks: [
        { p: 'These are typical kinds of requests, written as examples to show the range. Your own project may look quite different.' },
        {
          list: [
            { title: 'An ordering app for a restaurant', text: 'Customers browse the menu and place an order, and the order lands in the kitchen screen. Built on top of the restaurant module.' },
            { title: 'A fee portal for a school', text: 'Parents see dues and payment history. The data already lives in the School ERP, so the portal is a new face on existing records.' },
            { title: 'An online store for a retail shop', text: 'A searchable catalogue and checkout that reads the same products the shop sells at the till.' },
            { title: 'A field sales app', text: 'Sales staff log visits and orders from their phones, and managers see them in the CRM.' },
            { title: 'A custom report pack', text: 'A set of reports shaped around how the owner reviews the business each month.' },
          ],
        },
      ],
    },
    {
      id: 'cost-timeline',
      heading: 'What Affects Cost and Timeline',
      blocks: [
        { p: 'There is no single price for custom software, because the size of the job varies. We give a clear quote after we understand the scope. These factors have the largest effect:' },
        {
          list: [
            { title: 'Number of screens and workflows', text: 'More screens and more rules take more time to design, build and test.' },
            { title: 'Integrations', text: 'Connecting to another system adds work, especially if that system has limited documentation.' },
            { title: 'Platforms', text: 'A web app only is quicker than a web app plus Android and iOS apps.' },
            { title: 'Data migration', text: 'Moving large or messy records takes cleaning first.' },
            { title: 'Clarity of requirements', text: 'Projects with clear examples and quick feedback finish sooner than ones that change direction often.' },
          ],
        },
        { p: 'Building in steps keeps cost visible. You can stop after any step with something that works.' },
      ],
    },
    {
      id: 'after-launch',
      heading: 'After Launch: Support and Improvements',
      blocks: [
        { p: 'Software is never really finished. After launch, businesses discover small things that would help: a new report, a field to add, a different order of screens. Plan for a short period of adjustments in the first weeks, when real use shows what matters.' },
        { p: 'Tell us what you notice, and we will help decide what is a quick fix and what is a larger improvement worth scoping. Keeping the same team across build and support means no one has to learn your project from scratch.' },
      ],
    },
    {
      id: 'questions-to-ask',
      heading: 'Questions to Ask Any Software Developer',
      blocks: [
        { p: 'Whether you choose us or someone else, these questions protect you. A good developer answers them clearly and without pressure.' },
        {
          list: [
            { title: 'Can I see a similar thing you built?', text: 'Seeing a working product is better than reading a promise.' },
            { title: 'What exactly is included?', text: 'Ask for the list of screens and features in writing, and what is outside the scope.' },
            { title: 'How will we review progress?', text: 'Look for regular demos of working software, not only a final delivery.' },
            { title: 'Who owns what, and where does it run?', text: 'Agree who owns the code and data, where it is hosted and what happens if you want to move.' },
            { title: 'What happens after launch?', text: 'Ask how fixes, updates and questions are handled and by whom.' },
          ],
        },
        { p: 'We are happy to answer all of these before you decide anything.' },
      ],
    },
    {
      id: 'choose-service',
      heading: 'Which Service Fits Your Goal?',
      blocks: [
        {
          list: [
            { title: 'You want to sell online', text: 'E-commerce development gives you a store with a catalogue and checkout. Add SEO services so customers can find it.', to: '/ecommerce-development' },
            { title: 'You want your own customer or staff app', text: 'Mobile app development covers Android and iOS.', to: '/mobile-app-development' },
            { title: 'Your sales team needs a tailored process', text: 'CRM development shapes lead stages, follow-ups and reports around how you sell.', to: '/crm-development' },
            { title: 'Your operations span many departments', text: 'ERP development links sales, stock, finance and HR in one system.', to: '/erp-development' },
            { title: 'You need help running your tools', text: 'Business services cover setup, support and managed operations.', to: '/business-services' },
            { title: 'You want more visitors from search', text: 'SEO services improve technical health and content so people find your website.', to: '/seo-services' },
          ],
        },
      ],
    },
    {
      id: 'timeline-example',
      heading: 'A Typical Timeline, Week by Week',
      blocks: [
        { p: 'Every project is different, but a small to medium build often moves in this pattern. Treat it as a guide, not a promise, because the scope decides the real schedule.' },
        {
          steps: [
            { title: 'Week 1: discovery and scope', text: 'Conversations, examples and a written scope you approve.' },
            { title: 'Week 2: design', text: 'Screens and flow shared for feedback.' },
            { title: 'Weeks 3 to 5: build in steps', text: 'Working pieces delivered in order of importance, with a short review after each.' },
            { title: 'Week 6: testing with your team', text: 'Your staff try the software with real cases and we fix what they find.' },
            { title: 'Week 7: launch and training', text: 'Go-live, staff training and close support during the first days.' },
          ],
        },
      ],
    },
    {
      id: 'good-brief-example',
      heading: 'A Sample Brief You Can Copy',
      blocks: [
        { p: 'If you are unsure how to start, adapt this example and send it on WhatsApp or through the contact form. It is only a pattern, so change the details to fit your business.' },
        { callout: '"We run three pharmacies in Multan with about twelve staff. Today we keep medicine stock in spreadsheets and bills on paper. We need a way to see stock across the three shops, get warned about near-expiry medicines and send a daily sales summary to the owner. We would like to start in two months."' },
        { p: 'In four sentences that message gives us the business type, size, current tools, the problem, the goal and the timing. From there we can tell you quickly whether the Pharmacy POS already covers it or whether you need a custom addition, and what the first step would be.' },
        { p: 'Short briefs are welcome. We would rather start a conversation with a rough idea than wait for a perfect document, because the best specifications usually come out of the first call.' },
      ],
    },
    {
      id: 'working-with-us',
      heading: 'Working With Nexora',
      blocks: [
        { p: 'Nexora Solution has been building business software since 2019 from Multan, Punjab, Pakistan, and works with customers online. Because the same team builds the ready-made modules and the custom projects, custom work can sit on the same cloud foundation, with roles, reports and cloud sync that already exist.' },
        { p: 'The standard interface is in English. If you need another language, it is a custom addition and we will quote it as such. To begin, message the team on WhatsApp or send the contact form with a short description of what you need.' },
        {
          links: [
            { to: '/contact', label: 'Contact the team' },
            { to: '/help-center/support-and-contact', label: 'Support and contact' },
            { to: '/software-development', label: 'Custom software' },
          ],
        },
      ],
    },
  ],
  faqs: [
    { q: 'Do you build integrations with government or tax systems?', a: 'Nexora modules do not connect to tax authority systems today. If you need an integration like that, ask us first and we will scope it honestly as a custom project.' },
    { q: 'Can you build an Arabic or local-language interface?', a: 'The standard interface is in English. A full interface in another language would be a custom project.' },
    { q: 'How do I start a custom project?', a: 'Message us on WhatsApp or send the contact form with a short description of what you need.' },
    { q: 'How much does custom software cost?', a: 'It depends on the scope: screens, workflows, integrations and platforms. We give a clear quote after we understand what you need.' },
    { q: 'Do I have to choose custom software?', a: 'No. If a ready-made Nexora module covers your work, we will say so. Custom work is for needs a module does not meet.' },
    { q: 'Can you add something small to a Nexora module?', a: 'Often yes. A small custom extension around a module keeps cost and risk lower than a full build. Describe it and we will scope it.' },
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
  EDITOR_MANUAL,
  GEOLINT_ARTICLE,
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
