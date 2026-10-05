// Runs the real Cloud Function code against an in-memory Firestore and a mocked Resend.
import { test, before } from 'node:test'
import { existsSync } from 'node:fs'
import assert from 'node:assert/strict'
import { signSvix } from '../functions/marketingEmailLogic.js'

// The functions package has its own node_modules; skip (not fail) where it is not installed.
const hasFunctionDeps = existsSync(new URL('../functions/node_modules/firebase-admin', import.meta.url))
const run = hasFunctionDeps ? test : test.skip

const store = new Map()
let autoId = 0
const INC = '__inc'
const TS = '__ts'
const DEL = '__del'
const fv = { increment: (n) => ({ [INC]: n }), serverTimestamp: () => ({ [TS]: true }), delete: () => ({ [DEL]: true }) }

function applyPatch(base, patch) {
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && INC in value) next[key] = (Number(next[key]) || 0) + value[INC]
    else if (value && typeof value === 'object' && TS in value) next[key] = new Date().toISOString()
    else if (value && typeof value === 'object' && DEL in value) delete next[key]
    else next[key] = value
  }
  return next
}

class DocRef {
  constructor(col, id) { this.col = col; this.id = id; this.path = `${col}/${id}` }
  async get() { const data = store.get(this.path); return { exists: data !== undefined, id: this.id, ref: this, data: () => (data === undefined ? undefined : { ...data }) } }
  async set(data, options) { store.set(this.path, options?.merge ? applyPatch(store.get(this.path) || {}, data) : applyPatch({}, data)) }
  async update(patch) { if (!store.has(this.path)) throw new Error(`no doc ${this.path}`); store.set(this.path, applyPatch(store.get(this.path), patch)) }
}

class Query {
  constructor(col, filters = [], max = Infinity) { this.col = col; this.filters = filters; this.max = max }
  where(field, op, value) { assert.equal(op, '=='); return new Query(this.col, [...this.filters, [field, value]], this.max) }
  limit(n) { return new Query(this.col, this.filters, n) }
  rows() {
    return [...store.entries()]
      .filter(([path]) => path.startsWith(`${this.col}/`))
      .filter(([, data]) => this.filters.every(([field, value]) => data[field] === value))
      .slice(0, this.max)
  }
  async get() {
    const docs = this.rows().map(([path, data]) => ({ id: path.split('/')[1], ref: new DocRef(this.col, path.split('/')[1]), data: () => ({ ...data }) }))
    return { empty: docs.length === 0, size: docs.length, docs }
  }
  count() { return { get: async () => ({ data: () => ({ count: this.rows().length }) }) } }
}

class Collection extends Query {
  constructor(name) { super(name) }
  doc(id) { return new DocRef(this.col, id || `auto${++autoId}`) }
  async add(data) { const ref = this.doc(); await ref.set(data); return ref }
}

const fakeDb = {
  collection: (name) => new Collection(name),
  batch() {
    const ops = []
    return { set: (ref, data) => ops.push(() => ref.set(data)), update: (ref, patch) => ops.push(() => ref.update(patch)), commit: async () => { for (const op of ops) await op() } }
  },
  async runTransaction(fn) {
    const writes = []
    const tx = { get: (ref) => ref.get(), update: (ref, patch) => writes.push(() => ref.update(patch)), set: (ref, data) => writes.push(() => ref.set(data)) }
    const result = await fn(tx)
    for (const write of writes) await write()
    return result
  },
}

process.env.RESEND_API_KEY = 're_test'
process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + Buffer.from('webhook-secret').toString('base64')
process.env.GCLOUD_PROJECT = 'test-project'

let svc
before(async () => {
  if (!hasFunctionDeps) return
  svc = await import('../functions/marketingEmailService.js')
  svc.testing.useFirestore(fakeDb, fv)
})

const sent = []
let resendMode = 'ok'
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails')
  const body = JSON.parse(options.body)
  if (resendMode === 'quota') return { ok: false, status: 429, json: async () => ({ name: 'daily_quota_exceeded', message: 'quota' }) }
  sent.push({ body, headers: options.headers })
  return { ok: true, status: 200, json: async () => ({ id: `re_${sent.length}` }) }
}

