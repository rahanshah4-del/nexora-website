import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDeployHookRequest,
  classifyBlogPostChange,
  classifyRedirectChange,
  decideRebuild,
  DEBOUNCE_MAX_WAIT_MS,
  DEBOUNCE_QUIET_MS,
} from '../functions/blogRebuildLogic.js'

const ts = (ms) => ({ toMillis: () => ms })
const post = (over = {}) => ({
  slug: 'a-post', title: 'A post', status: 'published', sections: [{ heading: 'H', paragraphs: ['p'] }],
  faqs: [], tags: ['x'], publishDate: ts(1000), createdAt: ts(500), updatedAt: ts(1000),
  createdBy: 'uid', createdByEmail: 'a@b.c', ...over,
})

test('draft-only writes are ignored', () => {
  assert.equal(classifyBlogPostChange(null, post({ status: 'draft' })).action, 'ignore')
  assert.equal(classifyBlogPostChange(post({ status: 'draft' }), post({ status: 'draft', title: 'New' })).action, 'ignore')
  assert.equal(classifyBlogPostChange(post({ status: 'draft' }), null).action, 'ignore')
})

test('publish, unpublish and delete are detected', () => {
  assert.equal(classifyBlogPostChange(null, post()).action, 'publish')
  assert.equal(classifyBlogPostChange(post({ status: 'draft' }), post()).action, 'publish')
  assert.equal(classifyBlogPostChange(post(), post({ status: 'draft' })).action, 'unpublish')
  assert.equal(classifyBlogPostChange(post(), null).action, 'delete')
})

test('published → published needs a real field change', () => {
  // Only bookkeeping fields moved: a no-op save.
  assert.equal(classifyBlogPostChange(post(), post({ updatedAt: ts(9999), createdByEmail: 'z@y.x' })).action, 'ignore')
  // Same instant in a different timestamp shape is still no change.
  assert.equal(classifyBlogPostChange(post(), post({ publishDate: { _seconds: 1, _nanoseconds: 0 } })).action, 'ignore')
  assert.equal(classifyBlogPostChange(post(), post({ title: 'Renamed' })).action, 'content-change')
  assert.equal(classifyBlogPostChange(post(), post({ sections: [{ heading: 'H', paragraphs: ['p', 'q'] }] })).action, 'content-change')
  assert.equal(classifyBlogPostChange(post(), post({ tags: ['y'] })).action, 'content-change')
  assert.equal(classifyBlogPostChange(post(), post({ publishDate: ts(2000) })).action, 'content-change')
})

test('redirect document changes', () => {
  assert.equal(classifyRedirectChange(null, { from: 'a', to: 'b' }).action, 'redirect-change')
  assert.equal(classifyRedirectChange({ from: 'a', to: 'b' }, { from: 'a', to: 'c' }).action, 'redirect-change')
  assert.equal(classifyRedirectChange({ from: 'a', to: 'b' }, null).action, 'redirect-change')
  assert.equal(classifyRedirectChange({ from: 'a', to: 'b' }, { from: 'a', to: 'b', createdAt: 1 }).action, 'ignore')
})

test('trailing debounce: waits while edits continue, fires when quiet', () => {
  const t0 = 1_000_000
  assert.equal(decideRebuild(null, t0), 'not-pending')
  assert.equal(decideRebuild({ pending: false, lastChangeAt: t0 }, t0 + DEBOUNCE_QUIET_MS), 'not-pending')
  // The task from an earlier edit runs while a later edit is still recent.
  assert.equal(decideRebuild({ pending: true, pendingSince: t0, lastChangeAt: t0 + 60_000 }, t0 + DEBOUNCE_QUIET_MS), 'wait')
  // The latest edit's task: quiet long enough.
  assert.equal(decideRebuild({ pending: true, pendingSince: t0, lastChangeAt: t0 + 60_000 }, t0 + 60_000 + DEBOUNCE_QUIET_MS), 'fire')
  // Early dispatch by a few seconds still fires.
  assert.equal(decideRebuild({ pending: true, pendingSince: t0, lastChangeAt: t0 }, t0 + DEBOUNCE_QUIET_MS - 3_000), 'fire')
  // Accepts Firestore Timestamps as well as numbers.
  assert.equal(decideRebuild({ pending: true, pendingSince: ts(t0), lastChangeAt: ts(t0) }, t0 + DEBOUNCE_QUIET_MS), 'fire')
})

test('trailing debounce: max wait stops continuous edits starving the build', () => {
  const t0 = 1_000_000
  const now = t0 + DEBOUNCE_MAX_WAIT_MS
  assert.equal(decideRebuild({ pending: true, pendingSince: t0, lastChangeAt: now - 10_000 }, now), 'fire')
})

// --- deploy hook request shape -------------------------------------------
// Account id and trigger uuid below are fabricated; the real ones only ever
// live inside the CF_DEPLOY_HOOK_URL secret.
const TRIGGER_URL = 'https://api.cloudflare.com/client/v4/accounts/acc123/builds/triggers/trig-uuid-456/builds'
const HOOK_URL = 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/hook789'
const PAGES_HOOK_URL = 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/pages-hook-abc'

