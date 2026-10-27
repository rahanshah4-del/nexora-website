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
    keyword: 'offline POS system, cloud vs offline POS, offline-capable POS, restaurant POS offline mode, POS that works without internet',
    seoTitle: 'Cloud vs Offline POS System: Which Is Right for You? | Nexora',
    seoDescription: 'Cloud POS or offline POS? Compare connectivity, data sync, cost of downtime and multi-branch needs, and see how an offline-capable POS keeps billing during an outage.',
    intro: 'Every POS system leans one of two ways. A cloud POS needs a live internet connection to bill. An offline-capable POS keeps billing at the counter when the connection drops, then syncs once it returns. This guide explains the real difference, shows the trade-offs side by side and gives you a simple way to decide, without pushing you toward either answer.',
    sections: [
      {
        heading: 'The short answer: it depends on your internet and your counter',
        paragraphs: [
          'If your internet is stable and you run several branches that need live numbers, a cloud POS can be enough. If your connection drops now and then and a stopped till costs you real sales, an offline-capable POS is the safer choice. Most businesses fall somewhere between the two, which is why the useful question is not “cloud or offline?” but “what happens at my counter when the internet goes down?”',
          'The rest of this page gives you the facts to answer that for your own shop, restaurant or pharmacy. It stays neutral on purpose, because the right answer is different for a busy restaurant in a market area and for an office-style retail store with fibre internet.',
        ],
      },
      {
        heading: 'What a cloud POS means',
        paragraphs: [
          'A cloud-based POS stores and processes its data on remote servers. The till is only a screen that talks to those servers, so most actions, such as searching an item, saving a bill or opening a report, travel over the internet. When the connection is healthy, every device and every branch sees the same data at the same moment.',
          'That is the main strength of the cloud approach: one shared, always-current picture. It is also the main weakness. If the connection fails, the screen has nothing to talk to. Depending on the product, billing slows down or stops completely until the internet comes back.',
        ],
      },
      {
        heading: 'What an offline POS means',
        paragraphs: [
          'An offline POS, often called offline-capable or offline-first, can keep running the counter without an active internet connection. It keeps the data it needs on the device, so the cashier can still search items, create bills and print receipts. Sales made during the outage are saved locally.',
          'Once the connection returns, the POS sends everything it recorded to the cloud and reconciles it with the rest of the data. The cashier does not have to re-enter anything. Note that “offline POS” does not mean “never online”. A good offline-capable system still lives in the cloud, and offline mode is a safety net for the moments the connection fails.',
        ],
      },
      {
        heading: 'Cloud vs offline POS at a glance',
        paragraphs: [
          'The table below summarises how the two approaches differ in daily use. It describes the general approach, not any single product.',
        ],
        table: {
          headers: ['', 'Cloud-only POS', 'Offline-capable POS'],
          rows: [
            ['Billing during an internet outage', 'May slow down or stop', 'Continues at the counter'],
            ['Data location', 'Remote servers', 'Device first, then cloud'],
            ['Live view across branches', 'Instant while connected', 'Updates after sync'],
            ['After the connection returns', 'Nothing to reconcile', 'Offline sales sync to the cloud'],
            ['Risk to manage', 'Lost sales during downtime', 'Clean sync of offline sales'],
            ['Best fit', 'Stable internet, multi-branch visibility', 'Unreliable internet, busy single counters'],
          ],
        },
      },
      {
        heading: 'The real cost of a stopped till',
        paragraphs: [
          'Downtime is easy to ignore until it happens at the wrong moment. A restaurant that loses its connection during the dinner rush cannot send orders to the kitchen or print bills for waiting tables. A pharmacy cannot bill a customer who needs medicine now. A retail shop watches people leave the queue. Each of these is a lost sale and a worse customer experience.',
          'You can estimate the cost in a minute. Take the sales you make in an average hour at your busiest time, then multiply by the hours per month the internet is down or too slow to use. If that number is small, a cloud POS may serve you well. If it is not small, offline capability is worth far more than a few extra features.',
        ],
      },
      {
        heading: 'How offline billing works in practice',
        paragraphs: [
          'The details matter more than the label. A cashier does not want a technical explanation in the middle of a rush; they want the till to keep working and to know that nothing has been lost. That is why a clear status indicator matters as much as the queue behind it. In an offline-capable POS the flow is usually simple:',
        ],
        bullets: [
          'The connection drops and the POS shows that it is offline, so the cashier knows what state the system is in.',
          'Billing carries on: items are added, bills are created and receipts are printed from the device.',
          'Every order is saved in a queue on the device instead of being lost.',
          'When the connection returns, the queue is sent to the cloud and the status goes back to synced.',
        ],
      },
      {
        heading: 'Data sync: what to check before you trust it',
        paragraphs: [
          'The real test of an offline POS is not whether it works offline. It is what happens when it comes back online. Data recorded offline has to merge cleanly with anything that happened on other devices in the meantime, without duplicating a sale or losing one.',
          'Ask a vendor how a sale made offline is saved, what happens if the same order is sent twice, and what the cashier sees while the queue is waiting to sync. A clear, boring answer is a good sign. A vague answer means you should test it yourself during a free trial by switching off the internet and taking a few sales.',
        ],
      },
      {
        heading: 'When a cloud POS is the better choice',
        paragraphs: [
          'A cloud POS suits businesses with reliable fixed internet and a strong need for live, shared data. Typical examples include a chain of branches where the owner watches sales across every location in real time, or an office-style store with a stable connection and a backup mobile data plan.',
          'It can also be simpler to manage. With the data held centrally, there is less to think about on each device, and fewer questions about what is stored locally.',
        ],
      },
      {
        heading: 'When an offline-capable POS is the better choice',
        paragraphs: [
          'Offline capability matters most where a stopped till costs money and the internet is not fully dependable. That describes many restaurants, busy retail counters and pharmacies in markets, malls and busy streets, where a connection can drop at peak hours or during power cuts.',
          'It is also a sensible choice for single-counter businesses. They have no second location to compare against, so they gain little from instant cross-branch data, but they lose everything if the counter stops. For these shops, billing that never stops is the feature that matters.',
        ],
      },
      {
        heading: 'Nexora is cloud-based with offline billing on the counter',
        paragraphs: [
          'Nexora does not force a choice between the two. It is a cloud platform, so your data is centralised and available from any device. On top of that, Restaurant POS and Retail POS keep taking orders when the internet drops: orders keep saving at the counter and sync to the cloud when the connection returns.',
          'A sync indicator inside the app shows whether you are offline, syncing or fully synced, so the cashier always knows the state. The other Nexora modules, such as School ERP and CRM, are cloud-based and need an internet connection. If you want to see how it behaves on your own network, start the free one-month trial and test it at your own counter.',
        ],
        links: [
          { to: '/restaurant-pos', text: 'Restaurant POS' },
          { to: '/retail-pos', text: 'Retail POS' },
          { to: '/pharmacy-pos', text: 'Pharmacy POS' },
          { to: '/pricing', text: 'Pricing' },
        ],
      },
      {
        heading: 'Common myths about offline POS',
        paragraphs: [
          'A few ideas about offline and cloud systems come up in almost every buying conversation, and most of them are only half true.',
        ],
        bullets: [
          'Myth: “Offline POS means my data is not in the cloud.” Reality: a good offline-capable POS is still a cloud system, and offline mode only covers the time the connection is down.',
          'Myth: “Cloud POS is always more modern.” Reality: both are modern approaches, and the difference is how each one behaves when the connection fails.',
          'Myth: “Offline means I lose live reports.” Reality: reports are as current as the last sync, and they catch up as soon as the connection returns.',
          'Myth: “I only need offline mode if I have no internet.” Reality: slow or unstable internet hurts billing almost as much as no internet.',
        ],
      },
      {
        heading: 'Power cuts, routers and mobile data: plan the whole chain',
        paragraphs: [
          'Offline billing protects you from a lost connection, but the counter still needs power and a working device. Many shops in Pakistan deal with load shedding, router failures and patchy mobile data in the same week. Treat the counter as a chain: power, device, router, internet line, then software.',
          'A small UPS for the till and router, a mobile data hotspot as a backup, and a POS that keeps billing when the internet fails cover most real-world outages between them. No single item solves everything, but together they make a stopped till rare instead of routine.',
        ],
      },
      {
        heading: 'Questions to ask any POS vendor',
        paragraphs: [
          'Whichever approach you lean towards, put the same questions to every vendor, and treat a precise answer as a good sign:',
        ],
        bullets: [
          'Does billing continue if the internet drops in the middle of a sale?',
          'Which parts of the product work offline, and which need a connection?',
          'How is a sale saved while offline, and what stops it from being sent twice?',
          'Can the cashier see the current status: offline, syncing or synced?',
          'Can I test the offline behaviour myself during a free trial?',
        ],
      },
      {
        heading: 'A five-question checklist to decide',
        paragraphs: [
          'Answer these honestly for your busiest counter and the answer usually becomes clear:',
        ],
        bullets: [
          'How often does the internet drop or slow down at the counter, and for how long?',
          'What does one hour of stopped billing cost you at your busiest time?',
          'Do you need live numbers across several branches, or is a sync after a few minutes fine?',
          'Does a power cut or router failure also stop your current system?',
          'Can the software show clearly when it is offline and when it has finished syncing?',
        ],
        links: [{ to: '/compare/pos-software-buying-checklist', text: 'Full POS software buying checklist' }],
      },
    ],
    faqs: [
      ['What is the difference between a cloud POS and an offline POS?', 'A cloud POS depends on a live internet connection to bill. An offline-capable POS keeps taking sales when the connection drops and syncs them to the cloud afterwards.'],
      ['Does an offline POS work with no internet at all?', 'Yes, for billing at the counter. The POS stores sales on the device and sends them to the cloud when the connection returns. Reports and other devices update after that sync.'],
      ['Is an offline POS safe for my sales data?', 'Sales made offline are saved in a queue on the device until they sync. Ask any vendor how duplicates and failed syncs are handled, and test it in a trial before relying on it.'],
      ['Is cloud POS or offline POS better for a restaurant?', 'Restaurants usually gain most from offline capability, because a stopped till during a rush delays orders and bills. A restaurant with fibre internet and a backup connection may still do well with a cloud POS.'],
      ['Does Nexora POS work without internet?', 'Restaurant POS and Retail POS keep taking orders when the internet drops and sync when the connection returns. The other Nexora modules need an internet connection.'],
      ['What happens to offline sales when the internet comes back?', 'They sync to the cloud automatically. The cashier does not need to enter them again, and the app shows when syncing has finished.'],
      ['Can I use an offline POS across several branches?', 'Yes. Each branch can keep billing during an outage, and the data merges in the cloud after syncing. Live cross-branch numbers update when each branch is back online.'],
      ['Does a slow internet connection count as offline?', 'A very slow connection can hurt a cloud POS almost as much as no connection. An offline-capable POS keeps the counter moving while the connection is slow or unavailable and syncs later.'],
      ['Do I still need a UPS or backup power for offline billing?', 'Yes. Offline mode protects you from a lost internet connection, not from a power cut. A small UPS for the till and router is a cheap way to keep the whole chain running.'],
      ['How can I test offline billing before I buy?', 'Start a free trial, then switch off the internet at the counter and take a few test sales. Turn the connection back on and check that every sale appears.'],
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
