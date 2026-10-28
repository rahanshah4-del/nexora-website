import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareWithPrevious, speedKey } from '../src/lib/geolintSpeedHistory.js'

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }
const res = (at, s) => ({ testedAt: at, mobile: { score: s }, desktop: null })

test('keys ignore www, case, scheme and trailing slash', () => {
  assert.equal(speedKey('https://www.Example.com/Shop/'), speedKey('example.com/shop'))
  assert.notEqual(speedKey('example.com/a'), speedKey('example.com/b'))
})

test('the second test is compared with the first; a repeated result is not pushed into the past', () => {
  const st = mem()
  assert.equal(compareWithPrevious('x.com', res('t1', 41), st).before, null)
  const second = compareWithPrevious('x.com', res('t2', 72), st)
  assert.equal(second.before.mobile.score, 41)
  assert.equal(second.after.mobile.score, 72)
  const repeat = compareWithPrevious('x.com', res('t2', 72), st)
  assert.equal(repeat.before.mobile.score, 41)
  assert.equal(compareWithPrevious('x.com', res('t3', 90), st).before.mobile.score, 72)
})

test('blocked storage still returns the result', () => {
  const broken = { getItem: () => { throw new Error('no') }, setItem: () => { throw new Error('no') } }
  assert.deepEqual(compareWithPrevious('x.com', res('t1', 50), broken), { before: null, after: res('t1', 50) })
  assert.equal(compareWithPrevious('x.com', res('t1', 50), null).before, null)
})
