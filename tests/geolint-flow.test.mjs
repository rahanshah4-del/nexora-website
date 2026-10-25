import test from 'node:test'
import assert from 'node:assert/strict'
import { WIZARD_STEPS, DRAFT_MAX_AGE_MS, clearDraft, draftHasProgress, emptyScore, loadDraft, parseDraft, reachableStep, saveDraft, serializeDraft } from '../src/lib/geolintDraft.js'
import { buildPaymentMethods, isRealAccount, methodName, referenceFields, usdToPkr, validatePaymentProof } from '../src/lib/geolintPayment.js'

const memory = () => {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map }
}
const profile = { url: 'https://example.com/', host: 'example.com', title: 'Example' }
const state = (over = {}) => ({
  step: 'details',
  site: { input: 'example.com', profile, score: { status: 'done', scorePercent: 61, auditId: 'a1', error: '' } },
  rivals: [
    { key: 'r1', host: 'rival.com', profile: { url: 'https://rival.com/', host: 'rival.com' }, score: { status: 'running', scorePercent: null, auditId: null, error: '' } },
    { key: 'r2', host: 'broken.com', profile: null, error: 'x', score: emptyScore },
  ],
  form: { name: 'Ali', platform: 'wordpress', authorized: true },
  plan: 'seo',
  ...over,
})

test('a saved draft comes back with the same step, form and plan', () => {
  const store = memory()
  assert.equal(saveDraft('u1', state(), store), true)
  const draft = loadDraft('u1', store)
  assert.equal(draft.step, 'details')
  assert.equal(draft.plan, 'seo')
  assert.equal(draft.form.name, 'Ali')
  assert.equal(draft.form.authorized, true)
  assert.equal(draft.site.score.scorePercent, 61)
  assert.equal(draft.site.status, 'ready')
  assert.ok(draftHasProgress(draft))
})

test('competitors that were still loading or failed are not restored, and unfinished scores reset', () => {
  const draft = parseDraft(serializeDraft(state()))
  assert.equal(draft.rivals.length, 1)
  assert.equal(draft.rivals[0].score.status, 'idle')
})

test('drafts are kept per account and can be cleared', () => {
  const store = memory()
  saveDraft('u1', state(), store)
  assert.equal(loadDraft('u2', store), null)
  clearDraft('u1', store)
  assert.equal(loadDraft('u1', store), null)
})

test('old, broken or empty drafts are ignored', () => {
  const now = Date.now()
  assert.equal(parseDraft(serializeDraft(state(), now - DRAFT_MAX_AGE_MS - 1000), now), null)
  assert.equal(parseDraft('{not json'), null)
  assert.equal(parseDraft({ v: 2 }), null)
  assert.equal(parseDraft(serializeDraft(state({ site: { input: '', profile: null, score: emptyScore } }))), null)
  const store = memory()
  assert.equal(saveDraft('u1', state({ site: { input: '', profile: null, score: emptyScore } }), store), false)
  assert.equal(store.map.size, 0, 'nothing is stored before the site is read')
})

test('a missing storage never throws', () => {
  assert.equal(saveDraft('u1', state(), { setItem() { throw new Error('blocked') }, removeItem() {} }), false)
  assert.equal(loadDraft('u1', { getItem() { throw new Error('blocked') } }), null)
})

test('a step is only reachable when the ones before it are done', () => {
  assert.equal(reachableStep('plan', { hasSite: false, detailsValid: false }), 'site')
  assert.equal(reachableStep('competitors', { hasSite: true, detailsValid: false }), 'competitors')
  assert.equal(reachableStep('plan', { hasSite: true, detailsValid: false }), 'details')
  assert.equal(reachableStep('plan', { hasSite: true, detailsValid: true }), 'plan')
  assert.equal(reachableStep('nonsense', { hasSite: true, detailsValid: true }), 'site')
})

test('demo account numbers are never shown as places to send money', () => {
  assert.equal(isRealAccount('0300-1234567'), false)
  assert.equal(isRealAccount('XXXXXXXX'), false)
  assert.equal(isRealAccount('Contact support'), false)
  assert.equal(isRealAccount('0321-9876543'), true)
  assert.equal(isRealAccount('PK36MEZN0000123456789012'), true)
})

