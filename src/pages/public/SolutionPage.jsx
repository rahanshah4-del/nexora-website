import { Link, useParams } from 'react-router-dom'
import {
  HiOutlineAcademicCap,
  HiOutlineArrowDownTray,
  HiOutlineArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineChartBarSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineCloud,
  HiOutlineDevicePhoneMobile,
  HiOutlineSparkles,
  HiOutlineDocumentChartBar,
  HiOutlineMapPin,
  HiOutlinePlayCircle,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import PageSeo from '../../components/PageSeo.jsx'
import { getSeoForSolutionSlug } from '../../lib/seoMetadata.js'
import PublicPageShell from './PublicPageShell.jsx'
import NotFoundPage from './NotFoundPage.jsx'

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
  { key: 'transport-rental', label: 'Transport Software', to: '/transport', text: 'Manage fleet bookings, customers, payments and rental records.' },
  { key: 'whatsapp-crm', label: 'WhatsApp CRM', to: '/whatsapp-crm', text: 'Turn conversations into leads, follow-ups and customer activity.' },
  { key: 'crm', label: 'CRM Software', to: '/solutions/crm/', text: 'Track leads, customers, invoices, tasks and sales teams.' },
  { key: 'team-permissions', label: 'Team & Permissions', to: '/solutions/team-permissions/', text: 'Control roles, access rights and team member visibility.' },
  { key: 'medical-store-pos', label: 'Medical Store POS', to: '/solutions/medical-store-pos/', text: 'Handle pharmacy billing, medicine stock and expiry control.' },
  { key: 'property-erp', label: 'Property ERP', to: '/solutions/property-erp/', text: 'Manage tenants, rent, leases and maintenance requests.' },
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
    useCases: ['Property dealers', 'Building managers', 'Rental portfolios', 'Commercial property teams'],
    faqs: [
      ['Can I track rent balances?', 'Yes. Property ERP workflows include rent collection, balances and reporting.'],
      ['Can maintenance teams use it?', 'Yes. Maintenance requests can be tracked and assigned from the same workspace.'],
    ],
  },
  'pos': {
    eyebrow: 'POS Solution',
    productName: 'Nexora POS',
    headlineBefore: 'A fast, modern POS for restaurants, retail, medical stores and ',
    headlineHighlight: 'multi-counter sales.',
    description: 'A desktop, web and mobile-ready POS for billing, inventory, receipt printing, reports, staff roles and secure cloud sync.',
    icon: HiOutlineShoppingCart,
    previewTitle: 'Live Counter Workspace',
    previewLabel: 'Nexora POS live',
    sidebar: ['Counter', 'Products', 'Inventory', 'Receipts', 'Reports', 'Roles'],
    stats: [
      ['Today Sales', 'PKR 184K', '+22%'],
      ['Inventory Alerts', '16', 'Low stock'],
      ['Receipts', '328', 'Printed'],
    ],
    rows: ['Restaurant order billed', 'Receipt printed', 'Stock synced', 'Cashier report closed'],
    features: [
      ['Restaurant POS', 'Handle tables, quick bills, receipts, taxes and daily sales.', HiOutlineBuildingOffice2],
      ['Retail POS', 'Run barcode-ready sales, returns and stock movement.', HiOutlineShoppingCart],
      ['Medical Store POS', 'Support fast item search, receipts and inventory checks.', HiOutlineShieldCheck],
      ['Mall POS', 'Operate multi-counter sales and branch-level summaries.', HiOutlineCloud],
      ['Inventory Management', 'Track products, stock alerts, pricing and movement.', HiOutlineChartBarSquare],
      ['Receipt Printing', 'Print, email or sync receipts into reports instantly.', HiOutlineDocumentChartBar],
      ['Reports', 'View sales, cash summaries, staff performance and trends.', HiOutlineChartBarSquare],
      ['Multi-user Access', 'Set owner, manager, cashier and staff roles.', HiOutlineUserGroup],
      ['Cloud Sync', 'Keep counter, back office and mobile access aligned.', HiOutlineCloud],
    ],
    benefits: ['Speed up billing lines', 'Reduce stock mistakes', 'Control cashier access', 'See daily sales from anywhere'],
    useCases: ['Restaurants', 'Retail stores', 'Medical stores', 'Malls', 'Transport and fleet counters'],
    faqs: [
      ['Can Nexora POS print receipts?', 'Yes. POS workflows support receipt printing, email-ready receipts and reporting sync.'],
      ['Can it support multiple counters?', 'Yes. Nexora POS is built for multi-user and multi-counter workflows.'],
    ],
  },
  'retail-pos': {
    eyebrow: 'Retail POS Solution',
    productName: 'Nexora Retail POS',
    headlineBefore: 'Modern retail checkout and inventory for stores, counters and ',
    headlineHighlight: 'fast sales.',
    description: 'Manage retail sales, barcode scanning, inventory updates, customer receipts and store analytics with Nexora Retail POS.',
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
    ],
    benefits: ['Speed up store checkout', 'Keep retail stock accurate', 'Track customer purchase history', 'Make store reporting simple'],
    useCases: ['Retail stores', 'Clothing shops', 'Grocery stores', 'Boutiques'],
    faqs: [
      ['Can Nexora handle returns and refunds?', 'Yes. Retail POS supports returns, refunds and sales adjustments with inventory sync.'],
      ['Can I manage customer records?', 'Yes. Customer profiles and loyalty details are part of retail workflows.'],
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
    eyebrow: 'Transport / Rental Solution',
    productName: 'Nexora Transport / Rental',
    headlineBefore: 'Manage fleet, rentals, bookings and payments from ',
    headlineHighlight: 'one transport desk.',
    description: 'A transport and rental workspace for vehicles, customers, bookings, dues, refunds, rental ledgers and payment tracking.',
    icon: HiOutlineTruck,
    previewTitle: 'Fleet Rental Control',
    previewLabel: 'Transport workspace',
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
    eyebrow: 'Medical Store POS Solution',
    productName: 'Nexora Medical Store POS',
    headlineBefore: 'Run pharmacy billing, medicine stock and expiry control from ',
    headlineHighlight: 'one medical counter.',
    description: 'A pharmacy-focused POS for medicine sales, fast item search, batches, expiry alerts, inventory, receipts, supplier purchases and daily reports.',
    icon: HiOutlineShieldCheck,
    previewTitle: 'Pharmacy Counter Desk',
    previewLabel: 'Medical POS workspace',
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
      ['Can I track medicine expiry?', 'Yes. Medical Store POS workflows include batch and expiry visibility for pharmacy inventory.'],
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
    ['Today Sales', 'PKR 184K', '+22%', HiOutlineChartBarSquare],
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
                <h2 className="mt-1 text-xl font-medium text-slate-900 sm:text-2xl">{page.previewTitle}</h2>
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
      title: 'Continue Free Forever',
      text: 'Keep 1 workspace, 1 user, 50 customers, 20 leads, 10 invoices/month, Basic CRM and a Basic dashboard.',
      icon: HiOutlineShieldCheck,
    },
    {
      title: 'Upgrade When Business Grows',
      text: 'Move to Standard for Rs 3,000/month (50% OFF for new users) with more users, unlimited records, reports, analytics, team management and support tickets.',
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
  const faqs = [...page.faqs, ...commonFaqs]
  const relatedSolutions = getRelatedSolutions(solutionSlug)

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
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_72%,#ffffff_100%)] pb-16 pt-12 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
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
              Start with a free trial, continue Free Forever after trial, then upgrade to Standard when your users, records and reports need more room.
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
                <Link to="/download/restaurant-pos" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-6 text-sm font-medium tracking-[-0.01em] text-sky-700 shadow-[0_2px_8px_-2px_rgba(14,165,233,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800 hover:shadow-[0_6px_20px_-8px_rgba(14,165,233,0.15)] active:scale-[0.97]">
                  <HiOutlineArrowDownTray className="text-lg" />
                  Download for Windows
                </Link>
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
              Purpose-built tools, clean permissions and a premium workflow designed for daily business operations.
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

      <section data-reveal className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-slate-200/60 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm">
              Business Benefits
            </span>
            <h2 className="mt-5 text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">
              Better operations, faster teams and clearer ROI.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-500">
              Nexora is designed to remove manual friction, connect the right data and help teams move with confidence.
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
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">Industry use cases</h2>
              <p className="mt-5 text-base leading-8 text-slate-500">
                Flexible enough for modern service, sales, education, property, retail and operations teams.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {page.useCases.map((useCase) => (
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
              Start a free trial with no credit card, stay on Free Forever after trial, or book a guided demo before upgrading to Standard.
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
