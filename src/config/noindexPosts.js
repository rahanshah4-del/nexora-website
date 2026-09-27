/**
 * Blog posts kept out of the index (noindex,follow) and out of the sitemap.
 *
 * These 20 posts come from one article template (buildSections() in
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
  'crm-pipeline-follow-up-system',
  'crm-software-lead-management-guide',
  'customer-data-management-for-service-businesses',
  'pos-reporting-kpis-business-owners',
  'restaurant-kot-table-management-best-practices',
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
])
