/**
 * Platform (Control Centre) admins, by Firebase Auth UID — never by email,
 * because the admin@nexora.com account may have an unverified email.
 *
 * The same list is in firestore.rules (isAdmin()), functions/adminUids.js and
 * the payments / passkeys workers; tests/rules/admin-uids.test.mjs fails if
 * they drift apart, and scripts/check-admin-uids.mjs (a firebase.json
 * predeploy hook) refuses to deploy while the placeholder is still here.
 *
 * This only decides what the UI shows. Firestore rules are the enforcement.
 */
export const ADMIN_UIDS = Object.freeze(['REPLACE_WITH_ADMIN_UID'])

export function isAdminUid(uid) {
  return typeof uid === 'string' && uid !== '' && ADMIN_UIDS.includes(uid)
}
