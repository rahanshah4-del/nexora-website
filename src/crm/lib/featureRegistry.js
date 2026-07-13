/**
 * Feature Registry — central configuration for all discoverable features.
 *
 * Add ONE entry per feature. When the feature gets a significant update,
 * bump the version (e.g. "delivery-v1" → "delivery-v2") and the badge
 * automatically reappears for every user.
 *
 * Fields:
 *   key       – unique feature key, used for storage lookup (e.g. "delivery-v1")
 *   version   – semver-like string (e.g. "1.0.0"), compared for update detection
 *   title     – human-readable name
 *   routes    – array of route paths where clicking = "seen" (any match hides badge)
 *   icon      – optional icon key for future UI
 *   tag       – optional badge override text ("NEW" by default)
 */

const FEATURE_REGISTRY = [
  // ── Phase 2B-5J: Restaurant Settlement ──
  { key: 'restaurant-settlement-v1', version: '1.0.0', title: 'Restaurant Settlement Manager',     routes: ['/app/reports'] },

  // ── Phase 2B-5K: Loyalty & Rewards ──
  { key: 'loyalty-v1',               version: '1.0.0', title: 'Loyalty & Rewards',                 routes: ['/app/loyalty', '/app/loyalty/rewards', '/app/loyalty/coupons', '/app/loyalty/campaigns', '/app/loyalty/settings'] },
  { key: 'membership-v1',            version: '1.0.0', title: 'Membership Tiers',                   routes: ['/app/loyalty'] },

  // ── Phase 2B-5L: Online Ordering & Delivery ──
  { key: 'delivery-v1',              version: '1.0.0', title: 'Delivery Dashboard',                 routes: ['/app/delivery', '/app/delivery/orders'] },
  { key: 'driver-dashboard-v1',      version: '1.0.0', title: 'Driver Dashboard',                   routes: ['/app/driver'] },
  { key: 'delivery-zones-v1',        version: '1.0.0', title: 'Delivery Zones',                     routes: ['/app/delivery/zones'] },
  { key: 'delivery-drivers-v1',      version: '1.0.0', title: 'Delivery Drivers',                   routes: ['/app/delivery/drivers'] },
  { key: 'qr-menu-v1',               version: '1.0.0', title: 'QR Menu / Online Ordering',          routes: ['/menu/*'] },
  { key: 'customer-tracking-v1',     version: '1.0.0', title: 'Customer Order Tracking',            routes: ['/track/*'] },

  // ── Existing / previously shipped features (mark seen) ──
  { key: 'inventory-intelligence-v1', version: '1.0.0', title: 'Inventory Intelligence',            routes: ['/app/inventory'] },
  { key: 'business-intelligence-v1', version: '1.0.0', title: 'Business Intelligence',             routes: ['/app/reports'] },
  { key: 'shift-settlement-v1',      version: '1.0.0', title: 'Shift Settlement Report',           routes: ['/app/reports'] },

  // ── Phase 2B-5O: Kitchen Production ──
  { key: 'kitchen-production-v1',    version: '1.0.0', title: 'Kitchen Production & Recipe Automation', routes: ['/app/kitchen-production', '/app/kitchen-production/batches', '/app/kitchen-production/prep'] },
]

/** Look up a registry entry by feature key. */
export function featureByKey(key) {
  return FEATURE_REGISTRY.find((f) => f.key === key) || null
}

/** Look up registry entries that match one or more route paths. */
export function featuresByRoute(route) {
  if (!route) return []
  return FEATURE_REGISTRY.filter((f) => f.routes.some((r) => route.startsWith(r.replace('/*', ''))))
}

/** All registry keys. */
export function allFeatureKeys() {
  return FEATURE_REGISTRY.map((f) => f.key)
}

/** The full registry (read-only). */
export function getFeatureRegistry() {
  return FEATURE_REGISTRY
}

/**
 * Resolve the best feature key for a given route.
 * Returns the first registry match, or null.
 */
export function featureKeyForRoute(route) {
  if (!route) return null
  const match = FEATURE_REGISTRY.find((f) => f.routes.some((r) => route.startsWith(r.replace('/*', ''))))
  return match ? match.key : null
}
