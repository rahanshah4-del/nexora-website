/**
 * The footer's link columns, shared by the React footer (PublicFooter.jsx) and
 * the prerendered static footer (scripts/lib/footerLinkGroups.mjs), so the HTML
 * a crawler sees and the page a visitor sees cannot drift apart.
 *
 * Kept short on purpose: every other page (every service, product, tool and
 * country) is one click further, through the header menu, /tools, /industries,
 * /help-center and the HTML sitemap at /sitemap, which lists every country.
 * The "Free Tools" column exists only once the tools are launched.
 */
import { TOOLS_HUB_PATH, TOOLS_LAUNCHED } from './toolsLaunch.js'

const PRODUCTS = {
  heading: 'Products',
  links: [
    ['Nexora CRM', '/crm'],
    ['Restaurant POS', '/restaurant-pos'],
    ['Retail POS', '/retail-pos'],
    ['Pharmacy POS', '/pharmacy-pos'],
    ['School ERP', '/school-erp'],
    ['All industries →', '/industries'],
  ],
}

const TOOLS = {
  heading: 'Free Tools',
  links: [
    ['Invoice Generator', '/tools/invoice-generator'],
    ['Quotation Generator', '/tools/quotation-generator'],
    ['Thermal Receipt', '/tools/thermal-receipt-generator'],
    ['Pay Stub Generator', '/tools/pay-stub-generator'],
    ['Delivery Note', '/tools/delivery-note-generator'],
    ['All free tools →', TOOLS_HUB_PATH],
  ],
}

const COMPANY = {
  heading: 'Company',
  links: [
    ['About', '/about'],
    ['Pricing', '/pricing'],
    ['Software Development', '/software-development'],
    ['Blog', '/blog'],
    ['Contact', '/contact'],
  ],
}

const HELP = {
  heading: 'Help',
  links: [
    ['Help Center', '/help-center'],
    ['FAQ', '/faq'],
    ['Countries we serve →', '/sitemap'],
  ],
}

/** [{ heading, links: [[label, path]] }] for the given launch state. */
export function footerColumns(toolsLaunched = TOOLS_LAUNCHED) {
  return toolsLaunched ? [PRODUCTS, TOOLS, COMPANY, HELP] : [PRODUCTS, COMPANY, HELP]
}
