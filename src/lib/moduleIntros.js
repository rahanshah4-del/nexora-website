/**
 * Intro videos for each Nexora module (the dark "futuristic" series).
 *
 * Each intro is a short silent animation with on-screen captions, drawn with
 * sample data by src/components/video/ModuleIntroStage.jsx and rendered to
 * public/videos/intros/<id>.mp4 / .webm / -poster.jpg by
 * scripts/render-module-intros.mjs. They are illustrations, not recordings of a
 * customer's account, and the page says so. Every claim in a caption comes from
 * the module's own product page.
 *
 * `solutionSlug` is the key SolutionPage.jsx uses for the product page.
 * To add an intro: add an entry here, a scene file in src/components/video/intros/,
 * register it in ModuleIntroStage.jsx, then run the render script.
 * `scenes` must be contiguous and end at `duration`.
 */
import { absoluteUrl, assetUrl } from './seoStructuredData.js'

export const MODULE_INTRO = Object.freeze({
  width: 1920,
  height: 1080,
  stageWidth: 1280,
  stageHeight: 720,
  fps: 30,
  uploadDate: '2026-10-21T09:00:00+05:00',
})
export const MODULE_INTRO_CAPTURE_PATH = '/module-intro-capture'
export const MODULE_INTRO_DIR = '/videos/intros'

