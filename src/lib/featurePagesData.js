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
  HiOutlineCloud,
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
    title: 'Kitchen Order Ticket (KOT) System & Kitchen Display',
    keyword: 'kitchen order ticket, what is kitchen order ticket, kitchen order ticket system, kitchen order ticket format, kitchen order ticket printer, KOT full form, KOT format for restaurant, what is KOT in restaurant, kitchen display system for restaurants',
    seoTitle: 'Kitchen Order Ticket (KOT) System & Display | Nexora',
    seoDescription: 'What is a KOT in a restaurant? KOT full form, ticket format and how Nexora’s kitchen order ticket system moves orders from Pending to Preparing to Ready to Served.',
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
      {
        heading: 'What is a KOT? Full form and meaning',
        paragraphs: [
          'KOT stands for Kitchen Order Ticket (some restaurants say Kitchen Order Token). It is the slip, printed or on a screen, that carries an order from the counter or the table to the kitchen, so the cook reads exactly what to prepare instead of relying on a shouted or handwritten order. The customer’s bill is a separate document: the KOT is for the kitchen, the bill is for the guest.',
        ],
      },
      {
        heading: 'KOT format: what a good ticket shows',
        paragraphs: [
          'A clear KOT keeps to a short, fixed layout so the kitchen can read it at a glance during a rush. On Nexora the ticket carries the items below, and you can reprint any KOT from the order list.',
        ],
        bullets: [
          'The KOT or order number, so the ticket can be matched to the bill',
          'The table number for dine-in, or the order type (takeaway or delivery) for everything else',
          'Every item with its quantity, for example "2x Chicken Karahi"',
          'How long the order has been waiting, on the kitchen display',
        ],
      },
    ],
    capabilities: [
      ['Pending → Preparing → Ready → Served', 'A guided, forward-only status flow keeps the kitchen and the floor reading from the same ticket state.', HiOutlineFire],
      ['Table or order-type tagging', 'Dine-in tickets show the table number; takeaway and delivery tickets show the order type instead.', HiOutlineTableCells],
      ['Station-grouped tickets', 'Kitchens with more than one prep area see only the tickets relevant to that station.', HiOutlineClipboardDocumentList],
      ['Same-day sales & expense report', 'A Today Report rolls up order-type sales, category sales and logged expenses for the shift.', HiOutlineChartBarSquare],
    ],
    faqs: [
      ['What is a kitchen order ticket?', 'A kitchen order ticket is the slip or screen ticket that carries an order from the counter or table to the kitchen. It lists the table or order type and every item with its quantity, so the kitchen knows exactly what to prepare. KOT is the short form.'],
      ['Can I print a kitchen order ticket?', 'Yes. Kitchen order tickets can be printed on a 58mm thermal receipt printer, and any printed KOT can be reprinted from the order list. A kitchen display shows the same ticket on a screen if you want to go paperless.'],
      ['What is the full form of KOT in a restaurant?', 'KOT stands for Kitchen Order Ticket. Some restaurants also say Kitchen Order Token. It is the slip or screen ticket that sends an order from the counter or table to the kitchen.'],
      ['What is the difference between a KOT and a bill?', 'A KOT goes to the kitchen and lists what to cook. A bill goes to the customer and lists what they owe, with discount, service charge and tax. One order produces both, but they are different documents.'],
      ['What should a KOT format include?', 'The KOT or order number, the table number or order type, each item with its quantity, and the time. Keep it short so the kitchen can read it quickly. Nexora’s tickets show the number, the table or order type, the items with quantities and the waiting time.'],
      ['Can I use a KOT without a kitchen display?', 'Yes. A KOT can be printed on a thermal printer and handed to the kitchen. A kitchen display replaces the paper with a live screen, so the kitchen can also mark each order as started, ready and served.'],
      ['Can I reprint a KOT?', 'Yes. Every printed KOT and receipt can be reprinted from the order list.'],
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
    keyword: 'restaurant menu management software, menu card OCR, AI menu import, digitize restaurant menu from photo',
    seoTitle: 'Restaurant Menu Management Software | Nexora POS',
    seoDescription: 'Turn a photo of your menu card into POS menu items with AI (menu card OCR), then organize categories, prices and recipes — Nexora Restaurant POS menu management.',
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
        heading: 'Menu card OCR: from a photo to POS items',
        paragraphs: [
          'Menu card OCR means a program reads the text on a photo of your printed menu and turns it into data. Nexora’s AI menu import goes one step further: it reads the items, prices and categories from the photo and builds the menu list for you, so you are not typing a hundred dishes by hand on day one.',
          'Take a clear, well-lit photo of each menu page and upload it. Then review the imported items and prices once, correct anything the photo made unclear, and start billing.',
        ],
        bullets: [
          'Photograph one page at a time, flat and with no glare',
          'Check prices and spellings after the import, especially on small print',
          'Items you add later are entered in the same menu list',
        ],
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
    faqs: [
      ['What is menu card OCR?', 'OCR (optical character recognition) reads text from a picture. Menu card OCR reads the text on a photo of your printed menu so you do not have to type it in. Nexora’s AI menu import also picks out the item names, prices and categories.'],
      ['Can I upload a photo of my menu instead of typing it?', 'Yes. Upload a photo of your existing menu and Nexora’s AI reads the items and builds the list. You can also add items by hand at any time.'],
      ['Do I need to check the menu after an import?', 'Yes, a quick review is a good habit. Photos with small print, glare or handwriting can be read wrongly, so check names and prices before you start taking orders.'],
      ['Can I link a menu item to a recipe?', 'Yes. Each menu item can be linked to a recipe with its ingredients, which powers ingredient stock and food cost on the inventory side.'],
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
  'restaurant-pos/offline-billing': {
    pillar: 'restaurant-pos',
    icon: HiOutlineCloud,
    badge: 'Offline Billing',
    eyebrow: 'Restaurant POS · Works Without Internet',
    title: 'Offline POS System for Restaurants',
    keyword: 'offline pos system, restaurant pos systems offline mode, offline-capable pos systems internet outages, pos system offline, offline restaurant POS, restaurant POS without internet',
    seoTitle: 'Offline Restaurant POS System: Billing Without Internet',
    seoDescription: 'Restaurant POS with offline mode: keep billing through internet outages. Orders save on the device and sync to the cloud when you are back online.',
    intro: 'A slow or dropped connection should never stop a rush. Nexora is an offline-capable restaurant POS: it keeps taking orders through an internet outage and syncs them to the cloud when the connection returns.',
    design: 'apple',
    mock: 'offline',
    steps: [
      ['Order saved on the device', 'The cashier keeps billing. Each order is stored on the counter device the moment it is placed.'],
      ['Connection returns', 'Nexora notices the internet is back without anyone having to press anything.'],
      ['Synced to the cloud', 'Queued orders are sent to the cloud, so the dashboard and reports are complete again.'],
    ],
    compare: {
      heading: 'Cloud-only POS vs Nexora offline billing',
      columns: ['', 'Cloud-only POS', 'Nexora'],
      rows: [
        ['Internet drops during service', 'Billing can stop until it returns', 'Billing keeps going'],
        ['Orders taken during the outage', 'May need to be entered again', 'Kept on the device and synced'],
        ['Reports from anywhere', 'Yes', 'Yes, once orders sync'],
      ],
    },
    sections: [
      {
        heading: 'What happens when the internet drops',
        paragraphs: [
          'This is offline mode for a restaurant POS. The counter keeps working. Each order is saved on the device first, so the cashier can keep billing instead of waiting for a page to load. As soon as the connection returns, Nexora sends the queued orders to the cloud, so the owner dashboard and the reports are complete again.',
        ],
      },
      {
        heading: 'Why restaurants need it',
        paragraphs: [
          'A restaurant cannot pause service for a router restart or a power cut at the exchange. A purely cloud-based POS that needs a live connection for every tap leaves the cashier with a frozen screen at the busiest moment. A POS that saves locally and syncs later keeps the line moving.',
        ],
        bullets: [
          'Billing and orders carry on during a short outage',
          'Nothing needs to be re-entered by hand afterwards',
          'You still get the benefits of the cloud: reports from anywhere and one shared record',
        ],
      },
      {
        heading: 'Cloud and offline, together',
        paragraphs: [
          'Nexora is a cloud-connected POS with offline billing built in, not an offline-only program stuck on one computer. That means your data is in the cloud when you are online and the counter does not stop when you are not. If you are comparing the two approaches, our guide sets them side by side.',
        ],
        links: [
          { to: '/compare/cloud-vs-offline-pos', text: 'Compare cloud and offline POS' },
          { to: '/restaurant-pos/billing-and-receipts', text: 'How billing and receipts work' },
        ],
      },
      {
        heading: 'Set it up for a shaky connection',
        paragraphs: [
          'For a counter with an unreliable connection, run Nexora on a Windows PC or laptop with the free desktop app and print bills and kitchen copies on a 58mm thermal printer. Create your workspace while you are online, add your menu and staff, and the counter is ready for the next outage.',
        ],
        links: [{ to: '/download/restaurant-pos', text: 'Download the Windows app' }],
      },
    ],
    capabilities: [
      ['Orders saved on the device', 'Each order is kept on the counter device first, so billing does not wait for the internet.', HiOutlineCloud],
      ['Automatic sync', 'Queued orders are sent to the cloud when the connection comes back.', HiOutlineChartBarSquare],
      ['Complete reports afterwards', 'The owner dashboard and daily reports are filled in once the orders sync.', HiOutlineDocumentChartBar],
      ['Windows desktop app', 'Run the counter on a Windows PC or laptop with the free installer.', HiOutlineBuildingStorefront],
    ],
    faqs: [
      ['Does Nexora Restaurant POS work without internet?', 'Billing keeps working when the internet drops. Orders are saved on the counter device and synced to the cloud as soon as the connection returns.'],
      ['Will I lose orders if the internet goes down?', 'No. Orders taken during the outage are kept on the device and sent to the cloud automatically when the connection is back, so you do not enter them again.'],
      ['What is an offline POS system?', 'An offline POS system is point-of-sale software that can keep taking sales when the internet is not available. Nexora saves orders on the device and syncs them when the connection is back, so you get offline billing and cloud reports together.'],
      ['Does a restaurant POS work in offline mode during an internet outage?', 'Nexora does. Billing continues during the outage, and the queued orders sync to the cloud afterwards.'],
      ['Is this an offline-only POS?', 'No. Nexora is cloud-connected, so your data and reports live in the cloud. Offline billing is what keeps the counter running when the connection is down.'],
      ['Do I need the Windows app for offline billing?', 'For a counter with an unreliable connection we recommend the free Windows desktop app. It is the setup built for a fixed counter PC or laptop.'],
      ['When do my reports update?', 'Reports are complete once the queued orders have synced. If the connection was down for a while, give it a moment after you are back online.'],
      ['Is there a free trial?', 'Yes. Every module has a free one-month trial, so you can test offline billing at your own counter.'],
    ],
    sibling: 'restaurant-pos/billing-and-receipts',
    siblingLabel: 'Billing & Receipts',
  },
  'restaurant-pos/cafe-fast-food-cloud-kitchen': {
    pillar: 'restaurant-pos',
    icon: HiOutlineBuildingStorefront,
    badge: 'Cafe, Fast Food & Cloud Kitchen',
    eyebrow: 'Restaurant POS · Cafes, Takeaway & Delivery',
    title: 'Fast Food & Cafe POS System for Cloud Kitchens Too',
    keyword: 'fast food pos system, pos system for fast food restaurant, cafe pos system, pos system for cafe, pos systems for cafes, cloud kitchen software, pos software for cloud kitchen, takeaway and delivery POS',
    seoTitle: 'Fast Food & Cafe POS System, Cloud Kitchen Software',
    seoDescription: 'POS system for fast food, cafes and cloud kitchens: quick-bill counter sales, takeaway and delivery orders, kitchen tickets and daily reports. Free trial.',
    intro: 'A cafe, a burger counter and a delivery-only kitchen all need to bill fast, but not in the same way. Nexora is a fast food and cafe POS system that also works as cloud kitchen software, with no dining floor to manage.',
    design: 'apple',
    mock: 'counter',
    steps: [
      ['Add your menu', 'Photograph your menu or type it in. Items, prices and categories like Combo and Add-on are ready in minutes.'],
      ['Ring up the order', 'Use quick-bill for a counter sale, or choose takeaway or delivery and add the address.'],
      ['Kitchen and close', 'The kitchen ticket goes out at once, and the Today Report closes the day by order type.'],
    ],
    sections: [
      {
        heading: 'A cafe POS system built for repeat orders',
        paragraphs: [
          'A cafe runs on short, repeat orders. Quick-bill lets the cashier ring up a counter sale without opening a table, and Add-on items such as extra shots or toppings sit in the same menu as drinks and food. When a price or an item changes, the menu is updated in minutes.',
        ],
      },
      {
        heading: 'A fast food POS system that keeps the queue moving',
        paragraphs: [
          'At a fast food counter the queue is the problem. Takeaway orders are billed from the same screen as every other order, and the kitchen ticket reaches the kitchen the moment the order is placed. Combos have their own menu category, so a meal deal is one tap instead of four.',
        ],
      },
      {
        heading: 'Cloud kitchen software without a dining floor',
        paragraphs: [
          'A cloud kitchen has no tables, so there is nothing to set up on a floor plan. Delivery orders carry the customer’s delivery address and rider notes, and the same kitchen tickets and reports apply. You see sales by order type, so you know how much of the day came from delivery.',
        ],
      },
      {
        heading: 'One daily report for the whole shift',
        paragraphs: [
          'At closing, the Today Report breaks the day down by order type and category and includes the same-day expenses, so a cafe owner or a cloud-kitchen manager can see what sold and what was spent without a spreadsheet.',
        ],
        links: [
          { to: '/restaurant-pos/billing-and-receipts', text: 'Billing & receipts' },
          { to: '/restaurant-pos/kot-and-kitchen-display', text: 'Kitchen tickets & display' },
          { to: '/restaurant-pos/offline-billing', text: 'Offline billing' },
        ],
      },
    ],
    capabilities: [
      ['Quick-bill counter sales', 'Ring up a walk-in sale without opening a table.', HiOutlineShoppingCart],
      ['Takeaway and delivery orders', 'Delivery orders keep the address and rider notes with the bill.', HiOutlineTruck],
      ['Combos and add-ons', 'Menu categories for Combo and Add-on items speed up repeat orders.', HiOutlineSquares2X2],
      ['Daily report by order type', 'See sales by order type and category, with the day’s expenses.', HiOutlineChartBarSquare],
    ],
    faqs: [
      ['What is the best POS system for a fast food restaurant?', 'Look for quick billing for takeaway and counter orders, kitchen tickets that reach the kitchen at once, combo items in the menu and a daily report by order type. Nexora covers these, and you can test it on your own menu with the free one-month trial.'],
      ['What should I look for in a POS system for a cafe?', 'A fast counter sale, add-on items in the menu, a clear daily report and receipts on a thermal printer. Nexora has quick-bill, an Add-on category, the Today Report and 58mm thermal receipts.'],
      ['What is cloud kitchen software?', 'Cloud kitchen software runs a delivery-only kitchen: it takes orders, keeps the delivery address, sends tickets to the kitchen and reports sales by order type. Nexora does this without needing a dining floor or tables.'],
      ['Is Nexora a good POS for a small cafe?', 'Yes. A cafe can bill counter sales with quick-bill, keep add-on items in the menu, print bills on a 58mm thermal printer and close the day with a report.'],
      ['Can I run a cloud kitchen without tables?', 'Yes. You do not have to set up tables. Bill takeaway and delivery orders, send kitchen tickets and read the daily report by order type.'],
      ['Does it handle delivery orders?', 'Yes. Delivery orders are billed with the customer’s delivery address and rider notes, the same way as other order types.'],
      ['Can I update my menu quickly when prices change?', 'Yes. Items have their own price and status, so you can change a price or mark an item inactive from the menu.'],
      ['Does it work if the internet is slow?', 'Billing keeps working when the internet drops and orders sync when the connection returns.'],
      ['How much does it cost?', 'Every module has a free one-month trial. See the pricing page for current plans.'],
    ],
    sibling: 'restaurant-pos/menu-management',
    siblingLabel: 'Menu Management',
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
      {
        heading: "Why inventory control decides how much a shop really earns",
        paragraphs: [
          "A shop does not make money when it buys stock or even when it sells it. It makes money when the right product is on the shelf at the moment a customer wants it, and when the cash tied up in everything else stays small. Too little stock means lost sales and disappointed regulars. Too much stock means money sitting on a shelf, products going out of date and staff spending evenings counting boxes.",
          "Retail inventory management software exists to keep those two risks small. In Nexora Retail POS the stock count is not a separate notebook or spreadsheet. It is part of the same system that bills the customer, so every sale lowers the count by itself and every delivery raises it. The number on the screen is meant to match the number on the shelf, and when it does not, there is a clear trail that shows why.",
          "This page explains how that works day to day for a small shop, a grocery store or a supermarket, and what to set up first so the numbers can be trusted.",
        ],
      },
      {
        heading: "Stock status, out-of-stock and low-stock warnings",
        paragraphs: [
          "Each product carries a live stock status. The inventory dashboard counts how many items are out of stock and how many are running low, and shows a short list of the products that need attention first. A banner tells you in plain words how many items are out of stock and how many are low, so the first thing you see in the morning is what to reorder.",
          "Low stock is decided by a minimum stock alert that you set on each product. When the quantity falls to that number or below, the product appears in the low-stock list. A good alert is not a random number. Think about how many units you sell in a day and how many days a supplier needs to deliver, then set the alert so it covers at least that many days of sales.",
          "Because the list is built from live data, you do not have to walk the aisles to find out what is missing. Open the dashboard, read the list, call the supplier and place the order before the shelf is empty.",
        ],
      },
      {
        heading: "Finding products fast: name, SKU, barcode and category",
        paragraphs: [
          "Everything in inventory is searchable by product name, SKU, barcode or category. That sounds small, but it is what makes software usable in a busy shop. A new cashier can find a product by typing a few letters. A manager can pull up a whole category, such as dairy or stationery, in a second. A supplier delivery can be checked line by line by scanning or searching codes.",
          "If you use barcodes, scanning is the quickest way to bill and to receive goods. If you do not, a clear SKU and a consistent product name work almost as well. Whichever you choose, keep the naming style the same across the catalog. Names such as “Lays Masala 50g” and “Lays Masala 50 gm” create two entries for one product, and then the stock is split between them.",
        ],
      },
      {
        heading: "Stock movements and the audit trail",
        paragraphs: [
          "Every change in quantity is saved as a movement with a type. The movement types in the stock screen are stock in, stock out, adjustment, opening balance, damaged, returned and transfer. Because each type is separate, you can answer questions that a single running number never could. How much stock did we lose to damage this month? Which products come back most often? When did this quantity change, and who changed it?",
          "The inventory transactions log can be filtered by transaction type, so you can look only at adjustments, or only at returns. This is the log you open when a count does not match. In most cases the cause is visible there: a delivery that was never entered, a sale made before the purchase was recorded, or a correction that was entered twice.",
          "For an owner who is not in the shop every day, this trail is peace of mind. You do not have to trust that nothing odd happens. You can look.",
        ],
      },
      {
        heading: "Purchases, suppliers and paying them",
        paragraphs: [
          "Buying is the other half of inventory. Nexora keeps supplier records and purchase orders next to the stock itself, so what you ordered, what arrived and what you still owe are in one place. When goods are received, quantities go up. When goods must go back to a supplier, you can record a return so the stock and the supplier balance both stay correct.",
          "You can also record a supplier payment against cash, bank transfer, cheque or a mobile wallet such as JazzCash or EasyPaisa. Recording how you paid matters at month end, when the accountant needs to match the cash drawer, the bank statement and the wallet history. It also protects you in the rare dispute over whether a payment was made.",
          "Over a few months the purchase history shows you which supplier delivers on time, which one changes prices often and which product is cheaper from someone else. That is real negotiating power.",
        ],
      },
      {
        heading: "Step by step: setting up inventory for a new shop",
        paragraphs: [
          "Step 1. Create categories. Use the groups you actually think in, such as beverages, snacks, household and stationery.",
          "Step 2. Add your fastest-selling fifty products first. Give each a clear name, a SKU and, if you scan, a barcode. Enter the cost price and the selling price.",
          "Step 3. Set a minimum stock alert on each of those products using your daily sales and supplier lead time.",
          "Step 4. Enter opening stock, so the history starts from a real count taken on the shelf.",
          "Step 5. Add your suppliers with phone numbers and note which products each one provides.",
          "Step 6. Bill a few test sales and check that the stock falls as expected, then continue adding the rest of the catalog.",
          "Step 7. Once a week, count one shelf or category and compare it with the screen. Fix differences with an adjustment and a short reason.",
        ],
      },
      {
        heading: "Common inventory mistakes in small shops",
        paragraphs: [
          "Counting everything once a year. A single big count finds a year of errors at the same time and nobody can say where they came from. Counting a small slice every week keeps errors small and easy to trace.",
          "Receiving goods late. If a delivery is entered three days after it arrives, the shop sells it while the system says it is out of stock, and stock goes negative. Enter deliveries the day they arrive.",
          "Mixing damaged goods with adjustments. When damage is recorded as an ordinary adjustment, the loss disappears into the noise. Use the damaged type so you can see what waste really costs.",
          "Setting every alert to the same number. Fast and slow products need different alerts.",
          "Skipping cost prices. Without cost, you cannot see which products truly earn money. Product profitability and inventory value reports need it.",
        ],
      },
      {
        heading: "How to choose retail inventory software",
        paragraphs: [
          "Whichever system you choose, a few questions separate software you will actually use from software that ends up in a drawer. Is stock connected to billing, or do you have to enter sales twice? Can your cashiers search by name and barcode quickly? Does it warn you before you run out? Can you see every movement and who made it? Does it work for your whole team with different permissions? And can you start with a free trial using your own products?",
          "Nexora Retail POS answers yes to these within the retail workflow, and every product starts with a free 1-month trial. Setup, data migration and staff training are free on every plan, so you can test the whole routine with your real products before you decide.",
          "If you want a deeper look at reports, read the Reports & Analytics guide in the Help Center. If you want to see how this connects to your counter, read about billing and checkout next.",
        ],
      },
      {
        heading: "Inventory habits for different kinds of shops",
        paragraphs: [
          "Grocery and convenience stores sell many low-priced items quickly, so speed and alerts matter most. Scan the fastest sellers, keep alerts high on daily essentials and review the low-stock list every morning. Items with short shelf lives, such as dairy and bread, deserve a smaller reorder quantity and a closer eye on damage entries.",
          "Stationery, electronics and general stores carry thousands of slow items. Here accurate names, SKUs and categories are what keep the catalog usable. A weekly count of one category at a time keeps the whole shop accurate within a couple of months.",
          "Clothing and fashion shops often have variations such as size and colour. Give each variation a clear name or SKU so that the stock of a blue medium is not mixed with a red large.",
          "Wholesale and multi-branch counters should rely on cloud sync so that every counter and the office see the same numbers, and use transfer movements when stock moves between locations.",
        ],
      },
      {
        heading: "Reading the numbers: what to review each week",
        paragraphs: [
          "On Monday, open the low-stock list and place orders. On Wednesday, check the recent stock movements for anything odd, such as large adjustments. On Friday, count one shelf and fix differences. At month end, run the stock summary and inventory value reports and compare them with last month. This takes less than an hour a week and turns inventory from a worry into a routine.",
        ],
      },
    ],
    capabilities: [
      ['Live stock status', 'Products are flagged automatically when stock needs attention.', HiOutlineChartBarSquare],
      ['Categories & suppliers', 'Organize inventory by category and keep supplier records in the same workspace.', HiOutlineUserGroup],
      ['Purchase orders', 'Raise purchase orders and returns without leaving inventory.', HiOutlineClipboardDocumentList],
      ['Full transaction log', 'Every stock movement is recorded and filterable by type.', HiOutlineDocumentChartBar],
    ],
    faqs: [
      ["Does stock go down automatically when I sell?", "Yes. In Retail POS a completed sale reduces the stock of the items sold, so you do not enter it twice."],
      ["How do low-stock warnings work?", "You set a minimum stock alert on each product. When the quantity reaches that number or below, the product appears in the low-stock list and counts in the dashboard."],
      ["Can I search products by barcode or SKU?", "Yes. Inventory is searchable by product name, SKU, barcode or category."],
      ["Can I return stock to a supplier?", "Yes. You can record a return to a supplier so stock and the supplier balance stay correct."],
      ["Which ways of paying suppliers can I record?", "Cash, bank transfer, cheque and mobile wallets such as JazzCash or EasyPaisa."],
      ["Can I see why a stock count changed?", "Yes. The inventory transactions log shows every movement and can be filtered by type, such as adjustment, damaged or returned."],
      ["How often should I count stock?", "A small weekly count of one shelf or category is easier and more accurate than one large yearly count."],
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
      {
        heading: 'Why discounts need rules and not memory',
        paragraphs: [
          'Every shop gives discounts. A regular customer asks for a little off, a festival sale begins, a manager approves a clearance price. The trouble starts when each of those decisions lives in a cashier’s head. One cashier gives five percent, another gives ten, a third rounds the bill down to the nearest hundred, and at the end of the month nobody can explain why takings are lower than the shelf prices suggest.',
          'Nexora Retail POS replaces that guesswork with a short list of promo codes and settings that the whole counter shares. The owner decides what a promotion is worth. The cashier only applies the code. Because the discount comes from a shared rule and not from a number someone picked on the spot, it is far easier to explain at the end of the month.',
          'This does not take trust away from your staff. It simply makes the right behavior the easy one, which is what good point-of-sale software should do.',
        ],
      },
      {
        heading: 'How promo codes work',
        paragraphs: [
          'A promo is made of a code, a label, a type and a value. The code is the short word the cashier enters, such as EID10 or WELCOME. Codes use capital letters, numbers, hyphens and underscores, up to 32 characters, which keeps them easy to type on a keyboard or read out loud across the counter. The label is the friendly name you will recognize in the settings list, for example “Eid weekend promo”.',
          'The type is either a percentage or a fixed amount. A percentage promo takes that share off the bill, for example ten percent. A fixed promo takes a set amount of money off, such as a hundred rupees. The value is the number that goes with the type. Each promo also has an active switch, so you can pause a promotion without deleting it and switch it on again next season.',
          'You can create a new promo with one tap. The screen proposes a ready-made code that you can keep or rename. A copy button next to each code lets you paste it into a WhatsApp message, a poster caption or a social post without typing it twice.',
        ],
      },
      {
        heading: 'Percentage or fixed amount: which should you use?',
        paragraphs: [
          'Percentage discounts scale with the bill. They suit seasonal sales, loyalty rewards and “spend more, save more” moods, because a bigger basket gets a bigger saving and your margin stays in proportion. Their risk is that a very large bill can give away more than you intended, so keep the percentage modest on expensive items.',
          'Fixed amounts suit welcome offers, referral thank-yous and clearing a slow product. Everyone gets the same visible saving, which is easy to advertise (“Rs. 200 off”), and your cost per promotion is predictable. Their weakness is that on a very small bill the saving can be a large share of the price, so use them for orders you expect to be above a certain size.',
          'If you are unsure, start with a percentage for general promotions and a fixed amount for targeted offers. Review the results after a month and adjust.',
        ],
      },
      {
        heading: 'Tax and discounts together',
        paragraphs: [
          'Discounts and tax are the two numbers most likely to confuse a till. Nexora keeps them in the same place. The Tax & Promo screen holds your promo codes alongside two default rates: the default tax rate for point-of-sale bills and the default tax rate for invoices. Setting these once means every counter applies tax the same way.',
          'Before you launch a promotion, do one test sale. Add a couple of items, apply the code and read the total. Check that the discount and the tax look the way your accountant expects. It takes two minutes and prevents a week of confusing receipts.',
        ],
      },
      {
        heading: 'Step by step: setting up your first promotion',
        paragraphs: [
          'Step 1. Open the Tax & Promo screen from the Retail POS area of your workspace. If you only see the settings and cannot edit them, your role has view-only access. Ask the owner or an admin to change it.',
          'Step 2. Add a promo. Accept the suggested code or type your own, then give it a clear label so your team recognizes it later.',
          'Step 3. Choose percentage or fixed amount and enter the value. Keep it modest the first time.',
          'Step 4. Make sure the promo is active, then save. The new code is ready for the counter.',
          'Step 5. Do a test sale on the point-of-sale screen. Apply the code and confirm the total.',
          'Step 6. Tell your team and your customers. Put the code on a printed card, a shelf label or a WhatsApp message, and copy it straight from the settings list so there are no typing mistakes.',
        ],
      },
      {
        heading: 'Promotion ideas that work in a retail shop',
        paragraphs: [
          'Festival offers. Create a code for each major occasion and switch it on only for those days. A short window creates urgency without training customers to expect permanent discounts.',
          'Welcome offers. Give first-time customers a small fixed saving. It costs little and gives you a reason to take their name and phone number, which builds your customer list.',
          'Loyalty thank-yous. Share a private code with your best customers by message. It makes them feel recognized and is easy to switch off when the campaign ends.',
          'Slow-stock clearing. When a product is not moving, a time-limited code can free shelf space and cash. Check the Product Profitability report first so you do not discount below cost.',
          'End-of-day or end-of-month pushes. A small, clearly announced discount in a quiet period can lift a slow day.',
        ],
      },
      {
        heading: 'Keeping control: who can change discounts',
        paragraphs: [
          'Because discounts affect money directly, access matters. In Nexora, changing promo settings needs the right permission, and users with view-only access can see the list but cannot edit it. A common setup is that owners and managers can create and edit promos, while cashiers can only apply them at the counter.',
          'Combine this with activity logs and the daily sales reports, and you can review who changed settings and how a promotion affected takings. Our Team & Permissions guide explains how to set roles for your staff.',
        ],
      },
      {
        heading: 'A walkthrough at the counter',
        paragraphs: [
          'Imagine a customer buys three items on a festival weekend and mentions the Eid code from your poster. The cashier scans or adds the items as usual, selects the customer or leaves the sale as a walk-in, and applies the promo code at checkout. The total updates, tax follows the default rule, and the customer pays by cash, card or wallet. The receipt is printed, stock goes down, and the day’s sales report includes the sale.',
          'Nothing in that flow asks the cashier to calculate a percentage in their head, which is where most counter mistakes happen. It also means a new employee can handle promotions on their first day, because the rule lives in the system and not in anyone’s experience.',
        ],
      },
      {
        heading: 'Training your cashiers in ten minutes',
        paragraphs: [
          'Show the team the active promo list and explain in one sentence what each code is for. Run two practice sales on the live screen: one with a promo and one without. Ask each person to tell you the total before they confirm it. Then explain what to do when a customer asks for a discount that is not on the list: refer them to the manager, who can decide whether to create a promo or make an exception.',
          'Pin a small card near the counter with the active codes and their conditions. Remove it when a campaign ends. These small habits keep your promotions consistent from the first customer to the last.',
        ],
      },
      {
        heading: 'Measuring whether a promotion worked',
        paragraphs: [
          'A promotion is an experiment, and reports are how you read the result. Compare daily sales during the campaign with the same days in earlier weeks. Look at sales by product to see which items moved. Check Product Profitability to confirm you still earned a healthy margin after the discount.',
          'If sales rose but profit did not, the discount was too generous or aimed at the wrong products. If neither rose, the offer was not noticed, so promote it better. If both rose, repeat it at the next suitable moment and note what you did, so the next campaign starts from a proven idea.',
        ],
      },
      {
        heading: 'Discounts, customers and due sales',
        paragraphs: [
          'Promo codes work alongside customer records. Regular customers can be saved with a name and phone number, which lets you send a private code or thank them personally. Remember that due (credit) sales can only be recorded against a saved customer, so apply the discount first, confirm the final total, and then decide whether the customer pays now or later.',
        ],
      },
      {
        heading: 'Common mistakes and how to avoid them',
        paragraphs: [
          'Leaving old promotions active. A festival code that never gets switched off turns into a permanent discount. Use the active switch when a campaign ends.',
          'Making the code too complicated. Long random strings invite typing mistakes at a busy counter. Prefer short, readable words.',
          'Forgetting the margin. A twenty percent discount on a product with a fifteen percent margin loses money. Check cost price before you set the value.',
          'Skipping the test sale. Always check one real bill before announcing a promotion to customers.',
          'Mixing manual price changes with promo codes. Choose one method per promotion so reports stay clear.',
        ],
      },
    ],
    capabilities: [
      ['Active promo codes', 'Apply promo codes directly at checkout.', HiOutlineTag],
      ['Till-safe discount rules', 'Discount rules are built to behave consistently at the counter.', HiOutlineShieldCheck],
      ['Percentage or fixed PKR', 'Set discounts as a percentage or a fixed PKR amount.', HiOutlineBanknotes],
      ['Tax defaults', 'Configure tax defaults alongside discount rules for consistent totals.', HiOutlineDocumentChartBar],
    ],
    faqs: [
      ['Can I give a percentage discount and a fixed amount discount?', 'Yes. Each promo is either a percentage or a fixed amount. You choose the type and the value when you create it.'],
      ['How do cashiers apply a promo code?', 'The cashier applies an active promo code at checkout on the point-of-sale screen, so there is no manual price change to remember.'],
      ['Can I pause a promotion without deleting it?', 'Yes. Every promo has an active switch. Turn it off when the campaign ends and on again when you want to reuse it.'],
      ['Where do I set tax for the till?', 'The Tax & Promo screen holds the default POS tax rate and the default invoice tax rate next to your promo codes.'],
      ['Who can edit promo codes?', 'Users with the right permission. People with view-only access can see the list but cannot change it.'],
      ['Can I copy a code to share with customers?', 'Yes. There is a copy button next to each code so you can paste it into a message or post without retyping.'],
      ['Does the discount show in reports?', 'Sales are recorded with the discount applied, so daily and monthly sales reports reflect the reduced totals.'],
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
      {
        heading: "Why pharmacy purchasing needs its own discipline",
        paragraphs: [
          "A pharmacy buys many small items from many suppliers, often with different prices, credit terms and delivery days. Medicines expire, brands overlap and prices change. When purchasing is managed by memory or by a notebook, stock runs out of fast movers, slow movers pile up near expiry, and supplier balances become arguments.",
          "People who search for pharmacy purchase management, pharmacy supplier software and pharmacy purchase order format are trying to put structure around this. The goal is simple: buy the right quantity from the right supplier at the right price, record it once, and always know what you owe.",
        ],
      },
      {
        heading: "Supplier records that you only enter once",
        paragraphs: [
          "In Nexora Pharmacy POS, each supplier has a record with contact and pricing details. When you raise a purchase order, you choose the supplier and the details come with it. That means no re-typing phone numbers and no hunting for the last price you paid.",
          "Keep supplier records tidy. Use the supplier’s trading name, add a phone number that is answered, and note anything that matters, such as the day they deliver or the minimum order.",
        ],
      },
      {
        heading: "What a pharmacy purchase order should contain",
        paragraphs: [
          "Searching for a pharmacy purchase order format is common, so here is what a good one includes. The pharmacy’s name and contact details. The supplier’s name and contact. A purchase order number and date. A list of medicines with name, strength or form, pack size and quantity ordered. The agreed rate or the price per unit. The expected delivery date and payment terms. A line for notes, for example a request for specific batches or minimum expiry. A signature or approval line.",
          "In Nexora you create the order from your supplier and product records, so those fields are already there. When goods arrive, you receive them against the order and stock rises to match.",
        ],
      },
      {
        heading: "Receiving goods and keeping stock in step",
        paragraphs: [
          "A purchase only helps if it reaches the stock count. When a delivery comes, check the medicines against the order: names, strengths, quantities and, importantly, expiry dates and batch numbers. Record what actually arrived. Anything short or wrong should be noted so that the supplier can correct it.",
          "Because purchasing sits in the same workspace as medicine stock, there is one count of what you have. The Medicine Inventory and batch and expiry tracking pages explain how batches are managed once the goods are in.",
        ],
      },
      {
        heading: "Returns: sending medicine back the right way",
        paragraphs: [
          "Sometimes medicine has to go back: a wrong item, damaged packaging, short-dated stock or an expired batch the supplier agreed to take back. Nexora lets you record the return to the supplier, so stock is reduced and the amount you owe is reduced as well. Without that record, the returned goods simply vanish from the count and the supplier balance stays wrong.",
          "Agree return terms with each supplier up front, and write them in the supplier notes. Knowing which supplier accepts short-dated returns saves a surprising amount of money over a year.",
        ],
      },
      {
        heading: "Paying suppliers: cash, bank, cheque and wallets",
        paragraphs: [
          "Supplier payments are recorded against cash, bank transfer, cheque or a mobile wallet such as JazzCash or EasyPaisa. That keeps what you owe each supplier accurate without a separate ledger, and it gives you the evidence to settle a disagreement quickly.",
          "Pay on a schedule. Choose a day each week or fortnight to review balances and settle what is due. It builds goodwill with suppliers and makes it easier to ask for better terms.",
        ],
      },
      {
        heading: "Step by step: a weekly purchasing routine",
        paragraphs: [
          "Step 1. Review the low-stock and near-expiry lists first thing on the day you order.",
          "Step 2. Group items by supplier and decide quantities using recent sales, not guesswork.",
          "Step 3. Create a purchase order for each supplier.",
          "Step 4. When goods arrive, check them against the order, including batch and expiry, and receive them.",
          "Step 5. Record any returns for wrong or damaged items.",
          "Step 6. Record payments when you pay.",
          "Step 7. At month end, compare what each supplier statement says with what Nexora shows, and fix differences.",
        ],
      },
      {
        heading: "Getting better prices from suppliers",
        paragraphs: [
          "Purchase history is leverage. When you can show a supplier how much you bought from them over six months, you have a reason to ask for a better rate or longer credit. Compare prices for the same medicine across suppliers every few months, and consolidate orders to meet minimums that unlock discounts. Always check that a cheaper price is not offset by short expiry.",
        ],
      },
      {
        heading: "Choosing pharmacy supplier management software",
        paragraphs: [
          "Look for software where purchasing, stock, batches and expiry share one record, where supplier payments and returns are tracked, and where daily reports are available to the owner. Check that staff roles can limit who can place orders or change prices, and try it free on your own supplier list.",
          "Nexora Pharmacy POS includes all of that, starts with a free 1-month trial, and offers free setup, data migration and staff training on every plan.",
        ],
      },
      {
        heading: "Supplier balances: knowing exactly what you owe",
        paragraphs: [
          "A pharmacy usually buys on credit. Over a month, purchases, returns and payments all change what you owe each supplier. If these are in three places, the balance is a guess. When they are recorded in one workspace, the balance is a result.",
          "Check each supplier’s balance weekly against their statement. A difference of a few hundred rupees now is easy to trace; a difference of a lakh at year end is not.",
        ],
      },
      {
        heading: "Buying the right quantity",
        paragraphs: [
          "Over-buying ties up cash and risks expiry; under-buying loses sales and customers. Use your own sales history to decide quantities: fast movers deserve a buffer, slow movers should be bought in small packs, and seasonal items such as cough syrups, rehydration salts and allergy tablets need planning ahead of the season.",
          "Look at near-expiry stock before you order. If you already hold three months of a medicine that sells slowly, ordering more makes no sense. Ask your supplier about exchange terms before the stock expires.",
        ],
      },
      {
        heading: "Cold chain and special handling",
        paragraphs: [
          "Some medicines need refrigeration or careful handling. When ordering, tell the supplier what you need and check temperatures and packaging on delivery. Record anything damaged or warm as a return rather than putting it on the shelf. Patient safety is more important than any saving.",
        ],
      },
      {
        heading: "Documents and compliance",
        paragraphs: [
          "Keep purchase orders and supplier invoices organised and available. Regulators and auditors may ask where your medicines came from, and you should be able to answer for each batch. Buy only from licensed suppliers, and keep their licence details in the supplier record or notes.",
          "These obligations vary by location, so check the rules that apply to your pharmacy. Nexora helps you keep clean records, but responsibility for compliance stays with the pharmacy.",
        ],
      },
      {
        heading: "Working with more than one supplier",
        paragraphs: [
          "Most pharmacies use a main distributor for the bulk of stock and a few specialists for particular brands. Keep records for each and compare prices and reliability every few months. A supplier who is slightly dearer but always delivers on time may cost less overall than a cheaper one who often runs out.",
          "When a supplier is out of stock, the purchase order history shows the next-best source and what you paid last time.",
        ],
      },
      {
        heading: "Month-end purchasing review",
        paragraphs: [
          "At month end, look at total purchases per supplier, returns, payments made and balances. Compare this with your sales to see whether you are buying more than you sell. Note which supplier gave the best price, which delivered late and which returns were accepted. Use these notes when you negotiate next month.",
        ],
      },
      {
        heading: "A day in the life of purchasing at a busy pharmacy",
        paragraphs: [
          "Morning: the pharmacist checks the low-stock list and notes what sold fast yesterday. Mid-morning: purchase orders go out to the main distributor and one specialist. Afternoon: the delivery arrives, the receiver checks each line against the order, notes expiry and batch details, and receives the goods. Evening: any short or wrong items are recorded as returns, and the owner glances at supplier balances.",
          "The routine is short, but it only works if the information lives in one place and every step is recorded the same day. Small delays turn into reconciliation headaches at month end.",
        ],
      },
      {
        heading: "Common purchasing mistakes in pharmacies",
        paragraphs: [
          "Ordering by memory rather than by sales data. Accepting stock without checking expiry dates. Forgetting to record returns, so the balance stays wrong. Paying suppliers without recording the payment. Using one supplier for everything and having no leverage. Letting staff change prices without approval. Each is avoidable with a simple routine and a system that records what happens.",
        ],
      },
      {
        heading: "Who should be allowed to do what",
        paragraphs: [
          "Purchasing involves money, so roles matter. A counter assistant should not be able to change supplier prices or delete a purchase. A pharmacist or manager may raise orders and receive goods. The owner reviews payments and balances. Nexora’s staff roles and permissions let you give each person the access that fits their job and nothing more.",
          "Review the list of users whenever someone joins or leaves, and remove access promptly when people move on.",
        ],
      },
      {
        heading: "Using purchase data to protect margins",
        paragraphs: [
          "Margin is the difference between what you pay and what you charge. When supplier prices rise and your shelf prices do not, margin quietly disappears. Look at purchase prices every month, compare them with your selling prices, and adjust where the rules allow. Review slow movers and ask whether the margin on them justifies the shelf space.",
          "A pharmacy that watches purchase prices closely often finds that a few items account for most of the lost margin, and fixing those few matters more than haggling on everything.",
        ],
      },
    ],
    capabilities: [
      ['Purchase orders', 'Raise purchase orders for medicine stock against supplier records.', HiOutlineClipboardDocumentList],
      ['Supplier records', 'Keep pharmacy supplier contact and pricing details in one place.', HiOutlineBuildingStorefront],
      ['Supplier returns', 'Return medicine stock to a supplier when needed.', HiOutlineTruck],
      ['Supplier payments', 'Record payments by cash, bank transfer, cheque or mobile wallet.', HiOutlineCreditCard],
    ],
    faqs: [
      ["Can I raise purchase orders against supplier records?", "Yes. Orders are raised against supplier records that hold contact and pricing details."],
      ["Can I return medicine to a supplier?", "Yes. Returns can be recorded so stock and what you owe are both corrected."],
      ["How can I record supplier payments?", "Against cash, bank transfer, cheque or a mobile wallet such as JazzCash or EasyPaisa."],
      ["What should a pharmacy purchase order include?", "Pharmacy and supplier details, order number and date, medicine names with strength and pack size, quantities, rates, delivery date, payment terms and notes."],
      ["Does purchasing update medicine stock?", "Yes. Purchases and stock live in the same workspace, so received goods raise the stock count."],
      ["Can I track expiry and batches?", "Yes. Pharmacy POS includes batch and expiry tracking for medicine stock."],
      ["How often should I pay suppliers?", "Choose a fixed day each week or fortnight to review balances and settle what is due."],
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
    title: 'School Attendance Management Software',
    keyword: 'school attendance management software',
    seoTitle: 'School Attendance Management Software | Nexora School ERP',
    seoDescription: 'Student and staff attendance in one system: mark present, absent, late or leave by hand, or connect a biometric or RFID device. Reports update instantly.',
    intro: 'Nexora School ERP gives your school one attendance system for students and staff. Mark attendance by hand in seconds, or connect a biometric or RFID device so punches arrive on their own. Every record feeds the same school reports, so the principal, the office and the class teachers always look at the same numbers.',
    sections: [
      {
        heading: 'What good school attendance management software should do',
        paragraphs: [
          'Attendance looks simple until a school has several hundred students, a few dozen staff and a register for every class. Paper registers get lost, are copied twice, and are only counted when someone has time. By the time a parent asks how many days a child was absent this term, the office is adding up tick marks by hand.',
          'Good school attendance management software removes that work. It should let a teacher record a day in under a minute, keep one clean record per person per day, make corrections easy, and turn all of it into a report without retyping. It should also work for the way your school already runs: some schools are happy with manual marking, and others want a fingerprint or card reader at the gate. Nexora supports both, and you can use them side by side.',
        ],
      },
      {
        heading: 'Student and staff attendance in one workflow',
        paragraphs: [
          'Most schools track two groups: students and staff. Many tools handle only one of them, which leaves the other on paper. In Nexora the Attendance page has a student mode and a staff mode, and both use the same screen, the same statuses and the same reports.',
          'In student mode you pick the student and the record carries the class and section, so reports can be filtered by class later. In staff mode you pick a teacher or staff member and the record carries the department or role. Teachers and staff can come from Team Management or from the payroll list, so a person added in either place is available for attendance without being entered twice.',
        ],
      },
      {
        heading: 'Marking attendance by hand: date, status and note',
        paragraphs: [
          'Manual marking is the quickest way to start, and it needs no hardware. You choose student or staff, pick the person, set the date, choose a status and add a short note if you want one. Today is selected by default, and you can pick an earlier date when a register was filled in late.',
          'There are four statuses, chosen to match how schools actually talk about attendance:',
        ],
        bullets: [
          'Present: the student or staff member attended the day.',
          'Absent: no attendance and no approved reason on record.',
          'Late: the person arrived after the start of the day, so lateness can be tracked separately from absence.',
          'Leave: an excused absence, so approved leave is not mixed up with unexplained absence.',
        ],
      },
      {
        heading: 'One record per person per day, and easy corrections',
        paragraphs: [
          'A common problem with spreadsheets is duplicates: the same student marked twice for the same day, with two different answers. Nexora keeps one attendance record per person per date. If you mark someone again for a day that already has a record, the existing record is updated instead of a second one being created.',
          'Mistakes are normal on a busy morning, so every saved record can be edited or deleted from the attendance list. Choose Edit, change the date, status or note, and save. The reports are rebuilt from the updated record, so a correction made at ten o’clock is already in the report the principal opens at eleven.',
        ],
      },
      {
        heading: 'Biometric and RFID attendance for schools',
        paragraphs: [
          'A biometric attendance system for a school takes attendance when a person scans a fingerprint, and an RFID student attendance system does it when a card or tag is tapped. Either way, the device records the punch with a time, so nobody has to mark a register by hand and nobody can mark a friend present.',
          'Nexora connects to these devices instead of replacing them. You register the device in the Attendance page with a name, a provider (the default is ZKTeco biometric, and you can type another brand), a serial number or IP address, and a type. You also choose whether the device normally marks students or staff, so a gate reader for students and a separate reader in the staff room each write to the right place.',
          'The device itself does not talk to the internet directly. In most schools a small local program, often called middleware or a bridge app, reads punches from the device on your network and forwards them to Nexora. This is the normal way ZKTeco-style devices are connected, and the setup guide inside the product explains it step by step.',
        ],
      },
      {
        heading: 'How a device is connected: four steps',
        paragraphs: [
          'Connecting a device takes about as long as setting up a printer, and it is a one-time job for each device:',
        ],
        bullets: [
          'Connect the biometric or RFID device to your local network and note its IP address or serial number.',
          'Register the device in Nexora on the Attendance page by entering its name, provider and serial or IP, then press Connect Device.',
          'Save the endpoint and secret. Nexora shows the Device ID, the endpoint address and a secret key. The secret is shown only once, so copy it into your middleware settings straight away.',
          'Let the middleware send each punch to the endpoint. The secret is sent in a request header named x-nexora-device-secret, which keeps the connection private to your device.',
        ],
      },
      {
        heading: 'A live log of automatic punches',
        paragraphs: [
          'Once a device is connected, you do not have to guess whether it is working. The Attendance page shows a live log of recent automatic punches as they arrive, so the office can confirm in seconds that the gate reader is sending data. The connected devices are listed with their provider and serial number.',
          'Punches from a device are saved as attendance and show up in the reports together with manual records. A school can therefore run biometric attendance at the gate and still mark a late correction by hand for the odd student whose fingerprint would not scan.',
        ],
      },
      {
        heading: 'Attendance reports that are ready when you are',
        paragraphs: [
          'Taking attendance matters only if you can use it. Nexora saves every record into the School Reports Center, and the attendance reports are there the moment a record is saved. You do not export a sheet and rebuild a report; the report is already built.',
          'There are two attendance reports: student attendance and staff attendance. You can narrow the report by date range, by class and by individual student, then preview the report as a PDF and download or print it. The same report center holds the fee, salary, expense and collection reports, so one place covers the numbers a principal asks for most.',
          'The reports center also shows a quick summary for student attendance: how many records are present, how many are late, how many are absent, and the present percentage. That one number is usually what a principal wants first thing in the morning.',
        ],
      },
      {
        heading: 'The attendance dashboard: the whole picture at a glance',
        paragraphs: [
          'At the top of the Attendance page, the dashboard shows the number of students, the number of staff, and how many attendance devices are connected. It also links straight to the student or staff attendance report for the mode you are working in, so going from marking to reporting is one click.',
          'For a school administrator, that means attendance health for the day is visible without opening a register or asking a class teacher. If the numbers look wrong, for example a class with no records at ten o’clock, you can see it while there is still time to act.',
        ],
      },
      {
        heading: 'An English and Urdu setup guide',
        paragraphs: [
          'Device setup is often done by the school’s IT person, an accountant or a vendor technician, and not everyone is comfortable with English technical instructions. The setup guide for connecting a biometric or RFID device is available in both English and Urdu, and you can switch language with one button. The steps, the endpoint and the header name are identical in both versions, so the person doing the setup can follow the language they read fastest.',
        ],
      },
      {
        heading: 'How different people at your school use it',
        paragraphs: [
          'The principal uses the attendance summary and the student and staff reports to see trends, such as a class with falling attendance or a staff member who is often late, and to have a real number ready when a parent meeting is called.',
          'Class teachers use manual marking at the start of the day. Because the screen is short (person, date, status, note), marking a class does not take a lesson’s worth of time.',
          'The school office uses the reports for parent requests, for fee and leave discussions, and for correcting records when a teacher reports a mistake. Because attendance and fee records both sit in Nexora, the office is not switching between a register and a separate system.',
          'The IT person or vendor uses the device page once per device, then rarely again. After that, punches flow in, and the live log shows whether the device is still alive.',
        ],
      },
      {
        heading: 'How to choose student attendance management software',
        paragraphs: [
          'Whether you pick Nexora or another system, these are the questions worth asking before you commit. They are the questions that separate a tool the staff will really use from one that is abandoned after a month:',
        ],
        bullets: [
          'Does it cover both students and staff, or only students?',
          'Can a teacher mark attendance in under a minute, and fix a mistake without asking the administrator?',
          'Does it prevent duplicate records for the same person on the same day?',
          'Can it connect to the biometric or RFID devices you already own or plan to buy?',
          'Are reports ready without exporting and rebuilding them by hand, and can you filter by class and date?',
          'Is the setup guide available in a language your staff are comfortable with?',
          'Is attendance part of a larger school system, so fees, admissions and payroll use the same student and staff records?',
        ],
        links: [{ to: '/compare/school-erp-buying-checklist', text: 'School ERP buying checklist' }],
      },
      {
        heading: 'Where attendance fits in Nexora School ERP',
        paragraphs: [
          'Attendance is one part of a wider school workspace, and that is deliberate. A student added once through admissions is available for attendance, for fee billing and for reports, without being typed again. Staff added for payroll are available for staff attendance in the same way.',
          'If you are setting up a school on Nexora, a sensible order is to add students and classes first, add staff, start marking attendance by hand, and then add biometric or RFID devices once the routine is working. You can try the whole workspace with the free trial, with your own students and staff, before deciding anything.',
        ],
        links: [
          { to: '/school-erp', text: 'Nexora School ERP' },
          { to: '/school-erp/admissions-and-students', text: 'Admissions and students' },
          { to: '/school-erp/fee-management', text: 'Fee management' },
          { to: '/school-erp/payroll', text: 'Staff payroll' },
        ],
      },
    ],
    capabilities: [
      ['Student and staff modes', 'One attendance workflow covers both students and staff, with class and section on student records and department or role on staff records.', HiOutlineUserGroup],
      ['Four clear statuses', 'Mark every person present, absent, late or on leave, with an optional note for the day.', HiOutlineCheckCircle],
      ['One record per day', 'Marking the same person again for the same date updates the record instead of creating a duplicate.', HiOutlineClipboardDocumentList],
      ['Edit and delete', 'Correct the date, status or note of a saved record, or remove it, and the reports follow.', HiOutlineTableCells],
      ['Biometric and RFID devices', 'Register a device by name, provider and serial or IP, and choose whether it marks students or staff.', HiOutlineShieldCheck],
      ['Live punch log', 'See recent automatic punches as they arrive, so you know a connected device is working.', HiOutlineChartBarSquare],
      ['Reports Center', 'Student and staff attendance reports with date, class and student filters, ready as a PDF to download or print.', HiOutlineDocumentChartBar],
      ['English and Urdu setup guide', 'Device setup steps are available in both languages, with one button to switch.', HiOutlineCalendarDays],
    ],
    faqs: [
      ['What is school attendance management software?', 'School attendance management software records which students and staff were present, absent, late or on leave each day, and turns those records into reports. It replaces paper registers and spreadsheets, so counting attendance for a class, a month or a term does not need manual addition.'],
      ['Can Nexora track both student and staff attendance?', 'Yes. The Attendance page has a student mode and a staff mode. Student records carry the class and section, and staff records carry the department or role. Both feed their own report in the School Reports Center.'],
      ['Do I need a biometric device to use it?', 'No. Manual marking works on its own, with no hardware. You choose the person, the date and a status, and save. You can add a biometric or RFID device later, or use both together.'],
      ['Which attendance devices does it work with?', 'Nexora connects to biometric and RFID devices through a small local middleware program that reads punches and sends them to Nexora. The default provider option is ZKTeco biometric, and you can enter another provider name. The device is registered with a name, provider and serial number or IP address.'],
      ['How does the device send data to Nexora?', 'After you register the device, Nexora gives you a Device ID, an endpoint address and a secret. The middleware sends each punch to the endpoint, with the secret in the x-nexora-device-secret header. The secret is shown once, so save it when it appears.'],
      ['What attendance statuses can I use?', 'Present, absent, late and leave. You can add a short note to any record, for example the reason for a late arrival.'],
      ['What if a teacher marks someone by mistake?', 'Open the record from the attendance list, choose Edit, change the date, status or note, and save. You can also delete a record. Marking the same person again for the same date updates the existing record, so duplicates do not build up.'],
      ['Can I see attendance reports and a present percentage?', 'Yes. The School Reports Center has student attendance and staff attendance reports with date, class and student filters, and a PDF preview you can download or print. The student summary shows present, late and absent counts and the present percentage.'],
      ['Is the device setup guide available in Urdu?', 'Yes. The guide for connecting a biometric or RFID device is available in English and Urdu, with a button to switch between them.'],
      ['Can I try it before paying?', 'Yes. Nexora offers a free trial, so you can add your own students and staff, mark a week of attendance and open the reports before you decide.'],
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
      {
        heading: "Why schools search for fee management software",
        paragraphs: [
          "Ask a school accountant what takes up the most time each month and the answer is almost always fees. Every student has a different amount because of siblings, scholarships and staff discounts. Some families pay on the first, some on the twentieth and some after three reminders. The office keeps registers, prints receipts, answers parent calls and, at month end, tries to add it all up.",
          "That is why people search for school fee management software, school fee collection software and, very often, a free school fee management system in Excel. A spreadsheet is a fair place to start, but it breaks down as the school grows. Formulas get overwritten, two people edit different copies, and nobody can say with confidence how much is still outstanding.",
          "Nexora School ERP replaces the spreadsheet with a fee workflow built for monthly billing. You set each class’s fees once, add discounts, generate every student’s bill for the month in one step and track what is collected and what is still due.",
        ],
      },
      {
        heading: "Step 1: set each class’s fees once",
        paragraphs: [
          "Everything starts in Fee Structure. You add your classes, for example Nursery, Grade 1 or Class 9, and enter the fees for each one: tuition and any other heads you charge. Because the amounts live in one place, nobody has to remember the right figure at the front desk, and a change in January applies from the next bill, not as a scribble on last year’s list.",
          "Fee Structure also shows how many students are in each class and whether the fees for that class have been set, so a class you forgot is easy to spot. If the screen shows a class as not saved, wait for it to confirm before you move on. Saving fees is the foundation for everything that follows.",
        ],
      },
      {
        heading: "Step 2: discounts, scholarships and sibling rules",
        paragraphs: [
          "Real schools rarely charge everyone the same. Fee Structure lets you add concessions such as scholarships, staff-child discounts and a sibling discount, each as a percentage or a fixed amount applied to the heads you choose, for example tuition only.",
          "Because discounts are rules and not hand-typed numbers, they are applied the same way every month and the bill preview shows exactly how much was given. That protects the school from the usual accusation that one family was treated better than another, and it protects the accountant from arguments at the window.",
        ],
      },
      {
        heading: "Step 3: generate every student’s bill in one go",
        paragraphs: [
          "Generate Fee Bills is where the month’s billing happens. You pick the fee month, choose who the bills are for, set the bill date and the day of the month they are due, and check the preview. The preview shows how many bills will be created, the total amount, the discounts given and how many students were skipped, so you see the result before anything is saved.",
          "Amounts come from Fee Structure with discounts already applied. When the numbers look right, one click creates the bills for the whole school. A task that used to take a clerk two days of writing now takes a few minutes of checking.",
        ],
      },
      {
        heading: "Approvals: why a bill starts as pending, not paid",
        paragraphs: [
          "A fee bill is created pending approval, not marked paid. Collection is routed through the Approval Center as a fee approval, so a payment taken at the front desk is not recorded as settled until it is confirmed. This protects the school’s accounts from mistakes and from casual write-offs, because the person who takes the money and the person who approves it can be different.",
          "For a principal or owner, this is one of the quieter benefits. Instead of trusting a register, you can look at what is waiting for approval, approve it and know the figures that appear later in reports are confirmed.",
        ],
      },
      {
        heading: "Monthly billing and fee collection reporting",
        paragraphs: [
          "Every fee record carries its own fee month, so recurring billing stays organised from cycle to cycle. Fee collection trends appear on the School Reports dashboard, including fee collection and outstanding fees, and you can export reports for the board or the accountant.",
          "With a fee month on every record, answering the questions that matter becomes simple. How much was billed for March? How much has been collected? Which classes are furthest behind? You are reading a report, not adding up registers.",
        ],
      },
      {
        heading: "Excel or school fee software: an honest comparison",
        paragraphs: [
          "Excel is flexible and free, which is why so many schools begin there. It works well for a few dozen students and one person managing it. The trouble appears with scale and with more than one user. There is no approval step, no automatic discount rules, no record of who changed a number, and no easy way to give the principal a dashboard while the clerk edits.",
          "School fee software costs money and time to adopt, but it gives you a single shared record, rules that apply the same way every time, approval before a payment counts as settled, and reports that update by themselves. If you are past about a hundred students, or if the fee office has more than one person, the switch usually pays for itself in saved hours and fewer disputes.",
          "You do not have to decide on paper. Every Nexora product starts with a free 1-month trial, and setup, data migration and staff training are free on every plan, so you can test the whole fee cycle on one class and compare the result with your Excel sheet.",
        ],
      },
      {
        heading: "A fee month in practice: a checklist",
        paragraphs: [
          "Before the month: confirm each class’s fees and concessions are saved and check new admissions and withdrawals. Generate the bills: open Generate Fee Bills, choose the month, review the preview, check skipped students and create the bills. During the month: record payments and approve them in the Approval Center as they are confirmed. Around the due date: review who is still pending and contact families. At month end: open the reports, compare billed, collected and outstanding, and note anything to fix before next month.",
          "Schools that follow this rhythm usually find their arrears shrink within a few cycles, simply because defaults are noticed in days instead of months.",
        ],
      },
      {
        heading: "Online and offline: what to expect",
        paragraphs: [
          "People often search for offline fee software because internet at the school can be unreliable. Nexora is a cloud workspace, so records are stored online and available from any device the office uses. Fee Structure shows a clear not-saved marker if a change has not yet reached the server, so staff can tell whether a figure is safely stored.",
          "School ERP focuses on managing fees, approvals and reporting on the school side. If you need to know which payment methods or parent-facing payment options suit your school, ask the team and we will answer plainly what works today.",
        ],
      },
      {
        heading: "Common fee problems and how a proper system answers them",
        paragraphs: [
          "“A parent says they already paid.” With a pending-then-approved flow, the office can check whether a payment was recorded and approved, instead of arguing from memory. The record shows the bill, the month and its status.",
          "“We gave a discount last year and now nobody remembers why.” When concessions are rules in Fee Structure, the reason is part of the setup, not a verbal promise. A new accountant can read the rule and apply it the same way.",
          "“A new student joined mid-term.” Add the student to a class and the fee structure of that class applies when bills are generated. Check the preview for skipped students so no one is missed.",
          "“The principal wants the numbers tomorrow.” The School Reports dashboard shows fee collection and outstanding fees, so the answer is a report, not a night of adding registers.",
        ],
      },
      {
        heading: "Roles in the fee office",
        paragraphs: [
          "A well-run fee office separates three jobs. One person sets the fee structure and concessions, usually the accountant or administrator. One person receives payments at the counter. One person, often the principal or finance head, approves. Nexora’s approval step lets you keep these jobs apart so that nobody both takes and approves the same payment.",
          "Use staff roles and permissions to give each person only the screens they need. A front-desk clerk does not need to edit fee amounts, and a teacher does not need to see collection totals.",
        ],
      },
      {
        heading: "Questions parents ask, and how to answer them",
        paragraphs: [
          "Parents usually ask four things: how much is due, what it is made of, by when, and whether last month was received. Having a clear bill for each student, a fee month on every record and a due day set in Generate Fee Bills lets the office answer in one sentence. Consistent answers build trust, especially when siblings in different classes have different amounts.",
          "When a family has a genuine hardship, a concession rule or a documented decision is better than a one-off waiver nobody can trace later. Record who agreed and why in your school’s own notes.",
        ],
      },
      {
        heading: "Moving from Excel without losing a month",
        paragraphs: [
          "Do not try to move everything at once. Pick the next fee month as your start date. Enter classes and fee structure, add students, generate that month’s bills and run both systems side by side for one cycle. Compare totals at the end. Once the numbers match, retire the spreadsheet.",
          "Nexora offers free setup, data migration and staff training on every plan, and a free 1-month trial, so you can do this trial run without paying anything up front. Keep a copy of the old file for reference, but treat the new system as the single source of truth from then on.",
        ],
      },
      {
        heading: "What to ask any vendor before you buy school fee software",
        paragraphs: [
          "Can I set fees per class and apply discounts by rule? Does a payment need approval before it counts? Can I see collected and outstanding amounts in a report? Who can see or change what? Can I try it free with my own data? Is setup and training included? What happens to my data if I leave? Ask these of every product you compare, including ours, and judge by the answers, not by the length of a feature list.",
        ],
      },
    ],
    capabilities: [
      ['Fee approval workflow', 'Fee bills are routed through an approval step before being marked paid.', HiOutlineCheckCircle],
      ['Monthly fee billing', 'Fee records are tied to a specific fee month for recurring billing.', HiOutlineCalendarDays],
      ['Approval Center routing', 'Fee approvals are handled through the same Approval Center as other billing.', HiOutlineClipboardDocumentList],
      ['Fee collection reporting', 'Fee collection trends are visible on the School Reports dashboard.', HiOutlineChartBarSquare],
    ],
    faqs: [
      ["Where do I set the fee amounts for each class?", "In Fee Structure. You set each class’s fees once, and fee bills use those amounts automatically."],
      ["Can I give scholarships and sibling discounts?", "Yes. Fee Structure supports concessions such as scholarships and a sibling discount, as a percentage or a fixed amount on the heads you choose."],
      ["How do I create fee bills for all students?", "Open Generate Fee Bills, pick the fee month and who the bills are for, check the preview and create them in one step."],
      ["Why does a fee bill start as pending?", "Fee bills are routed through the Approval Center, so a payment is not recorded as settled until it has been approved."],
      ["Can I see how much is collected and how much is outstanding?", "Yes. Fee collection and outstanding fees appear in the School Reports dashboard."],
      ["Is there a free trial?", "Yes. Every product starts with a free 1-month trial, and setup, data migration and staff training are free on every plan."],
      ["Is it better than an Excel fee sheet?", "For small schools Excel can work. As the school grows, shared records, discount rules, approvals and automatic reports make dedicated software safer and faster."],
    ],
    sibling: 'school-erp/admissions-and-students',
    siblingLabel: 'Admissions & Students',
  },
  'school-erp/payroll': {
    pillar: 'school-erp',
    icon: HiOutlineUserGroup,
    badge: 'Staff Payroll',
    eyebrow: 'School ERP · Staff Operations',
    title: 'School Payroll Software',
    keyword: 'school payroll software',
    seoTitle: 'School Payroll Software | Salary & Payslips | Nexora School ERP',
    seoDescription: 'School payroll software for teachers and staff: salary profiles, allowances, bonuses, deductions, approval before payment, salary slips and reports in one place.',
    intro: 'Nexora School ERP gives your school one payroll workspace for teachers, admin staff, accountants, drivers and support staff. Set each person’s salary once, record every monthly payment with allowances, bonuses and deductions, send it for approval, and print or share a salary slip. Every payment stays on record, so the owner, the principal and the accountant all read the same numbers.',
    sections: [
      {
        heading: 'What school payroll software should do',
        paragraphs: [
          'Paying staff is the one school task that can never be late and never be wrong. A teacher who is underpaid because of a typing mistake loses trust quickly. In many schools payroll still lives in a notebook or a spreadsheet kept by one person. Salaries are copied from last month, deductions are worked out on a calculator, and nobody can say later who approved a payment or why the amount changed.',
          'Good school payroll software replaces that with a short, repeatable routine. It should hold a salary profile for each person, calculate the net amount from the same formula every time, ask for approval before money is released, and keep a permanent record of what was paid. It should also produce something the staff member can hold, such as a salary slip, and something the owner can read, such as a payroll report. Nexora School ERP includes all of this inside the School ERP module, so there is no separate payroll product to buy or connect.',
        ],
      },
      {
        heading: 'Teachers and staff in one payroll list',
        paragraphs: [
          'Schools do not only pay teachers. The payroll list has to cover the whole team, and each person is pay-grouped by role. When you add a payroll member in Nexora you choose a role from the list: Teacher, Admin Staff, Accountant, Support Staff, Driver or Other. You also enter the name, department, designation, phone number, email and an optional note.',
          'Payroll members are created for salary purposes only. Adding a teacher to payroll does not create a login for the software, so you can pay a gate keeper, a van driver or a part-time instructor without giving them access to anything. If the same person also needs a login, that is handled separately in Team Management. This keeps the payroll list accurate and keeps system access limited to the people who need it.',
        ],
      },
      {
        heading: 'Salary profiles: monthly, daily, hourly or custom',
        paragraphs: [
          'A full-time teacher is paid a fixed monthly salary. A visiting lecturer may be paid per hour, and a helper may be paid per day. School payroll software has to handle all of these, not force every person into one pattern.',
          'Each payroll member has a salary profile with a salary amount and a salary type. The four types are:',
        ],
        bullets: [
          'Monthly: a fixed salary for the month, the usual choice for teachers and office staff.',
          'Daily: a rate for each working day, useful for casual or temporary staff.',
          'Hourly: a rate for each hour, suited to visiting teachers and part-time instructors.',
          'Custom: for any arrangement that does not fit the three above.',
        ],
      },
      {
        heading: 'Department and designation for every person',
        paragraphs: [
          'Each salary profile also carries a department and a designation, such as Science department and Senior Teacher, or Accounts department and Accountant. This matters when the school grows. A principal reviewing payroll can see who works where, and the accountant can answer questions about a particular grade or post without searching through old files.',
          'The profile also has a notes field. Use it for details that should travel with the person, such as an agreed review date or a special arrangement. Because the profile is stored once and reused for every month, you only update it when something really changes, for example after a raise.',
        ],
      },
      {
        heading: 'Recording a monthly salary payment',
        paragraphs: [
          'Each month you record a payment against the staff member. You select the teacher or staff member, choose the salary month and the payment date, and the base salary is filled in from their profile. You can then add an allowance, a bonus and a deduction, choose how the person was paid, add a transaction reference, and write a remark if needed.',
          'The fields on a payment are deliberately close to what a school accountant already writes on paper: salary month, payment date, base, allowance, bonus, deduction, payment method, reference and remarks. Nothing has to be learned from scratch, which is why a school can move its payroll over in a day instead of a week.',
        ],
      },
      {
        heading: 'Allowances, bonuses and deductions with automatic net pay',
        paragraphs: [
          'The part of payroll that causes the most mistakes is arithmetic. Nexora works out the amounts for you and always uses the same formula: gross pay is the base salary plus the allowance plus the bonus, and net pay is the gross pay minus the deduction.',
          'Net pay never drops below zero, so a large deduction cannot produce a negative payment by accident. The base, allowance, bonus, deduction and net pay are all stored on the payment, which means the salary slip and the reports show exactly what was agreed at the time. Typical uses are:',
        ],
        bullets: [
          'Allowance: transport, house rent, medical or any fixed extra paid with the salary.',
          'Bonus: a performance reward, an Eid bonus or a result-based payment.',
          'Deduction: advance recovery, unpaid leave, a late fine or any amount held back.',
        ],
      },
      {
        heading: 'Pay by cash, bank transfer, cheque, JazzCash or EasyPaisa',
        paragraphs: [
          'Schools in Pakistan pay staff in several ways, often within the same month. A senior teacher may receive a bank transfer, a driver may be paid in cash, and a part-time tutor may prefer JazzCash or EasyPaisa. Nexora records the payment method on every salary payment, and the choices are Cash, Bank Transfer, Cheque, JazzCash and EasyPaisa.',
          'You can add a transaction reference, for example a bank transfer number or a mobile wallet transaction ID. When a staff member says a payment has not arrived, the accountant can open the record and see the method, date and reference in seconds, instead of searching through bank messages.',
        ],
      },
      {
        heading: 'Approval before payment: a control the owner can trust',
        paragraphs: [
          'The biggest risk in school payroll is not a wrong sum; it is a payment that nobody checked. Nexora uses an approval-based flow. A salary request is created first, and it waits for approval from the Approval Center before it counts as approved. Every payment therefore carries one of three statuses: Pending Approval, Approved / Paid, or Rejected.',
          'This separates the person who prepares payroll from the person who approves it. The accountant prepares the month’s salaries, and the owner or principal reviews and approves them. A rejected request stays on record with its status, so the school has a clear trail of what was proposed, what was approved and what was turned down.',
        ],
      },
      {
        heading: 'A payroll dashboard that shows where you stand',
        paragraphs: [
          'At the top of the payroll page, four summary cards give the picture without opening any record: staff with salary, the monthly payroll total, payments pending approval, and payments approved or paid. The staff card also shows how many staff members are on the list in total, which quickly reveals people who have been added but have no salary set.',
          'The monthly payroll figure is the total of all salary profiles. It is the number an owner needs when planning the month’s cash: how much will leave the bank if every person is paid. It is shown in your workspace currency, so a Pakistani school sees rupees without any setup.',
        ],
      },
      {
        heading: 'Salary slips staff can print, plus WhatsApp sharing',
        paragraphs: [
          'A salary slip is proof of payment for the staff member and a record for the school. From any salary transaction you can print a salary slip. The slip shows the school name, the status, the staff name and role, the salary month and payment date, then base salary, allowance, bonus, deduction and net pay, followed by the payment method, reference and remarks.',
          'You can also share a salary transaction through WhatsApp. This creates a short message with the school name, the staff member, the month, the net pay and the status, ready to send to the teacher or to the owner. Because most schools already use WhatsApp every day, this replaces phone calls and handwritten notes with a message that carries the figures.',
        ],
      },
      {
        heading: 'Payroll transactions and the Salary Report',
        paragraphs: [
          'Every salary payment is saved in the payroll transactions list. You can search it by staff name or other details, so finding one teacher’s payments takes a few seconds. Records can be edited when a figure was entered wrongly, or deleted when a request was created by mistake.',
          'The Salary Report brings the same data into a table with the staff member, the month, gross pay, deduction, net pay and status. It is the page to open for month-end review, for an audit question, or when the owner asks how much was paid in a particular month and to whom.',
        ],
      },
      {
        heading: 'Payroll next to attendance, fees and admissions',
        paragraphs: [
          'Payroll is only one part of running a school, and it works best next to the others. Staff added to the payroll list are also available when you mark staff attendance, so a person does not have to be entered twice. Read more about that in our guide to school attendance management software.',
          'On the income side, student fees are tracked in fee management, and the same School ERP workspace holds admissions and student records. Money in and money out are then visible in one system, which makes it easier to see whether fee collection covers the salary bill.',
        ],
        links: [
          { to: '/school-erp', text: 'Nexora School ERP' },
          { to: '/school-erp/attendance', text: 'School attendance management' },
          { to: '/school-erp/fee-management', text: 'Fee management' },
          { to: '/school-erp/admissions-and-students', text: 'Admissions and students' },
        ],
      },
      {
        heading: 'How to start paying staff with Nexora in a day',
        paragraphs: [
          'Moving payroll into software does not need a long project. Most schools can finish setup in one working session:',
        ],
        bullets: [
          'Add every teacher and staff member to payroll with name, role, department and designation.',
          'Enter each person’s salary amount and choose Monthly, Daily, Hourly or Custom.',
          'Record the first month’s payments with any allowance, bonus or deduction.',
          'Send the requests for approval and let the owner or principal approve them.',
          'Print salary slips or share them on WhatsApp, then review the Salary Report.',
        ],
        links: [
          { to: '/pricing', text: 'Nexora pricing' },
          { to: '/compare/school-erp-buying-checklist', text: 'School ERP buying checklist' },
        ],
      },
    ],
    preview: {
      badge: 'Approved / Paid',
      title: 'Salary Slip',
      subtitle: 'Sample School · Salary month 2026-10',
      rows: [
        ['Staff', 'Ayesha Khan'],
        ['Role', 'Teacher'],
        ['Base Salary', 'Rs 60,000'],
        ['Allowance', 'Rs 8,000'],
        ['Bonus', 'Rs 5,000'],
        ['Deduction', 'Rs 3,000'],
        ['Method', 'Bank Transfer'],
      ],
      total: ['Net Pay', 'Rs 70,000'],
    },
    capabilities: [
      ['Staff roles', 'Teacher, Admin Staff, Accountant, Support Staff, Driver or Other.', HiOutlineUserGroup],
      ['Salary types', 'Monthly, daily, hourly or custom salary profile for each person.', HiOutlineCalendarDays],
      ['Net pay calculation', 'Base plus allowance and bonus, minus deduction, worked out automatically.', HiOutlineBanknotes],
      ['Approval flow', 'Pending, approved or rejected before a salary counts as paid.', HiOutlineShieldCheck],
      ['Pakistan payment methods', 'Cash, bank transfer, cheque, JazzCash and EasyPaisa.', HiOutlineCreditCard],
      ['Salary slips', 'Print a salary slip or share the payment on WhatsApp.', HiOutlineDocumentChartBar],
      ['Payroll dashboard', 'Staff with salary, monthly total, pending and approved payments.', HiOutlineChartBarSquare],
      ['Salary Report', 'Gross, deduction, net and status by staff member and month.', HiOutlineClipboardDocumentList],
    ],
    faqs: [
      ['What is school payroll software?', 'School payroll software keeps each staff member’s salary profile, calculates net pay each month, records the payment and produces salary slips and reports. Nexora School ERP includes payroll for teachers, admin staff, accountants, drivers and support staff.'],
      ['Which staff roles can I add to payroll?', 'You can add Teacher, Admin Staff, Accountant, Support Staff, Driver or Other, with name, department, designation, phone and email.'],
      ['Does adding a staff member to payroll create a login?', 'No. Payroll members are created for salary only, so you can pay people who will never use the software. Logins are handled separately in Team Management.'],
      ['Can I pay teachers daily or hourly instead of monthly?', 'Yes. Each salary profile can be Monthly, Daily, Hourly or Custom, so visiting teachers and part-time staff are covered.'],
      ['How is net pay calculated?', 'Gross pay is the base salary plus allowance plus bonus. Net pay is the gross pay minus the deduction, and it never goes below zero.'],
      ['Which payment methods can I record?', 'Cash, Bank Transfer, Cheque, JazzCash and EasyPaisa, with an optional transaction reference for each payment.'],
      ['Does a salary need approval?', 'Yes. Salary requests are approval-based and show as Pending Approval, Approved / Paid or Rejected, so the person who prepares payroll is not the only one who releases it.'],
      ['Can I print a salary slip?', 'Yes. Any salary transaction can be printed as a salary slip showing base salary, allowance, bonus, deduction, net pay, method and reference.'],
      ['Can I send salary details on WhatsApp?', 'Yes. A salary transaction can be shared through WhatsApp with the staff name, month, net pay and status.'],
      ['Can I edit or delete a wrong salary entry?', 'Yes. Salary transactions can be edited or deleted from the payroll transactions list, and the Salary Report reflects the change.'],
      ['Does payroll work with attendance?', 'Staff on the payroll list are available in staff attendance, so nobody is entered twice. Deductions for absence are entered by you on the payment, not applied automatically.'],
    ],
    sibling: 'school-erp/fee-management',
    siblingLabel: 'Fee Management',
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
      {
        heading: "From lead to customer: what changes",
        paragraphs: [
          "A lead is someone who might buy. A customer is someone who has. The moment that changes, your relationship needs a different kind of record: one that remembers what they bought, what they owe and who in your team looks after them. Searches such as “customer management software for small business” and “customer database software” are people looking for exactly that.",
          "In Nexora CRM, a lead that converts becomes a customer record. You do not retype anything. The contact details come across, and from then on the record is connected to invoices, sales and follow-ups.",
        ],
      },
      {
        heading: "What the customer record holds",
        paragraphs: [
          "Each customer record has a name, email, phone and company, plus a customer type, a status and the date it was created. That is the set of facts a sales or account manager needs on a call: who the customer is, how to reach them, what kind of customer they are and since when you have been working together.",
          "Customer type matters more than it looks. Separating individuals from businesses, or retail from wholesale, lets you filter lists, plan campaigns and report on which kinds of customers bring the most revenue.",
        ],
      },
      {
        heading: "Wallet balance: credit and dues in one number",
        paragraphs: [
          "A customer’s wallet balance shows credit and dues, and it updates automatically as sales are recorded. The same mechanism is used at the point-of-sale counter, so a sale made in CRM, in retail POS or in another connected module changes the same balance. You do not have to reconcile two sheets to know what a customer owes.",
          "This is especially valuable for businesses that sell on credit. A salesperson can look up a customer before agreeing to a new order and see at once whether there is an unpaid balance.",
        ],
      },
      {
        heading: "Keeping customer data clean",
        paragraphs: [
          "A customer database is only as good as its data. A few rules keep it trustworthy. Enter names consistently, so “Ahmed Traders” is not also “Ahmad Traders Ltd”. Always record a working phone number. Add an email where you have one. Choose the right customer type when you create the record, and update the status when the relationship changes.",
          "Avoid duplicates by searching before you add. If you find two records for the same customer, keep the one with the history and remove the other. Once a month, scan for records with missing phones or emails and fill the gaps.",
        ],
      },
      {
        heading: "Using customer records to grow sales",
        paragraphs: [
          "A customer record is not a filing cabinet, it is a sales tool. Look at your best customers by revenue and call them to say thanks. Look at customers who have not bought for a few months and send a friendly check-in. Look at customers with dues and agree on a payment date. Connect each of these with a follow-up task so it actually happens.",
          "Over time, the CRM shows which customers buy repeatedly, which need chasing, and which are worth a special offer. Those patterns are impossible to see in a notebook.",
        ],
      },
      {
        heading: "Customer management software or a spreadsheet?",
        paragraphs: [
          "A spreadsheet is a fine starting point for a few dozen customers. It stops working when several people need the same list at once, when you need history linked to invoices, or when you want reminders. Free customer database tools help with storage but usually do not handle invoicing, balances or follow-ups.",
          "Nexora CRM keeps customers, invoices, wallet balances, tasks and reports in one workspace with roles that control who sees what. Start with a free 1-month trial and import your ten most important customers first to see the difference.",
        ],
      },
      {
        heading: "Privacy and access",
        paragraphs: [
          "Customer information is private business data. Give access only to staff who need it, using roles and permissions, and review the list when people join or leave. Do not paste customer details into public chats or share screenshots with phone numbers visible. If a customer asks you to remove their information, handle it according to the privacy rules where you operate.",
        ],
      },
      {
        heading: "Getting started in an afternoon",
        paragraphs: [
          "Gather your top fifty customers with names and phone numbers. Add them as customer records and choose a type for each. Record any outstanding balances. Create a follow-up task for the five most important accounts. Invite one colleague and check that they can see the list. By the end of the afternoon you will have a working customer database, and you can add the rest over the following days.",
        ],
      },
      {
        heading: "Customer types and how to use them",
        paragraphs: [
          "A customer type is a label that groups similar customers: an individual and a company, a retail buyer and a wholesale buyer, or whatever categories make sense for your business. Choose a small set that people can apply consistently. Too many types and staff will pick at random; too few and the grouping tells you nothing.",
          "Once types are set, filtering a list for just wholesale customers or just companies takes a moment, and reports can show which type brings the most sales.",
        ],
      },
      {
        heading: "Customer status: active, inactive and everything between",
        paragraphs: [
          "Each customer has a status, so you can separate the people you are actively working with from those who went quiet. Review statuses monthly. A customer who has not bought for a long time deserves a friendly call before you mark them inactive; many come back after a single message.",
        ],
      },
      {
        heading: "Customer records across the whole business",
        paragraphs: [
          "A customer appears in more than one place: in CRM, on invoices and, if you use other Nexora products, at the point-of-sale counter. Because the wallet mechanism is shared, a purchase at the counter and an invoice in the CRM update the same balance. You are not keeping two lists in step.",
          "That matters most for credit sales. Shops and distributors that allow customers to pay later need one clear number for what each customer owes, visible to everyone who serves them.",
        ],
      },
      {
        heading: "Importing and organising your existing list",
        paragraphs: [
          "Most businesses already have customers in a phone, a notebook or a spreadsheet. Start by cleaning what you have. Remove duplicates, fix spelling, make sure every row has a phone number and decide a type for each. Then add the records in order of importance, beginning with customers who buy most often or owe money.",
          "Nexora’s team can help with data migration on every plan at no cost, so if you have a large list, ask for help instead of retyping it.",
        ],
      },
      {
        heading: "A weekly customer routine for small teams",
        paragraphs: [
          "Monday: review customers with outstanding balances and plan calls. Tuesday: contact customers who have not bought for a while. Wednesday: add new customers from the weekend and tidy duplicates. Thursday: look at your top ten customers and check that someone owns each relationship. Friday: review the week’s new customers and create follow-up tasks.",
          "Fifteen minutes a day on this rhythm usually does more for sales than any new advertising, because it concentrates on people who already know you.",
        ],
      },
      {
        heading: "Customer service and the record behind it",
        paragraphs: [
          "When a customer calls, the first thirty seconds set the tone. If you can say their name, remember their last order and know whether anything is outstanding, the conversation starts well. A good record turns every call into a better one, whoever answers.",
          "Keep notes short and factual. Write what was agreed, not opinions. Remember that customers may see their information if they ask, so write accordingly.",
        ],
      },
      {
        heading: "Segments you can build with simple fields",
        paragraphs: [
          "You do not need a complicated system to segment customers. Customer type, status and the wallet balance already give you useful groups: customers with dues, customers with credit, active versus inactive, individuals versus companies. Each group deserves a different message. Customers with dues need a polite reminder. Active customers with credit may like to hear about new items. Inactive customers need a reason to return.",
          "Start with two or three segments you will actually act on. A segment that never receives a message is wasted effort.",
        ],
      },
      {
        heading: "Customer relationships beyond the sale",
        paragraphs: [
          "People remember how they were treated more than what they paid. Thank customers after large orders, remember small details such as preferred delivery times, and resolve problems quickly. A customer record is the place to keep these details so that any team member can continue the relationship, not just the person who started it.",
          "When a staff member leaves, their customers should not leave with them. Having every customer in a shared system, with notes and follow-ups, protects the business from that risk.",
        ],
      },
      {
        heading: "Metrics worth watching",
        paragraphs: [
          "Count how many new customers you add each month, how many return within ninety days, and how much of your sales comes from your top ten. Track total dues and the age of the oldest due. These four numbers tell you whether the business is growing, whether customers come back, how concentrated your risk is and how healthy your cash flow is.",
          "You do not need a dashboard full of charts. A few numbers read every month, with action taken on them, beat fifty numbers nobody checks.",
        ],
      },
      {
        heading: "Common mistakes with customer databases",
        paragraphs: [
          "Treating the database as a one-time project instead of a daily habit. Letting everyone invent their own way of writing names and phone numbers. Keeping customers in personal phones. Never removing duplicates. Not recording dues. Giving all staff access to everything. Each of these is easy to fix when noticed early and expensive to fix after years.",
        ],
      },
      {
        heading: "Questions to ask before choosing customer management software",
        paragraphs: [
          "Can several people use it at the same time with different permissions? Does it connect customers to invoices and balances? Can I import my existing list, and who helps if it is large? Can I try it free with real data? What happens to my data if I leave? A small business needs a tool that staff will actually open every day, so ease of use matters as much as features.",
          "Try the shortlist with ten real customers each. Within an hour you will know which one your team finds natural, and which one feels like extra work.",
        ],
      },
    ],
    capabilities: [
      ['Full contact profile', 'Name, email, phone, company and type on one customer record.', HiOutlineUserGroup],
      ['Wallet balance', 'Credit and due balances update automatically as sales happen.', HiOutlineCreditCard],
      ['Status & history', 'Every record carries a status and creation date for account tracking.', HiOutlineCheckCircle],
      ['Connected to sales', 'Customer records link directly to invoices and sales activity.', HiOutlineDocumentChartBar],
    ],
    faqs: [
      ["What details does a customer record store?", "Name, email, phone, company and customer type, plus a status and creation date."],
      ["What is the customer wallet balance?", "A running balance of credit and dues that updates automatically as sales are recorded."],
      ["Does the wallet work with POS sales?", "Yes. It uses the same wallet mechanism as the POS counter, so sales from connected modules change the same balance."],
      ["Is a customer linked to their invoices?", "Yes. Customer records link directly to invoices and sales activity."],
      ["How do I avoid duplicate customers?", "Search before you add a new record, and merge by keeping the record that holds the history."],
      ["Can staff have limited access to customers?", "Yes. Roles and permissions decide who can view or edit customer records."],
      ["Can I try it free?", "Yes. Every product starts with a free 1-month trial."],
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
      {
        heading: "What a CRM invoice is, and why it belongs next to your customers",
        paragraphs: [
          "People search for “CRM invoice” and “CRM invoicing software” because they want one system where a sale, a customer and a bill live together. When invoices are made in a separate tool, someone has to retype the customer’s name, find the right price and later copy the payment back into the sales record. Every re-entry is a chance for a mistake.",
          "In Nexora CRM, an invoice is created inside the same workspace as the customer and the deal it belongs to. You choose the customer, add the items, set the terms and send. Status and payments update in one place, so the sales team and the accounts team always read the same facts.",
        ],
      },
      {
        heading: "What goes into an invoice",
        paragraphs: [
          "A Nexora invoice captures the customer’s name, phone, email, NTN or CNIC and address, with notes if you need them. Dates include the invoice date and a due date, and you select the currency. Payment terms and the payment method can be set on the invoice, and the status shows where the invoice stands.",
          "Line items can come from your product list or be typed manually as a manual item, so a one-off service can sit next to a catalogued product. Each line has a quantity, unit and price. The total can be shown with tax exclusive, and the grand total is also spelled out in words, which many customers and accountants expect on a formal invoice.",
        ],
      },
      {
        heading: "Draft, Approved, Overdue and Cancelled",
        paragraphs: [
          "Every invoice has a status. Draft means you are still preparing it, and nothing has been confirmed. Approved means it has been checked and is a real, valid invoice. Overdue marks an invoice whose due date has passed without payment. Cancelled keeps a record of an invoice that should no longer count.",
          "These four labels do more than decorate the screen. They let an accounts manager filter the list to see only overdue invoices and start chasing, or review all drafts before sending. They also make month-end easier, because cancelled invoices are clearly separated from live ones.",
        ],
      },
      {
        heading: "Taking payment: cash, card, bank transfer, cheque and wallets",
        paragraphs: [
          "Payments are recorded against the invoice using the method the customer actually used: cash, card, bank transfer, cheque or a mobile wallet. Recording the method is more useful than it sounds. At the end of the week you can match the cash drawer, the bank statement and the wallet history against the invoices, and any difference points to a specific payment.",
          "Because customers also carry a wallet balance in the CRM, credit and dues stay in step with invoices. A customer with an unpaid invoice appears with a due balance, and you do not have to cross-check two lists.",
        ],
      },
      {
        heading: "Step by step: creating your first invoice",
        paragraphs: [
          "Step 1. Open Invoices and choose to create a new invoice.",
          "Step 2. Select an existing customer or enter a new customer’s name, phone, email and, if needed, NTN or CNIC and address.",
          "Step 3. Set the invoice date and the due date, and choose the currency.",
          "Step 4. Choose the payment terms and, if the customer pays on the spot, the payment method.",
          "Step 5. Add the items. Pick a product from your list or add a manual item, then enter quantity and price.",
          "Step 6. Check the totals, the tax setting and the grand total in words.",
          "Step 7. Leave it as Draft if you need someone to review it, or approve it when it is ready, then print or share it.",
          "Step 8. When payment arrives, record the amount and the method.",
        ],
      },
      {
        heading: "Invoice templates and what a professional invoice includes",
        paragraphs: [
          "Many people look for a CRM invoice template. Whatever tool you use, a professional invoice should always show: your business name and contact details, the customer’s details, a unique invoice number, the invoice and due dates, a clear list of items with quantities and prices, the tax treatment, the total, the payment methods you accept and any payment terms. A short thank-you line is a nice touch.",
          "Nexora builds these elements into the invoice screen so you do not have to design a layout from scratch. If you only need to make a quick invoice without an account, our free invoice generator in the tools section is also available.",
        ],
      },
      {
        heading: "Chasing overdue invoices without damaging the relationship",
        paragraphs: [
          "Late payment is rarely about unwillingness. Often the invoice was mislaid or the person who pays has changed. Start with a friendly reminder a day or two after the due date, quote the invoice number and amount, and attach a copy. If there is no reply in a week, call. Keep a short note on the customer’s record after each contact.",
          "Use the overdue status to make this routine. Open the invoice list, filter for overdue, and work down the list every Monday. Linking this with the CRM follow-up board turns each overdue invoice into a task with an owner.",
        ],
      },
      {
        heading: "Choosing invoicing software for a small business",
        paragraphs: [
          "Free invoicing tools are fine for a handful of invoices a month. As you grow, ask whether the tool knows your customers, keeps statuses, records payments by method, handles tax correctly and lets staff work together with different permissions. Check whether it also manages stock if you sell products, and whether you can try it free before committing.",
          "Nexora CRM covers invoicing along with leads, customers, tasks and reports, so you pay once for one connected system. Every product starts with a free 1-month trial.",
        ],
      },
      {
        heading: "Tax, totals and the grand total in words",
        paragraphs: [
          "Invoices are tax exclusive in Nexora, which means item prices are entered without tax and tax is shown separately before the grand total. That matches how most business customers expect to read an invoice and makes it easy to see exactly how much tax was charged.",
          "The grand total is also written in words. This is a small detail with a practical purpose: a figure in words is much harder to alter than a figure in digits, and many customers’ accountants ask for it.",
        ],
      },
      {
        heading: "Invoices and customer records working together",
        paragraphs: [
          "Because invoices belong to the same workspace as customers, you see each customer’s billing history without a separate search. If a customer calls about an invoice from three months ago, you open their record, find it and answer in seconds.",
          "The wallet balance on the customer record reflects credit and dues, so the account manager sees the real picture before agreeing to a new order: how much is outstanding, and how long it has been outstanding.",
        ],
      },
      {
        heading: "Common invoicing mistakes and how to avoid them",
        paragraphs: [
          "Forgetting a due date is the commonest. If the invoice has no due date, nobody knows when it is late. Always set one. Mixing currencies is the second: set the currency on every invoice and do not assume. Third is editing an invoice after it has been sent. Use Draft for preparation and Approved for the final version, and cancel and reissue if something genuinely changes.",
          "Another mistake is recording a payment against the wrong invoice. Check the customer and invoice number before saving, especially when a customer has several open invoices.",
          "Finally, leaving invoices in Draft for weeks means revenue is invisible to reports. Review drafts at the end of each week and either approve or cancel them.",
        ],
      },
      {
        heading: "Invoice numbers, records and good bookkeeping habits",
        paragraphs: [
          "Every invoice should have a unique number, so any invoice can be found without ambiguity. Keep a copy of every invoice, including cancelled ones, because a gap in numbers raises questions during an audit. Match your invoice list against payments at least once a month, and keep notes on any payment that was partial or late.",
          "These habits are not special to any software. They are what keeps a small business credible with customers, tax authorities and banks.",
        ],
      },
      {
        heading: "Who should create, approve and see invoices",
        paragraphs: [
          "In a one-person business you do everything. As you grow, separate the roles: sales staff create drafts, a manager approves, and accounts records payments. Nexora’s roles and permissions let you decide who can see or change invoices, so that sensitive figures stay with the people who need them.",
        ],
      },
      {
        heading: "Reports and the bigger picture",
        paragraphs: [
          "Invoices feed your reports. Once invoices are approved and payments are recorded, you can see sales over time, outstanding amounts and your top customers. If revenue is falling, you spot it in weeks, not at the end of the year. If a single customer represents most of your sales, you see the risk and can act on it.",
        ],
      },
      {
        heading: "Invoicing for different kinds of business",
        paragraphs: [
          "A service business such as a design studio or consultancy usually invoices after the work, with a few manual items and a clear due date. A trading business invoices from a product list, with quantities and unit prices. A contractor may invoice in stages. Nexora supports all three because you can mix product items and manual items on the same invoice, and set terms for each customer.",
          "Whichever you are, the principle is the same: the invoice should let the customer see what they are paying for, how much, by when and how. If any of those four is unclear, expect delays and questions.",
        ],
      },
      {
        heading: "A simple follow-up script for late invoices",
        paragraphs: [
          "Day after due date: a short, polite message with the invoice number and amount, and a copy attached. One week after: a phone call asking if there is any problem with the invoice or the payment. Two weeks after: a clear message with a new payment date you both agree on. After a month: involve a manager and decide what happens with further orders.",
          "Write each contact on the customer’s record. A consistent, documented process feels fair to the customer and protects your cash flow.",
        ],
      },
      {
        heading: "Quotes, orders and invoices: keeping the chain tidy",
        paragraphs: [
          "Many sales begin as a conversation, become a quotation, turn into an order and finally an invoice. If every stage is a separate document in a separate place, details get lost. Keep the customer, the items and the agreed prices consistent from the first conversation to the final bill, so that the invoice never surprises anyone.",
        ],
      },
    ],
    capabilities: [
      ['Draft to Overdue status', 'Track every invoice from Draft through Approved, Overdue or Cancelled.', HiOutlineDocumentChartBar],
      ['Tax-exclusive amounts', 'Invoice amounts can be set tax-exclusive, with the grand total spelled out in words.', HiOutlineBanknotes],
      ['Manual & recommended line items', 'Add line items manually or use recommended items when creating an invoice.', HiOutlineClipboardDocumentList],
      ['Multiple payment methods', 'Record payment by cash, card, bank transfer, cheque or mobile wallet.', HiOutlineCreditCard],
    ],
    faqs: [
      ["What statuses can an invoice have?", "Draft, Approved, Overdue and Cancelled."],
      ["Can I add items that are not in my product list?", "Yes. You can add manual items or choose products from your list."],
      ["Which payment methods can I record?", "Cash, card, bank transfer, cheque and mobile wallet."],
      ["Does the invoice show the total in words?", "Yes. The grand total is also spelled out in words."],
      ["Can I set the invoice currency and due date?", "Yes. Each invoice has its own currency, invoice date and due date."],
      ["Can I store a customer’s NTN or CNIC on an invoice?", "Yes. The customer section includes an NTN / CNIC field along with name, phone, email and address."],
      ["Is there a free way to try invoicing?", "Yes. Every product starts with a free 1-month trial, and the free invoice generator in the tools section needs no account."],
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
      {
        heading: "Why most deals are lost in the follow-up",
        paragraphs: [
          "Few leads say no. Most simply go quiet because nobody got back to them at the right moment. A customer asks for a quote on Monday, the salesperson means to call on Wednesday, a busy week intervenes and by Friday the customer has bought from whoever phoned first. This is the most common and the most avoidable way a sales team loses money.",
          "A CRM follow-up system exists to take memory out of the process. Each follow-up becomes a task with an owner, a date and a reminder. The task appears on a shared board, the reminder reaches the owner, and an overdue item shows up where the manager can see it.",
          "This page explains how follow-ups work in Nexora CRM, how to set up a routine your team will actually keep, and which mistakes to avoid.",
        ],
      },
      {
        heading: "The follow-up board",
        paragraphs: [
          "Nexora CRM keeps follow-ups on a dedicated board called Follow-Up Automation. It covers daily tasks, reminders, overdue alerts and activity tracking. You can search the board by customer, title, priority, status, the person assigned or phone number, so finding the one task you need takes seconds even when there are hundreds.",
          "Everything is visible to the team in one place. A manager does not need to ask “who is chasing the Karachi quote?” because the board shows it, along with the person responsible and the status.",
        ],
      },
      {
        heading: "Agent workload at a glance",
        paragraphs: [
          "The workload view shows how follow-up tasks are distributed across your team. This is easy to overlook and very useful. When one person has forty open tasks and another has five, the first person’s follow-ups will slip, whatever their intentions. Seeing the spread lets a manager move work before it becomes a missed call.",
          "It also helps with fairness and coaching. If a team member always carries a heavy list, you can see whether the problem is volume, training or a few tasks that never get closed.",
        ],
      },
      {
        heading: "Reminders by email and WhatsApp",
        paragraphs: [
          "Reminders are the part that stops follow-ups from depending on someone’s memory. Nexora sends reminder notifications by email and over WhatsApp, so the person who owns a task is told on a channel they actually read. In many markets WhatsApp is checked far more often than email, and having both means a reminder is less likely to be missed.",
          "Overdue alerts are part of the same system. When a follow-up passes its due date without being closed, it is flagged, so it does not quietly disappear into the middle of the list.",
        ],
      },
      {
        heading: "Step by step: building a follow-up routine",
        paragraphs: [
          "Step 1. Decide the standard timing for your business. For example: respond to a new enquiry within an hour, follow up on a quote after two days, follow up again after a week.",
          "Step 2. For every new lead or quote, create a follow-up task with a clear title, such as “Call about the school software quote”, and a due date.",
          "Step 3. Assign the task to one person. Tasks owned by everyone are owned by no one.",
          "Step 4. Add a short note after every contact: what was said, what was promised and the next date.",
          "Step 5. Close the task when it is done and create the next one immediately, so the lead never sits without a next step.",
          "Step 6. Each morning, open the board, read the overdue and today lists and clear them first.",
          "Step 7. Once a week, the manager checks the workload view and the overdue items and has a short conversation with anyone who is behind.",
        ],
      },
      {
        heading: "What to write in a follow-up",
        paragraphs: [
          "The best follow-ups are specific and useful, not “just checking in”. Refer to something the customer said. Answer a question they raised. Offer one clear next step, such as a demo time or a trial link. Keep the message short and make it easy to reply.",
          "For a lead who has gone quiet, try a different angle on the second attempt: share a relevant example, mention a limited offer or ask a simple yes-or-no question. If there is still no reply after three or four sensible attempts over a few weeks, close the task politely and move on. A tidy list is more valuable than a long one.",
        ],
      },
      {
        heading: "Common follow-up mistakes",
        paragraphs: [
          "Creating tasks with no date. A task without a date is a wish. Always set one.",
          "Leaving tasks unassigned. Put a name on every follow-up.",
          "Ignoring overdue items. Clear overdue tasks before adding new ones, or the list becomes noise.",
          "Writing no notes. When a colleague takes over a lead, notes are the only memory.",
          "Following up only by email. Use the channel the customer prefers, which in many cases is a phone call or WhatsApp message.",
          "Never closing the loop. Close each task and create the next one, so you can see the true size of your pipeline.",
        ],
      },
      {
        heading: "Choosing follow-up and task software for a sales team",
        paragraphs: [
          "Ask whether reminders reach people where they are, for example by WhatsApp as well as email. Check that managers can see workload and overdue items without asking. Confirm that follow-ups connect to leads, customers and invoices, so history stays together. And test it with real leads on a free trial before committing.",
          "Nexora CRM covers these points and starts with a free 1-month trial. Setup, data migration and staff training are free on every plan, so your team can have a real follow-up routine running in their first week.",
        ],
      },
      {
        heading: "A week of follow-ups: an illustrative example",
        paragraphs: [
          "Monday morning, a school administrator asks a salesperson for a software demo. The salesperson books the demo for Wednesday and creates a follow-up task for Wednesday afternoon: “Send demo summary and pricing”.",
          "On Wednesday after the demo, the task is closed and a new one is created for Friday: “Call about questions”. The system sends a reminder by WhatsApp on Friday morning. On the call, the administrator asks for a trial. The salesperson creates a task for Monday: “Check how the trial is going”.",
          "Nothing in this chain depends on memory. Each step has a date, an owner and a reminder. This is an illustrative example, not a real client, but it is how a well-kept follow-up board looks.",
        ],
      },
      {
        heading: "How often to follow up, by type of lead",
        paragraphs: [
          "New enquiries are warmest in the first hour, so respond quickly and follow up the next day. Quotes usually deserve a follow-up after two days and again after a week. Demo and trial leads need a check-in during the trial and one just before it ends. Existing customers benefit from a short call every few months, which often turns into a repeat order or a referral. Dormant leads can be re-contacted every month or two with something new to say.",
          "Whatever your rhythm, write it down and share it. A team that follows the same timing gives customers a consistent experience and makes results easier to compare.",
        ],
      },
      {
        heading: "Short message ideas for follow-ups",
        paragraphs: [
          "After a quote: “Hello, I wanted to check whether you had a chance to review the quote. Happy to answer any question or adjust it.” After a demo: “Thank you for your time today. I have sent the summary. Would Thursday work for a quick call about next steps?” For a quiet lead: “Is this still a priority this month? If timing has changed, I am happy to check back later.” For a trial: “How is the trial going so far? I can help you set up anything that is not clear.”",
          "Notice that each message is short, polite and ends with one easy question. Adapt the wording to your own voice and language, and never copy a template exactly for every customer.",
        ],
      },
      {
        heading: "Measuring whether follow-ups work",
        paragraphs: [
          "Review a few simple numbers each month. How many follow-ups were completed on time? How many were overdue? How many leads moved forward after a follow-up? Which team members close tasks fastest? The follow-up board and the workload view give you the first answers, and the CRM analytics help with the rest.",
          "If most tasks are overdue, the team has too much to do or too little discipline. If tasks are done but leads do not move, look at the quality of the conversation, the timing or the offer. Small changes, repeated consistently, add up to noticeably more closed deals.",
        ],
      },
      {
        heading: "Setting up follow-ups for different industries",
        paragraphs: [
          "School and academy sales have seasons, so follow-ups cluster before admission periods. Create tasks for parents who enquired and keep a plan for the weeks before term starts.",
          "Retail and wholesale sales depend on repeat orders. Create a recurring task after each delivery to ask whether the customer needs more, and another before known busy seasons.",
          "Service companies and agencies often have long sales cycles. Use tasks to stay in touch with a short, useful message every few weeks until the customer is ready.",
          "Property and rental teams chase viewings and renewals. Tasks set a few weeks before a lease ends turn renewals into a calm conversation instead of a last-minute scramble.",
          "In every industry, the principle is the same: when a customer shows interest, the next step is a dated task with a named owner.",
        ],
      },
    ],
    capabilities: [
      ['Follow-up board', 'See every open follow-up on one shared board.', HiOutlineClipboardDocumentList],
      ['Agent workload view', 'See how follow-up tasks are distributed across the team.', HiOutlineUserGroup],
      ['Email reminders', 'Automatic email reminders for upcoming and overdue follow-ups.', HiOutlineDocumentChartBar],
      ['WhatsApp reminders', 'Reminder notifications also go out over WhatsApp.', HiOutlineCalendarDays],
    ],
    faqs: [
      ["Where do my team's follow-ups live?", "On the Follow-Up Automation board, where tasks, reminders, overdue alerts and activity are visible to the team."],
      ["How are reminders sent?", "Reminder notifications go out by email and WhatsApp."],
      ["Can I see who has too many tasks?", "Yes. The agent workload view shows how follow-up tasks are distributed across the team."],
      ["What can I search follow-ups by?", "Customer, title, priority, status, the person assigned or phone number."],
      ["What happens when a follow-up is overdue?", "It is flagged as overdue so it stands out on the board and in alerts."],
      ["How many follow-ups should I make before giving up on a lead?", "Three or four well-timed attempts over a few weeks is a common rule. After that, close the task politely so your list stays clear."],
      ["Do follow-ups connect to leads and invoices?", "Yes. Follow-ups sit in the same CRM as leads, customers and invoices, so the history stays together."],
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
      {
        heading: "Why a fleet needs a proper record for every vehicle",
        paragraphs: [
          "A rental or transport business sells the same asset again and again. A car that sits idle earns nothing, a car that is double-booked causes an argument, and a car that is in the workshop but still shown as free costs you a customer. Most of these problems have one cause: the answer to “which vehicles are available today?” lives in someone’s head or in a WhatsApp group.",
          "Fleet management software replaces that with one record per vehicle. In Nexora Fleet & Rental each vehicle has its own page with a registration, specification, rates and status, so availability becomes something you filter, not something you phone around to find out.",
          "This page explains what the vehicle record holds, how status works, how it connects to bookings, and a few habits that keep a small fleet organised.",
        ],
      },
      {
        heading: "What a vehicle record holds",
        paragraphs: [
          "Each vehicle is added with a name, registration or plate number and a category. You record the number of seats, the transmission (automatic or manual) and the fuel type (petrol, diesel, hybrid, electric or CNG). These details answer the first questions customers ask on the phone, so staff do not have to guess.",
          "Pricing is stored on the vehicle too. You can set a daily rate, an hourly rate, a weekly rate and a security deposit in your workspace currency. This means a booking starts from the right price instead of a number remembered by the person who answers the phone.",
          "You can mark whether a vehicle comes with a driver, and enter the driver’s name. A list of features, such as air conditioning or child seats, helps customers choose the right vehicle for their trip.",
        ],
      },
      {
        heading: "Availability, status and the daily picture",
        paragraphs: [
          "Every vehicle has a status: available, rented, reserved or in maintenance. The fleet screen shows how many vehicles are in each status and lets you filter the whole fleet by it. At the start of the day you can see at once what is on the road, what is waiting for a customer, what is held for a later booking and what is in the workshop.",
          "Status stays in step with bookings. When a vehicle is booked out, it moves to rented or reserved, and a vehicle that is rented or reserved cannot be changed carelessly. That protects you from the classic mistake of promising the same car to two customers.",
          "Use the maintenance status honestly. When a car goes to the workshop, mark it, and it drops out of the available list until you bring it back. Customers then never get promised a car that is not ready.",
        ],
      },
      {
        heading: "Search and organisation for a growing fleet",
        paragraphs: [
          "A fleet of five cars can be remembered. A fleet of fifty cannot. The vehicle list is searchable by name, registration and category, so staff can find a specific car in seconds. Categories such as economy, SUV, van or luxury let you group the fleet in the way customers ask for it.",
          "As the fleet grows, consistent naming matters. Use the same format for every vehicle, for example make, model and year, and always record the plate number exactly as it appears on the registration.",
        ],
      },
      {
        heading: "Safe changes to fleet records",
        paragraphs: [
          "Deleting a vehicle is permanent, so Nexora asks you to confirm it by showing the vehicle’s name and registration first. This small step prevents the wrong car from disappearing when someone clicks quickly. If a vehicle is sold or retired, it is better to remove it only after its past bookings are no longer needed, because history is how you measure which vehicles earned money.",
          "Access can also be limited by role. Counter staff can look up availability, while only managers can edit rates or remove vehicles. The Team & Permissions guide explains how to set this up.",
        ],
      },
      {
        heading: "From vehicle to booking to payment",
        paragraphs: [
          "The vehicle record is the first link in a chain. A booking attaches a customer, dates and a vehicle to it. Payments, security deposits and refunds attach to the booking. The customer ledger then shows what each customer has paid and still owes. Because every link uses the same records, a number you see on the dashboard can be traced back to a vehicle and a booking.",
          "That traceability is what lets you answer the questions an owner really cares about: which vehicles pay for themselves, which categories are most in demand, and how many days a month each car is actually rented.",
        ],
      },
      {
        heading: "Habits that keep a small fleet organised",
        paragraphs: [
          "Add every vehicle on day one, including the ones you rarely rent. A fleet that is only partly in the system gives misleading availability.",
          "Update status the moment a car changes hands or goes to the workshop. The system is only as current as the last update.",
          "Review rates seasonally. Peak periods, weddings, holidays and tourist seasons justify different prices, and the rate fields make them easy to change.",
          "Check the fleet screen every morning. Two minutes of reading the status counts saves long phone calls later.",
          "Keep driver details current. A vehicle that comes with a driver should always have a name against it.",
        ],
      },
      {
        heading: "What to look for in fleet management software",
        paragraphs: [
          "When you compare options, large enterprise systems often add live GPS tracking, telematics and complex maintenance schedules that a small rental business may never use, and they price accordingly. For a small or medium rental or transport business, the features that matter most are a clear record per vehicle, reliable availability, bookings linked to payments and customers, and honest reports on what each vehicle earns.",
          "Nexora Fleet & Rental is built around that practical core. It records vehicles, bookings, payments, customer ledgers and dues, and it shows fleet-level reports. It does not claim to be a live GPS tracker. If you need map tracking or telematics, tell the team and we will say plainly whether it is covered or a custom addition.",
        ],
      },
      {
        heading: "Fleet management for different kinds of operators",
        paragraphs: [
          "Self-drive rental companies care most about availability, deposits and returning vehicles on time. Their vehicle records need accurate rates, a clear status and a quick way to see what is free for the weekend.",
          "Chauffeur-driven and tour operators rent a vehicle together with a driver. The driver field on each vehicle makes it clear which vehicles come with a driver and who that driver is, so a customer who asks for a driver is offered the right vehicle.",
          "Wedding and event car services have strong seasons and special vehicles. Categories and feature lists help you present the right car for the right occasion, while seasonal rates let you price peak dates properly.",
          "Corporate and school transport providers manage vans and buses on regular routes. They benefit most from a clean list of vehicles with status, so a vehicle in the workshop is replaced before the morning run.",
        ],
      },
      {
        heading: "Setting rates that match demand",
        paragraphs: [
          "Rates are stored on the vehicle as daily, hourly and weekly prices with a security deposit. A useful starting point is to price the weekly rate noticeably below seven times the daily rate, because long rentals mean less cleaning and fewer idle days for you. Hourly rates suit short city trips and events, but check that they are not cheaper than half a day.",
          "Review rates before the busy months and again after. Reports on which vehicles are rented most tell you where there is room to raise prices and where a small discount could fill idle days. Keep the deposit high enough to cover a realistic minor repair or late fee.",
        ],
      },
      {
        heading: "Fleet management software or fleet maintenance software?",
        paragraphs: [
          "These two terms are often confused. Fleet maintenance software focuses on service schedules, work orders, inspections and repair costs, which is the daily concern of large operators with many vehicles and mechanics. Fleet management software covers the wider operation: which vehicles you have, who is renting them, what they pay and what you are owed.",
          "Nexora Fleet & Rental sits on the management and rental side. It records vehicles, status including maintenance, bookings, payments, customer ledgers and dues. It does not currently schedule preventive services or issue work orders. If you also need those, keep a simple service log alongside and tell us what you need so we can advise.",
        ],
      },
      {
        heading: "A weekly fleet review you can do in ten minutes",
        paragraphs: [
          "Open the fleet screen and read the count in each status. Check that every vehicle in the workshop has a reason and a return date. Look at which vehicles stayed available all week and ask why: price, condition or visibility. Look at which were rented every day and ask whether the rate is too low. Finally, glance at the dues list from the customer ledger to see whether any rented vehicle belongs to a customer who owes money.",
        ],
      },
      {
        heading: "Getting your fleet into Nexora on the first day",
        paragraphs: [
          "Start with a list of every vehicle you own or manage, even those that are rarely rented. For each one, gather the registration, make and model, seats, transmission, fuel type and the rates you charge. Enter the five most-rented vehicles first, check that the details look right, then add the rest.",
          "Next, decide categories that match how customers ask. Many rental customers say “a small car”, “an SUV for six people” or “a van for a group”, so categories based on size and use are more helpful than technical names.",
          "Finally, set the correct status on each vehicle today. A vehicle that is rented now should be marked rented. One that is in the workshop should be marked maintenance. From that point, update status whenever it changes. This is the single habit that keeps availability trustworthy.",
        ],
      },
    ],
    capabilities: [
      ['Vehicle specification', 'Registration, transmission and fuel type tracked per vehicle.', HiOutlineTruck],
      ['Driver assignment', 'Mark a vehicle as coming with a driver included.', HiOutlineUserGroup],
      ['Fleet-wide status filter', 'Filter the whole fleet by availability status.', HiOutlineClipboardDocumentList],
      ['Confirmed deletions', 'Removing a vehicle requires an explicit confirmation step.', HiOutlineCheckCircle],
    ],
    faqs: [
      ["What details can I store for each vehicle?", "Name, registration, category, seats, transmission, fuel type, daily, hourly and weekly rates, security deposit, features and whether it comes with a driver."],
      ["Which fuel types are supported?", "Petrol, diesel, hybrid, electric and CNG."],
      ["How do I know which vehicles are free today?", "Every vehicle has a status of available, rented, reserved or maintenance, and you can filter the whole fleet by status."],
      ["Can I mark a vehicle as being in the workshop?", "Yes. Set its status to maintenance and it leaves the available list until you change it back."],
      ["Can a vehicle be removed by accident?", "Removing a vehicle needs a confirmation step that shows its name and registration, so it is hard to delete the wrong one."],
      ["Does Nexora track vehicles live on a map?", "No. The fleet product records vehicles, bookings, payments and dues. If you need live map tracking, contact the team about a custom addition."],
      ["Can staff have different access to fleet records?", "Yes. Roles control who can view, edit or remove vehicles."],
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
      {
        heading: "What a customer ledger is, and why rental businesses need one",
        paragraphs: [
          "A ledger is a running account for one person or company: what they have bought, what they have paid and what is still owed. In a rental business, money rarely arrives all at once. A customer pays a deposit, returns the car late, owes an extra day, disputes a charge, then settles two weeks later. If those facts are scattered across booking sheets, chat messages and memory, someone always ends up not paying simply because nobody chased.",
          "The customer ledger in Nexora Fleet & Rental gathers everything about one customer into a single view: their details, their full booking history and their outstanding dues. Instead of opening bookings one at a time, you open the customer.",
        ],
      },
      {
        heading: "What the customer record holds",
        paragraphs: [
          "Each rental customer has a profile with a name, phone number, CNIC, driving license number, address and notes. Keeping the CNIC and license number on file matters for a rental business, because you can check who you are handing a vehicle to and you have the details ready if there is an incident.",
          "The profile also shows the total the customer has paid, the date of their last booking and any amount currently due. At a glance you can tell whether you are dealing with a first-time renter, a loyal repeat customer or someone who has an unpaid balance.",
        ],
      },
      {
        heading: "Booking history in one place",
        paragraphs: [
          "Each customer’s booking history is listed on their record, with the amount due or the word paid against each booking. This makes it easy to spot repeat customers and to treat them well, for example by offering a better rate or priority on busy dates. It also helps you handle a disagreement calmly. When a customer says they always paid on time, you can check.",
          "Because history sits with the customer and not with a single booking, you can see how a customer has used your fleet over months. Do they rent for weekends, for weddings, for long trips? That knowledge helps you plan which vehicles to keep available.",
        ],
      },
      {
        heading: "Customers with dues: the view that protects your cash flow",
        paragraphs: [
          "The ledger screen shows two key numbers at the top: how many customers currently have dues, and the total outstanding amount. A dedicated view lists every customer who owes money, with the amount shown against their name.",
          "This is the screen to open each morning. Instead of remembering who still owes, you read a list. Start with the largest or oldest balances. A polite phone call or WhatsApp message the day after a payment is due usually works far better than a request weeks later.",
          "Dues are tracked per customer across all of their bookings, not just the latest one. A customer who owes a small amount from an old booking cannot disappear behind a new one.",
        ],
      },
      {
        heading: "Step by step: using the ledger to collect what you are owed",
        paragraphs: [
          "Step 1. Open Rental Customers and read the number of customers with dues and the total outstanding amount.",
          "Step 2. Open the list of customers with dues and sort your attention by amount. Start with the largest balances.",
          "Step 3. Open the customer’s record and check their booking history to see which booking the amount belongs to.",
          "Step 4. Contact the customer by phone or WhatsApp using the number on their record. Mention the booking and the exact amount.",
          "Step 5. When they pay, record the payment against the booking. The due amount on their profile updates, and the payment flows into your rental payments and fleet dashboard.",
          "Step 6. Add a short note on the customer record if you agreed a payment date, so the next person knows.",
        ],
      },
      {
        heading: "Good habits for rental credit and deposits",
        paragraphs: [
          "Collect a security deposit on every booking and record it, so there is something to settle against if there are damages or late returns.",
          "Write down any agreed extensions or extra charges when they are agreed, not later. A ledger is only as accurate as the entries.",
          "Never hand over a vehicle to a customer with a large unpaid balance without a conversation. The ledger makes that balance visible at the moment you need it.",
          "Review the dues list weekly. Many late payments are simply forgotten and settle after one friendly reminder.",
          "Keep customer details complete. A ledger entry without a working phone number is hard to collect.",
        ],
      },
      {
        heading: "Accounts receivable for a rental business, in plain words",
        paragraphs: [
          "Accountants call money owed to a business “accounts receivable”, and larger companies study how old each unpaid amount is. You do not need that language to benefit from the idea. The principle is simple: money owed gets harder to collect the longer it waits. A customer ledger makes waiting visible, so you act while the memory of the rental is fresh.",
          "If you also need quotations and invoices for corporate customers, Nexora’s Quotes & Invoices screen lets you price a trip or rental, send the quotation, convert it into a booking or invoice and collect payments. Every payment flows into rental payments, the customer ledger and the fleet dashboard, so you do not have to enter it twice.",
        ],
      },
      {
        heading: "Choosing customer ledger software for a fleet",
        paragraphs: [
          "Look for a system where the ledger is connected to bookings and payments, not a separate address book. Check that it shows dues per customer across all bookings, that it keeps booking history, that staff roles can limit who edits payments, and that you can try it with your own customers before paying.",
          "Every Nexora product starts with a free 1-month trial, and setup, data migration and staff training are free on every plan. Try the ledger with your ten most important customers and see whether the dues list matches what you remember.",
        ],
      },
      {
        heading: "A worked example: one customer, three bookings",
        paragraphs: [
          "Imagine a customer who rents a car three times in two months. The first booking is paid in full. On the second, they pay a deposit and the balance is due on return, but they return late and owe an extra day. The third booking is made before the second is settled.",
          "Without a ledger, the extra day is easy to forget, because each booking looks fine on its own. With a ledger, the customer’s record shows three bookings, and a due amount against the second. When they call for the third rental, staff see that amount straight away and can agree on settlement before handing over the keys.",
          "This is an illustrative example, not a real client, but it shows why dues should be tracked per customer and not per booking.",
        ],
      },
      {
        heading: "Individual and corporate customers",
        paragraphs: [
          "Individuals usually pay at pickup or return, so the main risk is late fees and damages. Corporate customers often pay by invoice after a trip or at the end of the month, so the main risk is waiting. Use the customer record to note who the contact person is and the agreed payment terms, and use quotations and invoices for corporate work so that each trip has a document behind it.",
          "For corporate accounts, review dues weekly and send a statement before a payment is late, not after. A friendly reminder that the invoice is due on Friday works better than a complaint about a missed payment.",
        ],
      },
      {
        heading: "Handling CNIC and license details responsibly",
        paragraphs: [
          "Keeping a customer’s CNIC and driving license number is normal in rental businesses, and it protects both sides. Treat these details as private. Give access only to staff who need them, do not share them in group chats and do not include them in screenshots when you ask for support. Roles and permissions in Nexora let you decide who can open customer records.",
          "If a customer asks you to delete their details after a rental ends, handle the request according to the privacy rules of your country and the terms you agreed with them.",
        ],
      },
      {
        heading: "A month-end checklist for the ledger",
        paragraphs: [
          "Export or note the total outstanding dues and the number of customers with dues. Compare with last month: is the amount growing? List the five largest balances and decide who will call each one. Check for customers with several small balances, which are often forgotten. Confirm that every payment received in the last days of the month is recorded, so that next month starts clean. Finally, review the customer notes for promises of payment dates and mark the ones that were not kept.",
        ],
      },
      {
        heading: "Questions to ask before you lend a vehicle on credit",
        paragraphs: [
          "Do I have the customer’s full name, phone, CNIC and license number on file? Is there an existing balance on their ledger? How much deposit have I collected, and does it cover a realistic problem? Have I agreed in writing, even by message, when the balance will be paid? Does a second person know about the agreement? If any answer is no, fix it before the vehicle leaves.",
          "These questions sound strict, but they protect good customers as much as they protect you. Clear terms, recorded in the ledger, prevent the awkward conversations that damage relationships. A customer who knows exactly what is due and when is far more likely to pay on time.",
          "Over time, the ledger also tells you who deserves more trust. Customers with long histories of on-time payment can be offered smoother terms, and customers with repeated late balances can be asked for larger deposits.",
        ],
      },
    ],
    capabilities: [
      ['Customer records', 'Every rental customer has their own record in the ledger.', HiOutlineUserGroup],
      ['Booking history', 'See a customer’s full booking history in one place.', HiOutlineClipboardDocumentList],
      ['Outstanding dues', 'Track what each customer owes across all their bookings.', HiOutlineBanknotes],
      ['Customers with dues view', 'A dedicated view surfaces every customer who currently owes money.', HiOutlineChartBarSquare],
    ],
    faqs: [
      ["What does the customer ledger show?", "Each customer’s details, total paid, last booking, full booking history and any outstanding dues."],
      ["Can I see all customers who owe money?", "Yes. A dedicated view lists every customer with dues, and the screen shows the number of customers with dues and the total outstanding amount."],
      ["Are dues tracked across several bookings?", "Yes. Dues are tracked per customer across all their bookings, not just the most recent one."],
      ["Can I store CNIC and license numbers?", "Yes. The customer profile has fields for name, phone, CNIC, license number, address and notes."],
      ["Do payments update the ledger automatically?", "Yes. Payments recorded against bookings flow into rental payments, the customer ledger and the fleet dashboard."],
      ["Can I create quotations for customers?", "Yes. Quotes & Invoices lets you price a trip or rental, send a quotation and turn it into a booking or invoice."],
      ["How often should I review dues?", "A weekly review works for most businesses, with a quick look each morning when you have many open balances."],
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
