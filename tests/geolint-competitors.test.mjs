import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCompetitorPrompt, parseCompetitorDomains, suggestCompetitors, verifyCompetitors } from '../src/lib/geolintCompetitors.js'

test('the answer is read whatever wraps the JSON array', () => {
  assert.deepEqual(parseCompetitorDomains('Here: ```json\n["a.com","https://www.B.io/pricing","a.com"]\n```', 'own.com'), ['a.com', 'b.io'])
  assert.deepEqual(parseCompetitorDomains('[{"domain":"x.pk"},{"url":"https://y.com/"}]', 'own.com'), ['x.pk', 'y.com'])
  assert.deepEqual(parseCompetitorDomains('one.com, two.com; three', 'own.com'), ['one.com', 'two.com'])
})

test('the client\'s own site, its subdomains and junk are dropped', () => {
  assert.deepEqual(parseCompetitorDomains('["own.com","app.own.com","www.own.com","not a domain","localhost","good.com"]', 'www.own.com'), ['good.com'])
  assert.deepEqual(parseCompetitorDomains('', 'own.com'), [])
  assert.equal(parseCompetitorDomains(JSON.stringify(Array.from({ length: 30 }, (_, i) => `s${i}.com`)), 'own.com').length, 10)
})

test('the prompt names the business and asks for JSON only', () => {
  const prompt = buildCompetitorPrompt({ host: 'www.nexorasolution.online', title: 'Nexora Solution', description: 'POS and ERP software' }, { exclude: ['x.com'] })
  assert.match(prompt, /Nexora Solution/)
  assert.match(prompt, /nexorasolution\.online/)
  assert.match(prompt, /Do not include: x\.com/)
  assert.match(prompt, /ONLY a JSON array/)
})

test('websites that do not load are never suggested, and the list is capped', async () => {
  const lookup = async (url) => {
    const host = new URL(url).hostname
    if (host.startsWith('dead')) throw new Error('unreachable')
    return { url: `https://${host}/`, host, title: host }
  }
  const found = await verifyCompetitors(['dead1.com', 'a.com', 'dead2.com', 'b.com', 'c.com', 'd.com'], { lookup, want: 3 })
  assert.equal(found.length, 3)
  assert.ok(found.every((p) => !p.host.startsWith('dead')))
})

test('suggestions follow the AI order and skip what is already added', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ text: '["first.com","second.com","added.com","third.com"]' }) })
  const lookup = async (url) => { const host = new URL(url).hostname; await new Promise((r) => setTimeout(r, host === 'first.com' ? 20 : 0)); return { url: `https://${host}/`, host, title: host } }
  const out = await suggestCompetitors({ host: 'own.com', title: 'Own' }, { fetchImpl, lookup, exclude: ['added.com'] })
  assert.deepEqual(out.items.map((p) => p.host), ['first.com', 'second.com', 'third.com'])
  assert.equal(out.reason, '')
})

test('when the site reader fails for every name the names are still offered, marked unverified, with a logo', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ text: '["a.com","b.com","c.com","d.com","e.com"]' }) })
  const out = await suggestCompetitors({ host: 'own.com' }, { fetchImpl, lookup: async () => { throw new Error('429') } })
  assert.equal(out.items.length, 4)
  assert.ok(out.items.every((p) => p.unverified && /favicons/.test(p.logo)))
})

test('an empty first answer is retried once in normal mode', async () => {
  const purposes = []
  const fetchImpl = async (url, init) => {
    purposes.push(JSON.parse(init.body).purpose || '')
    return { ok: true, json: async () => ({ text: purposes.length === 1 ? 'I cannot do that' : '["z.com"]' }) }
  }
  const out = await suggestCompetitors({ host: 'own.com' }, { fetchImpl, lookup: async (u) => ({ url: u, host: new URL(u).hostname }) })
  assert.deepEqual(purposes, ['translation', ''])
  assert.deepEqual(out.items.map((p) => p.host), ['z.com'])
})

test('a gateway that is down reports why, and nothing throws', async () => {
  assert.deepEqual(await suggestCompetitors({ host: 'own.com' }, { fetchImpl: async () => ({ ok: false, status: 502 }), lookup: async () => ({}) }), { items: [], reason: 'ai' })
  assert.equal((await suggestCompetitors({ host: 'own.com' }, { fetchImpl: async () => { throw new Error('offline') }, lookup: async () => ({}) })).reason, 'ai')
  assert.equal((await suggestCompetitors({ host: 'own.com' }, { fetchImpl: async () => ({ ok: true, json: async () => ({ text: 'no idea' }) }), lookup: async () => ({}) })).reason, 'none')
})
