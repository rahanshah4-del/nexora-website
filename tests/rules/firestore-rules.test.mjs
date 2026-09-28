/**
 * Firestore + Storage security rules, against the emulators.
 *
 *   npm run test:rules
 *
 * Identities:
 *   anonymous           — not signed in
 *   user                — any signed-up account (verified email, not an admin)
 *   impostor            — a different UID whose token says email admin@nexora.com,
 *                         even email_verified: true — email must never grant admin
 *   staffAdmin          — a staff PIN login token with role:'admin' (what
 *                         teamStaffLogin mints for any workspace's staff)
 *   admin               — the first UID in isAdmin() (firestore.rules), with an
 *                         UNVERIFIED email, as the owner's admin@nexora.com may be
 *
 * RULES_FILE / STORAGE_RULES_FILE point the suite at other rules files (used to
 * show which of these checks the previous rules failed).
 */
import { after, before, beforeEach, describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'

import { ROOT, readAdminUidLists } from '../../scripts/check-admin-uids.mjs'

const RULES = readFileSync(resolve(ROOT, process.env.RULES_FILE || 'firestore.rules'), 'utf8')
const STORAGE_RULES = readFileSync(resolve(ROOT, process.env.STORAGE_RULES_FILE || 'storage.rules'), 'utf8')
const ADMIN_UID = readAdminUidLists().find((l) => l.file === 'firestore.rules').uids[0]

let env
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nexora-rules',
    firestore: { rules: RULES },
    storage: { rules: STORAGE_RULES },
  })
})
after(async () => { await env?.cleanup() })

const as = {
  anonymous: () => env.unauthenticatedContext().firestore(),
  user: () => env.authenticatedContext('user_alice', { email: 'alice@example.com', email_verified: true }).firestore(),
  impostor: () => env.authenticatedContext('impostorUid00000000000000001', { email: 'admin@nexora.com', email_verified: true }).firestore(),
  staffAdmin: () => env.authenticatedContext('ACME-ADM-7QX2', { staff: true, role: 'admin', workspaceId: 'owner_attacker', ownerId: 'owner_attacker' }).firestore(),
  admin: () => env.authenticatedContext(ADMIN_UID, { email: 'admin@nexora.com', email_verified: false }).firestore(),
}
const NON_ADMINS = ['anonymous', 'user', 'impostor', 'staffAdmin']

const seed = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))

beforeEach(async () => {
  await env.clearFirestore()
  await seed(async (db) => {
    await setDoc(doc(db, 'siteConfig', 'main'), { title: 'Nexora Blog' })
    await setDoc(doc(db, 'adminUsers', 'someone'), { email: 'someone@example.com', role: 'admin' })
    await setDoc(doc(db, 'articles', 'hello'), { title: 'Hello' })
    await setDoc(doc(db, 'categories', 'news'), { name: 'News' })
    await setDoc(doc(db, 'tags', 'pos'), { name: 'POS' })
    await setDoc(doc(db, 'media', 'm1'), { url: 'https://example.com/a.png' })
    await setDoc(doc(db, 'comments', 'c1'), { approved: false, articleSlug: 'hello', name: 'Spam', message: 'buy now' })
    await setDoc(doc(db, 'submissions', 'pending1'), { status: 'pending', submitterEmail: 'private@example.com' })
    await setDoc(doc(db, 'submissions', 'approved1'), { status: 'approved', siteName: 'Public site' })
    await setDoc(doc(db, 'analytics', 'e1'), { path: '/', vid: 'v', sid: 's' })
    await setDoc(doc(db, 'authors', 'a1'), { name: 'Author' })
    await setDoc(doc(db, 'marketingSubscribers', 's1'), { email: 'subscriber@example.com' })
    await setDoc(doc(db, 'backendStaff', 'b1'), { note: 'catch-all collection' })
    await setDoc(doc(db, 'platformSettings', 'plans'), { free: true })
    // A victim tenant: owner "owner_victim" owns workspace "owner_victim".
    await setDoc(doc(db, 'workspaces', 'owner_victim'), { ownerId: 'owner_victim', workspaceId: 'owner_victim', createdBy: 'owner_victim', status: 'active' })
    await setDoc(doc(db, 'users', 'owner_victim'), { uid: 'owner_victim', userId: 'owner_victim', workspaceId: 'owner_victim', ownerId: 'owner_victim', role: 'owner', status: 'active', email: 'victim@example.com' })
    await setDoc(doc(db, 'workspaces', 'owner_victim', 'customers', 'cust1'), { name: 'Victim customer', workspaceId: 'owner_victim' })
    // An attacker tenant with one staff member.
    await setDoc(doc(db, 'workspaces', 'owner_attacker'), { ownerId: 'owner_attacker', workspaceId: 'owner_attacker', createdBy: 'owner_attacker', status: 'active' })
    await setDoc(doc(db, 'users', 'owner_attacker'), { uid: 'owner_attacker', userId: 'owner_attacker', workspaceId: 'owner_attacker', ownerId: 'owner_attacker', role: 'owner', status: 'active', email: 'attacker@example.com' })
    await setDoc(doc(db, 'users', 'staff_a1'), staffProfile('staff_a1', 'owner_attacker'))
  })
})

function staffProfile(uid, workspaceId, extra = {}) {
  return {
    uid, userId: uid, staffId: uid, workspaceId, ownerId: workspaceId, email: `${uid}@example.com`,
    role: 'sales_staff', status: 'active', emailVerifiedCustom: true, onboardingCompleted: true, isStaff: true, isAdmin: false, ...extra,
  }
}

// ── The two reported holes ────────────────────────────────────────────────────

describe('siteConfig: public read, admin-only write', () => {
  test('everyone can read', async () => {
    for (const who of [...NON_ADMINS, 'admin']) await assertSucceeds(getDoc(doc(as[who](), 'siteConfig', 'main')))
  })
  test('non-admins cannot create, update or delete', async () => {
    for (const who of NON_ADMINS) {
      const db = as[who]()
      await assertFails(setDoc(doc(db, 'siteConfig', 'main'), { title: 'defaced' }))
      await assertFails(setDoc(doc(db, 'siteConfig', 'new'), { x: 1 }))
      await assertFails(deleteDoc(doc(db, 'siteConfig', 'main')))
    }
  })
  test('the admin UID can write', async () => {
    await assertSucceeds(setDoc(doc(as.admin(), 'siteConfig', 'main'), { title: 'Updated' }))
    await assertSucceeds(deleteDoc(doc(as.admin(), 'siteConfig', 'main')))
  })
})

