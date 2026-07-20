/**
 * Nexora AI Glossary — Definitions for highlighted business terms.
 * When a user hovers over a highlighted term, a tooltip shows the definition
 * and why it matters for their business.
 */

export const glossary = {
  // ── POS Terms ──
  'POS': {
    title: 'Point of Sale',
    definition: 'The place where a customer pays for goods or services. In modern business, a POS system includes hardware (screen, printer, cash drawer) and software that tracks sales, inventory, and customer data in real-time.',
    why: 'A good POS reduces billing time by 60% and eliminates manual sales tracking errors.',
  },
  'KOT': {
    title: 'Kitchen Order Ticket',
    definition: 'A digital or printed order slip sent directly from the waiter\'s tablet or POS terminal to the kitchen display or printer. Replaces handwritten chits that get lost or misread.',
    why: 'Digital KOT reduces order errors by 90% and speeds up food preparation time.',
  },
  'BOGO': {
    title: 'Buy One Get One',
    definition: 'A promotional offer where purchasing one item gives the customer a second item free or at a discount. Common in retail and restaurant combos.',
    why: 'BOGO offers can increase sales volume by 40-60% during slow periods.',
  },
  'SKU': {
    title: 'Stock Keeping Unit',
    definition: 'A unique code assigned to each product variant for inventory tracking. Example: A red medium t-shirt and blue large t-shirt have different SKUs.',
    why: 'Proper SKU management prevents stockouts and helps identify best-selling variants.',
  },

  // ── ERP Terms ──
  'ERP': {
    title: 'Enterprise Resource Planning',
    definition: 'Software that integrates all core business processes — finance, HR, inventory, sales, payroll — into one unified system instead of separate tools.',
    why: 'An integrated ERP eliminates duplicate data entry and gives owners a single dashboard for the entire business.',
  },
  'School ERP': {
    title: 'School Management System',
    definition: 'A specialized ERP for educational institutions that handles student records, fee collection, attendance tracking, exam management, timetable scheduling, and parent communication.',
    why: 'Schools using ERP save 15-20 hours per week on administrative tasks and improve parent satisfaction.',
  },
  'inventory management': {
    title: 'Inventory Control',
    definition: 'The process of tracking stock levels, purchases, sales, and deliveries across all locations. Includes features like low-stock alerts, batch tracking, and purchase order automation.',
    why: 'Proper inventory management reduces carrying costs by 25% and prevents lost sales from stockouts.',
  },
  'fee management': {
    title: 'Fee Collection System',
    definition: 'Automated tracking of student fees, partial payments, discounts, transport fees, and exam fees. Generates receipts and sends payment reminders to parents.',
    why: 'Automated fee management improves collection rates by 35% and eliminates manual receipt books.',
  },
  'attendance': {
    title: 'Attendance Tracking',
    definition: 'Digital recording of student or staff presence. Modern systems use biometric, RFID cards, or mobile apps instead of paper registers.',
    why: 'Real-time attendance data helps identify absenteeism patterns and improves security.',
  },
  'payroll': {
    title: 'Payroll Management',
    definition: 'Automated calculation of employee salaries, deductions, taxes, bonuses, and overtime. Generates pay slips and maintains compliance records.',
    why: 'Automated payroll reduces calculation errors to near zero and saves 8-12 hours per month.',
  },

  // ── CRM Terms ──
  'CRM': {
    title: 'Customer Relationship Management',
    definition: 'Software that helps businesses track leads, manage customer interactions, automate follow-ups, and analyze sales pipelines — all in one place.',
    why: 'Businesses using CRM see an average 29% increase in sales conversion rates.',
  },
  'WhatsApp CRM': {
    title: 'WhatsApp Business CRM',
    definition: 'A CRM system integrated with WhatsApp that captures leads from chats, auto-replies to inquiries, manages team inbox, and sends broadcast messages to customer lists.',
    why: 'In Pakistan, WhatsApp CRM captures 70% more leads than email or web forms because customers prefer chatting.',
  },
  'dashboard': {
    title: 'Business Dashboard',
    definition: 'A visual overview screen showing key metrics — sales, expenses, pending orders, staff activity — in charts and numbers. Updated in real-time.',
    why: 'A dashboard lets owners spot problems in seconds instead of digging through reports for hours.',
  },
  'analytics': {
    title: 'Business Analytics',
    definition: 'The analysis of business data to find patterns, trends, and insights. Includes sales reports, customer behavior, inventory turnover, and staff performance metrics.',
    why: 'Data-driven decisions based on analytics are 5x more likely to succeed than gut-feel decisions.',
  },
  'payment gateway': {
    title: 'Online Payment Processing',
    definition: 'A service that securely processes credit card, debit card, and mobile wallet payments between a customer and a business. Examples: JazzCash, EasyPaisa, Stripe.',
    why: 'Adding a payment gateway increases online order completion rates by 45%.',
  },
  'loyalty program': {
    title: 'Customer Loyalty System',
    definition: 'A rewards system that gives customers points, discounts, or perks for repeat purchases. Tracks purchase history and automatically applies rewards.',
    why: 'Loyalty program members spend 30-60% more than non-members over their lifetime.',
  },

  // ── Tech / Infrastructure Terms ──
  'cloud-based': {
    title: 'Cloud Computing',
    definition: 'Software and data stored on remote servers accessed via the internet instead of installed on a local computer. Accessible from any device, anywhere.',
    why: 'Cloud systems are 99.9% available and eliminate the cost of buying and maintaining physical servers.',
  },
  'real-time': {
    title: 'Real-Time Data',
    definition: 'Information that updates instantly as events happen — no delays, no manual syncing. Sales appear on the dashboard the moment they\'re made.',
    why: 'Real-time data means you can fix problems while they\'re happening, not after the fact.',
  },
  'data encryption': {
    title: 'Data Security Encryption',
    definition: 'Converting sensitive business and customer data into unreadable code that can only be decoded with a security key. Protects against data theft.',
    why: 'Encryption is required by data protection laws and prevents financial losses from data breaches.',
  },
  'automation': {
    title: 'Business Process Automation',
    definition: 'Using software to automatically perform repetitive tasks — sending reminders, generating invoices, updating stock, running reports — without human intervention.',
    why: 'Automation frees up 15-20 hours per week that staff can spend on customer service instead.',
  },
  'scalable': {
    title: 'Scalability',
    definition: 'A system\'s ability to handle growth — more customers, more transactions, more locations — without slowing down or requiring a complete replacement.',
    why: 'Scalable software grows with your business, saving the cost and disruption of switching systems later.',
  },
  'subscription': {
    title: 'SaaS Subscription Model',
    definition: 'Paying a monthly or yearly fee to use software, rather than buying it once. Includes updates, support, and cloud hosting in the price.',
    why: 'Subscription pricing is predictable and includes free updates — no surprise upgrade costs.',
  },
  'billing': {
    title: 'Automated Billing',
    definition: 'Software that automatically generates invoices, tracks payments, sends reminders for overdue amounts, and reconciles accounts.',
    why: 'Automated billing reduces late payments by 40% and eliminates manual invoice creation.',
  },
  'invoice': {
    title: 'Digital Invoicing',
    definition: 'Creating and sending professional bills electronically. Modern systems include tax calculations, payment links, and automatic GST/PST application.',
    why: 'Digital invoices get paid 2x faster than paper invoices and reduce tax filing errors.',
  },

  // ── Restaurant Terms ──
  'table management': {
    title: 'Restaurant Table Layout',
    definition: 'A visual floor plan showing all tables with their current status (available, occupied, reserved, cleaning). Waiters assign orders to tables and track meal progress.',
    why: 'Table management reduces customer wait time by 30% and increases table turnover rate.',
  },
  'kitchen display': {
    title: 'Kitchen Display System (KDS)',
    definition: 'A screen in the kitchen showing incoming orders in real-time, replacing paper KOT slips. Orders are color-coded by priority and tracked until served.',
    why: 'KDS eliminates lost paper tickets and improves kitchen efficiency by 35%.',
  },
  'waitlist': {
    title: 'Customer Waitlist',
    definition: 'A digital queue management system that tracks waiting customers, estimates wait times, and sends SMS/call alerts when their table is ready.',
    why: 'A managed waitlist reduces customer walk-aways by 50% during busy hours.',
  },
  'delivery zone': {
    title: 'Delivery Zone Management',
    definition: 'Geographic areas defined for food delivery, each with its own fees, minimum order amounts, and assigned drivers. Prevents unprofitable long-distance deliveries.',
    why: 'Zone-based delivery reduces fuel costs by 25% and improves delivery times.',
  },
  'fleet management': {
    title: 'Vehicle Fleet Tracking',
    definition: 'Software for managing a group of vehicles — tracks location, fuel usage, maintenance schedules, driver assignments, and rental bookings.',
    why: 'Fleet management reduces maintenance costs by 20% and improves vehicle utilization.',
  },

  // ── Retail Terms ──
  'barcode': {
    title: 'Barcode Scanning',
    definition: 'Using optical scanners to read product barcodes for instant price lookup, stock deduction, and billing. Eliminates manual price entry errors.',
    why: 'Barcode billing is 4x faster than manual entry and virtually eliminates pricing errors.',
  },
  'discount engine': {
    title: 'Automated Discount System',
    definition: 'Software rules that automatically apply discounts, promotions, and coupons at checkout based on conditions like item quantity, customer type, or time of day.',
    why: 'An automated discount engine prevents staff from giving unauthorized discounts.',
  },
  'ledger': {
    title: 'Customer Payment Ledger',
    definition: 'A running record of what each customer owes, has paid, and pending balances. Essential for businesses that offer credit terms to regular customers.',
    why: 'Digital ledgers reduce payment disputes and improve cash flow tracking.',
  },
  'multi-currency': {
    title: 'Multi-Currency Support',
    definition: 'The ability to display prices, accept payments, and generate reports in multiple currencies (PKR, USD, AED, etc.) with automatic exchange rate conversion.',
    why: 'Multi-currency support enables businesses to serve international customers without manual conversion.',
  },
  'role-based access': {
    title: 'Role-Based Permissions',
    definition: 'Restricting what each staff member can see and do based on their role — cashiers can bill but not see reports, managers can view everything, owners can configure settings.',
    why: 'Role-based access prevents data leaks and unauthorized changes by staff.',
  },

  // ── General Business ──
  'Nexora': {
    title: 'Nexora Solution',
    definition: 'Pakistan\'s unified business management platform offering POS, ERP, CRM, and WhatsApp CRM in a single subscription. Designed for restaurants, retail, schools, and service businesses.',
    why: 'Nexora replaces 4-6 separate tools with one platform, reducing total software costs by 50%.',
  },
  'Nexora Solution': {
    title: 'Nexora Solution',
    definition: 'Pakistan\'s unified business management platform offering POS, ERP, CRM, and WhatsApp CRM in a single subscription.',
    why: 'Nexora replaces 4-6 separate tools with one platform, reducing total software costs by 50%.',
  },
  'Pakistan': {
    title: 'Pakistan Business Context',
    definition: 'Business software designed specifically for Pakistani market needs — Urdu support, PKR currency, FBR tax compliance, local payment gateways, and offline-first architecture for areas with connectivity issues.',
    why: 'Pakistan-specific software handles local tax laws, currency formats, and business practices out of the box.',
  },
}

/**
 * Look up a term in the glossary. Case-insensitive, handles partial matches.
 * Returns null if no match found.
 */
export function lookupTerm(text) {
  if (!text) return null
  const clean = text.trim()
  // Exact match
  if (glossary[clean]) return glossary[clean]
  // Case-insensitive
  const lower = clean.toLowerCase()
  for (const [key, value] of Object.entries(glossary)) {
    if (key.toLowerCase() === lower) return value
  }
  // Partial match (term contains the key)
  for (const [key, value] of Object.entries(glossary)) {
    if (lower.includes(key.toLowerCase())) return value
  }
  return null
}

/**
 * Find the best glossary entry for a span of highlighted text.
 */
export function findDefinition(text) {
  // Strip == markers if present
  const clean = text.replace(/==/g, '').trim()
  return lookupTerm(clean)
}
