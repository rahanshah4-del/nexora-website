import { useParams } from 'react-router-dom'
import Link from '../../components/AppLink.jsx'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowDownTray,
  HiOutlineArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentList,
  HiOutlineCube,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineCloud,
  HiOutlineDevicePhoneMobile,
  HiOutlineSparkles,
  HiOutlineDocumentChartBar,
  HiOutlineInformationCircle,
  HiOutlineMapPin,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import { GiRoundTable } from 'react-icons/gi'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForSolutionSlug } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import { featurePages, PILLAR_COMPARE_LINKS } from '../../lib/featurePagesData.js'

// Maps a solutionPages key to the pillar key used in FeaturePage.jsx's
// featurePages data, so each pillar page can list links to its own
// supporting feature pages (only the ones that exist so far).
const SOLUTION_SLUG_TO_PILLAR = {
  pos: 'restaurant-pos',
  'retail-pos': 'retail-pos',
  'medical-store-pos': 'pharmacy-pos',
  'school-erp': 'school-erp',
  crm: 'crm',
  'transport-rental': 'transport-fleet',
}

const whatsappLeadLink = `https://wa.me/923194329754?text=${encodeURIComponent(
  'Assalam o Alaikum, I want to book a Nexora product demo.',
)}`

const commonFaqs = [
  ['Can Nexora work on desktop and mobile?', 'Yes. Nexora is built for web dashboards, desktop counters and mobile-ready access with secure cloud sync.'],
  ['Can my team have different permissions?', 'Yes. Owners can control role-based access for managers, sales teams, accountants and operational staff.'],
  ['Do you provide onboarding support?', 'Yes. Nexora offers guided setup, demo sessions and support for moving teams into the right workflow.'],
]

const publicSolutionLinks = [
  { key: 'pos', label: 'Restaurant POS', to: '/restaurant-pos', text: 'Run tables, orders, billing and restaurant workflows from one counter.' },
  { key: 'retail-pos', label: 'Retail POS', to: '/retail-pos', text: 'Manage retail checkout, inventory, receipts and customer sales.' },
  { key: 'school-erp', label: 'School ERP', to: '/school-erp', text: 'Organize students, attendance, fees and school operations.' },
  { key: 'transport-rental', label: 'Fleet Management', to: '/transport-fleet', text: 'Manage fleet bookings, customers, payments and rental records.' },
  { key: 'whatsapp-crm', label: 'WhatsApp CRM', to: '/whatsapp-crm', text: 'Turn conversations into leads, follow-ups and customer activity.' },
  { key: 'crm', label: 'CRM Software', to: '/crm/', text: 'Track leads, customers, invoices, tasks and sales teams.' },
  { key: 'team-permissions', label: 'Team & Permissions', to: '/solutions/team-permissions/', text: 'Control roles, access rights and team member visibility.' },
  { key: 'medical-store-pos', label: 'Pharmacy POS', to: '/pharmacy-pos/', text: 'Handle pharmacy billing, medicine stock and expiry control.' },
  { key: 'property-erp', label: 'Property ERP', to: '/property-erp/', text: 'Manage tenants, rent, leases and maintenance requests.' },
  { key: 'reports', label: 'Business Reports', to: '/solutions/reports/', text: 'Review KPIs, exports and performance insights across modules.' },
  { key: 'email-marketing', label: 'Email Marketing', to: '/solutions/email-marketing/', text: 'Send campaigns, track opens and grow customer engagement.' },
  { key: 'inventory-management', label: 'Inventory Management', to: '/solutions/inventory-management/', text: 'Track stock, purchases, suppliers and warehouse movement.' },
  { key: 'reports-analytics', label: 'Reports & Analytics', to: '/solutions/reports-analytics/', text: 'Dashboards, KPI tracking and business intelligence exports.' },
]

const relatedSolutionKeys = {
  crm: ['whatsapp-crm', 'retail-pos', 'reports'],
  'school-erp': ['crm', 'whatsapp-crm', 'reports'],
  'property-erp': ['crm', 'reports', 'whatsapp-crm'],
  pos: ['retail-pos', 'crm', 'whatsapp-crm'],
  'retail-pos': ['pos', 'crm', 'whatsapp-crm'],
  'whatsapp-crm': ['crm', 'retail-pos', 'pos'],
  'transport-rental': ['crm', 'retail-pos', 'reports'],
  'medical-store-pos': ['retail-pos', 'crm', 'reports'],
  reports: ['crm', 'retail-pos', 'school-erp'],
  'email-marketing': ['crm', 'whatsapp-crm', 'reports'],
  'inventory-management': ['retail-pos', 'medical-store-pos', 'reports'],
  'team-permissions': ['crm', 'school-erp', 'reports'],
  'reports-analytics': ['reports', 'crm', 'retail-pos'],
}

function getRelatedSolutions(solutionSlug) {
  const linkByKey = new Map(publicSolutionLinks.map((item) => [item.key, item]))
  const keys = relatedSolutionKeys[solutionSlug] || publicSolutionLinks.map((item) => item.key)

  return keys
    .filter((key) => key !== solutionSlug)
    .map((key) => linkByKey.get(key))
    .filter(Boolean)
    .slice(0, 3)
}

