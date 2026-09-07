import Link from '../../components/AppLink.jsx'
import PageSeo from '../../components/PageSeo.jsx'
import { absoluteUrl } from '../../lib/seoStructuredData.js'
import PublicPageShell from './PublicPageShell.jsx'
import {
  HiOutlineArrowRight,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineCreditCard,
  HiOutlineDocumentChartBar,
  HiOutlineFire,
  HiOutlineMagnifyingGlass,
  HiOutlineShieldCheck,
  HiOutlineTableCells,
  HiOutlineTruck,
  HiOutlineUserGroup,
} from 'react-icons/hi2'

// Parent pillar reference data — kept in sync with the canonical routes in
// AppRouter.jsx / SolutionPage.jsx. Used for the back-link, breadcrumb and
// "back to product" CTA on every feature page below.
const PILLARS = {
  'restaurant-pos': { label: 'Restaurant POS', to: '/restaurant-pos', productName: 'Nexora Restaurant POS' },
  'retail-pos': { label: 'Retail POS', to: '/retail-pos', productName: 'Nexora Retail POS' },
  'pharmacy-pos': { label: 'Pharmacy POS', to: '/pharmacy-pos', productName: 'Nexora Pharmacy POS' },
  'school-erp': { label: 'School ERP', to: '/school-erp', productName: 'Nexora School ERP' },
  crm: { label: 'CRM', to: '/crm', productName: 'Nexora CRM' },
  'transport-fleet': { label: 'Fleet', to: '/transport-fleet', productName: 'Nexora Fleet & Rental' },
}