describe('adminUsers: admin-only read and write', () => {
  test('non-admins cannot read, list, add themselves or delete', async () => {
    for (const who of NON_ADMINS) {
      const db = as[who]()
      await assertFails(getDoc(doc(db, 'adminUsers', 'someone')))
      await assertFails(getDocs(collection(db, 'adminUsers')))
      await assertFails(setDoc(doc(db, 'adminUsers', 'me'), { email: 'me@example.com', role: 'admin' }))
      await assertFails(deleteDoc(doc(db, 'adminUsers', 'someone')))
    }
  })
  test('the admin UID can read and write', async () => {
    const db = as.admin()
    await assertSucceeds(getDocs(collection(db, 'adminUsers')))
    await assertSucceeds(setDoc(doc(db, 'adminUsers', 'new'), { email: 'new@example.com' }))
    await assertSucceeds(deleteDoc(doc(db, 'adminUsers', 'new')))
  })
})

// ── Admin identity: UID, not email ────────────────────────────────────────────

describe('admin identity is the UID', () => {
  test('a verified admin@nexora.com token on another UID is not an admin', async () => {
    const db = as.impostor()
    await assertFails(getDoc(doc(db, 'backendStaff', 'b1')))
    await assertFails(setDoc(doc(db, 'platformSettings', 'plans'), { free: false }))
    await assertFails(getDoc(doc(db, 'users', 'owner_victim')))
  })
  test('the admin UID with an unverified email is an admin (catch-all, platform data, any user)', async () => {
    const db = as.admin()
    await assertSucceeds(getDoc(doc(db, 'backendStaff', 'b1')))
    await assertSucceeds(setDoc(doc(db, 'platformSettings', 'plans'), { free: false }))
    await assertSucceeds(getDoc(doc(db, 'users', 'owner_victim')))
    await assertSucceeds(getDoc(doc(db, 'workspaces', 'owner_victim', 'customers', 'cust1')))
  })
  test('staff tokens with role:admin get no platform marketing data', async () => {
    await assertFails(getDoc(doc(as.staffAdmin(), 'marketingSubscribers', 's1')))
    await assertFails(setDoc(doc(as.staffAdmin(), 'marketingCampaigns', 'x'), { subject: 'spam' }))
    await assertFails(getDoc(doc(as.user(), 'marketingSubscribers', 's1')))
    await assertSucceeds(getDoc(doc(as.admin(), 'marketingSubscribers', 's1')))
  })
})

// ── Blog-subdomain CMS collections ────────────────────────────────────────────

describe('blog CMS content (articles, categories, tags, authors): public read, admin-only write', () => {
  const docs = [['articles', 'hello'], ['categories', 'news'], ['tags', 'pos'], ['authors', 'a1']]
  test('public read still works', async () => {
    for (const [c, id] of docs) await assertSucceeds(getDoc(doc(as.anonymous(), c, id)))
  })
  test('non-admins cannot write', async () => {
    for (const who of NON_ADMINS) {
      for (const [c, id] of docs) {
        await assertFails(setDoc(doc(as[who](), c, id), { title: 'defaced' }))
        await assertFails(deleteDoc(doc(as[who](), c, id)))
      }
    }
  })
  test('the admin can write', async () => {
    for (const [c, id] of docs) await assertSucceeds(setDoc(doc(as.admin(), c, id), { title: 'ok' }))
  })
})

describe('media, comments, submissions, analytics', () => {
  test('media: admin only', async () => {
    for (const who of NON_ADMINS) {
      await assertFails(getDoc(doc(as[who](), 'media', 'm1')))
      await assertFails(setDoc(doc(as[who](), 'media', 'm2'), { url: 'x' }))
    }
    await assertSucceeds(setDoc(doc(as.admin(), 'media', 'm2'), { url: 'x' }))
  })
  test('comments: public create still allowed; approve/delete admin only', async () => {
    await assertSucceeds(setDoc(doc(as.anonymous(), 'comments', 'c2'), { approved: false, articleSlug: 'hello', name: 'Ann', message: 'Nice post' }))
    for (const who of NON_ADMINS) {
      await assertFails(updateDoc(doc(as[who](), 'comments', 'c1'), { approved: true }))
      await assertFails(deleteDoc(doc(as[who](), 'comments', 'c1')))
    }
    await assertSucceeds(updateDoc(doc(as.admin(), 'comments', 'c1'), { approved: true }))
  })
  test('submissions: public create and approved reads; pending (with emails) and moderation admin only', async () => {
    await assertSucceeds(setDoc(doc(as.anonymous(), 'submissions', 's-new'), {
      status: 'pending', siteName: 'Site', url: 'https://example.com', category: 'Tools', description: 'd', submitterEmail: 'a@example.com', slug: 'site',
    }))
    await assertSucceeds(getDoc(doc(as.anonymous(), 'submissions', 'approved1')))
    for (const who of NON_ADMINS) {
      await assertFails(getDoc(doc(as[who](), 'submissions', 'pending1')))
      await assertFails(updateDoc(doc(as[who](), 'submissions', 'pending1'), { status: 'approved' }))
      await assertFails(deleteDoc(doc(as[who](), 'submissions', 'approved1')))
    }
    await assertSucceeds(updateDoc(doc(as.admin(), 'submissions', 'pending1'), { status: 'approved' }))
  })
  test('analytics: public create; read/delete admin only', async () => {
    await assertSucceeds(setDoc(doc(as.anonymous(), 'analytics', 'e2'), { path: '/blog', vid: 'v', sid: 's', isNew: true, duration: 3, hour: 10 }))
    for (const who of NON_ADMINS) {
      await assertFails(getDoc(doc(as[who](), 'analytics', 'e1')))
      await assertFails(deleteDoc(doc(as[who](), 'analytics', 'e1')))
    }
    await assertSucceeds(getDocs(collection(as.admin(), 'analytics')))
  })
})

// ── users/{uid}: no claiming someone else's workspace ─────────────────────────

