/**
 * Blog posts kept out of the index (noindex,follow) and out of the sitemap.
 *
 * These posts (20 originally; rewritten ones are removed) come from one article template (buildSections() in
 * src/lib/blogData.js; 13 were later copied unchanged into the CMS) and share
 * 88-90% of their text with each other — see ADSENSE_AUDIT.md §3. They stay
 * published and linkable; remove a slug here once its post has been rewritten.
 * Frontend-only on purpose: the Firestore documents are not touched.
 */
export const NOINDEX_POST_SLUGS = new Set([
  'ai-crm-lead-scoring-explained',
  'ai-in-business-management-software',
  'business-automation-checklist-for-growing-teams',
  'cloud-business-software-security-basics',
  'crm-software-lead-management-guide',
  'customer-data-management-for-service-businesses',
  'pos-reporting-kpis-business-owners',
  'restaurant-pos-software-pakistan-guide',
  'retail-cashier-permissions-pos-security',
  'retail-pos-inventory-control-guide',
  'saas-vs-desktop-pos-software',
  'school-erp-software-pakistan-guide',
  'school-fee-attendance-management-system',
  'small-business-software-stack-pakistan',
  'transport-rental-software-fleet-guide',
  'vehicle-rental-booking-payment-workflow',
  'whatsapp-broadcast-follow-up-strategy',
  'whatsapp-crm-for-sales-teams',
  // Overlapping posts (AdSense "replicated content" fix, Nov 2026). Only posts
  // with zero Search Console impressions (3 months) are listed, so nothing that
  // already shows in search is hidden. Remove an entry once the post is rewritten.
  'pharmacy-pos-software-pakistan',
  'best-school-erp-software-pakistan-2026-jazzcash-biometric-attendance-whatsapp-alerts',
  'free-invoice-generator-indian-freelancers',
  'property-management-software-pakistan-guide',
  'ai-powered-pos-software-the-modern-futuristic-way-to-run-your-business-in-pakistan',
  'free-invoice-generator-thermal-receipt-invoice-letterhead',
])
