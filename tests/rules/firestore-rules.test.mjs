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