describe('users/{uid}: profiles cannot be bound to another workspace', () => {
  const newUser = () => env.authenticatedContext('new_user', { email: 'new@example.com', email_verified: false }).firestore()
  test('the signup profile (accountProvisioning.createSignupUserProfile) is still allowed', async () => {
    await assertSucceeds(setDoc(doc(newUser(), 'users', 'new_user'), {
      uid: 'new_user', email: 'new@example.com', fullName: 'New', role: 'owner', status: 'active', userId: 'new_user', ownerId: 'new_user',
      workspaceId: 'new_user', plan: 'Basic', planStatus: 'trial', isAdmin: false, onboardingCompleted: false, createdAt: serverTimestamp(),
    }))
  })
  test('unverified bootstrap profile with empty workspace and a merge-only first write are allowed', async () => {
    await assertSucceeds(setDoc(doc(newUser(), 'users', 'new_user'), { uid: 'new_user', userId: 'new_user', ownerId: '', workspaceId: '' }))
    await env.clearFirestore()
    await assertSucceeds(setDoc(doc(newUser(), 'users', 'new_user'), { lastLogin: serverTimestamp() }, { merge: true }))
  })
  test('self-create pointing at a victim workspace is denied', async () => {
    const db = newUser()
    for (const forged of [
      { workspaceId: 'owner_victim', role: 'owner' },
      { workspaceId: 'owner_victim', role: 'admin' },
      { ownerId: 'owner_victim' },
      { companyId: 'owner_victim', role: 'owner' },
      { workspaceIds: ['owner_victim'], role: 'owner' },
      { workspaces: ['owner_victim'] },
      { staffId: 'someone_else' },
      { isAdmin: true },
    ]) {
      await assertFails(setDoc(doc(db, 'users', 'new_user'), { uid: 'new_user', ...forged }))
    }
  })
  test('with the create denied, the victim workspace stays unreadable', async () => {
    await assertFails(setDoc(doc(newUser(), 'users', 'new_user'), { uid: 'new_user', workspaceId: 'owner_victim', role: 'owner' }))
    await assertFails(getDoc(doc(newUser(), 'workspaces', 'owner_victim', 'customers', 'cust1')))
  })
  test('owners cannot add companyId / workspaceIds / workspaces to their own profile', async () => {
    const db = env.authenticatedContext('owner_attacker', { email: 'attacker@example.com', email_verified: true }).firestore()
    await assertFails(updateDoc(doc(db, 'users', 'owner_attacker'), { companyId: 'owner_victim' }))
    await assertFails(updateDoc(doc(db, 'users', 'owner_attacker'), { workspaceIds: ['owner_victim'] }))
    await assertFails(updateDoc(doc(db, 'users', 'owner_attacker'), { workspaces: ['owner_victim'] }))
    await assertSucceeds(updateDoc(doc(db, 'users', 'owner_attacker'), { fullName: 'Still editable', updatedAt: serverTimestamp() }))
  })
  test('users/{uid} itself is not writable through the subcollection wildcard', async () => {
    const db = env.authenticatedContext('owner_attacker', { email: 'attacker@example.com', email_verified: true }).firestore()
    await assertFails(updateDoc(doc(db, 'users', 'owner_attacker'), { workspaceId: 'owner_victim' }))
    await assertFails(updateDoc(doc(db, 'users', 'owner_attacker'), { role: 'admin' }))
    await assertFails(updateDoc(doc(db, 'users', 'owner_attacker'), { isAdmin: true }))
    await assertFails(updateDoc(doc(db, 'users', 'owner_attacker'), { plan: 'Enterprise', planStatus: 'active' }))
    await assertFails(deleteDoc(doc(db, 'users', 'owner_attacker')))
    // Subcollections keep working (sessions, verification/otp).
    await assertSucceeds(setDoc(doc(db, 'users', 'owner_attacker', 'sessions', 's1'), { at: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(db, 'users', 'owner_attacker', 'verification', 'otp'), { otpHash: 'x' }))
  })
  test('bootstrap: an owner profile with an empty workspace can move to its own workspace, not another', async () => {
    await seed((db) => setDoc(doc(db, 'users', 'new_user'), { uid: 'new_user', userId: 'new_user', ownerId: '', workspaceId: '', role: 'owner' }))
    await assertFails(updateDoc(doc(newUser(), 'users', 'new_user'), { workspaceId: 'owner_victim', ownerId: 'owner_victim' }))
    await assertSucceeds(updateDoc(doc(newUser(), 'users', 'new_user'), { workspaceId: 'new_user', ownerId: 'new_user', updatedAt: serverTimestamp() }))
  })
  test('staff invites: joining works only onto a real invite, with its workspace and role', async () => {
    // createTeamStaff writes the invite keyed by staffInviteEmailKey('Maya.Chen+pos@Shop.example').
    await seed(async (db) => {
      await setDoc(doc(db, 'staffInviteEmails', 'maya-chen-pos-shop-example'), { email: 'maya.chen+pos@shop.example', workspaceId: 'owner_victim', ownerId: 'owner_victim', role: 'cashier', staffId: 'SHOP-CSH-AB12' })
      await setDoc(doc(db, 'users', 'maya_uid'), { uid: 'maya_uid', userId: 'maya_uid', ownerId: 'maya_uid', workspaceId: 'maya_uid', role: 'owner', status: 'active' })
    })
    const maya = env.authenticatedContext('maya_uid', { email: 'Maya.Chen+pos@Shop.example', email_verified: false }).firestore()
    const invited = { uid: 'maya_uid', userId: 'maya_uid', staffId: 'SHOP-CSH-AB12', workspaceId: 'owner_victim', ownerId: 'owner_victim', role: 'cashier', isStaff: true, isOwner: false, isAdmin: false, emailVerifiedCustom: true, onboardingCompleted: true }
    await assertFails(setDoc(doc(maya, 'users', 'maya_uid'), { ...invited, role: 'admin' }, { merge: true }), 'role must match the invite')
    await assertFails(setDoc(doc(maya, 'users', 'maya_uid'), { ...invited, workspaceId: 'owner_attacker', ownerId: 'owner_attacker' }, { merge: true }), 'workspace must match the invite')
    await assertSucceeds(setDoc(doc(maya, 'users', 'maya_uid'), invited, { merge: true }))
    // Someone else, without an invite, cannot do the same.
    await assertFails(setDoc(doc(as.user(), 'users', 'user_alice'), { ...invited, uid: 'user_alice', userId: 'user_alice' }, { merge: true }))
    // A missing profile can be created straight from a staffInviteClaims/{uid} invite (UserContext repair).
    await seed((db) => setDoc(doc(db, 'staffInviteClaims', 'raj_uid'), { email: 'raj@example.com', workspaceId: 'owner_victim', ownerId: 'owner_victim', role: 'sales_staff', staffId: 'raj_uid' }))
    const raj = env.authenticatedContext('raj_uid', { email: 'raj@example.com', email_verified: true }).firestore()
    await assertSucceeds(setDoc(doc(raj, 'users', 'raj_uid'), { uid: 'raj_uid', userId: 'raj_uid', staffId: 'raj_uid', workspaceId: 'owner_victim', ownerId: 'owner_victim', role: 'sales_staff', isAdmin: false }, { merge: true }))
  })
  test("a workspace owner can update their own staff's profile but not another tenant's", async () => {
    const db = env.authenticatedContext('owner_attacker', { email: 'attacker@example.com', email_verified: true }).firestore()
    await assertSucceeds(setDoc(doc(db, 'users', 'staff_a1'), staffProfile('staff_a1', 'owner_attacker', { status: 'blocked' })))
    await assertFails(setDoc(doc(db, 'users', 'owner_victim'), staffProfile('owner_victim', 'owner_attacker')))
  })
})

// ── Self-create: billing fields only at the free-trial defaults ─────────────────
//
// The payloads below mirror, key for key, what the client sends when a new
// account creates its own users/{uid} and workspaces/{uid} docs. Keep them in
// step with those files if the payloads change.

describe('users/{uid} + workspaces/{uid} create: no self-granted billing', () => {
  const UID = 'signup_uid'
  const owner = (uid = UID) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true }).firestore()
  const days = (n) => new Date(Date.now() + n * 86400000)

  // src/lib/accountProvisioning.js createSignupUserProfile()
  const signupProfile = () => ({
    uid: UID, email: 'signup_uid@example.com', fullName: 'New Owner', displayName: 'New Owner', name: 'New Owner', company: 'Acme',
    phone: '0300 1234567', phoneNormalized: '+923001234567', provider: 'password', createdBy: UID, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    role: 'owner', status: 'active', emailVerifiedCustom: false, userId: UID, ownerId: UID, workspaceId: UID,
    plan: 'Basic', planStatus: 'trial', subscriptionStatus: 'trial', trialDays: 30, isAdmin: false, onboardingCompleted: false,
    allowedBusinessTypes: [], enabledModules: [], selectedFeatures: [], specialModuleAccess: false, allModulesAccess: false,
  })
  // accountProvisioning.js ensureUserWorkspaceInternal(): new profile with a business selection
  const ensureProfile = () => ({
    uid: UID, ownerId: UID, userId: UID, workspaceId: UID, fullName: 'New Owner', displayName: 'New Owner', name: 'New Owner', company: 'Acme',
    email: 'signup_uid@example.com', phone: '', phoneNormalized: '',
    businessType: 'Restaurant POS', selectedBusinessType: 'Restaurant POS', currentBusinessType: 'Restaurant POS', selectedWorkspace: 'restaurant-pos',
    selectedFeatures: ['Orders'], enabledModules: ['orders'], plan: 'Basic', planStatus: 'trial', subscriptionStatus: 'trial', trialDays: 30,
    billingCycle: 'monthly', trialStartAt: serverTimestamp(), trialStartedAt: serverTimestamp(), trialEndsAt: days(30), trialBusinessType: 'Restaurant POS',
    isTrialActive: true, onboardingCompleted: false, workspaceName: 'Acme', photoURL: '', provider: 'google', emailVerified: true,
    role: 'owner', status: 'active', isAdmin: false, createdAt: serverTimestamp(), createdBy: UID, updatedAt: serverTimestamp(), lastLoginAt: serverTimestamp(),
  })
  // accountProvisioning.js ensureUserWorkspaceInternal(): workspaceCreatePayload
  const ensureWorkspace = () => ({
    ownerId: UID, userId: UID, workspaceId: UID, name: 'Acme', workspaceName: 'Acme', email: 'signup_uid@example.com',
    plan: 'Basic', planStatus: 'trial', subscriptionStatus: 'trial', status: 'active', billingCycle: 'monthly', trialStartAt: serverTimestamp(),
    trialDays: 30, trialStartedAt: serverTimestamp(), trialEndsAt: days(30), isTrialActive: true, specialModuleAccess: false, allModulesAccess: false,
    primaryBusinessType: '', businessType: 'Restaurant POS', selectedBusinessType: 'Restaurant POS', currentBusinessType: 'Restaurant POS',
    selectedWorkspace: 'restaurant-pos', selectedFeatures: ['Orders'], enabledModules: ['orders'], trialBusinessType: 'Restaurant POS',
    onboardingCompleted: false, createdAt: serverTimestamp(), createdBy: UID, updatedAt: serverTimestamp(), lastAccessedAt: serverTimestamp(),
  })
  // src/pages/auth/WorkspaceSelection.jsx create flow: first profile (baseUserPayload + trialUserFields + create fields)
  const onboardingProfile = () => ({
    uid: UID, shortClientId: 'NX-ABC123', ownerId: UID, userId: UID, workspaceId: UID, fullName: 'New Owner', displayName: 'New Owner', name: 'New Owner',
    email: 'signup_uid@example.com', role: 'owner', status: 'active', businessType: 'School ERP', selectedBusinessType: 'School ERP',
    currentBusinessType: 'School ERP', primaryBusinessType: 'School ERP', allowedBusinessTypes: ['School ERP'], specialModuleAccess: false,
    allModulesAccess: false, selectedWorkspace: 'school-erp', trialBusinessType: 'School ERP', enabledModules: ['students'], selectedFeatures: ['Students'],
    onboardingCompleted: true, workspaceName: 'Acme School', company: 'Acme School', companyName: 'Acme School', ownerName: 'New Owner',
    country: 'Pakistan', currency: 'PKR', phone: '', address: '', preferredLanguage: 'English', academicYear: '2026', classesRange: '1-10',
    monthlyFeeSetup: '', setupDetails: { campus: 'Main' }, updatedAt: serverTimestamp(), lastLoginAt: serverTimestamp(), lastAccessedAt: serverTimestamp(),
    plan: 'Basic', planStatus: 'trial', subscriptionStatus: 'trial', billingCycle: 'monthly', trialStartAt: serverTimestamp(), trialStartedAt: serverTimestamp(),
    trialEndsAt: days(30), isTrialActive: true, trialDays: 30, createdAt: serverTimestamp(), createdBy: UID, isAdmin: false,
  })
  // WorkspaceSelection.jsx create flow: workspaceCreatePayload
  const onboardingWorkspace = () => ({
    workspaceId: UID, shortClientId: 'NX-ABC123', ownerId: UID, userId: UID, createdBy: UID, ownerEmail: 'signup_uid@example.com', email: 'signup_uid@example.com',
    primaryBusinessType: 'School ERP', businessType: 'School ERP', selectedBusinessType: 'School ERP', currentBusinessType: 'School ERP',
    selectedWorkspace: 'school-erp', allowedBusinessTypes: ['School ERP'], enabledModules: ['students'], onboardingCompleted: true,
    plan: 'Basic', planStatus: 'trial', subscriptionStatus: 'trial', billingCycle: 'monthly', trialStartAt: serverTimestamp(), trialStartedAt: serverTimestamp(),
    trialEndsAt: days(30), isTrialActive: true, setupDetails: { campus: 'Main' }, country: 'Pakistan', currency: 'PKR', currencySymbol: '',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastAccessedAt: serverTimestamp(),
  })
  // WorkspaceSelection.jsx select flow: create payload (no trialEndsAt) and the safe identity retry
  const selectModules = () => ({
    shortClientId: 'NX-ABC123', businessType: 'Retail / POS', currentBusinessType: 'Retail / POS', selectedBusinessType: 'Retail / POS',
    primaryBusinessType: 'Retail / POS', allowedBusinessTypes: ['Retail / POS'], specialModuleAccess: false, allModulesAccess: false,
    selectedWorkspace: 'retail-pos', workspaceId: UID, ownerId: UID, enabledModules: ['pos'], selectedFeatures: ['POS'], onboardingCompleted: true,
    updatedAt: serverTimestamp(), lastAccessedAt: serverTimestamp(),
  })
  const selectWorkspace = () => ({
    ...selectModules(), userId: UID, createdBy: UID, createdAt: serverTimestamp(),
    plan: 'Basic', planStatus: 'trial', subscriptionStatus: 'trial', trialDays: 30, status: 'active', isTrialActive: true,
  })
  const safeRetryWorkspace = () => ({ ...selectModules(), ownerId: UID, workspaceId: UID, userId: UID, createdBy: UID })

  test('the real signup / provisioning / onboarding user payloads are allowed', async () => {
    for (const payload of [signupProfile(), ensureProfile(), onboardingProfile()]) {
      await env.clearFirestore()
      await assertSucceeds(setDoc(doc(owner(), 'users', UID), payload, { merge: true }))
    }
  })

  test('merge writes that can land first on a missing profile are allowed', async () => {
    const firstWrites = [
      // src/context/AuthProvider.jsx updateClientPresence()
      { uid: UID, email: 'signup_uid@example.com', displayName: '', emailVerified: false, isOnline: true, lastActiveAt: serverTimestamp(), lastLoginAt: serverTimestamp(), loginAt: serverTimestamp(), device: 'Linux', browser: 'UA', updatedAt: serverTimestamp() },
      // src/lib/clientIp.js syncClientIpToProfile()
      { ipAddress: '1.2.3.4', ipCountry: 'PK', ipCity: 'Lahore', ipRegion: 'PB', ipTimezone: 'Asia/Karachi', ipColo: 'KHI', ipAsn: '1', ipOrganization: 'ISP', lastIpAddress: '1.2.3.4', ipCapturedAt: serverTimestamp(), lastIpCapturedAt: serverTimestamp(), lastActiveAt: serverTimestamp() },
      // src/lib/welcomeEmailDelivery.js, src/crm/lib/workspaceSession.js, UserContext setActiveBranch
      { welcomeEmailQueuedAt: serverTimestamp(), welcomeEmailQueuedSource: 'module_selection', welcomeEmailBusinessType: 'General CRM', updatedAt: serverTimestamp() },
      { lastLogin: new Date(), updatedAt: serverTimestamp() },
      { activeBranchId: 'main', updatedAt: serverTimestamp() },
    ]
    for (const payload of firstWrites) {
      await env.clearFirestore()
      await assertSucceeds(setDoc(doc(owner(), 'users', UID), payload, { merge: true }))
    }
  })

  test('the real workspace create payloads are allowed', async () => {
    for (const payload of [ensureWorkspace(), onboardingWorkspace(), selectWorkspace(), safeRetryWorkspace()]) {
      await env.clearFirestore()
      await assertSucceeds(setDoc(doc(owner(), 'workspaces', UID), payload, { merge: true }))
    }
  })

  const forgedBilling = () => [
    ['plan enterprise', { plan: 'Enterprise' }],
    ['plan business', { plan: 'Business' }],
    ['plan standard', { plan: 'Standard' }],
    ['subscriptionStatus active', { subscriptionStatus: 'active' }],
    ['planStatus active', { planStatus: 'active' }],
    ['subscriptionStatus paid', { subscriptionStatus: 'paid' }],
    ['trialEndsAt one year ahead', { trialEndsAt: days(365) }],
    ['trialEndsAt 2099', { trialEndsAt: new Date('2099-01-01T00:00:00Z') }],
    ['trialEndsAt in the past', { trialEndsAt: days(-1) }],
    ['trialEndsAt as a string', { trialEndsAt: '2099-01-01' }],
    ['trialStartAt in the future', { trialStartAt: new Date('2099-01-01T00:00:00Z') }],
    ['trialStartedAt in the future', { trialStartedAt: days(200) }],
    ['createdAt in the future', { createdAt: new Date('2099-01-01T00:00:00Z') }],
    ['trialDays 3650', { trialDays: 3650 }],
    ['billingCycle yearly', { billingCycle: 'yearly' }],
    ['subscriptionExpiresAt', { subscriptionExpiresAt: days(365) }],
    ['nextBillingDate', { nextBillingDate: days(365) }],
    ['expiresAt', { expiresAt: days(365) }],
    ['paidAt', { paidAt: new Date() }],
    ['approvedBy', { approvedBy: 'nowpayments:x' }],
    ['billingCurrency', { billingCurrency: 'USD' }],
    ['allModulesAccess', { allModulesAccess: true }],
    ['specialModuleAccess', { specialModuleAccess: true }],
    ['two allowedBusinessTypes', { allowedBusinessTypes: ['Restaurant POS', 'School ERP'] }],
    ['isAdmin', { isAdmin: true }],
    ['status blocked-bypass value', { status: 'vip' }],
    ['accountStatus', { accountStatus: 'active' }],
  ]

  test('forged billing / entitlement fields on users/{uid} create are denied', async () => {
    const extraUser = [
      ['role admin', { role: 'admin' }],
      ['role superadmin', { role: 'superadmin' }],
      ['emailVerifiedCustom', { emailVerifiedCustom: true }],
      ['permissions', { permissions: { settingsAccess: true } }],
    ]
    for (const [label, forged] of [...forgedBilling(), ...extraUser]) {
      await env.clearFirestore()
      await assertFails(setDoc(doc(owner(), 'users', UID), { ...onboardingProfile(), ...forged }, { merge: true }), `users create: ${label}`)
      // also as a merge-only first write carrying nothing else
      await assertFails(setDoc(doc(owner(), 'users', UID), { ...forged, updatedAt: serverTimestamp() }, { merge: true }), `users merge-create: ${label}`)
    }
  })

  test('forged billing / entitlement fields on workspaces/{uid} create are denied', async () => {
    for (const [label, forged] of forgedBilling()) {
      await env.clearFirestore()
      await assertFails(setDoc(doc(owner(), 'workspaces', UID), { ...onboardingWorkspace(), ...forged }), `workspace create: ${label}`)
      await assertFails(setDoc(doc(owner(), 'workspaces', UID), { ...safeRetryWorkspace(), ...forged }, { merge: true }), `workspace safe-retry create: ${label}`)
    }
  })

  test("a user cannot create another user's profile or workspace, or a second workspace", async () => {
    const alice = owner('user_alice')
    await assertFails(setDoc(doc(alice, 'users', UID), { ...signupProfile() }))
    await assertFails(setDoc(doc(alice, 'workspaces', UID), { ...ensureWorkspace() }))
    await assertFails(setDoc(doc(alice, 'workspaces', UID), { ...ensureWorkspace(), ownerId: 'user_alice', createdBy: 'user_alice' }))
    // Its own uid is the only workspace id a self-create may use.
    await assertFails(setDoc(doc(alice, 'workspaces', 'second_workspace'), { ...ensureWorkspace(), ownerId: 'user_alice', createdBy: 'user_alice', workspaceId: 'second_workspace', userId: 'second_workspace' }))
    await assertSucceeds(setDoc(doc(alice, 'workspaces', 'user_alice'), { ...ensureWorkspace(), ownerId: 'user_alice', createdBy: 'user_alice', workspaceId: 'user_alice', userId: 'user_alice' }))
    // Anonymous: nothing.
    await assertFails(setDoc(doc(as.anonymous(), 'users', UID), { ...signupProfile() }))
    await assertFails(setDoc(doc(as.anonymous(), 'workspaces', UID), { ...ensureWorkspace() }))
  })

  test('the admin UID can still create and update paid users / workspaces', async () => {
    const paid = { plan: 'Enterprise', planStatus: 'active', subscriptionStatus: 'active', billingCycle: 'yearly', subscriptionExpiresAt: days(365), nextBillingDate: days(365), allModulesAccess: true }
    await assertSucceeds(setDoc(doc(as.admin(), 'users', UID), { ...signupProfile(), ...paid }))
    await assertSucceeds(setDoc(doc(as.admin(), 'workspaces', UID), { ...ensureWorkspace(), ...paid }))
    await assertSucceeds(updateDoc(doc(as.admin(), 'users', UID), { plan: 'Business', trialEndsAt: days(400) }))
    await assertSucceeds(updateDoc(doc(as.admin(), 'workspaces', UID), { plan: 'Business', status: 'blocked' }))
  })

  test('update protection still holds after a legitimate create', async () => {
    const db = owner()
    await assertSucceeds(setDoc(doc(db, 'users', UID), signupProfile()))
    await assertSucceeds(setDoc(doc(db, 'workspaces', UID), ensureWorkspace()))
    for (const forged of [{ plan: 'Enterprise' }, { subscriptionStatus: 'active' }, { trialEndsAt: days(365) }, { isTrialActive: false }]) {
      await assertFails(updateDoc(doc(db, 'workspaces', UID), forged))
      await assertFails(updateDoc(doc(db, 'users', UID), forged))
    }
    // Protected on workspaces only (the users/{uid} update list does not name it — see the fix report).
    await assertFails(updateDoc(doc(db, 'workspaces', UID), { subscriptionExpiresAt: days(365) }))
    await assertSucceeds(updateDoc(doc(db, 'workspaces', UID), { workspaceName: 'Renamed', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(db, 'users', UID), { fullName: 'Renamed', updatedAt: serverTimestamp() }))
  })
})

