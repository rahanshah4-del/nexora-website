import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalHostRedirect } from '../worker/index.js'

const loc = (u) => {
  const r = canonicalHostRedirect(u)
  return r ? { status: r.status, location: r.headers.get('location') } : null
}

test('old domain redirects page-for-page with 301', () => {
  assert.deepEqual(loc('https://nexorasolution.online/'), { status: 301, location: 'https://nexorasolution.us/' })
  assert.deepEqual(loc('https://nexorasolution.online/lahore/'), { status: 301, location: 'https://nexorasolution.us/lahore/' })
  assert.deepEqual(loc('https://www.nexorasolution.online/crm'), { status: 301, location: 'https://nexorasolution.us/crm/' })
})

test('query string and file paths are preserved', () => {
  assert.equal(loc('https://nexorasolution.online/tools/geo-audit/?url=a.com&x=1').location, 'https://nexorasolution.us/tools/geo-audit/?url=a.com&x=1')
  assert.equal(loc('https://nexorasolution.online/sitemap.xml').location, 'https://nexorasolution.us/sitemap.xml')
  assert.equal(loc('https://nexorasolution.online/logo-512.png').location, 'https://nexorasolution.us/logo-512.png')
})

test('www on the new domain redirects to the apex', () => {
  assert.equal(loc('https://www.nexorasolution.us/about/').location, 'https://nexorasolution.us/about/')
})

test('canonical host is not redirected', () => {
  assert.equal(canonicalHostRedirect('https://nexorasolution.us/about/'), null)
  assert.equal(canonicalHostRedirect('http://localhost:5173/'), null)
  assert.equal(canonicalHostRedirect('https://nexora.rahanshah4.workers.dev/'), null)
})

test('search console verification files stay on the old host', () => {
  assert.equal(canonicalHostRedirect('https://nexorasolution.online/googlebace7425abb5dfdf.html'), null)
  assert.equal(canonicalHostRedirect('https://nexorasolution.online/.well-known/security.txt'), null)
  assert.equal(canonicalHostRedirect('https://www.nexorasolution.us/googlebace7425abb5dfdf.html').status, 301)
})