test('payment methods come from the Control Centre accounts, card first', () => {
  const settingsDocs = [{ paymentAccounts: {
    jazzcash: { id: 'jazzcash', label: 'JazzCash', accountTitle: 'Nexora', accountNumber: '0321-9876543' },
    easypaisa: { id: 'easypaisa', label: 'Easypaisa', accountTitle: 'Nexora', accountNumber: '0300-1234567' },
    bank_transfer: { id: 'bank_transfer', label: 'Bank Transfer', bankName: 'Meezan', accountTitle: 'Nexora', accountNumber: 'PK36MEZN0000123456789012' },
    nowpayments: { id: 'nowpayments', paymentUrl: 'https://nowpayments.io/payment/?iid=1' },
  } }]
  const methods = buildPaymentMethods({ paddle: { clientToken: 't' }, settingsDocs })
  assert.deepEqual(methods.map((m) => m.id), ['card', 'jazzcash', 'bank_transfer', 'crypto'])
  assert.equal(methods[1].accountNumber, '0321-9876543')
})

test('with no settings loaded no local account is offered, and card alone still works', () => {
  assert.deepEqual(buildPaymentMethods({ paddle: null, settingsDocs: [] }), [])
  assert.deepEqual(buildPaymentMethods({ paddle: { clientToken: 't' }, settingsDocs: [] }).map((m) => m.id), ['card'])
})

test('a crypto link that is not on nowpayments.io is not shown', () => {
  const docs = [{ paymentAccounts: { nowpayments: { paymentUrl: 'https://evil.example/pay' } } }]
  assert.equal(buildPaymentMethods({ paddle: null, settingsDocs: docs }).some((m) => m.id === 'crypto'), false)
})

test('USD to PKR uses the live rate and falls back when there is none', () => {
  assert.equal(usdToPkr(50, { USD: 0.0035 }), Math.round(50 / 0.0035))
  assert.equal(usdToPkr(50, null), 14000)
  assert.equal(usdToPkr(0, null), null)
})

test('the proof form asks for the right thing and checks it', () => {
  assert.equal(referenceFields({ id: 'crypto' }).label, 'Transaction ID (hash)')
  assert.equal(methodName({ id: 'jazzcash', label: 'JazzCash' }), 'JazzCash')
  assert.match(validatePaymentProof({ method: 'JazzCash', reference: '12' }), /at least 4/)
  assert.equal(validatePaymentProof({ method: 'JazzCash', reference: 'T123456' }), '')
  assert.match(validatePaymentProof({ method: '', reference: 'T123456' }), /how you paid/)
})

test('the wizard has seven steps, ending with the plan', () => {
  assert.deepEqual(WIZARD_STEPS, ['site', 'market', 'business', 'competitors', 'scope', 'details', 'plan'])
})

test('every middle step opens once the site is read; only the plan waits for valid details', () => {
  for (const id of ['market', 'business', 'competitors', 'scope', 'details']) assert.equal(reachableStep(id, { hasSite: true, detailsValid: false }), id)
  for (const id of ['market', 'scope', 'plan']) assert.equal(reachableStep(id, { hasSite: false, detailsValid: true }), 'site')
})

test('an old four-step draft still restores, with the new answers filled with defaults', () => {
  const old = { v: 1, savedAt: Date.now(), step: 'details', site: { input: 'example.com', profile, score: {} }, rivals: [], form: { name: 'Ali' }, plan: 'geo' }
  const draft = parseDraft(old)
  assert.equal(draft.step, 'details')
  assert.equal(draft.form.market, 'Canada')
  assert.equal(draft.form.language, 'English')
  assert.deepEqual(draft.form.fixOff, [])
})

test('switched-off fixes are kept in the draft but junk is dropped', () => {
  const draft = parseDraft(serializeDraft(state({ form: { name: 'Ali', fixOff: ['bluf', 7, null, 'src'] } })))
  assert.deepEqual(draft.form.fixOff, ['bluf', 'src'])
})

test('cardOnly offers just the card when cards are on, and everything else only when they are off', () => {
  const docs = [{ id: 'paymentAccounts', paymentAccounts: { jazzcash: { label: 'JazzCash', accountNumber: '03451234567' } } }]
  assert.deepEqual(buildPaymentMethods({ paddle: { clientToken: 't' }, settingsDocs: docs, cardOnly: true }).map((m) => m.id), ['card'])
  assert.equal(buildPaymentMethods({ paddle: null, settingsDocs: docs, cardOnly: true }).some((m) => m.kind === 'card'), false)
})