// ── Update-time entitlement bypass (G1), WhatsApp API mode (G2), upgrade requests (G3) ──

describe('users/{uid} + workspaces/{uid} update: no self-granted entitlements', () => {
  const UID = 'owner_g1'
  const owner = () => env.authenticatedContext(UID, { email: 'owner_g1@example.com', email_verified: true }).firestore()
  const days = (n) => new Date(Date.now() + n * 86400000)
  const created = days(-5)
  const trialUser = () => ({
    uid: UID, userId: UID, workspaceId: UID, ownerId: UID, role: 'owner', status: 'active', email: 'owner_g1@example.com',
    plan: 'Basic', planStatus: 'trial', subscriptionStatus: 'trial', trialDays: 30, isTrialActive: true,
    allowedBusinessTypes: ['Retail / POS'], specialModuleAccess: false, allModulesAccess: false, createdAt: created, createdBy: UID,
  })
  const trialWorkspace = () => ({
    ownerId: UID, userId: UID, workspaceId: UID, createdBy: UID, status: 'active', name: 'Shop',
    plan: 'Basic', planStatus: 'trial', subscriptionStatus: 'trial', trialDays: 30, isTrialActive: true,
    allowedBusinessTypes: ['Retail / POS'], specialModuleAccess: false, allModulesAccess: false, createdAt: created,
  })
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', UID), trialUser())
      await setDoc(doc(db, 'workspaces', UID), trialWorkspace())
    })
  })

  // WorkspaceSelection.jsx select flow (existing workspace) and its users/{uid} merge
  const selectUpdate = (type) => ({
    shortClientId: 'NX-ABC123', businessType: type, currentBusinessType: type, selectedBusinessType: type, primaryBusinessType: type,
    allowedBusinessTypes: [type], specialModuleAccess: false, allModulesAccess: false, selectedWorkspace: 'school-erp',
    workspaceId: UID, ownerId: UID, enabledModules: ['students'], selectedFeatures: ['Students'], onboardingCompleted: true,
    updatedAt: serverTimestamp(), lastAccessedAt: serverTimestamp(),
  })

  test('legitimate owner writes still work', async () => {
    const db = owner()
    // module selection / switching a single business type
    await assertSucceeds(setDoc(doc(db, 'workspaces', UID), selectUpdate('School ERP'), { merge: true }))
    const { lastAccessedAt, ...userSelect } = selectUpdate('School ERP')
    await assertSucceeds(setDoc(doc(db, 'users', UID), userSelect, { merge: true }))
    // workspaceSession.js
    await assertSucceeds(setDoc(doc(db, 'workspaces', UID), { ownerId: UID, userId: UID, workspaceId: UID, currentSessionId: 's1', sessionStartTime: new Date(), planType: 'Free', trialStatus: 'trial', updatedAt: serverTimestamp() }, { merge: true }))
    // accountProvisioning.js existing-workspace merge
    await assertSucceeds(setDoc(doc(db, 'workspaces', UID), { ownerId: UID, userId: UID, workspaceId: UID, email: 'owner_g1@example.com', updatedAt: serverTimestamp(), lastAccessedAt: serverTimestamp() }, { merge: true }))
    // OnboardingWizard: copies the (earlier) users createdAt, keeps status
    await assertSucceeds(setDoc(doc(db, 'workspaces', UID), { name: 'Renamed', workspaceName: 'Renamed', createdAt: days(-6), updatedAt: serverTimestamp() }, { merge: true }))
    await assertSucceeds(setDoc(doc(db, 'users', UID), { name: 'Renamed', status: 'active', role: 'owner', createdAt: created, updatedAt: serverTimestamp() }, { merge: true }))
    // profile edits
    await assertSucceeds(updateDoc(doc(db, 'users', UID), { fullName: 'New Name', phone: '0300', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(db, 'workspaces', UID), { address: 'Lahore', currency: 'PKR', updatedAt: serverTimestamp() }))
  })

  test('a missing status may be filled in as active, nothing else', async () => {
    await seed(async (db) => {
      const { status, ...noStatus } = trialUser()
      await setDoc(doc(db, 'users', UID), noStatus)
    })
    await assertFails(updateDoc(doc(owner(), 'users', UID), { status: 'vip' }))
    await assertSucceeds(updateDoc(doc(owner(), 'users', UID), { status: 'active' }))
  })

  const forged = () => [
    ['allModulesAccess', { allModulesAccess: true }],
    ['specialModuleAccess', { specialModuleAccess: true }],
    ['two business types', { allowedBusinessTypes: ['Retail / POS', 'School ERP'] }],
    ['six business types', { allowedBusinessTypes: ['a', 'b', 'c', 'd', 'e', 'f'] }],
    ['createdAt in the future', { createdAt: new Date('2099-01-01T00:00:00Z') }],
    ['createdAt moved later', { createdAt: days(-1) }],
    ['createdAt deleted', { createdAt: null }],
    ['subscriptionExpiresAt', { subscriptionExpiresAt: days(365) }],
    ['nextBillingDate', { nextBillingDate: days(365) }],
    ['expiresAt', { expiresAt: days(365) }],
    ['subscriptionStartedAt', { subscriptionStartedAt: new Date() }],
    ['trialDays', { trialDays: 3650 }],
    ['trialEndsAt', { trialEndsAt: days(365) }],
    ['trialStartAt', { trialStartAt: days(200) }],
    ['plan', { plan: 'Enterprise' }],
    ['planId', { planId: 'enterprise' }],
    ['subscriptionStatus', { subscriptionStatus: 'active' }],
    ['paidAt', { paidAt: new Date() }],
    ['approvedBy', { approvedBy: 'someone' }],
    ['billingCurrency', { billingCurrency: 'USD' }],
    ['status', { status: 'vip' }],
    // A missing accountStatus may only be filled in as 'active' (see accountStatusChangeSafe).
    ['accountStatus', { accountStatus: 'vip' }],
    ['isAdmin', { isAdmin: true }],
    ['role', { role: 'admin' }],
  ]

  test('owners cannot raise entitlements on their workspace', async () => {
    for (const [label, patch] of forged()) {
      await assertFails(updateDoc(doc(owner(), 'workspaces', UID), patch), `workspace: ${label}`)
    }
  })

  test('owners cannot raise entitlements on their own profile', async () => {
    for (const [label, patch] of [...forged(), ['createdBy', { createdBy: 'someone_else' }]]) {
      await assertFails(updateDoc(doc(owner(), 'users', UID), patch), `users: ${label}`)
    }
  })

  test('a blocked owner or staff member cannot unblock themselves', async () => {
    await seed(async (db) => {
      await updateDoc(doc(db, 'users', UID), { status: 'blocked' })
      await updateDoc(doc(db, 'users', 'staff_a1'), { status: 'blocked' })
    })
    await assertFails(updateDoc(doc(owner(), 'users', UID), { status: 'active' }))
    const staff = env.authenticatedContext('staff_a1', { email: 'staff_a1@example.com', email_verified: true }).firestore()
    await assertFails(updateDoc(doc(staff, 'users', 'staff_a1'), { status: 'active' }))
    await assertFails(updateDoc(doc(staff, 'users', 'staff_a1'), { allModulesAccess: true }))
  })

  test('a workspace admin (staff) cannot take over ownership fields', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', 'staff_admin_g1'), staffProfile('staff_admin_g1', UID, { role: 'admin' }))
    })
    const staffAdmin = env.authenticatedContext('staff_admin_g1', { email: 'staff_admin_g1@example.com', email_verified: true }).firestore()
    for (const patch of [{ ownerId: 'staff_admin_g1' }, { createdBy: 'staff_admin_g1' }, { userId: 'staff_admin_g1' }, { uid: 'staff_admin_g1' }]) {
      await assertFails(updateDoc(doc(staffAdmin, 'workspaces', UID), patch))
    }
    await assertSucceeds(updateDoc(doc(staffAdmin, 'workspaces', UID), { address: 'Karachi' }))
  })

  test('the admin UID can still change every entitlement', async () => {
    for (const [, patch] of forged()) {
      if ('createdAt' in patch && patch.createdAt === null) continue
      await assertSucceeds(updateDoc(doc(as.admin(), 'workspaces', UID), patch), JSON.stringify(patch))
      await assertSucceeds(updateDoc(doc(as.admin(), 'users', UID), patch), JSON.stringify(patch))
    }
  })
})