const solutionPages = {
  'crm': {
    eyebrow: 'CRM Solution',
    productName: 'Nexora CRM',
    headlineBefore: 'A complete CRM for leads, customers, invoices and ',
    headlineHighlight: 'team growth.',
    description: 'Manage your sales pipeline, customer follow-ups, invoices, tasks and team activity from one clean business dashboard.',
    icon: HiOutlineUserGroup,
    previewTitle: 'Revenue Command Center',
    previewLabel: 'Live CRM workspace',
    sidebar: ['Dashboard', 'Leads', 'Customers', 'Pipeline', 'Invoices', 'Tasks'],
    stats: [
      ['Open Leads', '184', '+18%'],
      ['Won Deals', 'PKR 2.4M', '+12%'],
      ['Follow-ups', '47', 'Today'],
    ],
    rows: ['Lead captured', 'Invoice sent', 'Task assigned', 'Deal moved'],
    features: [
      ['Leads', 'Capture, assign and track leads from first contact to closed deal.', HiOutlineUserGroup],
      ['Customers', 'Keep customer profiles, history, notes and activity in one place.', HiOutlineShieldCheck],
      ['Pipeline', 'Visualize sales stages and team movement across every opportunity.', HiOutlineChartBarSquare],
      ['Invoices', 'Create business invoices and keep sales connected to payments.', HiOutlineDocumentChartBar],
      ['Tasks', 'Plan follow-ups, assign work and keep teams accountable.', HiOutlineCheckCircle],
      ['Team Management', 'Control roles, visibility and daily performance across staff.', HiOutlineUserGroup],
    ],
    benefits: ['Improve lead conversion speed', 'Reduce missed follow-ups', 'Connect sales and billing', 'Give managers clear performance visibility'],
    useCases: ['Real estate agencies', 'Service businesses', 'B2B sales teams', 'Consultants and field teams'],
    faqs: [
      ['Can I manage invoices inside CRM?', 'Yes. CRM workflows can include customers, invoices, follow-ups and payment visibility.'],
      ['Can managers see team performance?', 'Yes. Managers can review leads, tasks, pipeline movement and reports from the dashboard.'],
    ],
  },
  'school-erp': {
    eyebrow: 'School ERP Solution',
    productName: 'Nexora School ERP',
    headlineBefore: 'Run admissions, attendance, fees and academics from ',
    headlineHighlight: 'one school system.',
    description: 'A modern ERP for schools to manage students, classes, attendance, fees, exams, parent communication and academic reporting.',
    icon: HiOutlineAcademicCap,
    previewTitle: 'Academic Operations Hub',
    previewLabel: 'School ERP dashboard',
    sidebar: ['Students', 'Attendance', 'Fees', 'Exams', 'Parents', 'Reports'],
    stats: [
      ['Students', '1,284', '+42'],
      ['Fee Collection', 'PKR 3.1M', 'This month'],
      ['Attendance', '94%', 'Today'],
    ],
    rows: ['Student admitted', 'Fee voucher paid', 'Exam schedule updated', 'Parent notified'],
    features: [
      ['Student Management', 'Maintain student records, classes, sections and guardian details.', HiOutlineAcademicCap],
      ['Attendance', 'Track daily attendance with quick class and student-level views.', HiOutlineCheckCircle],
      ['Fee Management', 'Manage fee vouchers, dues, collections and financial summaries.', HiOutlineDocumentChartBar],
      ['Exams', 'Plan exam schedules, marks and result workflows.', HiOutlineChartBarSquare],
      ['Parent Portal', 'Keep parents informed with academic and payment visibility.', HiOutlineChatBubbleLeftRight],
      ['Academic Reports', 'Generate performance, attendance and fee reports for leadership.', HiOutlineDocumentChartBar],
    ],
    benefits: ['Reduce manual admin work', 'Improve fee visibility', 'Keep parents better informed', 'Give principals clean academic reporting'],
    useCases: ['Private schools', 'Academies', 'Colleges', 'Training institutes'],
    faqs: [
      ['Can schools manage fees and exams together?', 'Yes. Nexora School ERP combines fee management, exams, attendance and reports.'],
      ['Can parents receive updates?', 'Yes. Parent-facing workflows can support academic, attendance and fee visibility.'],
    ],
  },
  'property-erp': {
    eyebrow: 'Property ERP Solution',
    productName: 'Nexora Property ERP',
    headlineBefore: 'Manage tenants, rent, leases and maintenance with ',
    headlineHighlight: 'property-grade control.',
    description: 'A property management ERP for owners, agencies and teams handling tenants, rent collection, lease tracking and maintenance requests.',
    icon: HiOutlineBuildingOffice2,
    previewTitle: 'Property Portfolio Desk',
    previewLabel: 'Property ERP workspace',
    sidebar: ['Properties', 'Tenants', 'Rent', 'Leases', 'Maintenance', 'Reports'],
    stats: [
      ['Properties', '86', 'Active'],
      ['Rent Collected', 'PKR 5.8M', '+9%'],
      ['Open Requests', '12', 'Pending'],
    ],
    rows: ['Rent payment recorded', 'Lease renewed', 'Maintenance assigned', 'Owner report ready'],
    features: [
      ['Tenant Management', 'Organize tenant profiles, contacts, dues and activity history.', HiOutlineUserGroup],
      ['Rent Collection', 'Track rent payments, balances and collection performance.', HiOutlineDocumentChartBar],
      ['Lease Tracking', 'Monitor lease dates, renewals and agreement status.', HiOutlineCheckCircle],
      ['Maintenance Requests', 'Assign maintenance work and keep requests visible.', HiOutlineBuildingOffice2],
      ['Financial Reports', 'View owner, rent and portfolio level financial summaries.', HiOutlineChartBarSquare],
      ['Cloud Access', 'Keep property teams connected from office and field.', HiOutlineCloud],
    ],
    benefits: ['Improve rent collection visibility', 'Reduce tenant follow-up gaps', 'Keep leases organized', 'Make owner reporting faster'],
    useCases: ['Property dealers', 'Building managers', 'Rental portfolios', 'Commercial property teams', 'Real estate agencies', 'Housing society offices'],
    faqs: [
      ['Can I track rent balances?', 'Yes. Property ERP workflows include rent collection, balances and reporting.'],
      ['Can maintenance teams use it?', 'Yes. Maintenance requests can be tracked and assigned from the same workspace.'],
      ['Does it work for rentals and property sales?', 'Yes. When you set up the workspace you choose Rentals, Sales or Both, and Nexora shapes the dashboard around that portfolio.'],
      ['Can I keep tenant and owner records together?', 'Yes. Tenants and owners live in one directory with contact details, dues and history, linked to the properties and contracts they belong to.'],
      ['Can I record expenses and see the accounts?', 'Yes. Expenses, payments and accounts are part of the workspace, so rent income and property costs show up in the same reports.'],
      ['Can I control what my staff can do?', 'Yes. Team roles and approvals let you decide who can record payments, edit contracts or view financial reports.'],
    ],
  },
  'pos': {
    eyebrow: 'Restaurant POS Solution',
    productName: 'Nexora Restaurant POS',
    headlineBefore: 'Cloud restaurant POS software for restaurants, cafes and ',
    headlineHighlight: 'cloud kitchens.',
    description: 'Nexora Restaurant POS is a restaurant management system that runs billing, KOT and kitchen display, tables, menu, food stock and daily reports from one counter — and keeps billing when the internet drops.',
    featuresIntro: 'Everything a restaurant POS system handles in a shift: dine-in, takeaway and delivery bills, kitchen tickets, table status, stock and the end-of-day report.',
    icon: HiOutlineShoppingCart,
    previewTitle: 'Restaurant Operations Hub',
    previewLabel: 'Nexora Restaurant POS',
    sidebar: ['Billing', 'Tables', 'Orders / KOT', 'Kitchen', 'Inventory', 'Reports'],
    stats: [
      ['Today Sales', '$4.8K', '+22%'],
      ['Open Tables', '16', 'Live'],
      ['Kitchen Orders', '28', 'In progress'],
    ],
    rows: ['Dine-in order billed', 'KOT sent to kitchen', 'Table status updated', 'Stock synced'],
    features: [
      ['Dine-In, Takeaway & Delivery Billing', 'Bill every order type from one screen with discounts, an optional service charge and your tax line printed on the receipt.', HiOutlineBuildingOffice2],
      ['KOT & Kitchen Display', 'Send kitchen order tickets from the counter and follow each order from pending to preparing, ready and served.', HiOutlineClipboardDocumentList],
      ['Table Management', 'See which tables are free, occupied or waiting for the bill, and open an order straight from the table.', GiRoundTable],
      ['AI Menu Import', 'Upload a photo of your existing menu and Nexora reads the items, prices and categories, so you do not type the menu by hand.', HiOutlineSparkles],
      ['Food Stock & Recipe Cost', 'Link menu items to recipes, track ingredient stock and see the food cost of each dish.', HiOutlineCube],
      ['Staff Roles & Permissions', 'Give owners, managers, cashiers and kitchen staff only the screens they need.', HiOutlineUserGroup],
      ['Daily Sales & Cashier Reports', 'Close the day with sales by order type, payments and cashier activity in one report.', HiOutlineChartBarSquare],
      ['Offline Billing & Cloud Sync', 'Orders keep saving when the internet drops and sync to the cloud when the connection returns.', HiOutlineCloud],
      ['Windows Desktop App', 'Run the counter on a Windows PC or laptop with the free Nexora installer, or use any browser.', HiOutlineArrowDownTray],
    ],
    benefitsHeading: 'What changes at your counter',
    benefitsIntro: 'The problems restaurant owners bring to us most, and how Nexora handles each one.',
    benefits: [
      'Handwritten KOTs get lost — printed or on-screen KOTs reach the kitchen',
      'Rush-hour billing is slow — one screen for dine-in, takeaway and delivery',
      'Stock runs out without warning — ingredients tied to every dish sold',
      'The day’s cash never matches — cashier-wise end-of-day report',
    ],
    useCaseHeading: 'Which restaurants use it',
    useCaseIntro: 'The same POS, set up around how your restaurant actually serves food.',
    useCaseDetails: [
      ['Full-service restaurants', 'Table view, a KOT for every table order and service charge on the bill.'],
      ['Cafes & coffee shops', 'Quick counter billing, add-on items and a menu you can update in minutes.'],
      ['Fast food & takeaway', 'Takeaway orders billed fast, with kitchen tickets that keep up with the queue.'],
      ['Cloud kitchens & delivery', 'Delivery orders with the customer’s address, without a dining floor to manage.'],
    ],
    detailSections: [
      {
        heading: 'Keeps billing when the internet drops',
        body: 'If the internet goes down, the counter keeps taking orders. Nexora queues each order on the device and syncs it to the cloud as soon as the connection comes back, so the owner dashboard and reports stay complete.',
      },
      {
        heading: 'Your currency, your tax line',
        body: 'Set your workspace currency when you create your account. On the bill, add one tax rate under your own label — VAT, GST, Sales Tax or whatever your country uses — plus an optional service charge. Add your tax registration and food licence numbers in settings and they print on every receipt.',
      },
      {
        heading: 'Hardware you can use',
        body: 'Run Nexora on a Windows PC or laptop with the desktop app, or in any modern browser. Bills and kitchen copies print on 58mm thermal receipt printers.',
        links: [
          { to: '/download/restaurant-pos', label: 'Download the Windows app' },
          { to: '/tools/thermal-receipt-generator', label: 'Try the free thermal receipt generator' },
        ],
      },
      {
        heading: 'Get started in one day',
        steps: [
          'Create your free Nexora account and choose Restaurant POS.',
          'Import your menu from a photo with AI, or add items by hand.',
          'Add your tables, staff and their roles.',
          'Enter your tax details and print a test bill and KOT.',
          'Start taking orders — your data syncs to the cloud automatically.',
        ],
      },
      {
        heading: 'How to choose a restaurant POS',
        steps: [
          'Does it keep billing when the internet goes down?',
          'Can servers send orders to the kitchen without paper?',
          'Does the receipt show your own tax rate and label correctly?',
          'Can you see food cost per dish, not just stock counts?',
          'Is the monthly price clear before you sign up?',
        ],
        links: [
          { to: '/compare/pos-software-buying-checklist', label: 'Read the full POS buying checklist' },
          { to: '/compare/cloud-vs-offline-pos', label: 'Compare cloud and offline POS' },
        ],
      },
      {
        heading: 'Nexora Restaurant POS by country',
        body: 'Nexora is built for restaurants in many markets. See how it fits where you operate.',
        links: [
          { to: '/usa/', label: 'Restaurant POS in the USA' },
          { to: '/uae/', label: 'Restaurant POS in the UAE' },
          { to: '/pakistan/', label: 'Restaurant POS in Pakistan' },
        ],
      },
    ],
    ownFaqsOnly: true,
    faqs: [
      ['How much does restaurant POS software cost?', 'Nexora starts with a 1-month free trial, so you can set up your menu, tables and staff and try it on real orders before choosing a plan. The plans and their prices are listed on the pricing page.'],
      ['Is Nexora a restaurant POS system or restaurant management software?', 'Both. The POS side handles the counter — billing, KOT and tables. The management side covers food stock, recipe cost, staff roles and daily reports, so you do not need a separate restaurant management system.'],
      ['Does Nexora Restaurant POS work without internet?', 'Yes. Orders keep saving on the counter during an internet outage and sync to the cloud automatically when the connection returns.'],
      ['Does it have a kitchen display system?', 'Yes. Orders create a KOT that prints as a kitchen copy or shows on the kitchen display, where staff move it from pending to preparing, ready and served.'],
      ['Can I upload my existing menu instead of typing it?', 'Yes. Upload a photo of your menu and Nexora’s AI extracts the items, prices and categories. You review them and import in one step.'],
      ['Can I print my own tax rate and registration number on receipts?', 'Yes. Set one tax rate with your own label, such as VAT, GST or Sales Tax, add an optional service charge, and enter your tax registration and food licence numbers so they print on every bill.'],
      ['Can I use Nexora in my own currency?', 'Yes. You choose your workspace currency when you set up, and bills, reports and receipts use it.'],
      ['Does it work for cafes and cloud kitchens?', 'Yes. Cafes use quick counter billing, and cloud kitchens use delivery orders with customer details — table management is optional.'],
      ['Which printers does it support?', 'Bills and kitchen copies are formatted for 58mm thermal receipt printers.'],
      ['Can I run it on a Windows PC?', 'Yes. Download the free Windows installer, or use Nexora in any modern browser. You need a Nexora business account to log in.'],
      ['Do you help with setup?', 'Yes. Book a demo on WhatsApp and our team will help you set up your menu, tables and staff.'],
    ],
  },
  'retail-pos': {
    eyebrow: 'Retail POS Solution',
    productName: 'Nexora Retail POS',
    headlineBefore: 'Retail POS software for stores, counters and ',
    headlineHighlight: 'fast, accurate sales.',
    description: 'Nexora Retail POS is retail POS software built for stores and shops — handling barcode billing, inventory control, customer records and store reporting from one counter.',
    icon: HiOutlineShoppingCart,
    previewTitle: 'Retail Checkout Workspace',
    previewLabel: 'Retail POS dashboard',
    sidebar: ['Counter', 'Products', 'Inventory', 'Receipts', 'Reports', 'Customers'],
    stats: [
      ['Today Sales', 'PKR 198K', '+16%'],
      ['Stock Alerts', '14', 'Low stock'],
      ['Receipts', '412', 'Printed'],
    ],
    rows: ['Retail sale billed', 'Stock synced', 'Customer saved', 'Receipt emailed'],
    features: [
      ['Retail Billing', 'Process barcode sales, returns, discounts and quick receipts.', HiOutlineShoppingCart],
      ['Inventory Control', 'Track stock levels, pricing and reorder alerts.', HiOutlineChartBarSquare],
      ['Customer Records', 'Keep buyer profiles, loyalty details and purchase history.', HiOutlineUserGroup],
      ['Receipt Printing', 'Print, email and save receipts instantly.', HiOutlineDocumentChartBar],
      ['Store Reports', 'View product, sales and cashier performance summaries.', HiOutlineChartBarSquare],
      ['Multi-user Access', 'Give store owners, managers and cashiers the right permissions.', HiOutlineUserGroup],
      ['Cloud Sync', 'Keep the counter, back office and mobile access aligned with secure cloud sync.', HiOutlineCloud],
    ],
    benefits: ['Speed up store checkout', 'Keep retail stock accurate', 'Track customer purchase history', 'Make store reporting simple'],
    useCases: ['Retail stores', 'Clothing shops', 'Grocery stores', 'Boutiques'],
    faqs: [
      ['Can Nexora handle returns and refunds?', 'Yes. Retail POS supports returns, refunds and sales adjustments with inventory sync.'],
      ['Can I manage customer records?', 'Yes. Customer profiles and loyalty details are part of retail workflows.'],
      ['Is Nexora Retail POS a cloud-based (SaaS) POS system?', 'Yes. Nexora Retail POS runs as a cloud-connected SaaS platform with offline billing support, so your store counter keeps working without internet and syncs automatically once you’re back online.'],
    ],
  },
  'whatsapp-crm': {
    eyebrow: 'WhatsApp CRM Solution',
    productName: 'Nexora WhatsApp CRM',
    headlineBefore: 'Turn WhatsApp conversations into follow-ups, automation and ',
    headlineHighlight: 'customer wins.',
    description: 'Manage broadcasts, follow-ups, automation and customer tracking so every conversation becomes a measurable business workflow.',
    icon: HiOutlineChatBubbleLeftRight,
    previewTitle: 'Conversation Growth Desk',
    previewLabel: 'WhatsApp CRM workflow',
    sidebar: ['Inbox', 'Broadcasts', 'Automation', 'Follow-ups', 'Customers', 'Reports'],
    stats: [
      ['Broadcasts', '24K', 'Sent'],
      ['Follow-ups', '312', 'Queued'],
      ['Replies', '38%', '+11%'],
    ],
    rows: ['Broadcast delivered', 'Follow-up scheduled', 'Customer tagged', 'Automation triggered'],
    features: [
      ['Broadcast Messaging', 'Send targeted updates to customers and prospects.', HiOutlineChatBubbleLeftRight],
      ['Follow-ups', 'Schedule team follow-ups and reduce missed conversations.', HiOutlineCheckCircle],
      ['Automation', 'Trigger consistent responses and repeatable outreach flows.', HiOutlineCloud],
      ['Customer Tracking', 'Link conversations with customer records and activity.', HiOutlineUserGroup],
      ['Reports', 'Measure outreach, response rates and team performance.', HiOutlineChartBarSquare],
      ['Mobile Ready', 'Support fast customer handling across devices.', HiOutlineDevicePhoneMobile],
    ],
    benefits: ['Improve response discipline', 'Make campaigns measurable', 'Keep customer context organized', 'Support sales and service teams'],
    useCases: ['Sales teams', 'Service teams', 'Retail campaigns', 'Education and admissions teams'],
    faqs: [
      ['Can broadcasts be tracked?', 'Yes. Campaign activity can be connected with customer follow-up and reporting.'],
      ['Can teams assign follow-ups?', 'Yes. WhatsApp CRM workflows support team follow-ups and customer tracking.'],
    ],
  },
  'transport-rental': {
    eyebrow: 'Fleet & Rental Solution',
    productName: 'Nexora Fleet & Rental',
    headlineBefore: 'Manage fleet, rentals, bookings and payments from ',
    headlineHighlight: 'one fleet desk.',
    description: 'A transport and rental workspace for vehicles, customers, bookings, dues, refunds, rental ledgers and payment tracking.',
    icon: HiOutlineTruck,
    previewTitle: 'Fleet Rental Control',
    previewLabel: 'Fleet workspace',
    sidebar: ['Dashboard', 'Vehicles', 'Bookings', 'Customers', 'Payments', 'Reports'],
    stats: [
      ['Fleet Units', '42', 'Available'],
      ['Active Rentals', '18', 'Live'],
      ['Dues', 'PKR 312K', 'Follow-up'],
    ],
    rows: ['Vehicle booked', 'Payment collected', 'Rental returned', 'Fleet report ready'],
    features: [
      ['Fleet Management', 'Track vehicles, status, availability and rental performance.', HiOutlineTruck],
      ['Rental Bookings', 'Create booking records with customer, duration, rate and due tracking.', HiOutlineCheckCircle],
      ['Customer Ledger', 'Keep customer rental history, balances and contact details organized.', HiOutlineUserGroup],
      ['Payments & Dues', 'Record collections, refunds, pending dues and payment methods.', HiOutlineDocumentChartBar],
      ['Rental Reports', 'View bookings, revenue, dues, utilization and customer summaries.', HiOutlineChartBarSquare],
      ['Cloud Sync', 'Keep counter, office and mobile access aligned for daily operations.', HiOutlineCloud],
    ],
    benefits: ['Control fleet availability', 'Reduce missed rental dues', 'Keep customer ledgers clean', 'Review revenue and active rentals faster'],
    useCases: ['Car rental companies', 'Bike rentals', 'Fleet operators', 'Transport counters'],
    faqs: [
      ['Can I track active rentals and dues?', 'Yes. Transport / Rental workflows include active bookings, dues, payments and return status.'],
      ['Can I manage vehicles and customers together?', 'Yes. Vehicle records, customer ledgers and rental payments stay connected in one workspace.'],
    ],
  },
  'medical-store-pos': {
    eyebrow: 'Pharmacy POS Solution',
    productName: 'Nexora Pharmacy POS',
    headlineBefore: 'Run pharmacy billing, medicine stock and expiry control from ',
    headlineHighlight: 'one pharmacy counter.',
    description: 'A pharmacy-focused POS for medicine sales, fast item search, batches, expiry alerts, inventory, receipts, supplier purchases and daily reports.',
    icon: HiOutlineShieldCheck,
    previewTitle: 'Pharmacy Counter Desk',
    previewLabel: 'Pharmacy POS workspace',
    sidebar: ['Counter', 'Medicines', 'Batches', 'Expiry', 'Purchases', 'Reports'],
    stats: [
      ['Today Sales', 'PKR 126K', '+14%'],
      ['Expiry Alerts', '23', 'Review'],
      ['Low Stock', '18', 'Reorder'],
    ],
    rows: ['Medicine billed', 'Batch stock updated', 'Expiry alert reviewed', 'Daily report closed'],
    features: [
      ['Fast Pharmacy Billing', 'Search medicines quickly, create receipts and keep the counter moving.', HiOutlineShoppingCart],
      ['Medicine Inventory', 'Track medicine names, categories, prices, stock levels and reorder needs.', HiOutlineChartBarSquare],
      ['Batch & Expiry Control', 'Monitor batches, expiry dates and near-expiry medicines before they become a loss.', HiOutlineShieldCheck],
      ['Supplier Purchases', 'Record purchases, supplier details, costs and inventory updates.', HiOutlineDocumentChartBar],
      ['Daily Sales Reports', 'Review sales, cash, profit, low stock and expiry summaries in one place.', HiOutlineChartBarSquare],
      ['Cloud Sync', 'Keep counter, owner dashboard and reports aligned with secure cloud access.', HiOutlineCloud],
    ],
    benefits: ['Speed up pharmacy billing', 'Reduce expired stock loss', 'Keep medicine inventory accurate', 'Review sales and purchases faster'],
    useCases: ['Medical stores', 'Pharmacies', 'Clinic dispensaries', 'Wholesale medicine counters'],
    faqs: [
      ['Can I track medicine expiry?', 'Yes. PharmaFlow workflows include batch and expiry visibility for pharmacy inventory.'],
      ['Can I manage purchases and stock together?', 'Yes. Purchases, suppliers, medicine stock and counter sales stay connected in one workspace.'],
    ],
  },
  'reports': {
    eyebrow: 'Reports Solution',
    productName: 'Nexora Reports',
    headlineBefore: 'Business intelligence, KPI dashboards and exports for ',
    headlineHighlight: 'smarter decisions.',
    description: 'Turn CRM, POS, school, property and finance activity into clear dashboards, PDF reports, Excel exports and leadership-ready insights.',
    icon: HiOutlineDocumentChartBar,
    previewTitle: 'Executive Reporting Suite',
    previewLabel: 'Analytics dashboard',
    sidebar: ['Analytics', 'KPI', 'PDF Reports', 'Excel Export', 'BI', 'Trends'],
    stats: [
      ['Revenue', 'PKR 8.6M', '+17%'],
      ['KPI Score', '92%', 'Healthy'],
      ['Reports', '48', 'Generated'],
    ],
    rows: ['PDF report exported', 'KPI dashboard opened', 'Excel sheet prepared', 'Trend report shared'],
    features: [
      ['Analytics', 'Review operational, sales and financial performance in one place.', HiOutlineChartBarSquare],
      ['KPI Dashboards', 'Track key indicators for leadership and managers.', HiOutlineDocumentChartBar],
      ['PDF Reports', 'Create polished PDF reports for clients and teams.', HiOutlineDocumentChartBar],
      ['Excel Export', 'Export business data for finance and advanced analysis.', HiOutlineCheckCircle],
      ['Business Intelligence', 'Compare performance trends across departments and modules.', HiOutlineCloud],
      ['Secure Visibility', 'Keep reporting access controlled by role and workspace.', HiOutlineShieldCheck],
    ],
    benefits: ['Make decisions with clean data', 'Reduce manual report preparation', 'Give leadership faster visibility', 'Connect multiple business modules'],
    useCases: ['Owners and directors', 'Finance teams', 'Sales managers', 'Operations leaders'],
    faqs: [
      ['Can reports export to PDF and Excel?', 'Yes. Reports workflows include PDF reporting and Excel export capability.'],
      ['Can reports combine business areas?', 'Yes. Nexora Reports is designed to connect activity across modules where access is enabled.'],
    ],
  },
  'email-marketing': {
    eyebrow: 'Email Marketing Solution',
    productName: 'Nexora Email Marketing',
    headlineBefore: 'Send campaigns, track opens and grow customer ',
    headlineHighlight: 'engagement.',
    description: 'Manage email campaigns, subscriber lists, templates, open tracking and performance analytics from one marketing workspace.',
    icon: HiOutlineDevicePhoneMobile,
    previewTitle: 'Campaign Control Desk',
    previewLabel: 'Email Marketing workspace',
    sidebar: ['Campaigns', 'Subscribers', 'Templates', 'Analytics', 'Reports', 'Settings'],
    stats: [
      ['Campaigns', '24', 'Sent'],
      ['Subscribers', '8.2K', '+12%'],
      ['Open Rate', '34%', '+5%'],
    ],
    rows: ['Campaign sent to subscribers', 'Open rate updated', 'Template created', 'Subscriber list imported'],
    features: [
      ['Campaign Management', 'Create, schedule and send email campaigns to your audience.', HiOutlineChatBubbleLeftRight],
      ['Subscriber Lists', 'Manage subscriber groups, imports and preferences.', HiOutlineUserGroup],
      ['Templates', 'Design email templates that match your brand.', HiOutlineDocumentChartBar],
      ['Open & Click Tracking', 'Monitor campaign performance with open and click metrics.', HiOutlineChartBarSquare],
      ['Reports', 'Review engagement, growth and campaign analytics.', HiOutlineChartBarSquare],
      ['Cloud Sync', 'Keep campaign data consistent across devices.', HiOutlineCloud],
    ],
    benefits: ['Improve campaign open rates', 'Track subscriber growth', 'Reduce manual email effort', 'Keep marketing measurable'],
    useCases: ['Small business marketing', 'Retail promotions', 'School communications', 'Real estate campaigns'],
    faqs: [
      ['Can I track who opened my emails?', 'Yes. Email Marketing includes open and click tracking for campaign analytics.'],
      ['Can I manage subscriber lists?', 'Yes. Subscribers, imports and list segmentation are part of the workspace.'],
    ],
  },
  'inventory-management': {
    eyebrow: 'Inventory Management Solution',
    productName: 'Nexora Inventory Management',
    headlineBefore: 'Track stock, purchases, suppliers and warehouse ',
    headlineHighlight: 'movement.',
    description: 'A complete inventory workspace for product stock, purchase orders, supplier records, stock alerts and warehouse tracking.',
    icon: HiOutlineDocumentChartBar,
    previewTitle: 'Stock Control Desk',
    previewLabel: 'Inventory workspace',
    sidebar: ['Dashboard', 'Products', 'Stock', 'Purchases', 'Suppliers', 'Reports'],
    stats: [
      ['Products', '1,842', '+8%'],
      ['Low Stock', '34', 'Reorder'],
      ['Purchases', '126', 'This month'],
    ],
    rows: ['Stock level updated', 'Purchase order created', 'Supplier record saved', 'Low stock alert triggered'],
    features: [
      ['Product Management', 'Maintain product catalog with categories, pricing and SKUs.', HiOutlineShoppingCart],
      ['Stock Control', 'Track stock levels, movement and reorder alerts.', HiOutlineChartBarSquare],
      ['Purchase Orders', 'Create and manage purchase orders with supplier details.', HiOutlineDocumentChartBar],
      ['Supplier Records', 'Store supplier contacts, pricing and order history.', HiOutlineUserGroup],
      ['Stock Reports', 'Review stock levels, valuation and movement summaries.', HiOutlineChartBarSquare],
      ['Cloud Sync', 'Keep inventory data aligned across counters and warehouse.', HiOutlineCloud],
    ],
    benefits: ['Reduce stock-outs', 'Improve purchase accuracy', 'Keep supplier data organized', 'Make inventory reporting simple'],
    useCases: ['Retail stores', 'Wholesale businesses', 'Medical stores', 'Warehouse operations'],
    faqs: [
      ['Can I track purchase orders?', 'Yes. Inventory Management includes purchase orders, supplier records and stock updates.'],
      ['Can I set low stock alerts?', 'Yes. Stock level alerts help you reorder before products run out.'],
    ],
  },
  'team-permissions': {
    eyebrow: 'Team & Permissions Solution',
    productName: 'Nexora Team & Permissions',
    headlineBefore: 'Control roles, access rights and team visibility across ',
    headlineHighlight: 'every module.',
    description: 'Manage team members, roles, permissions and access control so each person sees only what they need.',
    icon: HiOutlineUserGroup,
    previewTitle: 'Access Control Desk',
    previewLabel: 'Team workspace',
    sidebar: ['Team', 'Roles', 'Permissions', 'Activity', 'Audit', 'Settings'],
    stats: [
      ['Team Members', '24', 'Active'],
      ['Roles', '6', 'Configured'],
      ['Access Logs', '1.2K', 'This month'],
    ],
    rows: ['Team member added', 'Role permission updated', 'Access log reviewed', 'Audit trail exported'],
    features: [
      ['Team Management', 'Add, manage and organize team members across workspaces.', HiOutlineUserGroup],
      ['Role Configuration', 'Define roles with specific permissions and access levels.', HiOutlineShieldCheck],
      ['Permission Control', 'Set module-level and action-level access for each role.', HiOutlineCheckCircle],
      ['Activity Tracking', 'Monitor team activity and changes across modules.', HiOutlineChartBarSquare],
      ['Audit Logs', 'Review access history and permission changes.', HiOutlineDocumentChartBar],
      ['Cloud Sync', 'Keep role and permission settings consistent.', HiOutlineCloud],
    ],
    benefits: ['Improve data security', 'Reduce accidental changes', 'Give managers controlled visibility', 'Keep audit trails organized'],
    useCases: ['Growing teams', 'Multi-role businesses', 'Managers', 'Business owners'],
    faqs: [
      ['Can I control what each team member sees?', 'Yes. Role-based permissions let you set module-level and action-level access for each person.'],
      ['Can I review who changed what?', 'Yes. Activity tracking and audit logs help you review team actions.'],
    ],
  },
  'reports-analytics': {
    eyebrow: 'Reports & Analytics Solution',
    productName: 'Nexora Reports & Analytics',
    headlineBefore: 'Dashboards, KPI tracking and business intelligence ',
    headlineHighlight: 'for every team.',
    description: 'A reporting and analytics workspace for KPI dashboards, business intelligence, data exports and performance insights.',
    icon: HiOutlineChartBarSquare,
    previewTitle: 'Analytics Command Center',
    previewLabel: 'Reports workspace',
    sidebar: ['Dashboard', 'KPI', 'Analytics', 'Exports', 'BI', 'Trends'],
    stats: [
      ['Reports', '64', 'Generated'],
      ['KPI Score', '89%', 'Tracked'],
      ['Data Points', '24K', 'Synced'],
    ],
    rows: ['KPI dashboard updated', 'Report exported to PDF', 'Trend analysis run', 'Data export completed'],
    features: [
      ['KPI Dashboards', 'Track key metrics and performance indicators at a glance.', HiOutlineChartBarSquare],
      ['Business Intelligence', 'Analyze trends and compare performance across modules.', HiOutlineCloud],
      ['Analytics', 'Review operational data with clear visual summaries.', HiOutlineDocumentChartBar],
      ['PDF Reports', 'Generate polished PDF reports for leadership and clients.', HiOutlineDocumentChartBar],
      ['Data Exports', 'Export data for external analysis and record keeping.', HiOutlineCheckCircle],
      ['Secure Access', 'Keep report access controlled by user role.', HiOutlineShieldCheck],
    ],
    benefits: ['Make faster decisions', 'Reduce manual reporting effort', 'Give leadership clearer visibility', 'Connect data across business areas'],
    useCases: ['Business owners', 'Finance teams', 'Operations managers', 'Department leads'],
    faqs: [
      ['Can I export reports to PDF?', 'Yes. Reports & Analytics includes PDF and data export capabilities.'],
      ['Can I track KPIs over time?', 'Yes. KPI dashboards help you track trends and performance across periods.'],
    ],
  },
}

