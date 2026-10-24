/**
 * Launch switch for the free tools (/tools/*): the single source of truth that
 * the React components, scripts/prerender.mjs and scripts/generate-sitemap.mjs
 * all read.
 *
 *   false — every /tools/* page is noindex,follow and out of the sitemap, and
 *           no link to them appears in the header, the three footers, the
 *           homepage or the HTML sitemap. The pages still work at their URLs.
 *   true  — the landing pages below become indexable, are listed in the
 *           sitemap, and every link appears.
 *
 * /tools/invoice/view (share links: a private document in the URL fragment) is
 * noindex and out of the sitemap in both states.
 *
 * Launch day: flip to true, build, deploy. See the checklist in the Step 7 report.
 */
import { GEOLINT_HOW_PATH, GEOLINT_LAUNCHED, GEOLINT_PATH } from './geolintLaunch.js'
import { GEO_HUB_PATH } from './geoPages.js'

export const TOOLS_LAUNCHED = true

export const TOOLS_HUB_PATH = '/tools'
export const TOOL_SHARE_VIEW_PATH = '/tools/invoice/view'

/** The tools, in the order every list shows them. Paths without trailing slash.
 *  blurb: a few words for menus; summary: 14-20 words for the homepage cards (a direct answer AI tools can quote). */
export const TOOL_LINKS = Object.freeze([
  { key: 'invoice', path: '/tools/invoice-generator', label: 'Free Invoice Generator', blurb: 'PDF & Excel invoices in three steps', summary: 'Make a PDF or Excel invoice with taxes, discounts and 160+ currencies. No watermark, no signup.' },
  { key: 'gst', path: '/tools/gst-invoice-generator', label: 'GST Invoice Generator', blurb: 'GSTIN, CGST/SGST/IGST and UPI QR', summary: 'Indian tax invoices with GSTIN, CGST, SGST or IGST, lakh and crore amounts and a UPI QR code.' },
  { key: 'cis', path: '/tools/cis-invoice-generator', label: 'CIS Invoice Generator', blurb: 'UK pounds, VAT and CIS deduction', summary: 'UK subcontractor invoices in pounds: bill labour and materials, add VAT and deduct CIS automatically.' },
  { key: 'uae', path: '/tools/uae-vat-invoice-generator', label: 'UAE VAT Invoice Generator', blurb: 'AED, TRN and 5% VAT', summary: 'UAE Tax Invoice in dirhams with your TRN, 5% VAT and bank details, ready as PDF or Excel.' },
  { key: 'contractor', path: '/tools/contractor-invoice-generator', label: 'Contractor Invoice Generator', blurb: 'Hours, materials and sales tax', summary: 'Bill hours and materials, add sales tax to chosen lines, then download a PDF or Excel file.' },
  { key: 'thermal', path: '/tools/thermal-receipt-generator', label: 'Thermal Receipt Generator', blurb: '58mm & 80mm POS receipts', summary: 'POS receipts on 58mm or 80mm paper. Print straight from your browser or save the receipt as PDF.' },
  { key: 'letterhead', path: '/tools/invoice-on-letterhead', label: 'Invoice on Letterhead', blurb: 'Print on your own letterhead', summary: 'Upload your letterhead as PNG, JPG or PDF, set safe margins and download a print-ready invoice.' },
  { key: 'quotation', path: '/tools/quotation-generator', label: 'Quotation Generator', blurb: 'Quotes that become invoices', summary: 'Quotes with a validity date, terms and a deposit, which you can convert into an invoice in 1 click.' },
  { key: 'paystub', path: '/tools/pay-stub-generator', label: 'Pay Stub Generator', blurb: 'Payslips with gross, deductions and net pay', summary: 'Payslips with gross pay, overtime, deductions, year-to-date totals and net pay, as PDF, Excel or PNG.' },
  { key: 'pakistan', path: '/tools/pakistan-invoice-generator', label: 'Pakistan Invoice Generator', blurb: 'PKR, NTN, STRN and sales tax', summary: 'Sales tax invoices in PKR with your NTN and STRN, ready to download as a PDF or Excel file.' },
  { key: 'proforma', path: '/tools/proforma-invoice-generator', label: 'Proforma Invoice Generator', blurb: 'A priced preview with a deposit', summary: 'A priced preview with a validity date and a deposit that you turn into the final invoice later.' },
  { key: 'purchaseorder', path: '/tools/purchase-order-generator', label: 'Purchase Order Generator', blurb: 'Orders for your supplier', summary: 'List the items you are buying with a delivery date, payment terms and ship-to address, as PDF or Excel.' },
  { key: 'deliverynote', path: '/tools/delivery-note-generator', label: 'Delivery Note Generator', blurb: 'Goods and quantities, no prices', summary: 'A numbered delivery note listing items, quantities, delivery address and order number, without prices, as PDF or Excel.' },
])

/** Hub + the tools: the pages the switch makes indexable. */
export const TOOL_LANDING_PATHS = Object.freeze([TOOLS_HUB_PATH, ...TOOL_LINKS.map((t) => t.path)])

/** /tools/* paths that are noindex,follow in the given state. */
export function toolsNoindexPaths(launched = TOOLS_LAUNCHED) {
  return launched ? [TOOL_SHARE_VIEW_PATH] : [...TOOL_LANDING_PATHS, TOOL_SHARE_VIEW_PATH]
}

/** /tools/* paths added to the sitemap allowlist in the given state. */
export function toolsSitemapPaths(launched = TOOLS_LAUNCHED) {
  return launched ? [...TOOL_LANDING_PATHS] : []
}

/** Header dropdown items, or none before launch. */
export function toolsNavLinks(launched = TOOLS_LAUNCHED) {
  return launched ? TOOL_LINKS : []
}

/**
 * The "Free Tools" link group shared by the footers and the HTML sitemap, as
 * [label, path] pairs; null before launch.
 */
export function toolsFooterGroup(launched = TOOLS_LAUNCHED) {
  if (!launched) return null
  return {
    heading: 'Free Tools',
    links: [['All Free Tools', TOOLS_HUB_PATH], ...TOOL_LINKS.map((t) => [t.label, t.path]), ...(GEOLINT_LAUNCHED ? [['GEO Audit Tool (GeoLint)', GEOLINT_PATH], ['How GeoLint Works', GEOLINT_HOW_PATH], ['GEO Guides', GEO_HUB_PATH]] : [])],
  }
}