describe('whatsappSettings: API mode and limits are admin-only (G2)', () => {
  const UID = 'owner_g2'
  const owner = () => env.authenticatedContext(UID, { email: 'owner_g2@example.com', email_verified: true }).firestore()
  const cfg = () => doc(owner(), 'workspaces', UID, 'whatsappSettings', 'config')
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', UID), { uid: UID, userId: UID, workspaceId: UID, ownerId: UID, role: 'owner', status: 'active' })
      await setDoc(doc(db, 'workspaces', UID), { ownerId: UID, userId: UID, workspaceId: UID, createdBy: UID, status: 'active' })
    })
  })

  test('owners save connection metadata (useWhatsappSettings.saveConnection / verify / usage)', async () => {
    await assertSucceeds(setDoc(cfg(), {
      displayName: 'Shop', connectedNumber: '+923001234567', connectedNumberLabel: 'Shop', phoneNumberId: '123', businessAccountId: '456',
      webhookVerifyLabel: '', status: 'pending', connectionStatus: 'pending_verification', webhookStatus: 'pending', webhookVerified: false,
      workspaceId: UID, updatedAt: serverTimestamp(), updatedBy: UID,
    }, { merge: true }))
    await assertSucceeds(setDoc(cfg(), { webhookVerified: true, workspaceId: UID, updatedAt: serverTimestamp(), updatedBy: UID }, { merge: true }))
    await assertSucceeds(setDoc(cfg(), { whatsappTrialMessagesUsed: 3, workspaceId: UID, updatedAt: serverTimestamp(), updatedBy: UID }, { merge: true }))
  })

  test('owners cannot switch to paid API, raise limits or reset usage', async () => {
    await assertFails(setDoc(cfg(), { whatsappApiMode: 'paid-api', workspaceId: UID }, { merge: true }))
    await seed((db) => setDoc(doc(db, 'workspaces', UID, 'whatsappSettings', 'config'), { whatsappApiMode: 'trial-api', whatsappTrialMessageLimit: 50, whatsappTrialMessagesUsed: 40, workspaceId: UID }))
    for (const patch of [
      { whatsappApiMode: 'paid-api' },
      { whatsappTrialMessageLimit: 100000 },
      { whatsappApiTrialEnabled: true },
      { whatsappTrialEndsAt: new Date('2099-01-01T00:00:00Z') },
      { whatsappTrialMessagesUsed: 0 },
    ]) {
      await assertFails(setDoc(cfg(), { ...patch, workspaceId: UID }, { merge: true }), JSON.stringify(patch))
    }
    await assertSucceeds(setDoc(cfg(), { whatsappTrialMessagesUsed: 41, workspaceId: UID }, { merge: true }))
    await assertFails(deleteDoc(cfg()))
  })

  test('the admin UID can set the API mode', async () => {
    await assertSucceeds(setDoc(doc(as.admin(), 'workspaces', UID, 'whatsappSettings', 'config'), { whatsappApiMode: 'paid-api', whatsappTrialMessageLimit: 0 }, { merge: true }))
  })
})

