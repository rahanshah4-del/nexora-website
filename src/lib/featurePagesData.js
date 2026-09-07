/**
 * Pure data module for FeaturePage.jsx's pillar/sub-page catalog — no JSX,
 * so it can be imported both by the React component (src/pages/public/FeaturePage.jsx)
 * and by the Node-executed static prerender script (scripts/prerender.mjs),
 * which cannot parse JSX. Single source of truth for both.
 */
import {
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineCreditCard,
  HiOutlineCube,
  HiOutlineDocumentChartBar,
  HiOutlineFire,
  HiOutlineMagnifyingGlass,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineTableCells,
  HiOutlineTag,
  HiOutlineTruck,
  HiOutlineUserGroup,
} from 'react-icons/hi2'

// Parent pillar reference data — kept in sync with the canonical routes in
// AppRouter.jsx / SolutionPage.jsx. Used for the back-link, breadcrumb and
// "back to product" CTA on every feature page below.
export const PILLARS = {
  'restaurant-pos': { label: 'Restaurant POS', to: '/restaurant-pos', productName: 'Nexora Restaurant POS' },
  'retail-pos': { label: 'Retail POS', to: '/retail-pos', productName: 'Nexora Retail POS' },
  'pharmacy-pos': { label: 'Pharmacy POS', to: '/pharmacy-pos', productName: 'Nexora Pharmacy POS' },
  'school-erp': { label: 'School ERP', to: '/school-erp', productName: 'Nexora School ERP' },
  crm: { label: 'CRM', to: '/crm', productName: 'Nexora CRM' },
  'transport-fleet': { label: 'Fleet', to: '/transport-fleet', productName: 'Nexora Fleet & Rental' },
}

