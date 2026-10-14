/**
 * Timeline and copy for the Nexora homepage intro video. Shared by the frame
 * renderer (src/components/home/NexoraIntroStage.jsx), the homepage section
 * (chapters list, VideoObject JSON-LD) and the tests. Seconds, 72 in total.
 * Every product claim is taken from the site's own product pages and pricing page.
 */
import { absoluteUrl, assetUrl } from './seoStructuredData.js'

export const NEXORA_INTRO = Object.freeze({
  mp4: '/nexora-intro-v2.mp4',
  poster: '/nexora-intro-v2-poster.jpg',
  // first moments of the video; shown by the player until the first frame loads
  startFrame: '/nexora-intro-v2-start.jpg',
  width: 1280,
  height: 720,
  duration: 72,
  posterT: 70,
  uploadDate: '2026-10-14',
  capturePath: '/nexora-intro-capture',
})

export const NEXORA_INTRO_SCENES = Object.freeze([
  { id: 'hook', start: 0, end: 6.5, title: 'The problem', caption: 'Sheets, paper bills, chat threads and separate apps slow a growing business down.' },
  { id: 'platform', start: 6.5, end: 13.5, title: 'One platform', caption: 'Nexora puts POS, ERP, CRM and AI on one cloud platform with one login.' },
  { id: 'restaurant', start: 13.5, end: 21.5, title: 'Restaurant POS', caption: 'Tables, KOT, a kitchen display, split bills and billing that keeps working offline.', links: [['Restaurant POS', '/restaurant-pos']] },
  { id: 'retail', start: 21.5, end: 29.5, title: 'Retail and Pharmacy POS', caption: 'Barcode billing and stock for shops, plus batch and expiry tracking for pharmacies.', links: [['Retail POS', '/retail-pos'], ['Pharmacy POS', '/pharmacy-pos']] },
  { id: 'school', start: 29.5, end: 36.5, title: 'School ERP', caption: 'Student records, fees, attendance, exams and staff payroll in one place.', links: [['School ERP', '/school-erp']] },
  { id: 'crm', start: 36.5, end: 44.5, title: 'CRM and WhatsApp CRM', caption: 'Leads, follow-ups and invoices in one dashboard, with WhatsApp chats turned into leads.', links: [['CRM', '/crm'], ['WhatsApp CRM', '/whatsapp-crm']] },
  { id: 'fleet', start: 44.5, end: 51.5, title: 'Transport and Property', caption: 'Vehicle bookings and dues for fleets; rent, leases and owner reports for property managers.', links: [['Transport & Fleet', '/transport-fleet'], ['Property ERP', '/property-erp']] },
  { id: 'ai', start: 51.5, end: 58.5, title: 'Nexora AI', caption: 'AI features built into the modules, from importing a menu to asking about your sales.', links: [['Nexora AI', '/ai']] },
  { id: 'custom', start: 58.5, end: 64.5, title: 'Custom software and free tools', caption: 'Custom software, mobile apps and online stores, plus free invoice and quotation makers.', links: [['Custom software', '/software-development'], ['ERP development', '/erp-development'], ['Mobile apps', '/mobile-app-development'], ['Online stores', '/ecommerce-development'], ['Free tools', '/tools']] },
  { id: 'close', start: 64.5, end: 72, title: 'Start free', caption: 'A free 1-month trial with full access and no credit card. PKR billing, Urdu and English support.', links: [['Start free trial', '/signup']] },
])

export function nexoraIntroSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${absoluteUrl('/')}#intro-video`,
    name: 'Nexora Solution in 72 seconds: POS, ERP, CRM and AI on one platform',
    description: 'A 72 second tour of Nexora: Restaurant, Retail and Pharmacy POS, School ERP, CRM, WhatsApp CRM, Transport and Fleet, Property ERP, Nexora AI, custom software and free business tools.',
    thumbnailUrl: assetUrl(NEXORA_INTRO.poster),
    contentUrl: assetUrl(NEXORA_INTRO.mp4),
    uploadDate: NEXORA_INTRO.uploadDate,
    duration: 'PT1M12S',
    width: NEXORA_INTRO.width,
    height: NEXORA_INTRO.height,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'Nexora Solution', url: absoluteUrl('/') },
  }
}
