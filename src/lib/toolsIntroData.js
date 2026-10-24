/**
 * Timeline and copy for the free tools intro video on /tools/. Shared by the
 * frame renderer (src/components/tools/ToolsIntroStage.jsx), the hub section
 * (chapter list, VideoObject JSON-LD) and the tests. Seconds, 57 in total.
 * Every claim comes from the tools' own pages (src/lib/toolsPagesData.js).
 */
import { absoluteUrl, assetUrl } from './seoStructuredData.js'

export const TOOLS_INTRO = Object.freeze({
  mp4: '/nexora-tools-intro.mp4',
  poster: '/nexora-tools-intro-poster.jpg',
  startFrame: '/nexora-tools-intro-start.jpg',
  width: 1280,
  height: 720,
  duration: 57,
  posterT: 55,
  uploadDate: '2026-10-14T09:00:00+05:00',
  capturePath: '/nexora-tools-intro-capture',
  label: 'Nexora free business tools tour, 57 seconds, no audio, plays on a loop',
})

export const TOOLS_INTRO_SCENES = Object.freeze([
  { id: 'hook', start: 0, end: 6, title: 'Paperwork, sorted', caption: 'Invoices in Excel, receipts by hand, quotes lost in chat: business paperwork eats the week.' },
  { id: 'invoice', start: 6, end: 14, title: 'Free Invoice Generator', caption: 'A PDF or Excel invoice in three steps, with taxes, discounts, partial payments and 160+ currencies.', links: [['Invoice generator', '/tools/invoice-generator']] },
  { id: 'regional', start: 14, end: 22, title: 'GST, UAE VAT and CIS invoices', caption: 'GSTIN with CGST, SGST or IGST and a UPI QR; UAE Tax Invoices with TRN and 5% VAT; UK CIS deductions.', links: [['GST invoice', '/tools/gst-invoice-generator'], ['UAE VAT invoice', '/tools/uae-vat-invoice-generator'], ['CIS invoice', '/tools/cis-invoice-generator'], ['Contractor invoice', '/tools/contractor-invoice-generator'], ['Pakistan invoice', '/tools/pakistan-invoice-generator']] },
  { id: 'quote', start: 22, end: 29, title: 'Quotation Generator', caption: 'Quotes with a validity date and deposit that turn into an invoice in one click.', links: [['Quotation generator', '/tools/quotation-generator'], ['Proforma invoice', '/tools/proforma-invoice-generator'], ['Purchase order', '/tools/purchase-order-generator'], ['Delivery note', '/tools/delivery-note-generator']] },
  { id: 'receipt', start: 29, end: 37, title: 'Receipts and letterhead', caption: 'Till-style receipts for 58mm and 80mm rolls, and invoices that fit inside your own letterhead.', links: [['Thermal receipts', '/tools/thermal-receipt-generator'], ['Invoice on letterhead', '/tools/invoice-on-letterhead']] },
  { id: 'paystub', start: 37, end: 44, title: 'Pay Stub Generator', caption: 'Payslips with overtime, deductions, year-to-date totals and net pay in words, in any currency.', links: [['Pay stub generator', '/tools/pay-stub-generator']] },
  { id: 'private', start: 44, end: 51, title: 'Private by design', caption: 'No signup and no watermark. Documents are built in your browser and stay on your device.' },
  { id: 'close', start: 51, end: 57, title: 'Pick a tool', caption: 'Nine free business tools, ready in your browser.' },
])

export function toolsIntroSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${absoluteUrl('/tools/')}#intro-video`,
    name: 'Nexora free business tools in 57 seconds',
    description: 'A 57 second tour of the free Nexora business tools: invoice, GST, UAE VAT, CIS and contractor invoices, quotations, thermal receipts, invoice on letterhead and pay stubs. No signup, no watermark, data stays on your device.',
    thumbnailUrl: assetUrl(TOOLS_INTRO.poster),
    contentUrl: assetUrl(TOOLS_INTRO.mp4),
    uploadDate: TOOLS_INTRO.uploadDate,
    duration: 'PT57S',
    width: TOOLS_INTRO.width,
    height: TOOLS_INTRO.height,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'Nexora Solution', url: absoluteUrl('/') },
  }
}
