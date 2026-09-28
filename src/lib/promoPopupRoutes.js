// Routes where a promo popup (NewUserOfferPopup, ExitIntentPopup) doesn't
// belong: the authed app/admin, the auth/onboarding flows themselves, and
// reading pages — blog articles and the legal/policy pages — where a modal
// covering the content interrupts the reader (and ad/content reviewers).
const PROMO_POPUP_EXCLUDED_PREFIXES = [
  '/app',
  '/admin',
  '/login',
  '/signup',
  '/verify-email',
  '/workspace',
  '/blog',
  '/privacy-policy',
  '/terms',
  '/refund-policy',
  // Free tools: a modal over the editor would interrupt the work.
  '/tools',
]

/**
 * Free tools (/tools/*) run as full-screen apps: besides promo popups they
 * also skip the floating widgets (sticky CTA, AI assistant, live chat) that
 * would cover the editor's controls and totals bar.
 */
export function isToolRoute(pathname = '') {
  return pathname === '/tools' || pathname.startsWith('/tools/')
}

export function isPromoPopupExcluded(pathname = '') {
  return PROMO_POPUP_EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
