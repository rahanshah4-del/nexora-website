/**
 * Platform admins, by Firebase Auth UID — never by email or by custom-token
 * claims (staff PIN logins carry role:'admin'/'owner' for their own workspace).
 * Must match isAdmin() in firestore.rules and src/lib/adminUids.js;
 * tests/rules/admin-uids.test.mjs checks, and scripts/check-admin-uids.mjs
 * (firebase.json predeploy) blocks deploying the placeholder.
 */
export const ADMIN_UIDS = Object.freeze(['REPLACE_WITH_ADMIN_UID'])