export const MODULE_INTROS = Object.freeze({
  'restaurant-pos': {
    id: 'restaurant-pos',
    solutionSlug: 'pos',
    path: '/restaurant-pos',
    productName: 'Nexora Restaurant POS',
    accent: 'orange',
    duration: 28,
    posterT: 17.8,
    heading: 'Restaurant POS in 28 seconds',
    title: 'Nexora Restaurant POS in 28 seconds',
    description: 'A 28 second tour of Nexora Restaurant POS: a live table map, an order sent to the kitchen display as a KOT, split bills, billing that keeps working offline and a daily sales report.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The rush', caption: 'Paper orders, shouting to the kitchen and wrong bills slow a busy floor down.' },
      { id: 'tables', start: 4.5, end: 11, title: 'Tables', caption: 'Free, occupied and waiting-for-bill tables show on one live floor map.' },
      { id: 'order', start: 11, end: 18.5, title: 'Order to kitchen', caption: 'Tap the items, see the total and send the KOT to the kitchen display.' },
      { id: 'split', start: 18.5, end: 23.5, title: 'Split bills and offline', caption: 'Split a bill any way you like. Billing keeps working when the internet drops.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
  'retail-pos': {
    id: 'retail-pos',
    solutionSlug: 'retail-pos',
    path: '/retail-pos',
    productName: 'Nexora Retail POS',
    accent: 'blue',
    duration: 28,
    posterT: 17.8,
    heading: 'Retail POS in 28 seconds',
    title: 'Nexora Retail POS in 28 seconds',
    description: 'A 28 second tour of Nexora Retail POS: stock levels with reorder alerts, barcode billing with a printed receipt, returns that sync inventory and store reports.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The queue', caption: 'Slow checkout, wrong stock counts and manual returns hold a busy store back.' },
      { id: 'stock', start: 4.5, end: 11, title: 'Inventory', caption: 'Track stock levels and get a reorder alert before a product runs out.' },
      { id: 'billing', start: 11, end: 18.5, title: 'Barcode billing', caption: 'Scan the items, apply a discount and print the receipt in seconds.' },
      { id: 'reports', start: 18.5, end: 23.5, title: 'Returns and reports', caption: 'Returns sync with inventory, and store reports show sales by product.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
  'medical-store-pos': {
    id: 'medical-store-pos',
    solutionSlug: 'medical-store-pos',
    path: '/pharmacy-pos',
    productName: 'Nexora Pharmacy POS',
    accent: 'emerald',
    duration: 28,
    posterT: 17.8,
    heading: 'Pharmacy POS in 28 seconds',
    title: 'Nexora Pharmacy POS in 28 seconds',
    description: 'A 28 second tour of Nexora Pharmacy POS: batches and expiry alerts, fast medicine billing that updates batch stock, supplier purchases and daily reports.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The risk', caption: 'Expired stock, missing batches and paper registers cost a pharmacy money.' },
      { id: 'expiry', start: 4.5, end: 11, title: 'Batches and expiry', caption: 'Every medicine has a batch, and expiry alerts show what to review first.' },
      { id: 'billing', start: 11, end: 18.5, title: 'Medicine billing', caption: 'Search a medicine, bill it and the batch stock updates on its own.' },
      { id: 'reports', start: 18.5, end: 23.5, title: 'Purchases and reports', caption: 'Record supplier purchases and close the day with one sales report.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
  'school-erp': {
    id: 'school-erp',
    solutionSlug: 'school-erp',
    path: '/school-erp',
    productName: 'Nexora School ERP',
    accent: 'amber',
    duration: 28,
    posterT: 17.8,
    heading: 'School ERP in 28 seconds',
    title: 'Nexora School ERP in 28 seconds',
    description: 'A 28 second tour of Nexora School ERP: class attendance with parent updates, fee vouchers and collection, exam results and academic reports.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The paperwork', caption: 'Paper registers, missed fee dues and late results slow a school office down.' },
      { id: 'attendance', start: 4.5, end: 11, title: 'Attendance', caption: 'Mark a class in a tap, and the guardian of an absent student is informed.' },
      { id: 'fees', start: 11, end: 18.5, title: 'Fee management', caption: 'Collect a fee voucher and the parent portal shows the payment.' },
      { id: 'exams', start: 18.5, end: 23.5, title: 'Exams and reports', caption: 'Enter exam marks, publish results and view fee and attendance reports.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
  'crm': {
    id: 'crm',
    solutionSlug: 'crm',
    path: '/crm',
    productName: 'Nexora CRM',
    accent: 'violet',
    duration: 28,
    posterT: 17.8,
    heading: 'CRM in 28 seconds',
    title: 'Nexora CRM in 28 seconds',
    description: 'A 28 second tour of Nexora CRM: a lead pipeline, a deal turned into an invoice, follow-up tasks and team performance.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The leak', caption: 'Leads in notebooks and missed follow-ups quietly lose sales.' },
      { id: 'pipeline', start: 4.5, end: 11, title: 'Pipeline', caption: 'Every lead sits in a stage, with an owner and a next step.' },
      { id: 'invoice', start: 11, end: 18.5, title: 'Deal to invoice', caption: 'Win a deal and create the invoice from the same workspace.' },
      { id: 'team', start: 18.5, end: 23.5, title: 'Team and tasks', caption: 'Assign follow-up tasks and see how each team member is doing.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
  'whatsapp-crm': {
    id: 'whatsapp-crm',
    solutionSlug: 'whatsapp-crm',
    path: '/whatsapp-crm',
    productName: 'Nexora WhatsApp CRM',
    accent: 'cyan',
    duration: 28,
    posterT: 17.8,
    heading: 'WhatsApp CRM in 28 seconds',
    title: 'Nexora WhatsApp CRM in 28 seconds',
    description: 'A 28 second tour of Nexora WhatsApp CRM: chats linked to customers, a targeted broadcast, follow-ups, automation and outreach reports.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The chaos', caption: 'Unanswered chats and manual broadcasts mean customers slip away.' },
      { id: 'chats', start: 4.5, end: 11, title: 'Customer chats', caption: 'Every conversation is linked to a customer record with a next follow-up.' },
      { id: 'broadcast', start: 11, end: 18.5, title: 'Broadcasts', caption: 'Send a targeted broadcast and track its delivery.' },
      { id: 'followups', start: 18.5, end: 23.5, title: 'Follow-ups and reports', caption: 'Schedule follow-ups, trigger automation and measure the replies.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
  'transport-rental': {
    id: 'transport-rental',
    solutionSlug: 'transport-rental',
    path: '/transport-fleet',
    productName: 'Nexora Fleet & Rental',
    accent: 'indigo',
    duration: 28,
    posterT: 17.8,
    heading: 'Fleet and Rental in 28 seconds',
    title: 'Nexora Fleet and Rental in 28 seconds',
    description: 'A 28 second tour of Nexora Fleet & Rental: live fleet status, a rental booking saved to the customer ledger, payments and dues, and rental reports.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The gaps', caption: 'Missed dues, double bookings and paper ledgers cost a rental business.' },
      { id: 'fleet', start: 4.5, end: 11, title: 'Fleet', caption: 'See which vehicles are rented and which are available, live.' },
      { id: 'booking', start: 11, end: 18.5, title: 'Booking', caption: 'Create a booking with the rate and deposit, saved to the customer ledger.' },
      { id: 'payments', start: 18.5, end: 23.5, title: 'Payments and dues', caption: 'Record collections and refunds, and follow up on pending dues.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
  'property-erp': {
    id: 'property-erp',
    solutionSlug: 'property-erp',
    path: '/property-erp',
    productName: 'Nexora Property ERP',
    accent: 'rose',
    duration: 28,
    posterT: 17.8,
    heading: 'Property ERP in 28 seconds',
    title: 'Nexora Property ERP in 28 seconds',
    description: 'A 28 second tour of Nexora Property ERP: rent status per unit, a rent payment that updates the owner report, maintenance requests and portfolio reports.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The backlog', caption: 'Late rent, lost lease dates and slow owner reports pile up.' },
      { id: 'rent', start: 4.5, end: 11, title: 'Rent collection', caption: 'See which tenants have paid and which rent is due.' },
      { id: 'payment', start: 11, end: 18.5, title: 'Rent payment', caption: 'Record a payment and the owner statement updates.' },
      { id: 'maintenance', start: 18.5, end: 23.5, title: 'Maintenance and reports', caption: 'Assign maintenance requests and view portfolio-level reports.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
  'nexora-ai': {
    id: 'nexora-ai',
    solutionSlug: 'nexora-ai',
    path: '/ai',
    productName: 'Nexora AI',
    accent: 'violet',
    duration: 28,
    posterT: 17.8,
    heading: 'Nexora AI in 28 seconds',
    title: 'Nexora AI in 28 seconds',
    description: 'A 28 second tour of Nexora AI: a menu photo turned into POS items, a free GeoLint GEO audit that scores AI search visibility out of 100, and instant AI reports with free invoices.',
    scenes: [
      { id: 'hook', start: 0, end: 4.5, title: 'The busywork', caption: 'Typing menus by hand, reports nobody reads and invoices built from scratch eat the day.' },
      { id: 'menu', start: 4.5, end: 11, title: 'AI menu import', caption: 'Upload a menu photo and AI reads every item, price and category into your POS.' },
      { id: 'geo', start: 11, end: 18.5, title: 'GeoLint GEO audit', caption: 'GeoLint scores out of 100 whether AI search tools can read your site, then ranks the fixes.' },
      { id: 'reports', start: 18.5, end: 23.5, title: 'Reports and free tools', caption: 'Get AI sales summaries in seconds, and make an invoice or quotation with the free tools.' },
      { id: 'close', start: 23.5, end: 28, title: 'Start free', caption: 'A free 1-month trial with no credit card.' },
    ],
  },
})

export const ALL_INTROS = Object.freeze(Object.values(MODULE_INTROS))
export const getIntro = (id) => MODULE_INTROS[id] || null
export const introForPath = (path) => ALL_INTROS.find((intro) => intro.path === path) || null
export const introForSlug = (slug) => ALL_INTROS.find((intro) => intro.solutionSlug === slug) || null

export const introFiles = (id) => ({
  mp4: `${MODULE_INTRO_DIR}/${id}.mp4`,
  webm: `${MODULE_INTRO_DIR}/${id}.webm`,
  poster: `${MODULE_INTRO_DIR}/${id}-poster.jpg`,
})

export function introSchema(intro) {
  const files = introFiles(intro.id)
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${absoluteUrl(intro.path)}#intro-video`,
    name: intro.title,
    description: intro.description,
    thumbnailUrl: assetUrl(files.poster),
    contentUrl: assetUrl(files.mp4),
    uploadDate: MODULE_INTRO.uploadDate,
    duration: `PT${intro.duration}S`,
    width: MODULE_INTRO.width,
    height: MODULE_INTRO.height,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'Nexora Solution', url: absoluteUrl('/') },
  }
}