const IN_WINDOW = new Date('2026-10-05T07:00:00Z') // 12:00 PKT
const NEXT_DAY = new Date('2026-10-06T07:00:00Z')
const day1 = '2026-10-05'

function reset() { store.clear(); sent.length = 0; resendMode = 'ok' }
function logsOf(campaignId) { return [...store.entries()].filter(([p, d]) => p.startsWith('marketingEmailLogs/') && d.campaignId === campaignId).map(([p, d]) => ({ id: p.split('/')[1], ...d })) }

async function seedCampaign(id, emails) {
  store.set(`marketingCampaigns/${id}`, { subject: 'Hi {{name}}', bodyHtml: '<p>Hello {{name}} <a href="{{unsubscribe}}">unsub</a></p>', bodyText: 'Hello {{name}} {{unsubscribe}}', status: 'queued' })
  await svc.enqueueCampaign(id, emails.map((email, i) => ({ email, name: `N${i}` })))
}

run('queue sends only the daily limit, then waits for the next day', async () => {
  reset()
  store.set('marketingEmailMeta/settings', { dailyLimit: 3, windowStartHour: 9, windowEndHour: 21 })
  await seedCampaign('c1', ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com'])
  const first = await svc.runEmailQueue({ now: IN_WINDOW })
  assert.equal(first.sent, 3)
  assert.equal(sent.length, 3)
  assert.equal(store.get(`marketingEmailMeta/sent-${day1}`).count, 3)
  const second = await svc.runEmailQueue({ now: IN_WINDOW })
  assert.equal(second.skipped, 'daily limit reached')
  assert.equal(sent.length, 3)
  assert.equal(store.get('marketingCampaigns/c1').sentCount, 3)
  assert.equal(store.get('marketingCampaigns/c1').status, 'sending')
  // next day the remaining two go out and the campaign completes
  const third = await svc.runEmailQueue({ now: NEXT_DAY })
  assert.equal(third.sent, 2)
  assert.equal(store.get('marketingCampaigns/c1').status, 'completed')
  assert.equal(store.get('marketingCampaigns/c1').sentCount, 5)
  assert.equal(logsOf('c1').every((l) => l.status === 'sent' && l.providerId), true)
}, { timeout: 20000 })

run('each email is personalised, carries a signed unsubscribe link, headers and tracking tags', async () => {
  reset()
  await seedCampaign('c2', ['p@x.com'])
  await svc.runEmailQueue({ now: IN_WINDOW })
  const { body } = sent[0]
  assert.equal(body.to, 'p@x.com')
  assert.equal(body.subject, 'Hi N0')
  assert.match(body.html, /cloudfunctions\.net\/marketingUnsubscribe\?e=p%40x\.com&t=/)
  assert.doesNotMatch(body.html, /\{\{/)
  assert.match(body.headers['List-Unsubscribe'], /^<https:\/\/us-central1-test-project\.cloudfunctions\.net\/marketingUnsubscribe/)
  assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  const logId = logsOf('c2')[0].id
  assert.deepEqual(body.tags, [{ name: 'log', value: logId }, { name: 'campaign', value: 'c2' }])
}, { timeout: 20000 })

run('outside the sending window, when paused, and for unsubscribed people nothing is sent', async () => {
  reset()
  await seedCampaign('c3', ['ok@x.com', 'gone@x.com'])
  store.set('marketingSubscribers/s1', { email: 'gone@x.com', status: 'unsubscribed' })
  assert.equal((await svc.runEmailQueue({ now: new Date('2026-10-05T01:00:00Z') })).skipped, 'outside sending window') // 06:00 PKT
  store.set('marketingEmailMeta/settings', { paused: true })
  assert.equal((await svc.runEmailQueue({ now: IN_WINDOW })).skipped, 'paused')
  store.set('marketingEmailMeta/settings', { paused: false })
  const run = await svc.runEmailQueue({ now: IN_WINDOW })
  assert.equal(run.sent, 1)
  assert.equal(run.skipped, 1)
  assert.deepEqual(sent.map((s) => s.body.to), ['ok@x.com'])
  assert.equal(logsOf('c3').find((l) => l.email === 'gone@x.com').status, 'skipped')
}, { timeout: 20000 })

run("Resend's own daily quota error stops sending and keeps the rows queued", async () => {
  reset()
  resendMode = 'quota'
  await seedCampaign('c4', ['q1@x.com', 'q2@x.com'])
  await svc.runEmailQueue({ now: IN_WINDOW })
  assert.equal(logsOf('c4').every((l) => l.status === 'queued'), true)
  assert.equal(store.get(`marketingEmailMeta/sent-${day1}`).providerLimitHit, true)
  resendMode = 'ok'
  assert.equal((await svc.runEmailQueue({ now: IN_WINDOW })).skipped, 'daily limit reached')
})

run('cancelled campaign rows are never sent', async () => {
  reset()
  await seedCampaign('c5', ['z@x.com'])
  store.set('marketingCampaigns/c5', { ...store.get('marketingCampaigns/c5'), status: 'cancelled' })
  await svc.runEmailQueue({ now: IN_WINDOW })
  assert.equal(sent.length, 0)
  assert.equal(logsOf('c5')[0].status, 'cancelled')
})

run('webhook events update the log and campaign counters; opens/clicks count once per recipient', async () => {
  reset()
  await seedCampaign('c6', ['w@x.com'])
  await svc.runEmailQueue({ now: IN_WINDOW })
  const log = logsOf('c6')[0]
  const tags = { log: log.id, campaign: 'c6' }
  await svc.handleResendEvent({ type: 'email.delivered', created_at: 't1', data: { tags } }, 'e1')
  await svc.handleResendEvent({ type: 'email.opened', created_at: 't2', data: { tags } }, 'e2')
  await svc.handleResendEvent({ type: 'email.opened', created_at: 't3', data: { tags } }, 'e3')
  await svc.handleResendEvent({ type: 'email.clicked', created_at: 't4', data: { tags, click: { link: 'https://nexorasolution.online/' } } }, 'e4')
  await svc.handleResendEvent({ type: 'email.clicked', created_at: 't4', data: { tags } }, 'e4') // webhook retry of the same event
  const row = store.get(`marketingEmailLogs/${log.id}`)
  assert.equal(row.status, 'clicked')
  assert.equal(row.openCount, 2)
  assert.equal(row.clickCount, 1)
  const campaign = store.get('marketingCampaigns/c6')
  assert.equal(campaign.deliveredCount, 1)
  assert.equal(campaign.openedCount, 1)
  assert.equal(campaign.clickedCount, 1)
})

run('events for emails that are not campaigns (OTP, invoice) are ignored; tags may also be an array', async () => {
  reset()
  assert.deepEqual(await svc.handleResendEvent({ type: 'email.opened', data: { email_id: 'unknown' } }, 'x'), { ignored: true })
  await seedCampaign('c7', ['t@x.com'])
  await svc.runEmailQueue({ now: IN_WINDOW })
  const log = logsOf('c7')[0]
  await svc.handleResendEvent({ type: 'email.delivered', data: { tags: [{ name: 'log', value: log.id }] } }, 'a1')
  assert.equal(store.get(`marketingEmailLogs/${log.id}`).status, 'delivered')
  // fallback lookup by Resend id when tags are missing
  await svc.handleResendEvent({ type: 'email.opened', data: { email_id: log.providerId || 're_1' } }, 'a2')
  assert.equal(store.get(`marketingEmailLogs/${log.id}`).status, 'opened')
})

run('a hard bounce unsubscribes the address and skips its other queued emails', async () => {
  reset()
  await seedCampaign('c8', ['bad@x.com'])
  await seedCampaign('c9', ['bad@x.com'])
  await svc.runEmailQueue({ now: IN_WINDOW })
  const sentLog = logsOf('c8').concat(logsOf('c9')).find((l) => l.status === 'sent')
  await svc.handleResendEvent({ type: 'email.bounced', data: { tags: { log: sentLog.id }, bounce: { type: 'Permanent', message: 'no mailbox' } } }, 'b1')
  const subscriber = [...store.entries()].find(([p, d]) => p.startsWith('marketingSubscribers/') && d.email === 'bad@x.com')[1]
  assert.equal(subscriber.status, 'unsubscribed')
  assert.equal(store.get(`marketingEmailLogs/${sentLog.id}`).status, 'bounced')
})

function fakeRes() {
  const res = { statusCode: 200, body: '', headers: {}, handlers: {} }
  res.on = (event, handler) => { (res.handlers[event] ||= []).push(handler); return res }
  res.once = res.on
  res.removeListener = () => res
  res.end = () => { for (const handler of res.handlers.finish || []) handler() }
  res.status = (code) => { res.statusCode = code; return res }
  res.send = (body) => { res.body = body; res.end(); return res }
  res.set = (k, v) => { res.headers[k] = v; return res }
  return res
}

run('webhook endpoint: rejects bad signatures, accepts a valid one and records it', async () => {
  reset()
  await seedCampaign('c10', ['h@x.com'])
  await svc.runEmailQueue({ now: IN_WINDOW })
  const log = logsOf('c10')[0]
  const rawBody = JSON.stringify({ type: 'email.delivered', created_at: 'n', data: { tags: { log: log.id } } })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const headers = (signature) => ({ 'svix-id': 'm1', 'svix-timestamp': timestamp, 'svix-signature': signature })
  const request = (sig) => ({ method: 'POST', rawBody: Buffer.from(rawBody), get: (name) => headers(sig)[name.toLowerCase()] })

  const bad = fakeRes()
  await svc.resendWebhook(request('v1,AAAA'), bad)
  assert.equal(bad.statusCode, 401)
  assert.equal(store.get(`marketingEmailLogs/${log.id}`).status, 'sent')

  const good = fakeRes()
  await svc.resendWebhook(request(signSvix({ secret: process.env.RESEND_WEBHOOK_SECRET, id: 'm1', timestamp, rawBody })), good)
  assert.equal(good.statusCode, 200)
  assert.equal(store.get(`marketingEmailLogs/${log.id}`).status, 'delivered')

  const get = fakeRes()
  await svc.resendWebhook({ method: 'GET', get: () => '' }, get)
  assert.equal(get.statusCode, 405)
})

run('unsubscribe link: GET only asks, POST unsubscribes, a forged link is refused', async () => {
  reset()
  await seedCampaign('c11', ['u@x.com'])
  await svc.runEmailQueue({ now: IN_WINDOW })
  await seedCampaign('c12', ['u@x.com']) // a second campaign still queued for the same address
  const url = new URL(/href="([^"]+)"/.exec(sent[0].body.html)[1].replaceAll('&amp;', '&'))
  const query = Object.fromEntries(url.searchParams)

  const preview = fakeRes()
  await svc.marketingUnsubscribe({ method: 'GET', query }, preview)
  assert.equal(preview.statusCode, 200)
  assert.match(preview.body, /<form method="POST">/)
  assert.equal([...store.keys()].some((k) => k.startsWith('marketingSubscribers/')), false) // a mail scanner opening the link changes nothing

  const forged = fakeRes()
  await svc.marketingUnsubscribe({ method: 'POST', query: { e: 'someone@else.com', t: query.t } }, forged)
  assert.equal(forged.statusCode, 400)

  const done = fakeRes()
  await svc.marketingUnsubscribe({ method: 'POST', query }, done)
  assert.equal(done.statusCode, 200)
  const subscriber = [...store.entries()].find(([p, d]) => p.startsWith('marketingSubscribers/') && d.email === 'u@x.com')[1]
  assert.equal(subscriber.status, 'unsubscribed')
  assert.equal(logsOf('c12')[0].status, 'skipped')
}, { timeout: 20000 })

// ---------------------------------------------------------------------------
// Automations
// ---------------------------------------------------------------------------
const AUTO_NOW = IN_WINDOW
const ago = (n) => new Date(AUTO_NOW.getTime() - n * 86400000).toISOString()

function seedAccounts() {
  store.set('workspaces/w1', { email: 'new@x.com', createdAt: ago(1), subscriptionStatus: 'trial', trialEndsAt: new Date(AUTO_NOW.getTime() + 29 * 86400000).toISOString() })
  store.set('workspaces/w2', { email: 'soon@x.com', createdAt: ago(23), subscriptionStatus: 'trial', trialEndsAt: new Date(AUTO_NOW.getTime() + 7 * 86400000).toISOString() })
  store.set('workspaces/w3', { email: 'paid@x.com', createdAt: ago(27), subscriptionStatus: 'active', trialEndsAt: new Date(AUTO_NOW.getTime() + 3 * 86400000).toISOString() })
  store.set('users/u1', { email: 'new@x.com', fullName: 'Hina Malik' })
  store.set('websiteLeads/l1', { email: 'lead@x.com', name: 'Omar', status: 'new', createdAt: ago(2) })
}

run('automations are OFF by default: nothing is queued', async () => {
  reset()
  seedAccounts()
  assert.deepEqual(await svc.runMarketingAutomations({ now: AUTO_NOW }), { skipped: 'no automation is switched on' })
  assert.equal([...store.keys()].some((k) => k.startsWith('marketingEmailLogs/')), false)
})

run('a switched-on automation queues the right people once, with priority and its own stats campaign', async () => {
  reset()
  seedAccounts()
  store.set('marketingEmailMeta/automations', { welcome: { enabled: true }, trial_7_days: { enabled: true }, lead_followup: { enabled: true } })
  const first = await svc.runMarketingAutomations({ now: AUTO_NOW })
  assert.deepEqual(first.queued, { welcome: 1, trial_7_days: 1, lead_followup: 1 })
  assert.deepEqual(logsOf('automation-welcome').map((l) => [l.email, l.name, l.priority, l.status, l.accountId, l.sequence]), [['new@x.com', 'Hina', 1, 'queued', 'w1', 'welcome']])
  assert.deepEqual(first.people.filter((p) => p.sequence === 'welcome'), [{ sequence: 'welcome', email: 'new@x.com', accountId: 'w1' }])
  assert.equal(logsOf('automation-trial_7_days')[0].email, 'soon@x.com')
  assert.equal(logsOf('automation-lead_followup')[0].email, 'lead@x.com')
  const campaign = store.get('marketingCampaigns/automation-welcome')
  assert.equal(campaign.kind, 'automation')
  assert.equal(campaign.totalRecipients, 1)
  assert.ok(campaign.createdAt && campaign.subject === 'Welcome to Nexora, your workspace is ready' && campaign.bodyHtml.includes('nexorasolution.online/logo-192.png'))
  // running again (the hourly tick) never queues the same person twice
  const second = await svc.runMarketingAutomations({ now: AUTO_NOW })
  assert.deepEqual(second.queued, { welcome: 0, trial_7_days: 0, lead_followup: 0 })
  assert.equal(logsOf('automation-welcome').length, 1)
  // paying client is not reminded about the trial
  assert.equal([...store.values()].some((d) => d.email === 'paid@x.com' && d.sequence), false)
})

run('unsubscribed people are never queued by an automation', async () => {
  reset()
  seedAccounts()
  store.set('marketingSubscribers/s1', { email: 'new@x.com', status: 'unsubscribed' })
  store.set('marketingEmailMeta/automations', { welcome: { enabled: true } })
  assert.deepEqual((await svc.runMarketingAutomations({ now: AUTO_NOW })).queued, { welcome: 0 })
})

run('automation emails go out before campaign emails and arrive personalised with a working unsubscribe link', async () => {
  reset()
  store.set('marketingEmailMeta/settings', { dailyLimit: 1, windowStartHour: 9, windowEndHour: 21 })
  await seedCampaign('big', ['c1@x.com', 'c2@x.com'])
  seedAccounts()
  store.set('marketingEmailMeta/automations', { welcome: { enabled: true } })
  await svc.runMarketingAutomations({ now: AUTO_NOW })
  const result = await svc.runEmailQueue({ now: AUTO_NOW })
  assert.equal(result.sent, 1)
  assert.equal(sent[0].body.to, 'new@x.com')
  assert.equal(sent[0].body.subject, 'Welcome to Nexora, your workspace is ready')
  assert.match(sent[0].body.html, /Hi Hina,/)
  assert.match(sent[0].body.html, /marketingUnsubscribe\?e=new%40x\.com&t=/)
  assert.doesNotMatch(sent[0].body.html, /\{\{/)
  assert.equal(logsOf('big').every((l) => l.status === 'queued'), true)
  assert.equal(store.get('marketingCampaigns/automation-welcome').sentCount, 1)
}, { timeout: 20000 })