describe('upgradeRequests create: always pending, own workspace (G3)', () => {
  const UID = 'owner_g3'
  const owner = () => env.authenticatedContext(UID, { email: 'owner_g3@example.com', email_verified: true }).firestore()
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', UID), { uid: UID, userId: UID, workspaceId: UID, ownerId: UID, role: 'owner', status: 'active' })
      await setDoc(doc(db, 'workspaces', UID), { ownerId: UID, userId: UID, workspaceId: UID, createdBy: UID, status: 'active' })
    })
  })
  // src/pages/UpgradeBusiness.jsx handleSubmit (after the D1 worker response is merged in)
  const manual = () => ({
    id: 'req1', email: 'owner_g3@example.com', uid: UID, userId: UID, createdBy: UID, ownerId: UID, workspaceId: UID, workspaceName: 'Shop',
    businessType: 'Retail / POS', currentPlan: 'Basic', requestedPlan: 'Standard', planId: 'standard', selectedPlan: 'Standard', billingCycle: 'monthly',
    originalAmount: 5999, discountAmount: 0, finalAmount: 5999, promoCode: '', promoCodeId: '', amount: 5999, amountPaid: 5999, currency: 'PKR',
    transactionId: 'TXN1', senderName: 'Owner', senderNumber: '0300', paymentMethod: 'JazzCash', paymentMethodId: 'jazzcash', paymentDate: '2026-09-29',
    source: 'cloudflare-d1', sourceCollection: 'cloudflareD1UpgradeRequests', clientId: '', screenshotUrl: 'https://x/y.png', screenshotKey: 'k', paymentProof: 'https://x/y.png',
    status: 'pending', approvalStatus: 'pending', paymentStatus: 'pending', timelineStage: 'payment_submitted', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  // workers/nexora-payments-api crypto checkout (written with the user's ID token)
  const crypto = () => ({
    email: 'owner_g3@example.com', uid: UID, userId: UID, createdBy: UID, ownerId: UID, workspaceId: UID, workspaceName: 'Shop', businessType: 'Retail / POS',
    currentPlan: 'Basic', requestedPlan: 'Standard', selectedPlan: 'Standard', planId: 'standard', billingCycle: 'monthly', originalAmount: 5999, discountAmount: 0,
    finalAmount: 5999, promoCode: '', promoCodeId: '', promoDiscountType: '', promoDiscountValue: 0, amount: 5999, amountPaid: 0, currency: 'PKR',
    paymentMethod: 'Crypto (NOWPayments)', paymentMethodId: 'nowpayments', automaticVerification: true, nowPaymentsOrderId: 'nx_abc', nowPaymentsInvoiceId: '1',
    nowPaymentsPriceAmount: 21.5, nowPaymentsPriceCurrency: 'USD', invoiceUrl: 'https://nowpayments.io/payment/?iid=1',
    status: 'waiting', approvalStatus: 'pending', paymentStatus: 'waiting', createdAt: new Date(), updatedAt: new Date(),
  })

  test('the real manual and crypto request payloads are allowed', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'upgradeRequests', 'req1'), manual()))
    await assertSucceeds(setDoc(doc(owner(), 'upgradeRequests', 'cryptoabc'), crypto()))
  })

  test('pre-approved, pre-paid or foreign-workspace requests are denied', async () => {
    const cases = [
      { status: 'approved' }, { approvalStatus: 'approved' }, { paymentStatus: 'paid' }, { automaticVerification: true },
      { approvedAt: new Date() }, { approvedBy: 'x' }, { subscriptionExpiresAt: new Date('2099-01-01T00:00:00Z') }, { nextBillingDate: new Date() },
      { paidAt: new Date() }, { autoApprovedAt: new Date() }, { userId: 'owner_victim' }, { workspaceId: 'owner_victim', ownerId: 'owner_victim' },
    ]
    for (const patch of cases) {
      await assertFails(setDoc(doc(owner(), 'upgradeRequests', 'bad'), { ...manual(), ...patch }), JSON.stringify(patch))
    }
    await assertFails(setDoc(doc(owner(), 'upgradeRequests', 'bad'), { ...crypto(), amountPaid: 5999 }))
    await assertFails(setDoc(doc(owner(), 'upgradeRequests', 'bad'), { ...crypto(), status: 'finished', paymentStatus: 'paid' }))
    await assertFails(setDoc(doc(owner(), 'upgradeRequests', 'bad'), { ...crypto(), paymentMethodId: 'jazzcash' }))
  })

  test('the admin UID can still create any request', async () => {
    await assertSucceeds(setDoc(doc(as.admin(), 'upgradeRequests', 'adm'), { ...manual(), status: 'approved', approvalStatus: 'approved', paymentStatus: 'paid' }))
  })
})

// ── Storage ───────────────────────────────────────────────────────────────────

describe('storage public-blog uploads: admin UID only', () => {
  const png = new Uint8Array([137, 80, 78, 71])
  test('non-admins (including a verified admin@nexora.com impostor) cannot upload', async () => {
    await assertFails(uploadBytes(ref(env.authenticatedContext('impostorUid00000000000000001', { email: 'admin@nexora.com', email_verified: true }).storage(), 'public-blog/x.png'), png, { contentType: 'image/png' }))
    await assertFails(uploadBytes(ref(env.authenticatedContext('user_alice', { email: 'alice@example.com', email_verified: true }).storage(), 'public-blog/x.png'), png, { contentType: 'image/png' }))
  })
  test('the admin UID (unverified email) can upload', async () => {
    await assertSucceeds(uploadBytes(ref(env.authenticatedContext(ADMIN_UID, { email: 'admin@nexora.com', email_verified: false }).storage(), 'public-blog/x.png'), png, { contentType: 'image/png' }))
  })
})
