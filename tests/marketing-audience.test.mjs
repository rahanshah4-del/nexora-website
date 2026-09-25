import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  AUDIENCE_SOURCES,
  buildMarketingAudience,
  marketingOptOutUrl,
  withOptOutFooter,
} from '../functions/marketingAudience.js'

const sources = () => ({
  subscribers: [
    { id: 'sub1', email: 'Newsletter@Example.com', source: 'website', moduleInterest: 'restaurant', status: 'subscribed' },
    { id: 'sub2', email: 'optout@example.com', source: 'manual', status: 'unsubscribed' },
    { id: 'sub3', email: 'owner@pharma.pk', source: 'manual', moduleInterest: 'crm', status: 'subscribed' },
  ],
  users: [
    { id: 'u1', email: 'owner@pharma.pk', businessType: 'PharmaFlow', isTrialActive: true },
    { id: 'u2', email: 'optout@example.com', businessType: 'School ERP' },
    { id: 'u3', email: 'retailer@shop.pk', businessType: 'Retail / POS', subscriptionStatus: 'active' },
  ],
  workspaceOwners: [
    { id: 'w1', ownerEmail: 'owner@pharma.pk', email: 'owner@pharma.pk', businessType: 'PharmaFlow' },
    { id: 'w2', email: 'school@academy.pk', businessType: 'School ERP', subscriptionStatus: 'active' },
  ],
  upgradeRequests: [
    { id: 'r1', clientEmail: 'buyer@property.pk', businessType: 'Property ERP' },
  ],
  // Client data — must never become recipients, whatever the caller passes.
  leads: [{ email: 'lead-of-client@example.com', businessType: 'General CRM' }],
  customers: [{ email: 'patient@example.com', customerEmail: 'patient@example.com', businessType: 'PharmaFlow' }],
  students: [{ email: 'student@example.com' }],
})

const emails = (list) => list.map((contact) => contact.email).sort()

test('client leads, customers and other client data are never included', () => {
  const { contacts, recipients } = buildMarketingAudience(sources())
  for (const blocked of ['lead-of-client@example.com', 'patient@example.com', 'student@example.com']) {
    assert.equal(contacts.some((contact) => contact.email === blocked), false, blocked)
    assert.equal(recipients.some((contact) => contact.email === blocked), false, blocked)
  }
  assert.deepEqual(AUDIENCE_SOURCES.map((source) => source.collection), ['marketingSubscribers', 'users', 'workspaces', 'upgradeRequests'])
})

test('unsubscribed emails are excluded everywhere they appear', () => {
  const { contacts, recipients, unsubscribedCount } = buildMarketingAudience(sources())
  assert.equal(recipients.some((contact) => contact.email === 'optout@example.com'), false)
  assert.equal(contacts.find((contact) => contact.email === 'optout@example.com').status, 'unsubscribed')
  assert.equal(unsubscribedCount, 1)
  const flagged = buildMarketingAudience({ users: [{ email: 'flag@example.com', marketingOptOut: true }] })
  assert.equal(flagged.recipients.length, 0)
})

test('duplicates merge by lowercased email and keep every source', () => {
  const { recipients, countsBySource } = buildMarketingAudience(sources())
  assert.deepEqual(emails(recipients), ['buyer@property.pk', 'newsletter@example.com', 'owner@pharma.pk', 'retailer@shop.pk', 'school@academy.pk'])
  const owner = recipients.find((contact) => contact.email === 'owner@pharma.pk')
  assert.deepEqual(owner.sources, ['subscribers', 'users', 'workspaceOwners'])
  assert.equal(owner.subscriberId, 'sub3')
  // Explicit 'crm' subscriber interest gives way to the PharmaFlow account.
  assert.equal(owner.moduleInterest, 'pharmacy')
  assert.deepEqual(Object.fromEntries(countsBySource.map((row) => [row.key, row.count])), {
    subscribers: 2,
    users: 2,
    workspaceOwners: 2,
    upgradeRequests: 1,
  })
})

test('module segment filter works on the allowed sources', () => {
  const run = (module) => emails(buildMarketingAudience(sources(), { module }).recipients)
  assert.deepEqual(run('pharmacy'), ['owner@pharma.pk'])
  assert.deepEqual(run('retail'), ['retailer@shop.pk'])
  assert.deepEqual(run('property'), ['buyer@property.pk'])
  assert.deepEqual(run('school'), ['school@academy.pk'])
  assert.deepEqual(run('restaurant'), ['newsletter@example.com'])
  assert.deepEqual(run('crm'), [])
})

test('audience type filter matches any merged source type', () => {
  const run = (audienceType) => emails(buildMarketingAudience(sources(), { audienceType }).recipients)
  assert.deepEqual(run('trial'), ['owner@pharma.pk'])
  assert.deepEqual(run('lead'), ['newsletter@example.com'])
  assert.deepEqual(run('manual'), ['owner@pharma.pk'])
  assert.ok(run('client').includes('buyer@property.pk'))
})

test('invalid or missing emails are skipped', () => {
  const { contacts } = buildMarketingAudience({ users: [{ email: 'not-an-email' }, {}, null, { email: '  Spaced@Example.com ' }] })
  assert.deepEqual(emails(contacts), ['spaced@example.com'])
})

test('every campaign gets an opt-out footer pointing to the public contact page', () => {
  const plain = withOptOutFooter({ bodyHtml: '<p>Hello</p>', bodyText: 'Hello' })
  assert.match(plain.bodyHtml, /\{\{unsubscribe\}\}/)
  assert.match(plain.bodyText, /\{\{unsubscribe\}\}/)
  const templated = withOptOutFooter({ bodyHtml: '<a href="{{unsubscribe}}">Unsubscribe</a>', bodyText: '' })
  assert.equal(templated.bodyHtml, '<a href="{{unsubscribe}}">Unsubscribe</a>')
  assert.equal(templated.bodyText, '')
  assert.equal(marketingOptOutUrl('A@B.com'), 'https://nexorasolution.online/contact?topic=unsubscribe&email=a%40b.com')
  assert.equal(marketingOptOutUrl(), 'https://nexorasolution.online/contact?topic=unsubscribe')
})

test('Cloud Function and admin page never read client sub-collections for recipients', () => {
  const fn = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8')
  const start = fn.indexOf('async function fetchRecipients(')
  const body = fn.slice(start, fn.indexOf('\n}\n', start))
  assert.ok(start > 0)
  assert.doesNotMatch(body, /collectionGroup|leads|customers/)
  assert.match(body, /buildMarketingAudience/)
  const site = readFileSync(new URL('../src/lib/marketing.js', import.meta.url), 'utf8')
  assert.doesNotMatch(site, /collectionGroup|safeGroupDocs\(|'leads'|'customers'/)
  assert.match(site, /from '\.\.\/\.\.\/functions\/marketingAudience\.js'/)
})