test('builds trigger URL sends the Bearer token, JSON content type and branch body', () => {
  const req = buildDeployHookRequest(TRIGGER_URL, { token: 'cf-token', branch: 'main' })
  assert.equal(req.kind, 'builds-trigger')
  assert.equal(req.url, TRIGGER_URL)
  assert.equal(req.init.method, 'POST')
  assert.equal(req.init.headers.Authorization, 'Bearer cf-token')
  assert.equal(req.init.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(req.init.body), { branch: 'main' })
})

test('builds trigger honours a non-default branch and trims the token', () => {
  const req = buildDeployHookRequest(TRIGGER_URL, { token: '  spaced-token \n', branch: 'release' })
  assert.equal(req.init.headers.Authorization, 'Bearer spaced-token')
  assert.deepEqual(JSON.parse(req.init.body), { branch: 'release' })
})

test('builds trigger without a token fails before any request is made', () => {
  for (const token of [undefined, '', '   ']) {
    assert.throws(() => buildDeployHookRequest(TRIGGER_URL, { token }), /CF_API_TOKEN is empty/)
  }
})

test('deploy hook URL is a bare POST — no auth header, no body', () => {
  const req = buildDeployHookRequest(HOOK_URL, { token: 'cf-token' })
  assert.equal(req.kind, 'deploy-hook')
  assert.equal(req.init.method, 'POST')
  assert.equal(req.init.headers, undefined)
  assert.equal(req.init.body, undefined)
})

test('deploy hook needs no token at all', () => {
  assert.equal(buildDeployHookRequest(HOOK_URL).kind, 'deploy-hook')
})

test('only https api.cloudflare.com is accepted', () => {
  const rejected = [
    'https://evil.example.com/client/v4/workers/builds/deploy_hooks/x',
    'http://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/x',
    'https://api.cloudflare.com.evil.example/client/v4/workers/builds/deploy_hooks/x',
  ]
  for (const url of rejected) {
    assert.throws(() => buildDeployHookRequest(url, { token: 't' }), /not a https:\/\/api\.cloudflare\.com\/ URL/)
  }
  assert.throws(() => buildDeployHookRequest('not-a-url', { token: 't' }), /not a valid URL/)
  assert.throws(() => buildDeployHookRequest('', { token: 't' }), /not a valid URL/)
})

test('every other path on the host falls through to a bare POST', () => {
  // An earlier allowlist accepted only two guessed path shapes and threw on the
  // rest. A real Pages deploy hook is one of the shapes it threw on, which took
  // the rebuild down in production. The host is the boundary; a path only has to
  // not be a builds trigger to be posted to as-is.
  const passthrough = [
    PAGES_HOOK_URL,
    // Builds-trigger-ish but not the real shape: no token, so no bearer either.
    'https://api.cloudflare.com/client/v4/accounts/acc123/workers/builds/triggers/trig-uuid-456/builds',
    'https://api.cloudflare.com/client/v4/accounts/acc123/builds/triggers/trig-uuid-456',
    'https://api.cloudflare.com/',
  ]
  for (const url of passthrough) {
    const req = buildDeployHookRequest(url, { token: 'cf-token' })
    assert.equal(req.kind, 'deploy-hook', url)
    assert.equal(req.url, url)
    assert.equal(req.init.method, 'POST')
    assert.equal(req.init.headers, undefined, `${url} must not carry an auth header`)
    assert.equal(req.init.body, undefined, `${url} must not carry a body`)
  }
})

test('a value pasted more than once is rejected as a config error', () => {
  // The live secret once held its URL five times over with no separator. That
  // parses — the extra copies become path segments — so it reached Cloudflare
  // and came back 401, pointing at auth rather than at the real cause.
  // Fabricated hook id; the real one only lives in CF_DEPLOY_HOOK_URL.
  const once = 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/fake-hook-id'
  for (const n of [2, 3, 5]) {
    assert.throws(() => buildDeployHookRequest(once.repeat(n), { token: 'cf-token' }), /pasted more than once/)
  }
  // Mixed schemes count too, not just a repeat of the same string.
  assert.throws(
    () => buildDeployHookRequest(`${once}http://evil.example/x`, { token: 'cf-token' }),
    /pasted more than once/,
  )
  // A single copy is still a perfectly good bare-POST deploy hook.
  const req = buildDeployHookRequest(once)
  assert.equal(req.kind, 'deploy-hook')
  assert.equal(req.init.headers, undefined)
})

test('failure messages never leak the hook URL or the token', () => {
  const secrets = ['acc123', 'trig-uuid-456', 'hook789', 'pages-hook-abc', 'cf-token']
  const bad = [
    ['https://evil.example.com/client/v4/pages/webhooks/deploy_hooks/pages-hook-abc', 'cf-token', 'main'],
    [TRIGGER_URL.repeat(2), 'cf-token', 'main'],
    ['https://api.cloudflare.com.evil.example/client/v4/workers/builds/deploy_hooks/hook789', 'cf-token', 'main'],
    ['not-a-url-hook789', 'cf-token', 'main'],
    [TRIGGER_URL, '', 'main'],
    [TRIGGER_URL, 'cf-token', ''],
  ]
  for (const [url, token, branch] of bad) {
    let message = null
    try {
      buildDeployHookRequest(url, { token, branch })
    } catch (err) {
      message = err.message
    }
    assert.ok(message, `expected ${url} to be rejected`)
    for (const secret of secrets) assert.ok(!message.includes(secret), `leaked ${secret}: ${message}`)
  }
})