// ─────────────────────────────────────────────────────────────────────────
// Content is grounded directly in the real, shipped app modules (see file
// paths noted per section) and in the existing solutionPages copy in
// SolutionPage.jsx — no invented capabilities, integrations or stats.
// ─────────────────────────────────────────────────────────────────────────
export const featurePages = {
  // ── Restaurant POS ──────────────────────────────────────────────────
  'restaurant-pos/kot-and-kitchen-display': {
    pillar: 'restaurant-pos',
    icon: HiOutlineFire,
    badge: 'KOT & Kitchen Display',
    eyebrow: 'Restaurant POS · Kitchen Operations',
    title: 'KOT & Kitchen Display for Restaurants',
    keyword: 'KOT system, kitchen display system for restaurants',
    seoTitle: 'KOT & Kitchen Display System for Restaurants | Nexora',
    seoDescription: 'See how Nexora’s Kitchen Order Ticket and kitchen display workflow moves orders from Pending to Preparing to Ready to Served, with live sync to every counter.',
    intro: 'Every order placed at the counter becomes a Kitchen Order Ticket the kitchen can act on immediately. Nexora’s kitchen display groups active KOTs into three live columns — Pending, Preparing and Ready — so kitchen staff always know what to cook next and front-of-house always knows what’s coming out.',
    sections: [
      {
        heading: 'A live board, not a paper ticket',
        paragraphs: [
          'Each ticket on the kitchen display shows its KOT or order number, the table (or order type for takeaway and delivery), how long it has been waiting, and the full item list with quantities — for example "2x Chicken Karahi". Orders are grouped by kitchen station, so a multi-section kitchen sees only what belongs to it.',
        ],
      },
      {
        heading: 'One tap to move a ticket forward',
        paragraphs: [
          'Kitchen staff move a ticket forward with a single action — Start, Mark Ready, then Serve — and the system only allows forward progress, so a ticket can’t accidentally be pushed backward mid-service. Every status change syncs in real time, so the counter and the kitchen display are never out of step, even across multiple devices.',
        ],
      },
      {
        heading: 'The order list behind every ticket',
        paragraphs: [
          'Beyond the live board, the full Orders screen tracks every order by table or type, customer, items, total, payment status and order status (Pending, Preparing, Served or Cancelled), with payment shown separately as Partial, Paid or Cancelled. Any order can be reopened to edit its status, adjust the paid amount, record a cancellation reason, print the ticket, or jump straight into billing.',
        ],
        bullets: [
          'Today Report breaks the day down by order type, category, and includes same-day expenses',
          'Every printed KOT and receipt is available for reprint from the order list',
        ],
      },
    ],
    capabilities: [
      ['Pending → Preparing → Ready → Served', 'A guided, forward-only status flow keeps the kitchen and the floor reading from the same ticket state.', HiOutlineFire],
      ['Table or order-type tagging', 'Dine-in tickets show the table number; takeaway and delivery tickets show the order type instead.', HiOutlineTableCells],
      ['Station-grouped tickets', 'Kitchens with more than one prep area see only the tickets relevant to that station.', HiOutlineClipboardDocumentList],
      ['Same-day sales & expense report', 'A Today Report rolls up order-type sales, category sales and logged expenses for the shift.', HiOutlineChartBarSquare],
    ],
    sibling: 'restaurant-pos/table-management',
    siblingLabel: 'Table Management',
  },
  'restaurant-pos/table-management': {
    pillar: 'restaurant-pos',
    icon: HiOutlineTableCells,
    badge: 'Table Management',
    eyebrow: 'Restaurant POS · Floor Operations',
    title: 'Restaurant Table Management',
    keyword: 'restaurant table management software',
    seoTitle: 'Restaurant Table Management Software | Nexora POS',
    seoDescription: 'Manage floor areas, table status, merges and splits with Nexora’s restaurant table management — open orders directly from the table view.',
    intro: 'Nexora’s table management screen mirrors your actual floor — organized into named areas, with every table showing its live status and current order at a glance.',
    sections: [
      {
        heading: 'Floor areas, not just a flat list',
        paragraphs: [
          'Tables are organized under named floor areas (for example, "Ground Floor"), and each table carries its own ID — T-07, T-12 and so on — so staff can find and update the right table in seconds. An Advanced Floor View gives a full visual layout of the restaurant for a faster, more spatial read of what’s open, occupied or free.',
        ],
      },
      {
        heading: 'Open, merge or split a table without leaving the floor',
        paragraphs: [
          'Tapping a table opens its current order directly. When a large party needs more room, two tables can be merged into one open order; when a table needs to be divided — say a party splitting into two bills — it can be split into a new table (like T-01A) without losing what was already ordered.',
        ],
        bullets: [
          'Table notes capture reservation details, seating preferences or service instructions',
          'Tables can be added, renamed, or removed (with a confirmation step) as the floor layout changes',
        ],
      },
    ],
    capabilities: [
      ['Named floor areas', 'Group tables the way the restaurant is actually laid out, not a generic numbered grid.', HiOutlineTableCells],
      ['Merge & split tables', 'Combine tables for larger parties or split a table into a new one mid-service.', HiOutlineClipboardDocumentList],
      ['One-tap open order', 'Jump from the floor view straight into a table’s live order.', HiOutlineFire],
      ['Table notes', 'Attach reservation, placement or service notes to any table.', HiOutlineDocumentChartBar],
    ],
    sibling: 'restaurant-pos/kot-and-kitchen-display',
    siblingLabel: 'KOT & Kitchen Display',
  },

  // ── Retail POS ───────────────────────────────────────────────────────
  'retail-pos/billing-and-checkout': {
    pillar: 'retail-pos',
    icon: HiOutlineMagnifyingGlass,
    badge: 'Billing & Checkout',
    eyebrow: 'Retail POS · Front Till',
    title: 'Retail Billing & Checkout',
    keyword: 'retail POS billing software, retail checkout system',
    seoTitle: 'Retail Billing & Checkout Software | Nexora Retail POS',
    seoDescription: 'Nexora’s retail checkout handles barcode search, till sessions, promo codes and multiple payment methods, with an itemized receipt on every sale.',
    intro: 'The Front Till Billing screen is where every retail sale happens — search, cart, discount, pay and print, without leaving one workspace.',
    sections: [
      {
        heading: 'Search, cart and checkout',
        paragraphs: [
          'Cashiers search products by name, SKU or barcode and build the cart as items are scanned or selected. A shift starts with an opening cash count so end-of-day reconciliation always has a known starting balance, and every sale can be tied to a walk-in customer or an existing saved customer found by name or phone.',
        ],
      },
      {
        heading: 'Tax, promos and payment in one flow',
        paragraphs: [
          'Before checkout, a tax rate and an optional promo code can be applied directly on the till. Payment is captured against the store’s accepted methods — cash and mobile wallets like JazzCash and EasyPaisa among them — and the change owed is calculated automatically.',
        ],
        bullets: [
          'Every sale produces an itemized receipt — order number, date, customer, cashier, item table with rate and total, subtotal, promo discount, total, amount paid and change',
          'Receipts are printable and carry the business’s own branding',
        ],
      },
    ],
    capabilities: [
      ['Barcode / SKU search', 'Find any product in the cart instantly by name, SKU or barcode.', HiOutlineMagnifyingGlass],
      ['Till sessions', 'Open the counter with a starting cash count for clean end-of-day reconciliation.', HiOutlineBanknotes],
      ['Promo codes & tax', 'Apply a promo code and tax rate before the final total.', HiOutlineCreditCard],
      ['Itemized receipts', 'Every sale prints a full receipt with subtotal, discount, total, paid and change.', HiOutlineDocumentChartBar],
    ],
    sibling: 'retail-pos/inventory-control',
    siblingLabel: 'Inventory Control',
  },
  'retail-pos/inventory-control': {
    pillar: 'retail-pos',
    icon: HiOutlineChartBarSquare,
    badge: 'Inventory Control',
    eyebrow: 'Retail POS · Stock Operations',
    title: 'Retail Inventory Control',
    keyword: 'retail inventory management software',
    seoTitle: 'Retail Inventory Management Software | Nexora Retail POS',
    seoDescription: 'Track stock levels, purchase orders, suppliers and inventory transactions in Nexora’s retail inventory control — with low-stock flags before you run out.',
    intro: 'Retail inventory in Nexora connects every sale, purchase and stock adjustment back to one live stock count — so what’s on the shelf and what’s in the system always agree.',
    sections: [
      {
        heading: 'See stock health at a glance',
        paragraphs: [
          'Products carry a live stock status — flagged clearly when an item needs attention — alongside quick stock actions and a current stock levels view organized by category. Everything is searchable by product name, SKU, barcode or category.',
        ],
      },
      {
        heading: 'Purchases, suppliers and the transaction trail',
        paragraphs: [
          'Purchase orders and supplier records live alongside the stock count itself, including the ability to return stock to a supplier and record a supplier payment against cash, bank transfer, cheque or a mobile wallet like JazzCash or EasyPaisa. An inventory transactions log — filterable by transaction type — gives a full, auditable trail of every stock movement.',
        ],
      },
    ],
    capabilities: [
      ['Live stock status', 'Products are flagged automatically when stock needs attention.', HiOutlineChartBarSquare],
      ['Categories & suppliers', 'Organize inventory by category and keep supplier records in the same workspace.', HiOutlineUserGroup],
      ['Purchase orders', 'Raise purchase orders and returns without leaving inventory.', HiOutlineClipboardDocumentList],
      ['Full transaction log', 'Every stock movement is recorded and filterable by type.', HiOutlineDocumentChartBar],
    ],
    sibling: 'retail-pos/billing-and-checkout',
    siblingLabel: 'Billing & Checkout',
  },

  // ── Pharmacy POS ─────────────────────────────────────────────────────
  'pharmacy-pos/billing': {
    pillar: 'pharmacy-pos',
    icon: HiOutlineMagnifyingGlass,
    badge: 'Pharmacy Billing',
    eyebrow: 'Pharmacy POS · Counter Operations',
    title: 'Pharmacy Billing',
    keyword: 'pharmacy billing software, pharmacy POS',
    seoTitle: 'Pharmacy Billing Software | Nexora Pharmacy POS',
    seoDescription: 'Fast medicine search, till sessions and itemized receipts — Nexora Pharmacy POS keeps the pharmacy counter moving without slowing down accuracy.',
    intro: 'Pharmacy billing runs on the same fast, till-based checkout as the rest of Nexora POS — tuned for a pharmacy counter where speed and accuracy both matter.',
    sections: [
      {
        heading: 'Built for a fast-moving counter',
        paragraphs: [
          'Staff search medicines quickly by name to keep the counter moving, build the sale, and check out against the store’s accepted payment methods. As with every Nexora counter, a till session opens with a starting cash count so the day reconciles cleanly.',
        ],
      },
      {
        heading: 'A receipt for every sale',
        paragraphs: [
          'Every transaction produces an itemized receipt — items, quantities, rates and totals — that can be printed at the counter, keeping a clear, auditable record of daily pharmacy sales alongside the medicine stock it draws down.',
        ],
      },
    ],
    capabilities: [
      ['Fast medicine search', 'Search medicines by name to keep the counter moving during busy hours.', HiOutlineMagnifyingGlass],
      ['Till sessions', 'Open the pharmacy counter with a starting cash count for clean reconciliation.', HiOutlineBanknotes],
      ['Itemized receipts', 'Every sale is printed and recorded against the medicine stock it draws from.', HiOutlineDocumentChartBar],
      ['Multiple payment methods', 'Accept cash and mobile wallet payments at the same counter.', HiOutlineCreditCard],
    ],
    sibling: 'pharmacy-pos/medicine-inventory',
    siblingLabel: 'Medicine Inventory',
  },
  'pharmacy-pos/medicine-inventory': {
    pillar: 'pharmacy-pos',
    icon: HiOutlineShieldCheck,
    badge: 'Medicine Inventory',
    eyebrow: 'Pharmacy POS · Stock Operations',
    title: 'Medicine Inventory Management',
    keyword: 'pharmacy medicine inventory, batch and expiry management',
    seoTitle: 'Medicine Inventory Management | Nexora Pharmacy POS',
    seoDescription: 'Track medicine names, categories, prices and stock levels with reorder alerts — Nexora Pharmacy POS keeps pharmacy inventory current at the counter.',
    intro: 'Medicine inventory in Nexora Pharmacy POS keeps names, categories, prices and stock levels in one place, so the counter always knows what’s actually on the shelf.',
    sections: [
      {
        heading: 'Stock levels that stay current',
        paragraphs: [
          'Every medicine is tracked by name, category and price, with stock levels updated automatically as sales are made. Reorder needs surface as part of the same stock view used across Nexora’s inventory tools, so low stock on a fast-moving medicine doesn’t go unnoticed.',
        ],
      },
      {
        heading: 'Purchases and supplier records in the same workspace',
        paragraphs: [
          'Supplier purchases, costs and stock updates are recorded together, and inventory transactions stay filterable and auditable — the same underlying stock-control tooling used across Nexora’s retail and pharmacy counters, applied to medicine stock.',
        ],
      },
    ],
    capabilities: [
      ['Medicine catalog', 'Track medicine names, categories and pricing in one place.', HiOutlineShieldCheck],
      ['Live stock levels', 'Stock updates automatically as sales are made at the counter.', HiOutlineChartBarSquare],
      ['Reorder visibility', 'Low-stock medicines surface the same way as any other inventory item.', HiOutlineClipboardDocumentList],
      ['Supplier purchases', 'Record supplier costs and stock updates against the same medicine catalog.', HiOutlineUserGroup],
    ],
    sibling: 'pharmacy-pos/billing',
    siblingLabel: 'Pharmacy Billing',
  },

  // ── School ERP ───────────────────────────────────────────────────────
  'school-erp/admissions-and-students': {
    pillar: 'school-erp',
    icon: HiOutlineUserGroup,
    badge: 'Admissions & Students',
    eyebrow: 'School ERP · Student Records',
    title: 'Student Admissions & Records',
    keyword: 'school admissions software, student records management',
    seoTitle: 'Student Admissions & Records Software | Nexora School ERP',
    seoDescription: 'Manage student and parent records — admission numbers, class, section and roll number — in one Students & Parents workspace with Nexora School ERP.',
    intro: 'Every student in Nexora School ERP is recorded in a dedicated Students & Parents workspace, built to hold the details schools actually track from admission onward.',
    sections: [
      {
        heading: 'One record per student, linked to a parent',
        paragraphs: [
          'Each student profile holds the student’s name, an admission number, roll number, and class and section, alongside the parent or guardian’s contact details — so front-office staff and teachers are always looking at the same record.',
        ],
      },
      {
        heading: 'Built for how a school office actually works',
        paragraphs: [
          'Records carry a status and a created date, and can be searched and managed from one list rather than scattered across registers. Because it’s the same underlying customer-records engine used across Nexora, adding a new student takes the same few steps as adding any other record — just with school-specific fields in place of generic ones.',
        ],
      },
    ],
    capabilities: [
      ['Admission & roll numbers', 'Every student record carries its own admission number and roll number.', HiOutlineClipboardDocumentList],
      ['Class & section', 'Students are organized by class and section for fast lookup.', HiOutlineUserGroup],
      ['Parent/guardian contact', 'Parent or guardian details sit on the same record as the student.', HiOutlineDocumentChartBar],
      ['Status tracking', 'Each record carries a status and a created date for office record-keeping.', HiOutlineCheckCircle],
    ],
    sibling: 'school-erp/attendance',
    siblingLabel: 'Attendance',
  },
  'school-erp/attendance': {
    pillar: 'school-erp',
    icon: HiOutlineCheckCircle,
    badge: 'Attendance',
    eyebrow: 'School ERP · Daily Operations',
    title: 'School Attendance Management',
    keyword: 'school attendance management software',
    seoTitle: 'School Attendance Management Software | Nexora School ERP',
    seoDescription: 'Mark attendance manually or connect a biometric device — Nexora School ERP tracks student and staff attendance from one dashboard.',
    intro: 'Nexora’s attendance module covers both students and staff, and supports either manual marking or a connected attendance device — whichever fits how the school already runs.',
    sections: [
      {
        heading: 'Manual marking or a connected device',
        paragraphs: [
          'Attendance can be marked directly — choosing student or staff mode, the date, a status and an optional note — or captured automatically by connecting a biometric or RFID attendance device (recorded by device name, provider and serial or IP address). Connected devices default to marking either student or staff attendance, and recent auto-punches are visible in a live log as they come in.',
        ],
      },
      {
        heading: 'A dashboard that shows the whole picture',
        paragraphs: [
          'The attendance dashboard totals students, staff, connected devices and confirms the report link is wired up, so a school administrator can see attendance health for the day at a glance. The setup guide itself is bilingual — available in English and Urdu — for schools onboarding non-English-first staff.',
        ],
      },
    ],
    capabilities: [
      ['Student & staff modes', 'One attendance workflow covers both students and staff.', HiOutlineUserGroup],
      ['Biometric device sync', 'Connect an attendance device and see recent auto-punches as they arrive.', HiOutlineCheckCircle],
      ['Manual marking', 'Mark attendance directly by date, status and note when needed.', HiOutlineCalendarDays],
      ['Bilingual setup guide', 'Device setup is available in English and Urdu.', HiOutlineDocumentChartBar],
    ],
    sibling: 'school-erp/admissions-and-students',
    siblingLabel: 'Admissions & Students',
  },

  // ── CRM ──────────────────────────────────────────────────────────────
  'crm/leads-and-pipeline': {
    pillar: 'crm',
    icon: HiOutlineChartBarSquare,
    badge: 'Leads & Pipeline',
    eyebrow: 'CRM · Sales Operations',
    title: 'Lead & Pipeline Management',
    keyword: 'CRM lead management software, sales pipeline software',
    seoTitle: 'Lead & Pipeline Management Software | Nexora CRM',
    seoDescription: 'Track leads through a five-stage pipeline with AI-assisted scoring — Nexora CRM turns raw leads into a prioritized, working sales pipeline.',
    intro: 'Every lead in Nexora CRM moves through the same five-stage pipeline — New Lead, Contacted, Qualified, Proposal, Negotiation — with AI-assisted scoring to help teams work the right leads first.',
    sections: [
      {
        heading: 'A pipeline your team can see, not just a list',
        paragraphs: [
          'The Leads screen tracks each lead’s ID, name, source and current stage, searchable and filterable by stage. The Sales Pipeline view turns the same data into a Kanban board, plus a pipeline breakdown by stage and a stage summary showing how many leads sit at each point — so a sales manager can see where the pipeline is thin or backed up without opening a single record.',
        ],
      },
      {
        heading: 'AI scoring that explains itself',
        paragraphs: [
          'Alongside source and stage, each lead carries an AI Score, an auto-assigned priority and a prediction — built from real engagement signals like reply speed, meetings attended, payment history and activity frequency, not a black box. That gives reps a defensible reason to call one lead before another, rather than working the list top to bottom.',
        ],
      },
    ],
    capabilities: [
      ['Five-stage pipeline', 'New Lead, Contacted, Qualified, Proposal, Negotiation — one shared pipeline for the whole team.', HiOutlineChartBarSquare],
      ['Kanban pipeline board', 'See every lead’s stage at a glance, with a breakdown and stage summary.', HiOutlineClipboardDocumentList],
      ['AI lead scoring', 'Score, priority and prediction built from reply speed, meetings and activity signals.', HiOutlineUserGroup],
      ['Search & stage filters', 'Find and filter leads by stage without leaving the list view.', HiOutlineMagnifyingGlass],
    ],
    sibling: 'crm/customers',
    siblingLabel: 'Customers',
  },
  'crm/customers': {
    pillar: 'crm',
    icon: HiOutlineUserGroup,
    badge: 'Customers',
    eyebrow: 'CRM · Customer Records',
    title: 'CRM Customer Records',
    keyword: 'CRM customer management software',
    seoTitle: 'CRM Customer Records & Wallet Management | Nexora CRM',
    seoDescription: 'Keep customer contact details, type and wallet balance in one CRM record — Nexora CRM connects customer profiles directly to sales and invoices.',
    intro: 'Once a lead converts, it becomes a customer record in Nexora CRM — with contact details, type, and a running wallet balance that updates automatically from sales.',
    sections: [
      {
        heading: 'One profile, every detail',
        paragraphs: [
          'Each customer record holds name, email, phone, company and a customer type, plus a status and creation date — the same fields a sales or account manager needs on a call without switching screens.',
        ],
      },
      {
        heading: 'Wallet balances that move with real activity',
        paragraphs: [
          'Customer wallet balances — credit and dues — update automatically as sales are recorded, the same wallet mechanism used at the POS counter. That keeps a customer’s outstanding balance accurate without a manual reconciliation step, whether the sale happened through CRM, retail POS or another connected module.',
        ],
      },
    ],
    capabilities: [
      ['Full contact profile', 'Name, email, phone, company and type on one customer record.', HiOutlineUserGroup],
      ['Wallet balance', 'Credit and due balances update automatically as sales happen.', HiOutlineCreditCard],
      ['Status & history', 'Every record carries a status and creation date for account tracking.', HiOutlineCheckCircle],
      ['Connected to sales', 'Customer records link directly to invoices and sales activity.', HiOutlineDocumentChartBar],
    ],
    sibling: 'crm/leads-and-pipeline',
    siblingLabel: 'Leads & Pipeline',
  },

  // ── Fleet ────────────────────────────────────────────────────────────
  'transport-fleet/fleet-management': {
    pillar: 'transport-fleet',
    icon: HiOutlineTruck,
    badge: 'Fleet Management',
    eyebrow: 'Fleet · Vehicle Operations',
    title: 'Fleet Management',
    keyword: 'fleet management software',
    seoTitle: 'Fleet Management Software | Nexora Fleet & Rental',
    seoDescription: 'Track vehicle registration, transmission, fuel type and driver assignment — Nexora Fleet Management keeps every vehicle record ready for booking.',
    intro: 'Every vehicle in the fleet is tracked as its own record — registration, specification and driver assignment — so booking a vehicle out never starts with a phone call to check what’s free.',
    sections: [
      {
        heading: 'A record for every vehicle',
        paragraphs: [
          'Each vehicle carries its registration, transmission type (automatic or manual), fuel type (petrol, diesel, hybrid or electric) and a list of its own features, plus whether it comes with a driver included. Vehicles can be filtered by status across the fleet, so availability is a filter, not a phone call.',
        ],
      },
      {
        heading: 'Safe changes to fleet records',
        paragraphs: [
          'Removing a vehicle from the fleet requires an explicit confirmation step — naming the vehicle and its registration before it’s permanently removed — so fleet records don’t disappear by accident.',
        ],
      },
    ],
    capabilities: [
      ['Vehicle specification', 'Registration, transmission and fuel type tracked per vehicle.', HiOutlineTruck],
      ['Driver assignment', 'Mark a vehicle as coming with a driver included.', HiOutlineUserGroup],
      ['Fleet-wide status filter', 'Filter the whole fleet by availability status.', HiOutlineClipboardDocumentList],
      ['Confirmed deletions', 'Removing a vehicle requires an explicit confirmation step.', HiOutlineCheckCircle],
    ],
    sibling: 'transport-fleet/rental-bookings',
    siblingLabel: 'Rental Bookings',
  },
  'transport-fleet/rental-bookings': {
    pillar: 'transport-fleet',
    icon: HiOutlineCalendarDays,
    badge: 'Rental Bookings',
    eyebrow: 'Fleet · Bookings & Payments',
    title: 'Vehicle Rental Bookings',
    keyword: 'vehicle rental booking software, fleet rental management',
    seoTitle: 'Vehicle Rental Booking Software | Nexora Fleet & Rental',
    seoDescription: 'Book vehicles with pickup and return dates, security deposits and refund tracking — Nexora Fleet & Rental keeps every booking and payment in one record.',
    intro: 'Every rental starts as a booking record — customer, vehicle, dates and payment — and stays a single source of truth from pickup through return and, if needed, refund.',
    sections: [
      {
        heading: 'Everything a booking needs, in one record',
        paragraphs: [
          'A booking captures the customer and phone number, the vehicle and its registration, pickup and return dates, the rate type and units it’s billed against, and whether a driver is included (and who). Payment is tracked as total, advance paid and security deposit, against the customer’s chosen payment method — with a branded booking voucher generated for the customer.',
        ],
      },
      {
        heading: 'Refunds and cancellations stay accountable',
        paragraphs: [
          'When a booking is refunded, the record shows refund status, refunded amount, refund method and the date it was processed. A cancellation fine, if one applies, is tracked separately and marked as retained — so the financial trail for a cancelled booking is as clear as a completed one.',
        ],
      },
    ],
    capabilities: [
      ['Full booking record', 'Customer, vehicle, dates, rate and driver all captured on one booking.', HiOutlineCalendarDays],
      ['Deposits & advance payments', 'Track total, advance paid and security deposit per booking.', HiOutlineBanknotes],
      ['Refund tracking', 'Refund status, amount, method and date recorded against the booking.', HiOutlineCreditCard],
      ['Cancellation fines', 'Cancellation fines are tracked and marked as retained when applied.', HiOutlineDocumentChartBar],
    ],
    sibling: 'transport-fleet/fleet-management',
    siblingLabel: 'Fleet Management',
  },
}

