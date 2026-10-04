import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { WEBSITE_LEAD_LIMITS, WEBSITE_LEAD_SOURCE, submitWebsiteLead, validateWebsiteLead } from '../src/lib/websiteLeads.js'

const valid = { name: '  Ayesha  Khan ', phone: '+92 300 1234567', message: 'Need a POS\nfor 2 branches', email: 'A@Example.com' }

test('valid input is cleaned and keeps only allowed, non-empty fields', () => {
  const { errors, fields } = validateWebsiteLead({ ...valid, businessName: '', module: 'Restaurant POS', extra: 'x' })
  assert.deepEqual(errors, {})
  assert.deepEqual(fields, {
    name: 'Ayesha Khan',
    phone: '+92 300 1234567',
    email: 'a@example.com',
    module: 'Restaurant POS',
    message: 'Need a POS\nfor 2 branches',
  })
})

test('required fields and formats are enforced', () => {
  assert.ok(validateWebsiteLead({}).errors.name)
  assert.ok(validateWebsiteLead({}).errors.phone)
  assert.ok(validateWebsiteLead({}).errors.message)
  assert.ok(validateWebsiteLead({ ...valid, phone: '12' }).errors.phone)
  assert.ok(validateWebsiteLead({ ...valid, phone: 'call me' }).errors.phone)
  assert.ok(validateWebsiteLead({ ...valid, email: 'not-an-email' }).errors.email)
})

test('values are cut to the firestore.rules limits', () => {
  const { fields } = validateWebsiteLead({ ...valid, name: 'n'.repeat(500), message: 'm'.repeat(5000) })
  assert.equal(fields.name.length, WEBSITE_LEAD_LIMITS.name)
  assert.equal(fields.message.length, WEBSITE_LEAD_LIMITS.message)
})

test('limits, field list and source match firestore.rules validWebsiteLead()', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  const fn = rules.slice(rules.indexOf('function validWebsiteLead()'), rules.indexOf('function validWebsiteLeadStatusUpdate()'))
  assert.ok(fn.includes(`request.resource.data.source=='${WEBSITE_LEAD_SOURCE}'`))
  for (const [key, max] of Object.entries(WEBSITE_LEAD_LIMITS)) {
    const required = ['name', 'phone', 'message'].includes(key)
    const pattern = required ? `request.resource.data.${key}.size()<=${max}` : `optionalString(request.resource.data,'${key}',${max})`
    assert.ok(fn.includes(pattern), `rule limit for ${key} should be ${max}`)
    assert.ok(fn.includes(`'${key}'`), `rule should allow ${key}`)
  }
})

test('invalid input is not submitted', async () => {
  const result = await submitWebsiteLead({ name: 'x' })
  assert.equal(result.ok, false)
  assert.ok(result.errors.phone)
})

test('honeypot submissions are dropped without touching Firestore', async () => {
  const result = await submitWebsiteLead(valid, { honeypot: 'http://spam.example' })
  assert.deepEqual(result, { ok: true, dropped: true })
})