const solutionPreviewRows = {
  crm: [
    ['Leads', '184', '+18%', HiOutlineUserGroup],
    ['Pipeline', 'PKR 2.4M', '12 deals', HiOutlineChartBarSquare],
    ['Invoices', '48', 'This month', HiOutlineDocumentChartBar],
    ['Tasks', '23', 'Pending', HiOutlineCheckCircle],
    ['Revenue', 'PKR 8.6M', '+22%', HiOutlineArrowRight],
    ['Follow-ups', '47', 'Today', HiOutlineChatBubbleLeftRight],
  ],
  'school-erp': [
    ['Students', '1,284', '+42', HiOutlineAcademicCap],
    ['Attendance', '94%', 'Today', HiOutlineCheckCircle],
    ['Fees', 'PKR 3.1M', 'Collected', HiOutlineDocumentChartBar],
    ['Exams', '6', 'Scheduled', HiOutlineChartBarSquare],
    ['Results', '88%', 'Pass rate', HiOutlineAcademicCap],
    ['Transport', '18', 'Routes', HiOutlineTruck],
  ],
  'property-erp': [
    ['Tenants', '86', 'Active', HiOutlineUserGroup],
    ['Units', '124', 'Total', HiOutlineBuildingOffice2],
    ['Rent', 'PKR 5.8M', '+9%', HiOutlineDocumentChartBar],
    ['Maintenance', '12', 'Open', HiOutlineShieldCheck],
    ['Occupancy', '72%', '+5%', HiOutlineChartBarSquare],
    ['Payments', 'PKR 2.1M', 'Pending', HiOutlineArrowRight],
  ],
  pos: [
    ['Tables', '24', '8 occupied', HiOutlineBuildingOffice2],
    ['Dine-in', '16', 'Orders', HiOutlineShoppingCart],
    ['Takeaway', '9', 'Orders', HiOutlineCloud],
    ['Today Sales', '$4.8K', '+22%', HiOutlineChartBarSquare],
    ['KOT Pending', '7', 'Kitchen', HiOutlineDocumentChartBar],
    ['Menu Items', '142', 'Active', HiOutlineCheckCircle],
  ],
  'retail-pos': [
    ['Barcode Sales', 'PKR 198K', '+16%', HiOutlineShoppingCart],
    ['Cart Items', '34', 'Pending', HiOutlineChartBarSquare],
    ['Stock Alerts', '14', 'Low', HiOutlineShieldCheck],
    ['Customers', '86', 'Today', HiOutlineUserGroup],
    ['Sales Report', 'PKR 1.2M', 'This month', HiOutlineDocumentChartBar],
    ['Inventory', '2,184', 'Items', HiOutlineCheckCircle],
  ],
  'whatsapp-crm': [
    ['Inbox', '312', 'Unread', HiOutlineChatBubbleLeftRight],
    ['Contacts', '2.4K', '+12%', HiOutlineUserGroup],
    ['Campaigns', '24', 'Sent', HiOutlineArrowRight],
    ['Auto Replies', '89%', 'Rate', HiOutlineCloud],
    ['Lead Capture', '184', '+18%', HiOutlineChartBarSquare],
    ['Message Status', '94%', 'Delivered', HiOutlineCheckCircle],
  ],
  'transport-rental': [
    ['Vehicles', '42', 'Active', HiOutlineTruck],
    ['Trips', '128', 'This month', HiOutlineMapPin],
    ['Drivers', '36', 'Available', HiOutlineUserGroup],
    ['Bookings', '18', 'Live', HiOutlineCheckCircle],
    ['Fuel', 'PKR 284K', 'Expenses', HiOutlineDocumentChartBar],
    ['Fleet Reports', '96%', 'Uptime', HiOutlineChartBarSquare],
  ],
  'medical-store-pos': [
    ['Medicine Search', '12K', 'Items', HiOutlineShieldCheck],
    ['Batch Expiry', '23', 'Alert', HiOutlineDocumentChartBar],
    ['Stock', '4,826', 'Units', HiOutlineCheckCircle],
    ['Billing', 'PKR 126K', 'Today', HiOutlineShoppingCart],
    ['Suppliers', '48', 'Active', HiOutlineUserGroup],
    ['Low Stock', '18', 'Reorder', HiOutlineChartBarSquare],
  ],
  'reports': [
    ['Sales Charts', 'PKR 8.6M', '+17%', HiOutlineChartBarSquare],
    ['Revenue', 'PKR 8.6M', '+22%', HiOutlineArrowRight],
    ['Profit', 'PKR 2.1M', '+14%', HiOutlineCheckCircle],
    ['Expenses', 'PKR 4.2M', '-8%', HiOutlineDocumentChartBar],
    ['Top Modules', '6', 'Active', HiOutlineCloud],
    ['Export Report', 'PDF/Excel', 'Ready', HiOutlineDocumentChartBar],
  ],
  'email-marketing': [
    ['Campaigns', '24', 'Sent', HiOutlineArrowRight],
    ['Subscribers', '8.2K', '+12%', HiOutlineUserGroup],
    ['Open Rate', '34%', '+5%', HiOutlineChartBarSquare],
    ['Click Rate', '18%', '+3%', HiOutlineCloud],
    ['Templates', '12', 'Active', HiOutlineDocumentChartBar],
    ['Analytics', '92%', 'Delivered', HiOutlineCheckCircle],
  ],
  'inventory-management': [
    ['Products', '1,842', '+8%', HiOutlineShoppingCart],
    ['Stock Levels', '4.2K', 'Units', HiOutlineCheckCircle],
    ['Purchase Orders', '126', 'This month', HiOutlineDocumentChartBar],
    ['Suppliers', '64', 'Active', HiOutlineUserGroup],
    ['Low Stock', '34', 'Alert', HiOutlineShieldCheck],
    ['Inventory Value', 'PKR 12.4M', '+6%', HiOutlineChartBarSquare],
  ],
  'team-permissions': [
    ['Team Members', '24', 'Active', HiOutlineUserGroup],
    ['Roles', '6', 'Configured', HiOutlineShieldCheck],
    ['Permissions', '18', 'Rules', HiOutlineDocumentChartBar],
    ['Access Controls', '92%', 'Secure', HiOutlineCheckCircle],
    ['Active Users', '18', 'Online', HiOutlineCloud],
    ['Security Audit', 'Clean', 'Passed', HiOutlineChartBarSquare],
  ],
}

