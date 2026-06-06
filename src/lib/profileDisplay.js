const DEMO_ADMIN_EMAIL = 'admin@nexora.solutions'
const DEMO_ADMIN_NAME = 'Admin User'

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value) {
  return clean(value).toLowerCase()
}

function isDemoAdminEmail(value) {
  return normalizeEmail(value) === DEMO_ADMIN_EMAIL
}

function isDemoAdminName(value) {
  return clean(value).toLowerCase() === DEMO_ADMIN_NAME.toLowerCase()
}

function emailPrefix(email) {
  const value = clean(email)
  return value && value.includes('@') ? value.split('@')[0] : value
}

function userDocBelongsToAuth(userDoc, firebaseUser) {
  const authUid = clean(firebaseUser?.uid)
  if (!authUid || !userDoc) return true

  const identityFields = [userDoc.uid, userDoc.userId, userDoc.id].map(clean).filter(Boolean)
  if (identityFields.length === 0) return true
  return identityFields.includes(authUid)
}

function safeEmail(value, authEmail) {
  const email = normalizeEmail(value)
  if (!email) return ''
  if (isDemoAdminEmail(email) && !isDemoAdminEmail(authEmail)) return ''
  return email
}

function safeName(value, authEmail) {
  const name = clean(value)
  if (!name) return ''
  if (isDemoAdminName(name) && !isDemoAdminEmail(authEmail)) return ''
  return name
}

export function resolveProfileDisplay({ firebaseUser, userDoc, preferenceProfile }) {
  const authEmail = normalizeEmail(firebaseUser?.email)
  const userDocEmail = normalizeEmail(userDoc?.email)
  const preferenceEmail = normalizeEmail(preferenceProfile?.email)
  const userDocBelongs = userDocBelongsToAuth(userDoc, firebaseUser)
  const userDocDisplayName = userDocBelongs ? safeName(userDoc?.displayName, authEmail) : ''
  const authDisplayName = safeName(firebaseUser?.displayName, authEmail)
  const userDocFullName = userDocBelongs ? safeName(userDoc?.fullName, authEmail) : ''
  const legacyUserName = userDocBelongs ? safeName(userDoc?.name, authEmail) : ''
  const preferenceName = safeName(preferenceProfile?.ownerName, authEmail)
  const displayEmail =
    authEmail ||
    (userDocBelongs ? safeEmail(userDocEmail, authEmail) : '') ||
    safeEmail(preferenceEmail, authEmail) ||
    'No email'

  const displayName =
    userDocDisplayName ||
    authDisplayName ||
    userDocFullName ||
    legacyUserName ||
    preferenceName ||
    emailPrefix(displayEmail) ||
    'Nexora User'
  const profileSource = userDocDisplayName
    ? 'userDoc.displayName'
    : authDisplayName
      ? 'firebaseUser.displayName'
      : userDocFullName
        ? 'userDoc.fullName'
        : legacyUserName
          ? 'userDoc.name'
          : preferenceName
            ? 'preferences.ownerName'
            : displayEmail !== 'No email'
              ? 'email_prefix'
              : 'fallback'

  return {
    authEmail,
    userDocEmail,
    preferenceEmail,
    displayEmail,
    displayName,
    fullName: userDocFullName,
    rawDisplayName: userDocDisplayName || authDisplayName,
    profileSource,
    userDocBelongs,
  }
}
