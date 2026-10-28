import test from 'node:test'
import assert from 'node:assert/strict'
import { checkNewDeviceSignIn, describeDevice } from '../src/lib/deviceAlert.js'

function store() { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) } }
function deps({ known = new Map(), local = store(), session = store(), sent = [] } = {}) {
  return {
    local, session, sent, known, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605 Chrome/120 Safari/537', now: new Date('2026-10-28T15:30:00Z'),
    getKnown: async (uid, id) => known.has(`${uid}/${id}`),
    listKnown: async (uid) => [...known.keys()].filter((k) => k.startsWith(`${uid}/`)),
    setKnown: async (uid, id, data) => { known.set(`${uid}/${id}`, data) },
    sendEmail: async (mail) => { sent.push(mail); return { ok: true } },
  }
}
const user = { uid: 'u1', email: 'Me@Example.com', displayName: 'Ayesha Khan' }

test('the first device of an account is recorded without an email', async () => {
  const d = deps()
  const res = await checkNewDeviceSignIn(user, d)
  assert.deepEqual([res.isNew, res.emailed], [true, false])
  assert.equal(d.known.size, 1)
  assert.equal(d.sent.length, 0)
})

test('a second, unseen device sends the new sign-in email once', async () => {
  const known = new Map([['u1/other', {}]])
  const d = deps({ known })
  const res = await checkNewDeviceSignIn(user, d)
  assert.equal(res.emailed, true)
  assert.equal(d.sent.length, 1)
  assert.equal(d.sent[0].to, 'me@example.com')
  assert.equal(d.sent[0].type, 'new_device_login')
  assert.equal(d.sent[0].data.device, 'Mac')
  assert.equal(d.sent[0].data.browser, 'Chrome')
  assert.equal(d.sent[0].data.clientName, 'Ayesha')
  // same tab session: no second check
  assert.equal((await checkNewDeviceSignIn(user, d)).reason, 'already_checked')
  // new session on the same browser: it is known now, no email
  const d2 = deps({ known, local: d.local })
  assert.equal((await checkNewDeviceSignIn(user, d2)).isNew, false)
  assert.equal(d2.sent.length, 0)
})

test('user agent parsing', () => {
  assert.deepEqual(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604'), { device: 'iPhone or iPad', browser: 'Safari' })
  assert.deepEqual(describeDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120'), { device: 'Windows', browser: 'Microsoft Edge' })
  assert.deepEqual(describeDevice(''), { device: 'Unknown device', browser: 'Browser' })
})
