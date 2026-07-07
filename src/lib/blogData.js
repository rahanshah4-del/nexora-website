import { absoluteUrl, DEFAULT_LOGO, SITE_NAME, SITE_URL } from './seoStructuredData.js'

export const blogCategories = [
  'Restaurant POS',
  'Retail POS',
  'School ERP',
  'Transport Software',
  'CRM',
  'WhatsApp CRM',
  'Business Tips',
  'AI',
  'Technology',
]

export const blogAuthor = {
  name: 'Nexora Solution Editorial Team',
  url: SITE_URL,
}

const featuredImage = '/nexora-brand-logo.png'

const articleConfigs = [
  {
    slug: 'restaurant-pos-software-pakistan-guide',
    title: 'Restaurant POS Software in Pakistan: Complete Guide for Modern Food Businesses',
    seoTitle: 'Restaurant POS Software in Pakistan | Complete Nexora Guide',
    metaDescription: 'Learn how restaurant POS software helps Pakistani restaurants manage billing, KOT, tables, staff permissions, reporting and daily operations.',
    category: 'Restaurant POS',
    tags: ['restaurant pos', 'kot', 'billing', 'pakistan restaurants'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'restaurant POS software in Pakistan',
    product: 'Nexora Restaurant POS',
    audience: 'restaurant owners, cafe operators and food service managers',
    primaryLink: { label: 'Restaurant POS', to: '/restaurant-pos' },
    secondaryLinks: [
      { label: 'Retail POS', to: '/retail-pos' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    slug: 'restaurant-kot-table-management-best-practices',
    title: 'KOT and Table Management Best Practices for Restaurants',
    seoTitle: 'Restaurant KOT and Table Management Best Practices',
    metaDescription: 'A practical guide to KOT workflows, table status, kitchen coordination and cashier controls for restaurants using modern POS systems.',
    category: 'Restaurant POS',
    tags: ['kot', 'table management', 'restaurant operations', 'cashier'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'KOT and table management',
    product: 'Nexora Restaurant POS',
    audience: 'restaurant managers, cashiers and kitchen teams',
    primaryLink: { label: 'Restaurant POS', to: '/restaurant-pos' },
    secondaryLinks: [
      { label: 'WhatsApp CRM', to: '/whatsapp-crm' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    slug: 'retail-pos-inventory-control-guide',
    title: 'Retail POS and Inventory Control: A Store Owner Guide',
    seoTitle: 'Retail POS Inventory Control Guide | Nexora Solution',
    metaDescription: 'Understand how retail POS software connects sales, products, inventory, receipts, cashier permissions and owner reporting.',
    category: 'Retail POS',
    tags: ['retail pos', 'inventory', 'barcode', 'store management'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'retail POS and inventory control',
    product: 'Nexora Retail POS',
    audience: 'retail store owners, branch managers and cashiers',
    primaryLink: { label: 'Retail POS', to: '/retail-pos' },
    secondaryLinks: [
      { label: 'CRM Software', to: '/solutions/crm' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    slug: 'retail-cashier-permissions-pos-security',
    title: 'Retail Cashier Permissions: How to Keep POS Sales Secure',
    seoTitle: 'Retail Cashier Permissions and POS Security Guide',
    metaDescription: 'Learn how retail businesses can use cashier permissions to protect refunds, reports, inventory, settings and sales data.',
    category: 'Retail POS',
    tags: ['cashier permissions', 'retail security', 'pos orders', 'staff roles'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'retail cashier permissions and POS security',
    product: 'Nexora Retail POS',
    audience: 'owners who manage cashiers, branches and retail counters',
    primaryLink: { label: 'Retail POS', to: '/retail-pos' },
    secondaryLinks: [
      { label: 'Business Services', to: '/services' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    slug: 'school-erp-software-pakistan-guide',
    title: 'School ERP Software in Pakistan: What Schools Should Look For',
    seoTitle: 'School ERP Software Pakistan | Complete Nexora Guide',
    metaDescription: 'Explore school ERP features for admissions, attendance, fees, exams, parent communication and school management in Pakistan.',
    category: 'School ERP',
    tags: ['school erp', 'fees', 'attendance', 'education software'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'school ERP software in Pakistan',
    product: 'Nexora School ERP',
    audience: 'school owners, principals, administrators and finance teams',
    primaryLink: { label: 'School ERP', to: '/school-erp' },
    secondaryLinks: [
      { label: 'CRM Software', to: '/solutions/crm' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    slug: 'school-fee-attendance-management-system',
    title: 'School Fee and Attendance Management: Building a Reliable ERP Workflow',
    seoTitle: 'School Fee and Attendance Management System Guide',
    metaDescription: 'A practical school ERP guide for fee records, attendance tracking, class operations, parent updates and reporting.',
    category: 'School ERP',
    tags: ['fee management', 'attendance', 'school reporting', 'parents'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'school fee and attendance management',
    product: 'Nexora School ERP',
    audience: 'school administrators and academic coordinators',
    primaryLink: { label: 'School ERP', to: '/school-erp' },
    secondaryLinks: [
      { label: 'WhatsApp CRM', to: '/whatsapp-crm' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    slug: 'transport-rental-software-fleet-guide',
    title: 'Transport and Rental Software Guide for Fleet Businesses',
    seoTitle: 'Transport and Rental Software Guide | Nexora Solution',
    metaDescription: 'Learn how transport and rental software manages vehicles, bookings, customers, payments, dues, returns and fleet reports.',
    category: 'Transport Software',
    tags: ['transport software', 'fleet', 'rental', 'bookings'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'transport and rental software',
    product: 'Nexora Transport Software',
    audience: 'fleet owners, rental counters and transport operators',
    primaryLink: { label: 'Transport Software', to: '/transport' },
    secondaryLinks: [
      { label: 'CRM Software', to: '/solutions/crm' },
      { label: 'Business Services', to: '/services' },
    ],
  },
  {
    slug: 'vehicle-rental-booking-payment-workflow',
    title: 'Vehicle Rental Booking and Payment Workflow: A Practical Playbook',
    seoTitle: 'Vehicle Rental Booking and Payment Workflow Guide',
    metaDescription: 'A practical guide for vehicle booking records, payment collection, dues tracking, customer ledgers and rental reporting.',
    category: 'Transport Software',
    tags: ['vehicle rental', 'booking workflow', 'payments', 'customer ledger'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'vehicle rental booking and payment workflows',
    product: 'Nexora Transport Software',
    audience: 'rental business owners and counter teams',
    primaryLink: { label: 'Transport Software', to: '/transport' },
    secondaryLinks: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    slug: 'crm-software-lead-management-guide',
    title: 'CRM Software for Lead Management: From First Contact to Customer',
    seoTitle: 'CRM Software Lead Management Guide | Nexora Solution',
    metaDescription: 'Learn how CRM software helps teams capture leads, assign follow-ups, manage pipelines, convert customers and improve sales visibility.',
    category: 'CRM',
    tags: ['crm software', 'lead management', 'pipeline', 'customers'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'CRM software for lead management',
    product: 'Nexora CRM',
    audience: 'sales teams, service businesses and growth-focused owners',
    primaryLink: { label: 'CRM Software', to: '/solutions/crm' },
    secondaryLinks: [
      { label: 'WhatsApp CRM', to: '/whatsapp-crm' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    slug: 'crm-pipeline-follow-up-system',
    title: 'CRM Pipeline and Follow-Up System: How to Stop Losing Leads',
    seoTitle: 'CRM Pipeline and Follow-Up System Guide',
    metaDescription: 'Build a better CRM follow-up system with lead stages, reminders, customer history, team ownership and management reporting.',
    category: 'CRM',
    tags: ['pipeline', 'follow-ups', 'sales process', 'crm'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'CRM pipeline and follow-up systems',
    product: 'Nexora CRM',
    audience: 'sales managers and customer-facing teams',
    primaryLink: { label: 'CRM Software', to: '/solutions/crm' },
    secondaryLinks: [
      { label: 'Business Services', to: '/services' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    slug: 'whatsapp-crm-for-sales-teams',
    title: 'WhatsApp CRM for Sales Teams: Turn Chats into Revenue',
    seoTitle: 'WhatsApp CRM for Sales Teams | Nexora Guide',
    metaDescription: 'Learn how WhatsApp CRM organizes customer conversations, broadcasts, follow-ups, team assignments and sales activity.',
    category: 'WhatsApp CRM',
    tags: ['whatsapp crm', 'sales teams', 'broadcasts', 'follow-ups'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'WhatsApp CRM for sales teams',
    product: 'Nexora WhatsApp CRM',
    audience: 'sales teams, admission teams and service teams',
    primaryLink: { label: 'WhatsApp CRM', to: '/whatsapp-crm' },
    secondaryLinks: [
      { label: 'CRM Software', to: '/solutions/crm' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    slug: 'whatsapp-broadcast-follow-up-strategy',
    title: 'WhatsApp Broadcast and Follow-Up Strategy for Businesses',
    seoTitle: 'WhatsApp Broadcast and Follow-Up Strategy Guide',
    metaDescription: 'A business guide to WhatsApp broadcasts, customer segmentation, follow-up discipline, response tracking and CRM reporting.',
    category: 'WhatsApp CRM',
    tags: ['whatsapp broadcast', 'customer follow-up', 'campaigns', 'crm'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'WhatsApp broadcast and follow-up strategy',
    product: 'Nexora WhatsApp CRM',
    audience: 'business owners and customer communication teams',
    primaryLink: { label: 'WhatsApp CRM', to: '/whatsapp-crm' },
    secondaryLinks: [
      { label: 'Restaurant POS', to: '/restaurant-pos' },
      { label: 'Retail POS', to: '/retail-pos' },
    ],
  },
  {
    slug: 'small-business-software-stack-pakistan',
    title: 'Small Business Software Stack in Pakistan: What to Use First',
    seoTitle: 'Small Business Software Stack Pakistan | Nexora Guide',
    metaDescription: 'A practical software stack guide for Pakistani small businesses choosing CRM, POS, reporting, WhatsApp workflows and business services.',
    category: 'Business Tips',
    tags: ['small business', 'software stack', 'pakistan', 'operations'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'small business software stack in Pakistan',
    product: 'Nexora Business Suite',
    audience: 'founders, shop owners and service business operators',
    primaryLink: { label: 'Pricing', to: '/pricing' },
    secondaryLinks: [
      { label: 'CRM Software', to: '/solutions/crm' },
      { label: 'Business Services', to: '/services' },
    ],
  },
  {
    slug: 'business-automation-checklist-for-growing-teams',
    title: 'Business Automation Checklist for Growing Teams',
    seoTitle: 'Business Automation Checklist for Growing Teams',
    metaDescription: 'Use this business automation checklist to improve customer follow-ups, billing, POS workflows, reporting, team permissions and daily operations.',
    category: 'Business Tips',
    tags: ['business automation', 'operations', 'team management', 'growth'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'business automation for growing teams',
    product: 'Nexora Business Suite',
    audience: 'growing business teams and operators',
    primaryLink: { label: 'Business Services', to: '/services' },
    secondaryLinks: [
      { label: 'CRM Software', to: '/solutions/crm' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    slug: 'ai-in-business-management-software',
    title: 'AI in Business Management Software: Practical Use Cases',
    seoTitle: 'AI in Business Management Software | Practical Guide',
    metaDescription: 'Explore practical AI use cases in business management software, including lead prioritization, reporting, support, workflows and operations.',
    category: 'AI',
    tags: ['ai', 'business software', 'automation', 'analytics'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'AI in business management software',
    product: 'Nexora Business Suite',
    audience: 'owners, managers and technology decision makers',
    primaryLink: { label: 'CRM Software', to: '/solutions/crm' },
    secondaryLinks: [
      { label: 'Business Services', to: '/services' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    slug: 'ai-crm-lead-scoring-explained',
    title: 'AI CRM Lead Scoring Explained for Sales Teams',
    seoTitle: 'AI CRM Lead Scoring Explained | Nexora Guide',
    metaDescription: 'Understand AI CRM lead scoring, how it helps teams prioritize sales activity, and what data should guide follow-up decisions.',
    category: 'AI',
    tags: ['ai crm', 'lead scoring', 'sales automation', 'pipeline'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'AI CRM lead scoring',
    product: 'Nexora CRM',
    audience: 'sales teams and managers improving lead conversion',
    primaryLink: { label: 'CRM Software', to: '/solutions/crm' },
    secondaryLinks: [
      { label: 'WhatsApp CRM', to: '/whatsapp-crm' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    slug: 'cloud-business-software-security-basics',
    title: 'Cloud Business Software Security Basics for Owners',
    seoTitle: 'Cloud Business Software Security Basics | Nexora',
    metaDescription: 'Learn practical cloud business software security basics: roles, permissions, audit logs, backups, workspace isolation and access control.',
    category: 'Technology',
    tags: ['cloud software', 'security', 'permissions', 'workspace'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'cloud business software security',
    product: 'Nexora Business Suite',
    audience: 'business owners and administrators responsible for data safety',
    primaryLink: { label: 'Pricing', to: '/pricing' },
    secondaryLinks: [
      { label: 'CRM Software', to: '/solutions/crm' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    slug: 'saas-vs-desktop-pos-software',
    title: 'SaaS vs Desktop POS Software: Which Model Fits Your Business?',
    seoTitle: 'SaaS vs Desktop POS Software | Business Guide',
    metaDescription: 'Compare SaaS and desktop POS software for speed, security, updates, reporting, multi-branch access and business continuity.',
    category: 'Technology',
    tags: ['saas pos', 'desktop pos', 'cloud software', 'business technology'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'SaaS versus desktop POS software',
    product: 'Nexora Business Suite',
    audience: 'owners comparing modern software options',
    primaryLink: { label: 'Retail POS', to: '/retail-pos' },
    secondaryLinks: [
      { label: 'Restaurant POS', to: '/restaurant-pos' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    slug: 'pos-reporting-kpis-business-owners',
    title: 'POS Reporting KPIs Every Business Owner Should Track',
    seoTitle: 'POS Reporting KPIs for Business Owners | Nexora',
    metaDescription: 'Track the POS KPIs that matter: daily sales, refunds, cashier activity, inventory movement, stock alerts, margins and repeat customers.',
    category: 'Business Tips',
    tags: ['pos reporting', 'kpis', 'business reports', 'analytics'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'POS reporting KPIs',
    product: 'Nexora Business Suite',
    audience: 'retail and restaurant owners who review daily performance',
    primaryLink: { label: 'Retail POS', to: '/retail-pos' },
    secondaryLinks: [
      { label: 'Restaurant POS', to: '/restaurant-pos' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    slug: 'customer-data-management-for-service-businesses',
    title: 'Customer Data Management for Service Businesses',
    seoTitle: 'Customer Data Management for Service Businesses',
    metaDescription: 'Learn how service businesses can manage customer records, notes, follow-ups, invoices, support requests and team ownership.',
    category: 'CRM',
    tags: ['customer data', 'service business', 'crm', 'support'],
    publishDate: '2026-07-07',
    updatedDate: '2026-07-07',
    topic: 'customer data management for service businesses',
    product: 'Nexora CRM',
    audience: 'service companies, agencies and consultants',
    primaryLink: { label: 'CRM Software', to: '/solutions/crm' },
    secondaryLinks: [
      { label: 'Business Services', to: '/services' },
      { label: 'Contact', to: '/contact' },
    ],
  },
]

function sentenceBlock(config, angle) {
  const { topic, product, audience } = config
  const base = {
    overview: `${topic} matters because daily operations are no longer handled from a single counter, notebook or spreadsheet. ${audience} need a system that keeps records clean, reduces repeated work and gives owners a reliable view of what happened today. ${product} is positioned around that operating reality: one workspace, controlled access and practical workflows that help teams move faster without losing visibility.`,
    problem: `The common problem is not only missing software. It is disconnected software. Sales may happen in one place, customers may be tracked somewhere else, reports may be delayed and staff may know more than the owner can verify. When the process is fragmented, small errors become expensive: missed follow-ups, duplicate entries, unclear balances, wrong stock and weak accountability.`,
    workflow: `A strong workflow starts with the record that matters most. Create the customer, product, booking, student, order or lead once, then let the system carry that context into the next step. This approach keeps teams aligned because everyone is working from the same source of truth. It also makes permissions easier because staff can be given access to the exact areas they need.`,
    permissions: `Permissions are part of operational quality. A cashier may need billing and printing, but not reports or settings. A manager may need review access, but not owner-level controls. A support user may need customer notes, but not financial approvals. When roles are planned before the team grows, the business becomes easier to audit and safer to delegate.`,
    data: `Good data is practical data. Owners should be able to see totals, recent activity, pending work and exceptions without waiting for manual updates. The best systems do not turn every employee into a report writer. They capture normal daily actions and convert them into useful summaries that help the owner decide what to improve next.`,
    implementation: `Implementation should be gradual. Start with the workflow that creates the most daily pressure, train the staff who use it most and confirm that the owner can read the output clearly. After that, expand into automation, reporting, customer communication and advanced controls. This reduces resistance because the team experiences value before the system becomes wide.`,
    mistakes: `The biggest mistake is buying features without defining responsibility. A business should decide who creates records, who approves changes, who can delete information, who can see reports and who handles exceptions. Clear rules turn software from a digital filing cabinet into an operating system for the business.`,
    nexora: `Nexora Solution focuses on connected business software for Pakistan, including POS, CRM, ERP, transport workflows, WhatsApp CRM and business services. The goal is not to add noise to the team. The goal is to give owners a calmer, clearer command center where daily work can be measured, delegated and improved.`,
    action: `The practical next step is to list the top five activities your team repeats every day. For each activity, write down the record created, the person responsible, the approval required and the report the owner expects. That simple exercise will show where ${topic} can create the fastest return for your business.`,
  }
  return base[angle]
}

function supportingParagraph(config, focus) {
  const { topic, product, audience } = config
  const details = {
    overview: `For ${audience}, the value is strongest when ${topic} supports both front-desk speed and back-office clarity. A good setup should help the newest staff member complete daily work correctly while giving the owner enough information to review performance without asking for separate manual summaries.`,
    workflow: `This is why process design matters as much as software selection. Teams should agree on naming rules, required fields, daily closing habits and escalation points before launch. When these basics are written down, ${product} becomes easier to use because the team understands what a complete record looks like.`,
    permissions: `A permission model should also be reviewed after the first few weeks. Owners often discover that one role needs more create access while another role only needs view access. Regular review keeps access practical without opening sensitive areas such as settings, refunds, reports or business approvals to the wrong person.`,
    data: `Reliable reporting depends on consistent entry. If staff skip customer names, product details, payment methods or status updates, the dashboard will feel incomplete. The solution is not more manual reports; it is a workflow where the required data is captured naturally while the work is being done.`,
    implementation: `Training should use real examples from the business instead of generic demo data. A restaurant should test a real table order, a retail store should test a real product sale, a school should test a real fee workflow and a transport company should test a real booking. Familiar examples reduce confusion quickly.`,
    mistakes: `Avoid giving every user owner-level access just to speed up launch. It may feel convenient for one week, but it creates long-term risk. Start with minimum required access, watch where staff get blocked, and then expand permissions only where the business process genuinely requires it.`,
    nexora: `Because Nexora includes multiple public solutions, businesses can start narrow and grow later. A team may begin with ${config.primaryLink.label}, then add CRM, WhatsApp follow-ups, reports or business services when the operating model is ready. This keeps adoption controlled instead of overwhelming the team.`,
    checklist: `Use this checklist as a discussion guide with your team. The strongest answers are specific: name the user, name the action, name the record and name the report. Specific answers make setup faster and reduce the chance that old manual habits return after launch.`,
  }
  return details[focus]
}

function buildSections(config) {
  const { topic, product, primaryLink, secondaryLinks } = config
  return [
    {
      id: 'overview',
      heading: `What ${topic} means for modern businesses`,
      level: 2,
      paragraphs: [sentenceBlock(config, 'overview'), sentenceBlock(config, 'problem'), supportingParagraph(config, 'overview')],
    },
    {
      id: 'core-workflow',
      heading: 'The workflow that should come first',
      level: 2,
      paragraphs: [
        sentenceBlock(config, 'workflow'),
        `Before adding advanced automation, focus on the core journey. In a POS business, that journey may be product selection, billing, receipt printing and order review. In a CRM business, it may be lead capture, assignment, follow-up and conversion. In an ERP business, it may be admission, attendance, fees and reporting. ${product} works best when each step has a clear owner and a clear outcome.`,
        supportingParagraph(config, 'workflow'),
      ],
    },
    {
      id: 'permissions',
      heading: 'Roles, permissions and accountability',
      level: 2,
      paragraphs: [
        sentenceBlock(config, 'permissions'),
        `A professional setup separates view, create, edit, delete, print, refund, reports and settings permissions. That separation helps owners delegate daily work while keeping sensitive controls protected. It also makes training easier because every staff member sees the tools that match their job instead of a crowded menu of unrelated options.`,
        supportingParagraph(config, 'permissions'),
      ],
    },
    {
      id: 'data-reporting',
      heading: 'Data, reports and owner visibility',
      level: 2,
      paragraphs: [
        sentenceBlock(config, 'data'),
        `The owner view should answer direct questions: what happened today, what is pending, who handled it, what changed and where attention is needed. If the data is stored in one workspace, staff and owners can work on the same records while permissions control what each person can do. This is the difference between shared operations and isolated spreadsheets.`,
        supportingParagraph(config, 'data'),
      ],
    },
    {
      id: 'implementation-plan',
      heading: 'Implementation plan for a clean launch',
      level: 2,
      paragraphs: [
        sentenceBlock(config, 'implementation'),
        `A simple launch plan is enough for most businesses: prepare the records, choose the first module, assign owner/admin roles, create staff access, test a real transaction, review the report and then train the remaining users. Keep the first week focused on accuracy and confidence rather than changing every process at once.`,
        supportingParagraph(config, 'implementation'),
      ],
    },
    {
      id: 'mistakes',
      heading: 'Mistakes to avoid',
      level: 2,
      paragraphs: [
        sentenceBlock(config, 'mistakes'),
        `Another mistake is ignoring old habits. If the team still keeps parallel notebooks after the system launches, reports will not be trusted. A better approach is to keep a short transition period, compare results and then make the software the primary record. Owners should review early records daily until the workflow becomes natural.`,
        supportingParagraph(config, 'mistakes'),
      ],
    },
    {
      id: 'internal-links',
      heading: 'Where Nexora fits into the wider business stack',
      level: 2,
      paragraphs: [
        sentenceBlock(config, 'nexora'),
        `If this article matches your current need, explore ${primaryLink.label} or compare related options such as ${secondaryLinks.map((item) => item.label).join(' and ')}. Internal linking is useful for readers because most businesses do not need one isolated page; they need a connected path from problem to solution.`,
        supportingParagraph(config, 'nexora'),
      ],
    },
    {
      id: 'checklist',
      heading: 'Owner checklist before choosing software',
      level: 2,
      paragraphs: [
        `Ask these questions before making a decision: Can the system use one shared workspace? Can staff access be limited by module and action? Can the owner see records created by staff? Can reports show useful daily movement? Can the system grow from one module into a wider operating suite? A yes to these questions usually means the business is choosing software that can support growth.`,
        sentenceBlock(config, 'action'),
        supportingParagraph(config, 'checklist'),
      ],
    },
    {
      id: 'cta',
      heading: `Ready to explore ${product}?`,
      level: 2,
      paragraphs: [
        `Nexora Solution can help you review your current workflow and decide which software module should come first. Start with the public product pages, compare pricing, or contact Nexora for a guided discussion. The best software decision is the one that makes daily work easier, gives owners clearer data and keeps the team accountable.`,
        `For a cleaner start, choose one measurable outcome for the first month: faster billing, fewer missed follow-ups, clearer stock, cleaner fees, better booking control or more reliable reporting. That outcome will help your team judge progress honestly.`,
      ],
    },
  ]
}

function buildFaqs(config) {
  return [
    [`Is ${config.topic} useful for small businesses?`, `Yes. Small teams benefit when records, permissions and reports are handled from one shared workspace instead of scattered files.`],
    [`Can ${config.product} support staff permissions?`, `Yes. The workflow is designed around role-based access so owners can control what staff can view, create, edit, delete, print or report.`],
    ['Does Nexora work for businesses in Pakistan?', 'Yes. Nexora Solution builds software for Pakistani businesses, including POS, CRM, ERP, transport and WhatsApp workflows.'],
    ['What should I do before starting?', 'List your daily operations, staff roles, approval rules and reporting needs. That makes software setup faster and cleaner.'],
  ]
}

function wordCountForSections(sections, faqs) {
  const text = [
    ...sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ...faqs.flatMap(([question, answer]) => [question, answer]),
  ].join(' ')
  return text.split(/\s+/).filter(Boolean).length
}

function estimateReadingTime(wordCount) {
  return Math.max(6, Math.ceil(wordCount / 210))
}

function dateString(value, fallback = new Date().toISOString().slice(0, 10)) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : fallback
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function normalizeSections(value, fallbackTitle = 'Article details') {
  if (Array.isArray(value) && value.length) {
    return value
      .map((section, index) => ({
        id: slugify(section.id || section.heading || `section-${index + 1}`) || `section-${index + 1}`,
        heading: String(section.heading || `Section ${index + 1}`).trim(),
        paragraphs: Array.isArray(section.paragraphs)
          ? section.paragraphs.map((item) => String(item || '').trim()).filter(Boolean)
          : String(section.body || '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
      }))
      .filter((section) => section.heading && section.paragraphs.length)
  }
  const paragraphs = String(value || '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
  return [{
    id: slugify(fallbackTitle) || 'article-details',
    heading: fallbackTitle,
    paragraphs: paragraphs.length ? paragraphs : ['Nexora editorial content will appear here after the article is completed.'],
  }]
}

function normalizeFaqs(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Array.isArray(item) ? item : [item.question, item.answer])
    .filter(([question, answer]) => question && answer)
    .map(([question, answer]) => [String(question).trim(), String(answer).trim()])
}

function articleWordCount(sections, faqs = []) {
  return wordCountForSections(sections, faqs)
}

export const blogArticles = articleConfigs.map((config, index) => {
  const sections = buildSections(config)
  const faqs = buildFaqs(config)
  const wordCount = wordCountForSections(sections, faqs)
  return {
    ...config,
    excerpt: config.metaDescription,
    author: blogAuthor,
    featuredImage,
    featuredImageAlt: `${config.product} guide by ${SITE_NAME}`,
    canonical: absoluteUrl(`/blog/${config.slug}`),
    path: `/blog/${config.slug}`,
    sections,
    faqs,
    wordCount,
    readingTime: `${estimateReadingTime(wordCount)} min read`,
    order: index + 1,
    status: 'published',
    source: 'static',
  }
})

export function normalizeBlogArticleDoc(id, data = {}) {
  const slug = slugify(data.slug || id || data.title)
  const title = String(data.title || 'Untitled Nexora Blog Article').trim()
  const sections = normalizeSections(data.sections || data.content || data.body, data.contentHeading || 'Article guide')
  const faqs = normalizeFaqs(data.faqs)
  const wordCount = Number(data.wordCount || articleWordCount(sections, faqs))
  const publishDate = dateString(data.publishDate || data.publishedAt || data.createdAt)
  const updatedDate = dateString(data.updatedDate || data.updatedAt || data.publishDate || data.createdAt, publishDate)
  const imageUrl = data.featuredImage || data.featuredImageUrl || featuredImage

  return {
    slug,
    title,
    seoTitle: data.seoTitle || `${title} | Nexora Solution Blog`,
    metaDescription: String(data.metaDescription || data.excerpt || '').trim().slice(0, 180) || 'Read a Nexora Solution business software guide for POS, ERP, CRM, AI and operations teams.',
    excerpt: String(data.excerpt || data.metaDescription || '').trim().slice(0, 220) || 'Read a Nexora Solution business software guide for modern operations.',
    category: data.category || 'Business Tips',
    tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    publishDate,
    updatedDate,
    topic: data.topic || title,
    product: data.product || 'Nexora Solution',
    primaryLink: data.primaryLink || { label: 'Nexora Blog', to: '/blog' },
    secondaryLinks: Array.isArray(data.secondaryLinks) ? data.secondaryLinks : [],
    author: data.author || blogAuthor,
    featuredImage: imageUrl,
    featuredImageAlt: data.featuredImageAlt || `${title} featured image`,
    canonical: data.canonical || absoluteUrl(`/blog/${slug}`),
    path: `/blog/${slug}`,
    sections,
    faqs,
    wordCount,
    readingTime: data.readingTime || `${estimateReadingTime(wordCount)} min read`,
    order: Number(data.order || 0),
    status: data.status || 'draft',
    source: 'cms',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function mergeBlogArticles(cmsArticles = []) {
  const bySlug = new Map(blogArticles.map((article) => [article.slug, article]))
  cmsArticles.forEach((article) => {
    if (article?.slug) bySlug.set(article.slug, article)
  })
  return Array.from(bySlug.values()).sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || '')) || Number(a.order || 0) - Number(b.order || 0))
}

export function getBlogArticle(slug) {
  return blogArticles.find((article) => article.slug === slug) || null
}

export function getAdjacentArticles(slug) {
  const index = blogArticles.findIndex((article) => article.slug === slug)
  return {
    previous: index > 0 ? blogArticles[index - 1] : null,
    next: index >= 0 && index < blogArticles.length - 1 ? blogArticles[index + 1] : null,
  }
}

export function getRelatedArticles(article, limit = 3) {
  if (!article) return []
  return blogArticles
    .filter((item) => item.slug !== article.slug)
    .map((item) => {
      const categoryScore = item.category === article.category ? 3 : 0
      const tagScore = item.tags.filter((tag) => article.tags.includes(tag)).length
      return { item, score: categoryScore + tagScore }
    })
    .sort((a, b) => b.score - a.score || a.item.order - b.item.order)
    .slice(0, limit)
    .map(({ item }) => item)
}

export function getBlogCategoriesWithCounts() {
  return blogCategories.map((category) => ({
    category,
    count: blogArticles.filter((article) => article.category === category).length,
  }))
}

export function getBlogTagsWithCounts() {
  const counts = new Map()
  blogArticles.forEach((article) => {
    article.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
  })
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}

export { DEFAULT_LOGO }
