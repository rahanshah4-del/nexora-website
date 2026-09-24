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
]

export function isPromoPopupExcluded(pathname = '') {
  return PROMO_POPUP_EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