function SoftwareMockup({ page, solutionSlug }) {
  const previewRows = solutionPreviewRows[solutionSlug] || solutionPreviewRows['crm']

  return (
    <div className="relative mx-auto w-full max-w-[60rem]">
      <div className="pos-float-card absolute -left-5 top-16 z-10 hidden w-48 rounded-[1.45rem] border border-slate-200/60 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.42)] backdrop-blur xl:block">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-400">{page.productName}</p>
        <p className="mt-2 text-2xl font-medium text-slate-900">{page.stats[0][1]}</p>
        <p className="mt-1 text-xs font-medium text-emerald-600">{page.stats[0][2]}</p>
      </div>

      <div className="pos-float-card absolute -right-4 bottom-14 z-10 hidden w-52 rounded-[1.45rem] border border-sky-100 bg-white/95 p-4 shadow-[0_28px_72px_-38px_rgba(15,23,42,0.4)] backdrop-blur lg:block">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <HiOutlineCloud className="text-xl" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-900">Cloud Synced</p>
            <p className="text-xs text-slate-500">Desktop, web, mobile</p>
          </div>
        </div>
      </div>

      <div className="pos-preview-shell overflow-hidden rounded-[2rem] border border-slate-200/60/90 bg-white shadow-[0_44px_126px_-62px_rgba(15,23,42,0.58)] ring-1 ring-white/80">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="hidden rounded-full border border-slate-200/60 bg-slate-100/70 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500 sm:block">
            {page.previewLabel}
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </div>
        </div>

        <div className="grid min-h-[24rem] grid-cols-[6.2rem_1fr] bg-[linear-gradient(180deg,#fbfdff_0%,#edf6ff_100%)] sm:grid-cols-[8rem_1fr] lg:grid-cols-[9rem_1fr]">
          <aside className="border-r border-slate-100 bg-white/70 px-2 py-4">
            <div className="grid gap-1">
              {page.sidebar.map((item, index) => (
                <span
                  key={item}
                  className={`truncate rounded-lg px-2 py-2 text-[0.58rem] font-medium sm:text-[0.68rem] ${
                    index === 0 ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </aside>

          <div className="min-w-0 p-3 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Nexora Suite</p>
                <p className="mt-1 text-xl font-medium text-slate-900 sm:text-2xl">{page.previewTitle}</p>
              </div>
              <span className="w-max rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white">Live workspace</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {page.stats.map(([label, value, note]) => (
                <div key={label} className="rounded-[1.2rem] border border-white bg-white p-4 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
                  <p className="text-[0.65rem] font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-medium text-slate-900">{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{note}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {previewRows.map(([label, value, note, Icon]) => (
                <div key={label} className="flex items-center gap-2 rounded-[1.2rem] border border-white bg-white p-3 shadow-[0_20px_58px_-46px_rgba(15,23,42,0.5)]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon className="text-sm" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.58rem] font-medium text-slate-500">{label}</p>
                    <p className="truncate text-sm font-medium text-slate-900">{value}</p>
                    <p className="truncate text-[0.55rem] font-medium text-slate-500">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GrowthPathStrip() {
  const steps = [
    {
      title: 'Start Free Trial',
      text: 'Explore Nexora with real workflows, CRM tools, invoices and dashboards. No credit card required.',
      icon: HiOutlinePlayCircle,
    },
    {
      title: 'Pick a Plan',
      text: 'After the trial, pick the plan that fits your team on the pricing page. New users get 50% off the first subscription with code WELCOME-NEXORA.',
      icon: HiOutlineShieldCheck,
    },
    {
      title: 'Upgrade When Business Grows',
      text: 'Move up to a larger plan or a custom Enterprise plan when you need more users, records, reports and team controls.',
      icon: HiOutlineChartBarSquare,
    },
  ]

  return (
    <section data-reveal className="bg-white px-5 pb-4 sm:px-6 lg:px-8">
      <div className="mx-auto -mt-8 grid max-w-7xl gap-4 rounded-[1.8rem] border border-slate-200/60 bg-white/95 p-4 shadow-[0_8px_40px_-20px_rgba(15,23,42,0.12)] sm:p-5 lg:grid-cols-3">
        {steps.map(({ title, text, icon: Icon }) => (
          <article key={title} className="flex min-w-0 gap-4 rounded-[1.35rem] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Icon className="text-2xl" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-medium text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function SolutionPage({ solutionSlug: solutionSlugProp } = {}) {
  const { solutionSlug: solutionSlugParam } = useParams()
  const solutionSlug = solutionSlugProp || solutionSlugParam
  const page = solutionPages[solutionSlug]
  const seo = getSeoForSolutionSlug(solutionSlug)

  if (!page) return <NotFoundPage />

  const Icon = page.icon
  const faqs = page.ownFaqsOnly ? page.faqs : [...page.faqs, ...commonFaqs]
  const relatedSolutions = getRelatedSolutions(solutionSlug)
  const pillarKey = SOLUTION_SLUG_TO_PILLAR[solutionSlug]
  const supportingPages = pillarKey
    ? Object.entries(featurePages).filter(([, fp]) => fp.pillar === pillarKey).map(([key, fp]) => ({ key, ...fp }))
    : []
  const compareLinks = pillarKey ? (PILLAR_COMPARE_LINKS[pillarKey] || []) : []

  return (
    <PublicPageShell>
      <PageSeo
        {...seo}
        faqItems={faqs}
        softwareApplication={{
          name: page.productName,
          description: page.description,
          applicationCategory: 'BusinessApplication',
        }}
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <span aria-current="page">{page.productName}</span>
      </nav>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_72%,#ffffff_100%)] pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-slate-100/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                <Icon className="text-base" />
                {page.eyebrow}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/60 bg-violet-50/80 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-600 shadow-[0_0_12px_-2px_rgba(139,92,246,0.12)] backdrop-blur-sm">
                <HiOutlineSparkles className="h-3 w-3 text-violet-500" />
                AI-Powered
              </span>
            </div>
            <h1 className="mt-6 text-[2.75rem] font-semibold leading-[0.98] tracking-tight text-slate-900 sm:text-[4.2rem] lg:text-[5.2rem]">
              {page.headlineBefore}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{page.headlineHighlight}</span>
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-500 sm:text-lg">{page.description}</p>
            <p className="mt-4 rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-3 text-sm font-medium leading-6 text-slate-500 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.08)]">
              Start with a 1-month free trial, choose Basic after the trial, then upgrade to Standard when your users, records and reports need more room.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 min-[390px]:flex-row lg:justify-start">
              <Link to="/signup" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]">
                Start Free Trial
                <HiOutlineArrowRight className="text-lg" />
              </Link>
              <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]">
                Book Demo
                <HiOutlinePlayCircle className="text-xl text-slate-500" />
              </a>
              {solutionSlug === 'pos' ? (
                <div className="flex w-full flex-col items-center gap-2.5 min-[390px]:w-auto lg:items-start">
                  <Link to="/download/restaurant-pos" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-sky-600 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(14,165,233,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-[0_8px_24px_-8px_rgba(14,165,233,0.5)] active:scale-[0.97]">
                    <HiOutlineArrowDownTray className="text-lg" />
                    Download for Windows
                  </Link>
                  <p className="flex max-w-xs items-start gap-1.5 text-left text-xs leading-5 text-slate-400">
                    <HiOutlineInformationCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>
                      You’ll need a Nexora business account to log in after installing. Don’t have one yet?{' '}
                      <Link to="/signup" className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700">Create a free account</Link> first.
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <SoftwareMockup page={page} solutionSlug={solutionSlug} />
        </div>
      </section>

      <GrowthPathStrip />

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
              Key features for <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{page.productName}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500">
              {page.featuresIntro || 'Purpose-built tools, clean permissions and a premium workflow designed for daily business operations.'}
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map(([title, text, FeatureIcon]) => (
              <article key={title} className="group flex min-h-48 gap-4 rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white">
                  <FeatureIcon className="text-2xl" />
                </span>
                <div>
                  <h3 className="text-lg font-medium text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {supportingPages.length > 0 ? (
        <section data-reveal className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">Explore {page.productName} in depth</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500">
                A closer look at how each part of {page.productName} actually works.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {supportingPages.map((sp) => {
                const SpIcon = sp.icon
                return (
                  <Link
                    key={sp.key}
                    to={`/${sp.key}`}
                    className="group flex items-center gap-4 rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)]"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white">
                      <SpIcon className="text-2xl" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-medium text-slate-900">{sp.badge}</h3>
                      <p className="mt-1 truncate text-sm leading-6 text-slate-500">{sp.title}</p>
                    </div>
                    <HiOutlineArrowRight className="shrink-0 text-lg text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-900" />
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {compareLinks.length > 0 ? (
        <section className="bg-white px-5 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl border-t border-slate-200/60 pt-8">
            <p className="text-sm leading-7 text-slate-500">
              <span className="font-medium text-slate-900">Comparing your options? </span>
              {compareLinks.map((l, i) => (
                <span key={l.to}>
                  {i > 0 ? ' · ' : null}
                  <Link to={l.to} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">{l.text}</Link>
                </span>
              ))}
            </p>
          </div>
        </section>
      ) : null}

      {page.detailSections?.length ? (
        <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-5xl gap-12 px-5 sm:px-6 lg:px-8">
            {page.detailSections.map((section) => (
              <article key={section.heading}>
                <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-4xl">{section.heading}</h2>
                {section.body ? <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500">{section.body}</p> : null}
                {section.steps?.length ? (
                  <ol className="mt-5 grid max-w-3xl list-decimal gap-2 pl-5 text-base leading-7 text-slate-600">
                    {section.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                ) : null}
                {section.links?.length ? (
                  <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {section.links.map((l) => (
                      <Link key={l.to} to={l.to} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">{l.label}</Link>
                    ))}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-slate-200/60 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm">
              Business Benefits
            </span>
            <h2 className="mt-5 text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
              {page.benefitsHeading || 'Better operations, faster teams and clearer ROI.'}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-500">
              {page.benefitsIntro || 'Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {page.benefits.map((benefit) => (
              <div key={benefit} className="rounded-[1.35rem] border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]">
                <HiOutlineCheckCircle className="text-2xl text-slate-500" />
                <p className="mt-4 text-lg font-medium text-slate-900">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">{page.useCaseHeading || 'Industry use cases'}</h2>
              <p className="mt-5 text-base leading-8 text-slate-500">
                {page.useCaseIntro || 'Flexible enough for modern service, sales, education, property, retail and operations teams.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {page.useCaseDetails ? page.useCaseDetails.map(([title, text]) => (
                <article key={title} className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.45)]">
                  <h3 className="text-base font-medium text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                </article>
              )) : page.useCases.map((useCase) => (
                <div key={useCase} className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.45)]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
                    <HiOutlineMapPin className="text-xl" />
                  </span>
                  <p className="text-sm font-medium text-slate-900">{useCase}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {relatedSolutions.length > 0 ? (
        <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-slate-200/60 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                  Related Solutions
                </span>
                <h2 className="mt-5 max-w-3xl text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
                  Software that works with {page.productName}
                </h2>
              </div>
              <Link to="/pricing" className="w-max inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]">
                Compare Pricing
              </Link>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {relatedSolutions.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className="group rounded-[1.35rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)]"
                >
                  <p className="text-lg font-medium text-slate-900">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{item.text}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                    View solution
                    <HiOutlineArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section data-reveal className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">Frequently asked questions</h2>
          </div>
          <div className="mt-10 grid gap-4">
            {faqs.map(([question, answer]) => (
              <article key={question} className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_18px_54px_-42px_rgba(15,23,42,0.36)]">
                <h3 className="text-base font-medium text-slate-900">{question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-[2rem] border border-slate-200/60 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">Ready to see {page.productName} in action?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Start a 1-month free trial with no credit card, or book a guided demo before choosing a plan.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <Link to="/signup" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]">
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
            <a href={whatsappLeadLink} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]">
              Book Demo
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