export default function FeaturePage({ slug }) {
  const page = featurePages[slug]
  if (!page) return null

  const pillar = PILLARS[page.pillar]
  const path = `/${slug}`
  const canonical = absoluteUrl(path)
  const sibling = page.sibling ? featurePages[page.sibling] : null

  return (
    <PublicPageShell backTo={pillar.to} backLabel={`Back to ${pillar.label}`} badge={page.badge} badgeIcon={page.icon}>
      <PageSeo
        title={page.seoTitle}
        description={page.seoDescription}
        canonical={canonical}
        path={path}
        keywords={page.keyword}
        ogTitle={page.seoTitle}
        ogDescription={page.seoDescription}
        twitterCard="summary_large_image"
      />
      <nav aria-label="Breadcrumb" className="sr-only">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to={pillar.to}>{pillar.label}</Link>
        <span> / </span>
        <span aria-current="page">{page.badge}</span>
      </nav>

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#f1f5f9_100%)] pb-14 pt-16 sm:pb-16 sm:pt-20 lg:pt-24">
        <div className="soft-arc-bg pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 shadow-sm backdrop-blur-xl">
            {page.eyebrow}
          </span>
          <h1 className="mt-6 text-[2.2rem] font-semibold leading-[1.06] tracking-[-0.02em] text-slate-900 sm:text-[3rem]">
            {page.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">{page.intro}</p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10">
            {page.sections.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">{sec.heading}</h2>
                {sec.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="mt-4 text-base leading-8 text-slate-500">{p}</p>
                ))}
                {sec.bullets ? (
                  <ul className="mt-4 grid gap-2.5">
                    {sec.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm leading-7 text-slate-500">
                        <HiOutlineCheckCircle className="mt-1 shrink-0 text-base text-slate-400" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">What this covers</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {page.capabilities.map(([title, text, CapIcon]) => (
              <article key={title} className="group flex gap-4 rounded-[1.2rem] border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.14)]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white">
                  <CapIcon className="text-xl" />
                </span>
                <div>
                  <h3 className="text-base font-medium text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-6 rounded-[2rem] border border-slate-200/60 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_58%,#e0f2fe_100%)] p-6 shadow-[0_8px_40px_-16px_rgba(15,23,42,0.08)] sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
              This is one part of {pillar.productName}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              {sibling ? (
                <>See how it works alongside <Link to={`/${page.sibling}`} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">{sibling.badge}</Link>, or explore the full {pillar.label} workspace.</>
              ) : (
                <>Explore the full {pillar.label} workspace, or start a free trial to see it running on your own data.</>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[420px]:flex-row">
            <Link to={pillar.to} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-6 text-sm font-medium tracking-[-0.01em] text-slate-500 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/70 hover:bg-white hover:text-slate-900 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97]">
              Back to {pillar.label}
            </Link>
            <Link to="/signup" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-medium tracking-[-0.01em] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)] active:scale-[0.97]">
              Start Free Trial
              <HiOutlineArrowRight className="text-lg" />
            </Link>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
