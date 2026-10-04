/**
 * Restaurant blog posts retired in Oct 2026 because they competed with
 * /restaurant-pos/ (and each other) for the same queries. Each now 301s to its
 * replacement via public/_redirects — keep the two in sync.
 *
 * This list only keeps them out of the BUILD (prerendered pages, sitemap, RSS,
 * search index) and the public blog listing. It deliberately does NOT touch
 * the admin Blog Manager, so the CMS copies stay visible there until they are
 * unpublished by hand.
 */
export const RETIRED_POST_TARGETS = {
  'restaurant-pos-software-pakistan': '/restaurant-pos/',
  'restaurant-pos-software-pakistan-multan-lahore-karachi': '/restaurant-pos/',
  'restaurant-point-of-sale-software': '/restaurant-pos/',
  'advanced-restaurant-pos-billing-software': '/restaurant-pos/billing-and-receipts/',
  'restaurant-billing-software-pakistan': '/restaurant-pos/billing-and-receipts/',
  'restaurant-pos-software-pakistan-guide': '/blog/restaurant-pos-system-guide-2026/',
  'restaurant-pos-system-complete-guide-to-smarter-restaurant-management': '/blog/restaurant-pos-system-guide-2026/',
  'why-every-restaurant-needs-a-smart-pos-system-in-2026-the-complete-guide': '/blog/restaurant-pos-system-guide-2026/',
}

export const RETIRED_POST_SLUGS = new Set(Object.keys(RETIRED_POST_TARGETS))
