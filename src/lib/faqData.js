/**
 * Content of the /faq/ page, grouped by topic. One source for the React page
 * (src/pages/public/FaqPage.jsx), the FAQPage JSON-LD and the prerendered HTML
 * (scripts/prerender.mjs), so the three can never disagree.
 *
 * Every answer states only what is true of the product and is covered
 * elsewhere on the site. Prices are deliberately not repeated here: the
 * pricing page is the single place they live, so this page never goes stale.
 *
 * `links` are internal paths shown under an answer ("Related:"), which also
 * gives each topic page another crawlable link.
 */

import { SITE_EMAILS } from './seoStructuredData.js'

const WHATSAPP_DISPLAY = '+92 319 432 9754'

export const FAQ_GROUPS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    intro: 'What Nexora is, who it is for and how to try it.',
    items: [
      {
        q: 'What is Nexora Solution?',
        a: 'Nexora Solution is a cloud business software company. Its platform covers POS, CRM and ERP for restaurants, retail stores, pharmacies, schools, transport fleets and growing businesses, all from one account. The team is based in Multan, Pakistan, and the software runs in a browser, so you can start from anywhere.',
        links: [{ label: 'About Nexora', to: '/about' }, { label: 'All products', to: '/industries' }],
      },
      {
        q: 'Who is Nexora built for?',
        a: 'Nexora is built for small and growing businesses, from a single-counter restaurant or retail shop to multi-branch schools, pharmacy chains and transport fleets. The modules adapt to your workflow, and you set your own tax rate and label so receipts fit the country you sell in.',
        links: [{ label: 'Industries we serve', to: '/industries' }],
      },
      {
        q: 'How do I start using Nexora?',
        a: 'Sign up for a free account, choose the module that fits your business and open your workspace. Every account starts with a 1-month free trial and no credit card is needed. If you prefer, book a demo on WhatsApp and the team will walk you through the modules that fit.',
        links: [{ label: 'Start free trial', to: '/signup' }, { label: 'Contact us', to: '/contact' }],
      },
      {
        q: 'Which Nexora modules are available?',
        a: 'Nexora CRM, WhatsApp CRM, Restaurant POS, Retail POS, Pharmacy POS, School ERP, Transport and Fleet management and Property ERP. They run on the same Nexora account, so you can add a second module later without starting over.',
        links: [
          { label: 'Restaurant POS', to: '/restaurant-pos' },
          { label: 'Retail POS', to: '/retail-pos' },
          { label: 'Pharmacy POS', to: '/pharmacy-pos' },
          { label: 'School ERP', to: '/school-erp' },
          { label: 'CRM', to: '/crm' },
        ],
      },
      {
        q: 'What is POS software?',
        a: 'POS (point of sale) software is the program a business uses to ring up a sale: it records what was sold, at what price and how the customer paid, then updates stock and reports afterwards. Our guide explains how it works, its main features and how to choose.',
        links: [{ label: 'What is POS software?', to: '/blog/what-is-pos-software' }],
      },
      {
        q: 'Where is Nexora based, and can I use it from another country?',
        a: 'Our head office is in Multan, Punjab, Pakistan. Nexora is cloud software you open in a browser (the Restaurant POS also has a Windows app), so you can sign up and start the free trial from anywhere. The interface is in English.',
        links: [{ label: 'Nexora for the USA', to: '/usa' }, { label: 'Nexora for India', to: '/india' }, { label: 'Nexora for Pakistan', to: '/pakistan' }],
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing, trial and payment',
    intro: 'Plans, the free month and how to pay.',
    items: [
      {
        q: 'Is there a free trial?',
        a: 'Yes. Every account starts with a 1-month free trial with full access and no credit card. You can set up your menu, items, tables or students and try real work before you decide to pay.',
        links: [{ label: 'See pricing', to: '/pricing' }],
      },
      {
        q: 'How much does Nexora cost?',
        a: 'Nexora has a Basic plan, a Standard plan and a custom-priced Enterprise plan, billed monthly or yearly. The current prices are always on the pricing page, so you see the up-to-date numbers in one place.',
        links: [{ label: 'View pricing', to: '/pricing' }],
      },
      {
        q: 'Is there a discount for yearly billing or new users?',
        a: 'Yes. Paying yearly saves 20% compared with paying monthly, and new users get 50% off their first subscription with the code WELCOME-NEXORA. The pricing page shows what each plan includes.',
        links: [{ label: 'View pricing', to: '/pricing' }],
      },
      {
        q: 'Can I upgrade or change my plan later?',
        a: 'Yes. You can move from Basic to Standard or to an Enterprise plan at any time, and add modules as your business grows.',
        links: [{ label: 'View pricing', to: '/pricing' }],
      },
      {
        q: 'How can I pay for a Nexora subscription?',
        a: 'Payment options include JazzCash, Easypaisa and bank transfer, and card or PayPal through Paddle. The options available to you are shown at checkout. If you need help with a payment, contact support.',
        links: [{ label: 'Contact support', to: '/contact' }],
      },
      {
        q: 'What is your refund policy?',
        a: 'The full terms are on the refund policy page. If you have a question about a charge, email support and the team will look into it.',
        links: [{ label: 'Refund policy', to: '/refund-policy' }],
      },
    ],
  },
  {
    id: 'pos-and-modules',
    title: 'POS and business modules',
    intro: 'What each module does.',
    items: [
      {
        q: 'What does the Restaurant POS include?',
        a: 'Table management, kitchen order tickets (KOT) and a kitchen display, split bills, menu management and billing and receipts for dine-in, takeaway and delivery. It can import your menu from a photo with AI, and bills and kitchen copies print on 58mm thermal printers.',
        links: [{ label: 'Restaurant POS', to: '/restaurant-pos' }, { label: 'Download the Windows app', to: '/download/restaurant-pos' }],
      },
      {
        q: 'What does the Retail POS include?',
        a: 'Barcode billing, multi-counter checkout, stock control, supplier records and a customer ledger for shops, marts and showrooms, with store reports for the owner.',
        links: [{ label: 'Retail POS', to: '/retail-pos' }],
      },
      {
        q: 'What does the Pharmacy POS include?',
        a: 'Medicine search, batch and expiry tracking, supplier purchases and itemized receipts at the counter, so a medical store can see what is close to expiry.',
        links: [{ label: 'Pharmacy POS', to: '/pharmacy-pos' }],
      },
      {
        q: 'What does the School ERP include?',
        a: 'Student records and admissions, attendance, fee collection, exams, a parent portal and staff payroll in one workspace, so a student record created at admission carries through to attendance and fees.',
        links: [{ label: 'School ERP', to: '/school-erp' }],
      },
      {
        q: 'What can the CRM and the WhatsApp CRM do?',
        a: 'The CRM tracks leads, follow-ups and customers in a sales pipeline. The WhatsApp CRM adds broadcasts, automation and a shared inbox so a team can talk to customers on WhatsApp and follow up in one place.',
        links: [{ label: 'CRM', to: '/crm' }, { label: 'WhatsApp CRM', to: '/whatsapp-crm' }],
      },
      {
        q: 'Can Nexora manage vehicles, rentals and properties?',
        a: 'Yes. Transport and Fleet covers vehicles, rental bookings, customer ledgers, payments and dues. Property ERP is available for property businesses.',
        links: [{ label: 'Transport and Fleet', to: '/transport-fleet' }, { label: 'Property ERP', to: '/property-erp' }],
      },
      {
        q: 'Can my team use Nexora together, with different access?',
        a: 'Yes. Nexora supports multiple users with role-based permissions: a cashier sees the billing screen, a manager sees reports and the owner sees everything. Nobody gets more access than their job needs.',
        links: [{ label: 'Team permissions guide', to: '/help-center/team-permissions' }],
      },
      {
        q: 'Does Nexora have AI features?',
        a: 'Yes. Nexora AI includes an assistant that answers in the language you write to it, and AI menu import in the Restaurant POS, which reads a photo of your menu. Review what it reads before you import.',
        links: [{ label: 'Nexora AI', to: '/ai' }],
      },
    ],
  },
  {
    id: 'offline-and-hardware',
    title: 'Offline use, devices and printers',
    intro: 'What happens when the internet drops, and what you need at the counter.',
    items: [
      {
        q: 'Does Nexora work without internet?',
        a: 'The POS modules support offline mode, so billing keeps going during an internet outage. Orders keep saving at the counter and sync to the cloud when the connection returns.',
        links: [{ label: 'Cloud vs offline POS', to: '/compare/cloud-vs-offline-pos' }],
      },
      {
        q: 'What devices and printers do I need?',
        a: 'Nexora runs in a web browser, so you can use a computer, tablet or phone you already own. For receipts, bills and kitchen copies print on 58mm thermal printers. The free receipt tool also makes 80mm layouts.',
        links: [{ label: 'Thermal receipt generator', to: '/tools/thermal-receipt-generator' }],
      },
      {
        q: 'Is there a Windows app?',
        a: 'Yes. The Restaurant POS has a Windows app you can download. The rest of the platform runs in your browser.',
        links: [{ label: 'Download Restaurant POS', to: '/download/restaurant-pos' }],
      },
    ],
  },
  {
    id: 'free-tools',
    title: 'Free invoice and receipt tools',
    intro: 'The free tools anyone can use, with no signup.',
    items: [
      {
        q: 'Are the invoice and quotation tools really free?',
        a: 'Yes. The invoice generator, quotation generator, thermal receipt generator and invoice-on-letterhead tool are free to use with no signup. You add your details and download a PDF or Excel file.',
        links: [
          { label: 'Free invoice generator', to: '/tools/invoice-generator' },
          { label: 'Quotation generator', to: '/tools/quotation-generator' },
          { label: 'All free tools', to: '/tools' },
        ],
      },
      {
        q: 'Is there a GST invoice generator for India?',
        a: 'Yes. The free GST invoice generator opens set up for India: GSTIN fields, CGST and SGST or IGST, GST at 18% that you can change per line, rupee amounts with lakh and crore grouping and a UPI QR code. Download it as PDF or Excel.',
        links: [{ label: 'GST invoice generator', to: '/tools/gst-invoice-generator' }, { label: 'Nexora for India', to: '/india' }],
      },
      {
        q: 'Can I print an invoice on my own letterhead?',
        a: 'Yes. Upload your company letterhead as a PNG, JPG or PDF, set safe margins and download a print-ready PDF.',
        links: [{ label: 'Invoice on letterhead', to: '/tools/invoice-on-letterhead' }],
      },
      {
        q: 'Do the free tools file taxes or create e-invoices?',
        a: 'No. They make the document only. They do not file tax returns, connect to a tax authority, create government e-invoice references or e-way bills, or give tax advice, so keep using your accountant or the official portal for those.',
        links: [{ label: 'Help center: free tools', to: '/help-center/free-tools' }],
      },
      {
        q: 'Where is my data stored when I use the free tools?',
        a: 'The free tools save your business details and documents in your own browser on that device, and you can download your files at any time. Because it is local storage, clear your browser data only after you have saved what you need.',
        links: [{ label: 'All free tools', to: '/tools' }],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security and your data',
    intro: 'How your information is protected.',
    items: [
      {
        q: 'Is my data secure?',
        a: 'Nexora runs on secure cloud infrastructure with role-based access control, so each person sees only what their role allows, and data syncs across your devices. You can read how we handle personal data in the privacy policy.',
        links: [{ label: 'Privacy policy', to: '/privacy-policy' }],
      },
      {
        q: 'Can I bring my existing data into Nexora?',
        a: 'Yes. Every plan includes free data migration and free staff training, so you can move your items, customers or student records over and get your team started.',
        links: [{ label: 'Contact us', to: '/contact' }],
      },
    ],
  },
  {
    id: 'support',
    title: 'Support and custom work',
    intro: 'How to reach us and what else we build.',
    items: [
      {
        q: 'How do I get support?',
        a: `Message the team on WhatsApp at ${WHATSAPP_DISPLAY} or email ${SITE_EMAILS.support} for setup help and support. The Help Center also has step-by-step guides for every module and free tool.`,
        links: [{ label: 'Help Center', to: '/help-center' }, { label: 'Contact us', to: '/contact' }],
      },
      {
        q: 'Can you build custom software for my company?',
        a: 'Yes. Besides the Nexora platform, we build custom software, CRM and ERP systems, e-commerce sites and mobile apps. Contact us with what you need and we will discuss it.',
        links: [
          { label: 'Custom software', to: '/software-development' },
          { label: 'Custom CRM development', to: '/crm-development' },
          { label: 'Mobile app development', to: '/mobile-app-development' },
        ],
      },
    ],
  },
]

/** Every question and answer, flat, in page order. */
export function allFaqItems() {
  return FAQ_GROUPS.flatMap((group) => group.items)
}

/** The `{ question, answer }` pairs used by the FAQPage JSON-LD. */
export function faqSchemaItems() {
  return allFaqItems().map(({ q, a }) => ({ question: q, answer: a }))
}

/** A stable anchor id for one question, e.g. "is-there-a-free-trial". */
export function faqAnchor(question) {
  return String(question)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
