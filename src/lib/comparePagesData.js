/**
 * Pure data module for ComparePage.jsx's comparison/buyer-guide catalog —
 * no JSX, so it can be imported both by the React component
 * (src/pages/public/ComparePage.jsx) and by the Node-executed static
 * prerender script (scripts/prerender.mjs), which cannot parse JSX.
 * Single source of truth for both.
 */
import {
  HiOutlineAcademicCap,
  HiOutlineClipboardDocumentList,
  HiOutlineCloud,
  HiOutlineTableCells,
} from 'react-icons/hi2'

// ─────────────────────────────────────────────────────────────────────────
// Comparison / buyer-intent content approved in the Phase 7 SEO opportunity
// audit. Every claim about Nexora is grounded in verified product content
// already published elsewhere on the site (FeaturePage.jsx, SolutionPage.jsx
// commonFaqs, the homepage FAQ in seoMetadata.js, or real UI fields such as
// the FBR POS ID setting in src/crm/pages/Settings.jsx) — no invented
// features, integrations, stats, certifications or competitor claims.
// ─────────────────────────────────────────────────────────────────────────
export const comparePages = {
  'cloud-vs-offline-pos': {
    badge: 'Comparison',
    icon: HiOutlineCloud,
    eyebrow: 'Compare · POS Architecture',
    title: 'Cloud vs Offline POS Software',
    keyword: 'cloud vs offline POS software, offline POS Pakistan, cloud POS benefits, offline-first POS',
    seoTitle: 'Cloud vs Offline POS Software: Which Is Right for You? | Nexora',
    seoDescription: 'A neutral comparison of cloud-based and offline-capable POS software — connectivity, data sync, trade-offs and how to decide which approach fits your business.',
    intro: 'Every POS system leans one of two ways when it comes to the internet: cloud-based, where billing depends on a live connection, or offline-capable, where the counter keeps working even when the connection drops. Here’s what actually separates the two, and what to weigh before choosing.',
    sections: [
      {
        heading: 'What cloud-based POS means',
        paragraphs: [
          'A cloud-based POS stores and processes data on remote servers, so the till talks to the internet for most or every action — billing, inventory lookups, reporting. When the connection is live, everyone sees the same data instantly across every device and location.',
        ],
      },
      {
        heading: 'What offline-capable POS means',
        paragraphs: [
          'An offline-capable (or offline-first) POS can keep billing and running the counter even without an active internet connection, using data stored locally on the device. Once the connection comes back, the system syncs what happened offline back to the cloud.',
        ],
      },
      {
        heading: 'Trade-offs of each approach',
        paragraphs: [
          'Neither approach is universally better — each comes with something you give up.',
        ],
        bullets: [
          'Cloud-only POS: real-time data across every location, but billing stops if the connection drops',
          'Offline-capable POS: the counter keeps working through an outage, but relies on the device to hold data correctly until it can sync',
          'Cloud-only setups typically need less local storage management; offline-capable setups need a clear process for syncing once connectivity returns',
        ],
      },
      {
        heading: 'Connectivity and data-sync considerations',
        paragraphs: [
          'The real question isn’t just whether a system works offline — it’s what happens when the connection comes back. Data recorded while offline needs to reconcile cleanly with anything else that happened on other devices in the meantime, without duplicating sales or losing a transaction.',
        ],
      },
      {
        heading: 'When each approach fits',
        paragraphs: [
          'A single-counter business in an area with an unreliable connection has more to lose from a cloud-only system than a multi-branch operation with a stable connection and a need for real-time visibility across locations. The right choice depends on how often the connection actually drops, and how costly it is to stop billing when it does.',
        ],
      },
      {
        heading: 'What to evaluate before choosing',
        bullets: [
          'How reliable is the internet connection at the actual counter location, not just in general',
          'Does billing continue during an outage, or does the till stop working entirely',
          'How does the system reconcile data once the connection is restored',
          'Does the business need real-time visibility across multiple locations, or is periodic sync enough',
        ],
      },
      {
        heading: 'How Nexora approaches this',
        paragraphs: [
          'Nexora’s POS modules support offline mode, so billing can continue even when the internet connection drops. Once the connection is restored, data syncs back to the cloud automatically.',
        ],
        links: [
          { to: '/restaurant-pos', text: 'Restaurant POS' },
          { to: '/retail-pos', text: 'Retail POS' },
          { to: '/pharmacy-pos', text: 'Pharmacy POS' },
        ],
      },
    ],
    relatedLinks: [
      { to: '/restaurant-pos', text: 'Restaurant POS' },
      { to: '/retail-pos', text: 'Retail POS' },
      { to: '/pharmacy-pos', text: 'Pharmacy POS' },
    ],
  },

  'pos-software-buying-checklist': {
    badge: 'Buying Guide',
    icon: HiOutlineClipboardDocumentList,
    eyebrow: 'Compare · Buyer Checklist',
    title: 'POS Software Buying Checklist',
    keyword: 'how to choose POS software Pakistan, POS software features checklist, POS software buying guide Pakistan',
    seoTitle: 'POS Software Buying Checklist: What to Check Before You Choose | Nexora',
    seoDescription: 'A practical, feature-by-feature checklist for choosing POS software — billing, inventory, receipts, reporting, offline capability and more.',
    intro: 'Choosing POS software usually comes down to more than a features list on a sales page. Here’s a practical checklist of what to actually check before deciding — organized by what the counter needs to do, not by price.',
    sections: [
      {
        heading: 'Billing & checkout',
        paragraphs: [
          'Check how fast the till can find an item — by name, SKU or barcode — and whether it supports the order types your business actually uses (dine-in, takeaway, delivery, walk-in, quick sale).',
        ],
        links: [
          { to: '/restaurant-pos/billing-and-receipts', text: 'Restaurant billing' },
          { to: '/retail-pos/billing-and-checkout', text: 'Retail checkout' },
          { to: '/pharmacy-pos/billing', text: 'Pharmacy billing' },
        ],
      },
      {
        heading: 'Inventory',
        paragraphs: [
          'Look for live stock visibility, purchase orders tied to suppliers, and alerts before something actually runs out — not just a static product list.',
        ],
        links: [
          { to: '/retail-pos/inventory-control', text: 'Retail inventory control' },
          { to: '/pharmacy-pos/medicine-inventory', text: 'Medicine inventory' },
        ],
      },
      {
        heading: 'Receipts',
        paragraphs: [
          'A receipt should break a sale down clearly — subtotal, discount, tax, total, amount paid and amount due — and be reprintable if a customer needs a copy later.',
        ],
      },
      {
        heading: 'Reporting',
        paragraphs: [
          'At minimum, check for a daily closing report that reconciles cash against sales, broken down by payment method — that’s what actually gets used at the end of a shift.',
        ],
        links: [{ to: '/retail-pos/store-reports', text: 'See a real daily closing report' }],
      },
      {
        heading: 'Taxes and FBR-related considerations',
        paragraphs: [
          'If your business needs to meet FBR-related requirements, check whether the POS gives you a place to configure that — for example, a field for a tax or POS registration ID — rather than assuming every system handles it the same way.',
        ],
      },
      {
        heading: 'Offline capability',
        paragraphs: [
          'Ask directly: does billing stop if the internet drops, or does the till keep working and sync later? This matters more in areas with an unreliable connection.',
        ],
        links: [{ to: '/compare/cloud-vs-offline-pos', text: 'Cloud vs offline POS' }],
      },
      {
        heading: 'User permissions',
        paragraphs: [
          'Check whether the system lets you control what each team member can see and do — a cashier and an owner shouldn’t have the same access.',
        ],
      },
      {
        heading: 'Payment methods',
        paragraphs: [
          'Confirm the POS actually supports how your customers pay — cash, cards, and mobile wallets like JazzCash or EasyPaisa where relevant — not just a generic "cash" field.',
        ],
      },
      {
        heading: 'Product & customer management',
        paragraphs: [
          'Check how products are catalogued (by SKU, barcode or category) and how customer records work — some systems require a saved customer for every sale, others let you bill a walk-in by default and only save a record when it’s worth keeping.',
        ],
        links: [{ to: '/retail-pos/customer-records', text: 'See how walk-in vs saved customers work' }],
      },
      {
        heading: 'Industry-specific requirements',
        paragraphs: [
          'A restaurant needs kitchen ticketing and table management; a pharmacy needs batch and expiry tracking; a retail store needs barcode-driven inventory. Generic POS software often treats these as afterthoughts — check whether the workflow is actually built for your industry.',
        ],
        links: [
          { to: '/restaurant-pos', text: 'Restaurant POS' },
          { to: '/pharmacy-pos', text: 'Pharmacy POS' },
        ],
      },
      {
        heading: 'Support and implementation',
        paragraphs: [
          'Ask what happens after you sign up: is there help migrating existing data, training for staff, and someone to contact if something breaks — or are you on your own after setup?',
        ],
      },
      {
        heading: 'A note on cost',
        paragraphs: [
          'Cost matters, but it deserves its own comparison — total cost of ownership against what’s actually included, not just the monthly number on a pricing page. This checklist is about what the software needs to do, not what it should cost.',
        ],
      },
    ],
    relatedLinks: [
      { to: '/restaurant-pos', text: 'Restaurant POS' },
      { to: '/retail-pos', text: 'Retail POS' },
      { to: '/pharmacy-pos', text: 'Pharmacy POS' },
    ],
  },

  'school-erp-buying-checklist': {
    badge: 'Buying Guide',
    icon: HiOutlineAcademicCap,
    eyebrow: 'Compare · Buyer Checklist',
    title: 'School ERP Software Buying Checklist',
    keyword: 'how to choose school ERP software Pakistan, school ERP features checklist, school management software buying guide Pakistan',
    seoTitle: 'School ERP Software Buying Checklist | Nexora',
    seoDescription: 'What to check before choosing school management software — student records, attendance, fees, payroll, reporting, communication and more.',
    intro: 'School ERP software varies a lot in what it actually covers day to day. Here’s a practical checklist for evaluating one — organized by what a school office, not a sales page, actually needs.',
    sections: [
      {
        heading: 'Student management',
        paragraphs: [
          'Check how a student record is actually structured — does it hold admission number, roll number, class and section, and the parent or guardian’s contact details in one place, or is that scattered across separate tools?',
        ],
        links: [{ to: '/school-erp/admissions-and-students', text: 'See how student records work' }],
      },
      {
        heading: 'Attendance',
        paragraphs: [
          'Ask whether attendance can be marked manually and, if you need it, whether the system can connect to a biometric or RFID device — and whether both students and staff are covered by the same workflow.',
        ],
        links: [{ to: '/school-erp/attendance', text: 'See attendance management' }],
      },
      {
        heading: 'Fees',
        paragraphs: [
          'Look at how a fee bill moves from created to actually collected — some systems mark a bill paid the moment it’s created, others route it through an approval step first — and check whether fee records are tied to a specific month for recurring billing.',
        ],
        links: [{ to: '/school-erp/fee-management', text: 'See fee management' }],
      },
      {
        heading: 'Payroll',
        paragraphs: [
          'If staff payroll matters to you, check whether pay frequency can vary by role (daily, hourly, monthly) and whether gross pay and deductions are both tracked per payment.',
        ],
        links: [{ to: '/school-erp/payroll', text: 'See staff payroll' }],
      },
      {
        heading: 'Reporting',
        paragraphs: [
          'Check whether attendance and fee data actually roll up into a dashboard you can read at a glance, rather than requiring a manual tally at the end of each month.',
        ],
      },
      {
        heading: 'Communication',
        paragraphs: [
          'Ask how the system supports reaching parents or guardians. At minimum, parent or guardian contact details should sit on the same record as the student, so staff aren’t looking them up elsewhere.',
        ],
      },
      {
        heading: 'Multi-user access',
        paragraphs: [
          'Confirm whether staff accounts can have different access levels — front-office, teaching and accounts staff typically shouldn’t all see the same things. Nexora’s team permissions apply across its modules, including School ERP, so owners can control role-based access for staff.',
        ],
      },
      {
        heading: 'Multi-campus support',
        paragraphs: [
          'If you run more than one campus, check specifically whether student records, fees and attendance are separated per campus or shared in one pool — this varies between systems and is worth confirming directly rather than assuming.',
        ],
      },
      {
        heading: 'Mobile access',
        paragraphs: [
          'Nexora is built for web dashboards and mobile-ready access, so records can be checked from a phone or tablet, not only from a front-office desktop.',
        ],
      },
      {
        heading: 'Security and data considerations',
        paragraphs: [
          'Ask how student and financial data is backed up, and who at the school actually has access to it — a system with no role-based access control means every staff account can see everything.',
        ],
      },
      {
        heading: 'Implementation and support',
        paragraphs: [
          'Ask what setup actually involves — is there support for migrating existing student and fee records, and training for office staff, or are you starting from a blank system?',
        ],
      },
      {
        heading: 'Pricing evaluation',
        paragraphs: [
          'Compare pricing against what’s actually included — trial length, data migration, training and support — not just the headline monthly fee.',
        ],
      },
    ],
    relatedLinks: [
      { to: '/school-erp', text: 'School ERP' },
      { to: '/school-erp/admissions-and-students', text: 'Admissions & Students' },
      { to: '/school-erp/attendance', text: 'Attendance' },
      { to: '/school-erp/fee-management', text: 'Fee Management' },
      { to: '/school-erp/payroll', text: 'Staff Payroll' },
    ],
  },

  'crm-vs-spreadsheets': {
    badge: 'Comparison',
    icon: HiOutlineTableCells,
    eyebrow: 'Compare · Sales Operations',
    title: 'CRM Software vs Spreadsheets',
    keyword: 'CRM software vs spreadsheets, why use a CRM, CRM vs Excel',
    seoTitle: 'CRM vs Spreadsheets: What Actually Changes | Nexora CRM',
    seoDescription: 'A practical comparison of CRM software and spreadsheets — lead management, pipeline visibility, follow-ups, invoicing and what changes as a sales team grows.',
    intro: 'A spreadsheet can track a list of leads. What it can’t do on its own is show which stage each one is in, remind someone about a follow-up, or update automatically when a sale happens. Here’s where the two actually differ.',
    sections: [
      {
        heading: 'Lead management',
        paragraphs: [
          'In a spreadsheet, a lead is a row — its source and status are only as accurate as the last person who remembered to update the cell. A CRM tracks each lead’s source and stage directly, and Nexora CRM adds an AI-assisted score and priority to each one, built from real engagement signals rather than a manual guess.',
        ],
        links: [{ to: '/crm/leads-and-pipeline', text: 'See lead & pipeline management' }],
      },
      {
        heading: 'Sales pipeline visibility',
        paragraphs: [
          'A spreadsheet needs someone to build (and maintain) a pivot table or filter to see the pipeline by stage. Nexora CRM shows the same information as a live Kanban board — New Lead through Negotiation — with a stage-by-stage breakdown, no manual filtering required.',
        ],
      },
      {
        heading: 'Customer records',
        paragraphs: [
          'A spreadsheet row for a customer doesn’t know about their invoices or sales activity unless someone links it manually. A CRM customer record connects directly to sales — Nexora CRM updates a customer’s wallet balance automatically as sales are recorded, rather than requiring a manual reconciliation.',
        ],
        links: [{ to: '/crm/customers', text: 'See customer records' }],
      },
      {
        heading: 'Follow-ups and reminders',
        paragraphs: [
          'A spreadsheet can hold a "next follow-up date" column, but nothing happens on that date unless someone checks it. Nexora CRM puts follow-ups on a shared board and sends reminder notifications by email and WhatsApp automatically.',
        ],
        links: [{ to: '/crm/tasks-and-follow-ups', text: 'See tasks & follow-ups' }],
      },
      {
        heading: 'Invoicing',
        paragraphs: [
          'Invoices built in a spreadsheet template don’t track their own status — that’s tracked separately, if at all. Nexora CRM invoices carry a built-in status (Draft, Approved, Overdue or Cancelled), so it’s clear at a glance which invoices still need attention.',
        ],
        links: [{ to: '/crm/invoices', text: 'See CRM invoices' }],
      },
      {
        heading: 'Team workflows',
        paragraphs: [
          'Multiple people editing the same spreadsheet risks version conflicts and overwritten data. A shared CRM pipeline and follow-up board — including an agent workload view — gives a team one live version of the same data instead of competing copies.',
        ],
      },
      {
        heading: 'Reporting and visibility',
        paragraphs: [
          'Pulling a report from a spreadsheet means building it from scratch or maintaining a formula that can break. A CRM’s pipeline breakdown and stage summary are already part of how the data is stored, not a separate reporting step.',
        ],
      },
      {
        heading: 'Scalability and data consistency',
        paragraphs: [
          'A spreadsheet gets harder to maintain as the number of leads and customers grows — more rows, more manual updates, more room for error. A CRM’s structured records, including automatic calculations like wallet balances, stay consistent regardless of how much data is in the system.',
        ],
      },
    ],
    relatedLinks: [
      { to: '/crm', text: 'CRM' },
      { to: '/crm/leads-and-pipeline', text: 'Leads & Pipeline' },
      { to: '/crm/customers', text: 'Customers' },
      { to: '/crm/tasks-and-follow-ups', text: 'Tasks & Follow-Ups' },
      { to: '/crm/invoices', text: 'Invoices' },
    ],
  },
}