// Comparison / buying-guide pages (Phase 8) relevant to each pillar, linked
// from that pillar's own product page (SolutionPage.jsx) and, statically,
// from the prerendered pillar shell (scripts/prerender.mjs) — kept minimal
// and directly relevant rather than linking every compare page from every pillar.
export const PILLAR_COMPARE_LINKS = {
  'restaurant-pos': [
    { to: '/compare/pos-software-buying-checklist', text: 'POS Software Buying Checklist' },
    { to: '/compare/cloud-vs-offline-pos', text: 'Cloud vs Offline POS' },
  ],
  'retail-pos': [
    { to: '/compare/pos-software-buying-checklist', text: 'POS Software Buying Checklist' },
    { to: '/compare/cloud-vs-offline-pos', text: 'Cloud vs Offline POS' },
  ],
  'pharmacy-pos': [
    { to: '/compare/pos-software-buying-checklist', text: 'POS Software Buying Checklist' },
    { to: '/compare/cloud-vs-offline-pos', text: 'Cloud vs Offline POS' },
  ],
  'school-erp': [{ to: '/compare/school-erp-buying-checklist', text: 'School ERP Buying Checklist' }],
  crm: [{ to: '/compare/crm-vs-spreadsheets', text: 'CRM vs Spreadsheets' }],
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
  'restaurant-pos/menu-management': {
    pillar: 'restaurant-pos',
    icon: HiOutlineSquares2X2,
    badge: 'Menu Management',
    eyebrow: 'Restaurant POS · Menu Operations',
    title: 'Restaurant Menu Management',
    keyword: 'restaurant menu management software',
    seoTitle: 'Restaurant Menu Management Software | Nexora POS',
    seoDescription: 'Organize menu categories, item status and pricing, import a menu with AI, and connect menu items to recipes — Nexora Restaurant POS menu management.',
    intro: 'Every item on the menu — its category, price and availability — lives in one place in Nexora, connected directly to the recipe behind it.',
    sections: [
      {
        heading: 'Organize the menu the way it’s actually served',
        paragraphs: [
          'Menu items are grouped into categories — Food, Drink, Combo and Add-on — with each item carrying its own status (Available or Inactive) and price, so staff and the ordering screen always show what’s actually sellable that day.',
        ],
      },
      {
        heading: 'Import a menu with AI instead of typing it in',
        paragraphs: [
          'Rather than re-entering an existing menu by hand, Nexora can import it directly — the AI reads a menu, including from a photo, and extracts the items automatically, which is faster than manual data entry for a restaurant bringing a large menu online for the first time.',
        ],
        links: [{ to: '/ai', text: 'See Nexora AI in action' }],
      },
      {
        heading: 'Menu items connected to recipes',
        paragraphs: [
          'Menu items aren’t just a name and a price — each one can be linked to a recipe with its own ingredients. That link is what powers ingredient-level stock tracking and food cost reporting on the inventory side, so the menu and the kitchen’s ingredient stock stay in sync.',
        ],
      },
    ],
    capabilities: [
      ['Menu categories', 'Group items as Food, Drink, Combo or Add-on for a clear, organized menu.', HiOutlineSquares2X2],
      ['Item status & pricing', 'Mark items Available or Inactive and set pricing per item.', HiOutlineDocumentChartBar],
      ['AI menu import', 'Import an existing menu — including from a photo — instead of entering it by hand.', HiOutlineSparkles],
      ['Recipe-linked items', 'Connect menu items to their recipes for ingredient-level tracking.', HiOutlineCube],
    ],
    sibling: 'restaurant-pos/inventory',
    siblingLabel: 'Inventory & Food Cost',
  },
  'restaurant-pos/inventory': {
    pillar: 'restaurant-pos',
    icon: HiOutlineCube,
    badge: 'Inventory & Food Cost',
    eyebrow: 'Restaurant POS · Ingredient & Cost Control',
    title: 'Restaurant Inventory & Food Cost Management',
    keyword: 'restaurant inventory management software',
    seoTitle: 'Restaurant Inventory & Food Cost Management | Nexora POS',
    seoDescription: 'Track ingredient stock tied to recipes and see food cost percentage per menu item — Nexora’s restaurant inventory goes beyond generic stock counts.',
    intro: 'Restaurant inventory in Nexora isn’t a generic product list — it’s ingredient stock tied directly to the recipes on the menu, with food cost calculated from real ingredient and sales data.',
    sections: [
      {
        heading: 'Ingredient stock, not just product stock',
        paragraphs: [
          'Because menu items are linked to recipes, ingredient stock is tracked through the same recipe data that powers menu management — ingredient-level stock, not a separate, disconnected product list.',
        ],
      },
      {
        heading: 'Food cost, calculated per menu item',
        paragraphs: [
          'Nexora computes food cost analysis directly from recipes, ingredient stock and order data — working out the cost behind each recipe so a menu item that’s quietly eating into margin doesn’t stay invisible.',
        ],
        bullets: [
          'Food cost is measured as a percentage of a recipe’s cost against its price, benchmarked against a healthy 28–35% range',
          'Menu items and categories can be compared on cost, not just on sales volume',
        ],
      },
      {
        heading: 'Low-stock and reorder visibility',
        paragraphs: [
          'Ingredients approaching low stock are flagged automatically, with a suggested reorder quantity calculated from current stock and minimum levels — so restocking decisions are based on the kitchen’s actual usage, not guesswork.',
        ],
      },
    ],
    capabilities: [
      ['Recipe-linked ingredient stock', 'Ingredient stock is tied to the recipes menu items are built from.', HiOutlineCube],
      ['Food cost analysis', 'Food cost is calculated per recipe from real ingredient and order data.', HiOutlineChartBarSquare],
      ['Healthy cost benchmarking', 'Food cost percentage is compared against a healthy range, not just tracked in isolation.', HiOutlineDocumentChartBar],
      ['Low-stock alerts & reorder quantities', 'Ingredients nearing low stock are flagged with a suggested reorder amount.', HiOutlineClipboardDocumentList],
    ],
    sibling: 'restaurant-pos/menu-management',
    siblingLabel: 'Menu Management',
  },
  'restaurant-pos/billing-and-receipts': {
    pillar: 'restaurant-pos',
    icon: HiOutlineBanknotes,
    badge: 'Billing & Receipts',
    eyebrow: 'Restaurant POS · Checkout & Receipts',
    title: 'Restaurant Billing & Receipts',
    keyword: 'restaurant billing software',
    seoTitle: 'Restaurant Billing Software & Receipts | Nexora POS',
    seoDescription: 'Bill dine-in, takeaway, delivery and quick-bill orders with discounts, service charges and tax — Nexora Restaurant POS billing and itemized receipts.',
    intro: 'Every order type at the counter — dine-in, takeaway, delivery or a fast quick-bill — is billed the same reliable way, with a full breakdown on the receipt.',
    sections: [
      {
        heading: 'One bill, four ways to order',
        paragraphs: [
          'Orders are billed as dine-in (tied to a table), takeaway, delivery (with a delivery address and rider notes), or quick-bill for a fast counter sale — the same cart and checkout, adapted to how the order actually leaves the kitchen.',
        ],
      },
      {
        heading: 'Discounts, service charges and tax on every bill',
        paragraphs: [
          'A bill can carry a discount and a service charge alongside tax, itemized separately rather than folded into one number — so what a customer paid, and why, is always traceable on the receipt itself.',
        ],
        bullets: [
          'The printed receipt breaks a bill down into subtotal, discount, tax, total, amount paid and amount due',
          'Cart items can be edited before the bill is finalized',
        ],
      },
      {
        heading: 'Not the kitchen ticket',
        paragraphs: [
          'This page covers the checkout and the bill. Once an order is billed, it still moves through the kitchen as its own ticket, and the ingredients behind what was sold tie back to food cost reporting on the inventory side.',
        ],
        links: [
          { to: '/restaurant-pos/kot-and-kitchen-display', text: 'Kitchen tickets & display' },
          { to: '/restaurant-pos/inventory', text: 'Inventory & food cost' },
        ],
      },
    ],
    capabilities: [
      ['Dine-in, takeaway, delivery, quick-bill', 'One checkout flow adapts to how each order actually leaves the kitchen.', HiOutlineShoppingCart],
      ['Discounts & service charges', 'Apply discounts and service charges as their own line items on the bill.', HiOutlineTag],
      ['Tax support', 'Tax is calculated and itemized separately on every bill.', HiOutlineDocumentChartBar],
      ['Itemized receipts', 'Receipts show subtotal, discount, tax, total, paid and due.', HiOutlineBanknotes],
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
  'retail-pos/discounts-and-offers': {
    pillar: 'retail-pos',
    icon: HiOutlineTag,
    badge: 'Discounts & Offers',
    eyebrow: 'Retail POS · Promotions',
    title: 'Retail Discounts & Offers',
    keyword: 'retail POS discount software',
    seoTitle: 'Retail POS Discount Software | Nexora Retail POS',
    seoDescription: 'Run promo codes and till-safe discount rules with percentage or fixed-PKR discounts and tax defaults — Nexora Retail POS discounts and offers.',
    intro: 'Discounts in Nexora Retail POS run as till-safe rules the counter can apply consistently — not manual price overrides a cashier has to remember.',
    sections: [
      {
        heading: 'Promo codes and discount rules at the till',
        paragraphs: [
          'Active promo codes can be applied directly at checkout, and discount rules are built to be till-safe — consistent, predictable behavior at the counter rather than one-off manual adjustments that are easy to apply inconsistently.',
        ],
      },
      {
        heading: 'Percentage or fixed-PKR, with tax handled correctly',
        paragraphs: [
          'A discount can be set as a percentage or a fixed PKR amount, and tax defaults are configured alongside discount rules — so the till applies tax the same way, on the same items, every time a promo is used.',
        ],
      },
    ],
    capabilities: [
      ['Active promo codes', 'Apply promo codes directly at checkout.', HiOutlineTag],
      ['Till-safe discount rules', 'Discount rules are built to behave consistently at the counter.', HiOutlineShieldCheck],
      ['Percentage or fixed PKR', 'Set discounts as a percentage or a fixed PKR amount.', HiOutlineBanknotes],
      ['Tax defaults', 'Configure tax defaults alongside discount rules for consistent totals.', HiOutlineDocumentChartBar],
    ],
    sibling: 'retail-pos/billing-and-checkout',
    siblingLabel: 'Billing & Checkout',
  },
  'retail-pos/customer-records': {
    pillar: 'retail-pos',
    icon: HiOutlineUserGroup,
    badge: 'Customer Records',
    eyebrow: 'Retail POS · At the Till',
    title: 'Retail Customer Records',
    keyword: 'retail POS customer management',
    seoTitle: 'Retail POS Customer Management | Nexora Retail POS',
    seoDescription: 'Walk-in by default, saved when it matters — Nexora Retail POS ties customer records directly to the till, including the rule behind due sales.',
    intro: 'Retail customer records in Nexora live at the till, not in a separate contact list — every sale starts as a walk-in and only becomes a saved customer when it’s worth keeping.',
    sections: [
      {
        heading: 'Walk-in by default',
        paragraphs: [
          'Every sale defaults to "Walk-in Customer" — no record required to check out. A cashier can search for a saved customer by name or phone mid-sale, or add a new one with just a name and phone number, without leaving the till.',
        ],
      },
      {
        heading: 'The rule behind due sales',
        paragraphs: [
          'A due (credit) sale can only be recorded against a saved customer — a walk-in sale can’t carry a balance due. That one rule is what ties customer records directly to how the till actually works, rather than being a general contact list attached to the POS.',
        ],
      },
      {
        heading: 'What the till shows about a customer',
        paragraphs: [
          'Once selected, a customer’s record carries their type, status and wallet balance, and the receipt records exactly who the sale was billed to — walk-in or saved — for that transaction.',
        ],
      },
    ],
    capabilities: [
      ['Walk-in by default', 'Every sale starts without a customer record required.', HiOutlineUserGroup],
      ['Quick capture at checkout', 'Search a saved customer or add one by name and phone mid-sale.', HiOutlineMagnifyingGlass],
      ['Due-sale rule', 'Only a saved customer can carry a balance due — walk-ins can’t.', HiOutlineShieldCheck],
      ['Wallet balance at the till', 'Customer wallet balance is visible and updates from the sale.', HiOutlineCreditCard],
    ],
    sibling: 'retail-pos/billing-and-checkout',
    siblingLabel: 'Billing & Checkout',
  },
  'retail-pos/store-reports': {
    pillar: 'retail-pos',
    icon: HiOutlineChartBarSquare,
    badge: 'Store Reports',
    eyebrow: 'Retail POS · Daily Closing',
    title: 'Retail Store Reports',
    keyword: 'retail POS sales reports',
    seoTitle: 'Retail POS Sales Reports | Nexora Retail POS',
    seoDescription: 'A daily closing report built from real till transactions — cash reconciliation, sales by payment method and items sold — Nexora Retail POS store reports.',
    intro: 'Store reports in Nexora Retail POS are built from the till itself — a daily closing report that reconciles cash and sales for the counter, not a general business dashboard.',
    sections: [
      {
        heading: 'A daily closing report, built from real transactions',
        paragraphs: [
          'At the end of a shift or day, the till produces a closing report — opening cash against closing cash, gross sales, discounts, tax, dues collected and items sold — computed directly from that period’s actual orders, not a manual tally.',
        ],
        bullets: [
          'Refunded or cancelled orders are excluded from the report’s active sales figures',
          'The report can be filtered to today or a custom date range',
        ],
      },
      {
        heading: 'Broken down by payment method and item',
        paragraphs: [
          'Sales are grouped by payment method, so a cashier or owner can see how much came in as cash versus card or mobile wallet, alongside a count of items sold — a store-level view, not a company-wide one.',
        ],
      },
      {
        heading: 'Printed at the counter or exported',
        paragraphs: [
          'The closing report prints as a thermal receipt for the counter or exports as a CSV — built for reconciling a till at the end of a shift, not for boardroom analytics.',
        ],
        links: [{ to: '/solutions/reports', text: 'For cross-module business reports, see Nexora Reports' }],
      },
    ],
    capabilities: [
      ['Daily closing report', 'Opening cash, closing cash, gross sales, discounts and dues in one report.', HiOutlineChartBarSquare],
      ['Payment-method breakdown', 'See sales split across cash, card and mobile wallet.', HiOutlineCreditCard],
      ['Items sold count', 'Track how many items were sold in the period.', HiOutlineDocumentChartBar],
      ['Print or export', 'Print the closing report as a thermal receipt or export it as CSV.', HiOutlineClipboardDocumentList],
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
  'pharmacy-pos/supplier-purchases': {
    pillar: 'pharmacy-pos',
    icon: HiOutlineBuildingStorefront,
    badge: 'Supplier Purchases',
    eyebrow: 'Pharmacy POS · Supplier & Purchasing',
    title: 'Pharmacy Supplier Purchases',
    keyword: 'pharmacy supplier purchase management',
    seoTitle: 'Pharmacy Supplier Purchase Management | Nexora Pharmacy POS',
    seoDescription: 'Raise purchase orders, manage pharmacy supplier records, returns and payments — Nexora Pharmacy POS keeps medicine purchasing in one workspace.',
    intro: 'Restocking a pharmacy counter runs through the same purchasing workspace as the medicine stock it feeds — purchase orders, supplier records and payments, all in one place.',
    sections: [
      {
        heading: 'Purchase orders tied to supplier records',
        paragraphs: [
          'Purchase orders are raised against supplier records that hold contact and pricing details, so reordering medicine stock from a known supplier doesn’t mean re-entering their information each time.',
        ],
      },
      {
        heading: 'Returns and payments, tracked against the same supplier',
        paragraphs: [
          'Stock can be returned to a supplier when needed, and supplier payments are recorded against cash, bank transfer, cheque or a mobile wallet like JazzCash or EasyPaisa — keeping what’s owed to each pharmacy supplier accurate without a separate ledger.',
        ],
      },
    ],
    capabilities: [
      ['Purchase orders', 'Raise purchase orders for medicine stock against supplier records.', HiOutlineClipboardDocumentList],
      ['Supplier records', 'Keep pharmacy supplier contact and pricing details in one place.', HiOutlineBuildingStorefront],
      ['Supplier returns', 'Return medicine stock to a supplier when needed.', HiOutlineTruck],
      ['Supplier payments', 'Record payments by cash, bank transfer, cheque or mobile wallet.', HiOutlineCreditCard],
    ],
    sibling: 'pharmacy-pos/medicine-inventory',
    siblingLabel: 'Medicine Inventory',
  },
  'pharmacy-pos/batch-and-expiry-tracking': {
    pillar: 'pharmacy-pos',
    icon: HiOutlineShieldCheck,
    badge: 'Batch & Expiry Tracking',
    eyebrow: 'Pharmacy POS · Stock Safety',
    title: 'Batch & Expiry Tracking for Pharmacies',
    keyword: 'pharmacy expiry tracking software',
    seoTitle: 'Pharmacy Expiry Tracking Software | Nexora Pharmacy POS',
    seoDescription: 'Monitor batches, expiry dates and near-expiry medicines as part of Nexora Pharmacy POS — keeping expired stock from becoming a loss.',
    intro: 'Medicine stock in a pharmacy carries a shelf life that regular retail stock doesn’t — Nexora Pharmacy POS is built with that in mind, as part of its medicine inventory.',
    sections: [
      {
        heading: 'Watching batches and expiry as part of medicine inventory',
        paragraphs: [
          'As part of Nexora Pharmacy POS’s medicine inventory, batches, expiry dates and near-expiry medicines are monitored — so stock approaching its shelf life doesn’t sit unnoticed until it becomes unsellable, and a loss.',
        ],
      },
      {
        heading: 'Part of the same inventory workspace',
        paragraphs: [
          'Batch and expiry visibility isn’t a separate tool — it’s built into the same medicine inventory workspace used for stock levels, categories and supplier purchases, so a pharmacy counter isn’t switching between systems to keep expired stock off the shelf.',
        ],
        links: [
          { to: '/pharmacy-pos/medicine-inventory', text: 'Medicine Inventory' },
          { to: '/pharmacy-pos/supplier-purchases', text: 'Supplier Purchases' },
        ],
      },
    ],
    capabilities: [
      ['Batch monitoring', 'Batches are monitored as part of medicine inventory.', HiOutlineShieldCheck],
      ['Expiry date visibility', 'Expiry dates are tracked so stock doesn’t go unnoticed until it expires.', HiOutlineCalendarDays],
      ['Near-expiry visibility', 'Medicines approaching expiry are surfaced before they become unsellable.', HiOutlineChartBarSquare],
      ['Built into medicine inventory', 'Part of the same workspace as stock levels and supplier purchases — not a separate tool.', HiOutlineCube],
    ],
    sibling: 'pharmacy-pos/medicine-inventory',
    siblingLabel: 'Medicine Inventory',
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
  'school-erp/fee-management': {
    pillar: 'school-erp',
    icon: HiOutlineBanknotes,
    badge: 'Fee Management',
    eyebrow: 'School ERP · Finance',
    title: 'School Fee Management',
    keyword: 'school fee management software',
    seoTitle: 'School Fee Management Software | Nexora School ERP',
    seoDescription: 'Run fee approvals, monthly billing and fee collection reporting from one workspace — Nexora School ERP fee management.',
    intro: 'School fees in Nexora move through the same approval-based billing workflow as any other invoice, tailored specifically for monthly fee cycles.',
    sections: [
      {
        heading: 'Fee bills start pending approval, not paid',
        paragraphs: [
          'A school fee bill is created and starts pending approval rather than being marked paid immediately — routed through Nexora’s Approval Center as a fee approval — so a front-desk collection doesn’t get recorded as settled before it’s actually confirmed.',
        ],
      },
      {
        heading: 'Billed by the month, tracked over time',
        paragraphs: [
          'Fee records carry their own fee month, so recurring monthly billing stays organized cycle to cycle, and fee collection trends are visible on the School Reports dashboard rather than requiring a manual month-by-month tally.',
        ],
      },
    ],
    capabilities: [
      ['Fee approval workflow', 'Fee bills are routed through an approval step before being marked paid.', HiOutlineCheckCircle],
      ['Monthly fee billing', 'Fee records are tied to a specific fee month for recurring billing.', HiOutlineCalendarDays],
      ['Approval Center routing', 'Fee approvals are handled through the same Approval Center as other billing.', HiOutlineClipboardDocumentList],
      ['Fee collection reporting', 'Fee collection trends are visible on the School Reports dashboard.', HiOutlineChartBarSquare],
    ],
    sibling: 'school-erp/admissions-and-students',
    siblingLabel: 'Admissions & Students',
  },
  'school-erp/payroll': {
    pillar: 'school-erp',
    icon: HiOutlineUserGroup,
    badge: 'Staff Payroll',
    eyebrow: 'School ERP · Staff Operations',
    title: 'School Staff Payroll',
    keyword: 'school payroll management software',
    seoTitle: 'School Payroll Management Software | Nexora School ERP',
    seoDescription: 'Manage staff roles, pay frequency, gross pay and deductions — Nexora School ERP payroll keeps every staff payment on record.',
    intro: 'School staff — teachers, admin staff, accountants, drivers and more — are paid through one payroll workspace, with each payment recorded against its own frequency and deductions.',
    sections: [
      {
        heading: 'Every staff role, its own pay setup',
        paragraphs: [
          'Staff members are added to payroll by role — Accountant, Admin Staff, Driver and others — with a pay frequency set per person: Daily, Hourly, Monthly, or Custom, matching how each role actually gets paid.',
        ],
      },
      {
        heading: 'Gross pay, deductions and a full transaction record',
        paragraphs: [
          'Each payroll entry tracks gross pay and any deductions, paid out through cash, bank transfer, cheque or a mobile wallet like JazzCash or EasyPaisa, with every payment kept in a payroll transactions log for the school’s records.',
        ],
      },
    ],
    capabilities: [
      ['Staff roles', 'Add staff by role — Accountant, Admin Staff, Driver and more.', HiOutlineUserGroup],
      ['Flexible pay frequency', 'Set pay as Daily, Hourly, Monthly or Custom per staff member.', HiOutlineCalendarDays],
      ['Gross pay & deductions', 'Track gross pay and deductions for every payroll entry.', HiOutlineBanknotes],
      ['Payroll transaction log', 'Every payment is recorded in a payroll transactions history.', HiOutlineDocumentChartBar],
    ],
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
  'crm/invoices': {
    pillar: 'crm',
    icon: HiOutlineDocumentChartBar,
    badge: 'Invoices',
    eyebrow: 'CRM · Billing',
    title: 'CRM Invoices',
    keyword: 'CRM invoicing software',
    seoTitle: 'CRM Invoicing Software | Nexora CRM',
    seoDescription: 'Create business invoices with Draft, Approved, Overdue and Cancelled statuses, multiple payment methods and tax-exclusive amounts — Nexora CRM invoices.',
    intro: 'Invoices in Nexora CRM connect directly to the customers and deals they belong to, with a status that reflects exactly where each one stands.',
    sections: [
      {
        heading: 'A status for every stage of an invoice',
        paragraphs: [
          'Every invoice carries a clear status — Draft, Approved, Overdue or Cancelled — so a sales or accounts team can see at a glance which invoices are still being prepared, which are confirmed, and which need to be chased.',
        ],
      },
      {
        heading: 'Built for real business invoicing',
        paragraphs: [
          'Invoices support tax-exclusive amounts, a grand total spelled out in words, and both manual and recommended line items — with payment recorded against cash, card, bank transfer, cheque or a mobile wallet once it comes in.',
        ],
      },
    ],
    capabilities: [
      ['Draft to Overdue status', 'Track every invoice from Draft through Approved, Overdue or Cancelled.', HiOutlineDocumentChartBar],
      ['Tax-exclusive amounts', 'Invoice amounts can be set tax-exclusive, with the grand total spelled out in words.', HiOutlineBanknotes],
      ['Manual & recommended line items', 'Add line items manually or use recommended items when creating an invoice.', HiOutlineClipboardDocumentList],
      ['Multiple payment methods', 'Record payment by cash, card, bank transfer, cheque or mobile wallet.', HiOutlineCreditCard],
    ],
    sibling: 'crm/customers',
    siblingLabel: 'Customers',
  },
  'crm/tasks-and-follow-ups': {
    pillar: 'crm',
    icon: HiOutlineCheckCircle,
    badge: 'Tasks & Follow-Ups',
    eyebrow: 'CRM · Execution',
    title: 'CRM Tasks & Follow-Ups',
    keyword: 'CRM follow-up management software',
    seoTitle: 'CRM Follow-Up Management Software | Nexora CRM',
    seoDescription: 'Run a follow-up board with agent workload visibility and email or WhatsApp reminders — Nexora CRM keeps every follow-up from slipping through.',
    intro: 'Once a lead or customer needs a follow-up, Nexora CRM turns it into a task on a shared board — with reminders that go out on their own, so nothing depends on someone remembering.',
    sections: [
      {
        heading: 'A follow-up board the whole team can see',
        paragraphs: [
          'Follow-ups sit on a dedicated board, with an agent workload view showing how tasks are distributed across the team — useful for spotting when one person is overloaded while another has room to take on more.',
        ],
      },
      {
        heading: 'Reminders that go out automatically',
        paragraphs: [
          'Reminder notifications are sent by email and WhatsApp, so a follow-up doesn’t rely on someone checking the CRM at the right moment — the reminder reaches the person who owns the task on its own.',
        ],
      },
    ],
    capabilities: [
      ['Follow-up board', 'See every open follow-up on one shared board.', HiOutlineClipboardDocumentList],
      ['Agent workload view', 'See how follow-up tasks are distributed across the team.', HiOutlineUserGroup],
      ['Email reminders', 'Automatic email reminders for upcoming and overdue follow-ups.', HiOutlineDocumentChartBar],
      ['WhatsApp reminders', 'Reminder notifications also go out over WhatsApp.', HiOutlineCalendarDays],
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
  'transport-fleet/customer-ledger': {
    pillar: 'transport-fleet',
    icon: HiOutlineUserGroup,
    badge: 'Customer Ledger',
    eyebrow: 'Fleet · Customer Accounts',
    title: 'Fleet Customer Ledger',
    keyword: 'fleet customer ledger software',
    seoTitle: 'Fleet Customer Ledger Software | Nexora Fleet & Rental',
    seoDescription: 'See booking history and outstanding dues per customer, and every customer who owes money — Nexora Fleet & Rental customer ledger.',
    intro: 'Every rental customer in Nexora Fleet & Rental has a ledger of their own — booking history and outstanding dues in one view, not scattered across individual bookings.',
    sections: [
      {
        heading: 'Booking history per customer',
        paragraphs: [
          'Instead of looking up bookings one at a time, each customer’s record shows their full booking history — useful for spotting a repeat renter or checking how a particular customer has used the fleet over time.',
        ],
      },
      {
        heading: 'Dues that don’t get lost between bookings',
        paragraphs: [
          'Outstanding dues are tracked per customer, with a dedicated view for customers with dues and a running total customer count — so a fleet operator can see who owes money across all their bookings, not just the most recent one.',
        ],
      },
    ],
    capabilities: [
      ['Customer records', 'Every rental customer has their own record in the ledger.', HiOutlineUserGroup],
      ['Booking history', 'See a customer’s full booking history in one place.', HiOutlineClipboardDocumentList],
      ['Outstanding dues', 'Track what each customer owes across all their bookings.', HiOutlineBanknotes],
      ['Customers with dues view', 'A dedicated view surfaces every customer who currently owes money.', HiOutlineChartBarSquare],
    ],
    sibling: 'transport-fleet/rental-bookings',
    siblingLabel: 'Rental Bookings',
  },
  'transport-fleet/payments-and-dues': {
    pillar: 'transport-fleet',
    icon: HiOutlineCreditCard,
    badge: 'Payments & Dues',
    eyebrow: 'Fleet · Daily Collection',
    title: 'Fleet Payments & Dues',
    keyword: 'fleet payment collection software',
    seoTitle: 'Fleet Payment Collection Software | Nexora Fleet & Rental',
    seoDescription: 'Reconcile daily collections, see Net Collected vs Net Today, and track outstanding dues fleet-wide — Nexora Fleet & Rental payments and dues.',
    intro: 'Payments and dues in Nexora Fleet & Rental take a fleet-wide view — what’s been collected today, what’s outstanding, and where refunds and cancellations stand.',
    sections: [
      {
        heading: 'Net Collected vs Net Today',
        paragraphs: [
          'Collections are reconciled as Net Collected against Net Today, giving a fleet-wide read on how much has actually come in for the day versus what was billed — the daily collection picture, not a single booking’s payment history.',
        ],
      },
      {
        heading: 'Outstanding dues across every customer',
        paragraphs: [
          'Dues owed across the fleet are tracked in one place, tied to booking status control, so an operator can see which bookings still have money outstanding without checking each rental individually.',
        ],
      },
      {
        heading: 'Cancellations and refunds, accounted for',
        paragraphs: [
          'Cancelled bookings and refund entries are recorded as part of the same collection view — for the per-booking refund amount, method and date on a specific rental, that detail lives on the booking itself.',
        ],
        links: [{ to: '/transport-fleet/rental-bookings', text: 'See per-booking payment detail on Rental Bookings' }],
      },
    ],
    capabilities: [
      ['Net Collected vs Net Today', 'A fleet-wide reconciliation of what’s been collected against what was billed today.', HiOutlineChartBarSquare],
      ['Outstanding dues', 'Track dues owed across every customer, not just one booking.', HiOutlineBanknotes],
      ['Booking status payment control', 'Payment status is tied to booking status across the fleet.', HiOutlineClipboardDocumentList],
      ['Cancelled & refund entries', 'Cancellations and refunds are accounted for in the collection view.', HiOutlineCreditCard],
    ],
    sibling: 'transport-fleet/rental-bookings',
    siblingLabel: 'Rental Bookings',
  },
}
