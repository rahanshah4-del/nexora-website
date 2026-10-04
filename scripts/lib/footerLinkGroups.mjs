/**
 * The footer link groups of the prerendered static HTML (scripts/prerender.mjs):
 * the crawlable twin of src/pages/public/PublicFooter.jsx, kept in sync by hand.
 * The "Free Tools" group appears only once the tools are launched
 * (src/lib/toolsLaunch.js); tests pass `toolsLaunched` to check both states.
 */
import { TOOLS_LAUNCHED, toolsFooterGroup } from '../../src/lib/toolsLaunch.js'

const BASE_GROUPS = [
  {
    heading: 'Products',
    links: [
      ['Nexora CRM', '/crm'],
      ['Restaurant POS', '/restaurant-pos'],
      ['Retail POS', '/retail-pos'],
      ['Pharmacy POS', '/pharmacy-pos'],
      ['School ERP', '/school-erp'],
      ['Fleet Management', '/transport-fleet'],
      ['WhatsApp CRM', '/whatsapp-crm'],
      ['Nexora AI', '/ai'],
      ['Property ERP', '/solutions/property-erp'],
      ['Download Restaurant POS', '/download/restaurant-pos'],
    ],
  },
  {
    heading: 'Company',
    links: [
      ['About', '/about'],
      ['Pricing', '/pricing'],
      ['Software Development', '/software-development'],
      ['SEO Services', '/seo-services'],
      ['Custom CRM Development', '/crm-development'],
      ['ERP Solutions', '/erp-development'],
      ['Cloud Solutions', '/cloud-solutions'],
      ['API Integration', '/api-integration'],
      ['Mobile App Development', '/mobile-app-development'],
      ['E-commerce Development', '/ecommerce-development'],
      ['Industries', '/industries'],
      ['Projects', '/projects'],
      ['Blog', '/blog'],
      ['Contact', '/contact'],
    ],
  },
  {
    heading: 'Resources',
    links: [
      ['Help Center', '/help-center'],
      ['FAQ', '/faq'],
      ['Sitemap', '/sitemap'],
      ['Privacy Policy', '/privacy-policy'],
      ['Terms & Conditions', '/terms'],
      ['Refund Policy', '/refund-policy'],
    ],
  },
]

/** [{ heading, links: [[label, path]] }] for the given launch state. */
export function footerLinkGroups(toolsLaunched = TOOLS_LAUNCHED) {
  const tools = toolsFooterGroup(toolsLaunched)
  return tools ? [...BASE_GROUPS, tools] : BASE_GROUPS
}
