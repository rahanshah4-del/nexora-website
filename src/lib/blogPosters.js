/**
 * 16:9 posters (1920x1080 WebP in public/blog-posters/) for blog posts that had
 * no image of their own. A post that sets its own featuredImage (in blogData.js
 * or uploaded in the CMS) always keeps it; a poster only replaces the generic
 * brand logo. Pure data, shared by the browser and the build.
 */
export const DEFAULT_BLOG_IMAGE = '/nexora-brand-logo.png'

export const BLOG_POSTERS = Object.freeze({
  "restaurant-pos-software-pakistan-guide": { src: '/blog-posters/restaurant-pos-software-pakistan-guide.webp', alt: "Nexora poster: Run the whole restaurant from one counter (Restaurant POS)" },
  "restaurant-kot-table-management-best-practices": { src: '/blog-posters/restaurant-kot-table-management-best-practices.webp', alt: "Nexora poster: Every order to the right kitchen, every table honest (Restaurant POS)" },
  "retail-pos-inventory-control-guide": { src: '/blog-posters/retail-pos-inventory-control-guide.webp', alt: "Nexora poster: Know your stock before it runs out (Retail POS)" },
  "retail-cashier-permissions-pos-security": { src: '/blog-posters/retail-cashier-permissions-pos-security.webp', alt: "Nexora poster: Give cashiers only what they need (Retail POS)" },
  "school-erp-software-pakistan-guide": { src: '/blog-posters/school-erp-software-pakistan-guide.webp', alt: "Nexora poster: Choosing a School ERP in Pakistan (School ERP)" },
  "school-fee-attendance-management-system": { src: '/blog-posters/school-fee-attendance-management-system.webp', alt: "Nexora poster: Fees on time. Attendance without paper. (School ERP)" },
  "transport-rental-software-fleet-guide": { src: '/blog-posters/transport-rental-software-fleet-guide.webp', alt: "Nexora poster: Your whole fleet on one screen (Transport Software)" },
  "vehicle-rental-booking-payment-workflow": { src: '/blog-posters/vehicle-rental-booking-payment-workflow.webp', alt: "Nexora poster: From booking to final invoice in four steps (Transport Software)" },
  "crm-software-lead-management-guide": { src: '/blog-posters/crm-software-lead-management-guide.webp', alt: "Nexora poster: From first contact to customer (CRM)" },
  "crm-pipeline-follow-up-system": { src: '/blog-posters/crm-pipeline-follow-up-system.webp', alt: "Nexora poster: Stop losing leads between follow-ups (CRM)" },
  "whatsapp-crm-for-sales-teams": { src: '/blog-posters/whatsapp-crm-for-sales-teams.webp', alt: "Nexora poster: Turn chats into revenue (WhatsApp CRM)" },
  "whatsapp-broadcast-follow-up-strategy": { src: '/blog-posters/whatsapp-broadcast-follow-up-strategy.webp', alt: "Nexora poster: Broadcasts people want to open (WhatsApp CRM)" },
  "small-business-software-stack-pakistan": { src: '/blog-posters/small-business-software-stack-pakistan.webp', alt: "Nexora poster: The small business software stack (Business Tips)" },
  "business-automation-checklist-for-growing-teams": { src: '/blog-posters/business-automation-checklist-for-growing-teams.webp', alt: "Nexora poster: Automate the boring, keep the human (Business Tips)" },
  "ai-in-business-management-software": { src: '/blog-posters/ai-in-business-management-software.webp', alt: "Nexora poster: AI that does real work for your business (AI)" },
  "ai-crm-lead-scoring-explained": { src: '/blog-posters/ai-crm-lead-scoring-explained.webp', alt: "Nexora poster: Lead scoring, explained simply (AI)" },
  "cloud-business-software-security-basics": { src: '/blog-posters/cloud-business-software-security-basics.webp', alt: "Nexora poster: Keep your business data safe in the cloud (Technology)" },
  "saas-vs-desktop-pos-software": { src: '/blog-posters/saas-vs-desktop-pos-software.webp', alt: "Nexora poster: Cloud or desktop POS? (Technology)" },
  "pos-reporting-kpis-business-owners": { src: '/blog-posters/pos-reporting-kpis-business-owners.webp', alt: "Nexora poster: The KPIs every owner should check daily (Business Tips)" },
  "customer-data-management-for-service-businesses": { src: '/blog-posters/customer-data-management-for-service-businesses.webp', alt: "Nexora poster: One clean record for every customer (CRM)" },
  "pharmacy-pos-software-pakistan-guide": { src: '/blog-posters/pharmacy-pos-software-pakistan-guide.webp', alt: "Nexora poster: A medical store that never sells expired stock (Pharmacy POS)" },
  "pharmacy-batch-expiry-management-guide": { src: '/blog-posters/pharmacy-batch-expiry-management-guide.webp', alt: "Nexora poster: Sell the oldest batch first, every time (Pharmacy POS)" },
  "what-is-pos-software": { src: '/blog-posters/what-is-pos-software.webp', alt: "Nexora poster: What is POS software? (Technology)" },
  "what-is-school-erp-software": { src: '/blog-posters/what-is-school-erp-software.webp', alt: "Nexora poster: What is School ERP software? (School ERP)" },
  "fbr-pos-integration-guide-pakistan": { src: '/blog-posters/fbr-pos-integration-guide-pakistan.webp', alt: "Nexora poster: FBR POS integration, step by step (Technology)" },
  "pos-software-cost-pakistan": { src: '/blog-posters/pos-software-cost-pakistan.webp', alt: "Nexora poster: What POS software really costs in Pakistan (Business Tips)" },
  "school-erp-implementation-checklist": { src: '/blog-posters/school-erp-implementation-checklist.webp', alt: "Nexora poster: Go live with a School ERP in 30 days (School ERP)" },
  "fleet-management-cost-pakistan": { src: '/blog-posters/fleet-management-cost-pakistan.webp', alt: "Nexora poster: What does fleet software cost? (Transport Software)" },
  "pharmacy-management-software-in-pakistan-complete-guide": { src: '/blog-posters/pharmacy-management-software-in-pakistan-complete-guide.webp', alt: "Nexora poster: Run your pharmacy like a chain (Pharmacy POS)" },
})

/** The image a post should show: its own, else its poster, else the brand logo. */
export function blogImageFor(slug, ownImage = '', ownAlt = '') {
  const own = String(ownImage || '').trim()
  const poster = BLOG_POSTERS[slug]
  if (own && own !== DEFAULT_BLOG_IMAGE) return { src: own, alt: ownAlt }
  if (poster) return { src: poster.src, alt: poster.alt }
  return { src: own || DEFAULT_BLOG_IMAGE, alt: ownAlt }
}
