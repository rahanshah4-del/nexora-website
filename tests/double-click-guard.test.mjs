import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldDropEvent, isOnceButtonLabel, installDoubleClickGuard, FORM_WINDOW_MS } from '../src/lib/doubleClickGuard.js'
import { runOnce, flightKey } from '../src/lib/singleFlight.js'

function fakeDoc() {
  const handlers = {}
  return {
    handlers,
    addEventListener(type, fn) { handlers[type] = fn },
    removeEventListener(type) { delete handlers[type] },
  }
}
function evt(target) {
  return { target, prevented: false, stopped: false, preventDefault() { this.prevented = true }, stopImmediatePropagation() { this.stopped = true } }
}
const btn = (text) => ({ disabled: false, textContent: text, hasAttribute: () => false, getAttribute: () => null, closest() { return this } })

test('shouldDropEvent only inside the window', () => {
  assert.equal(shouldDropEvent(undefined, 1000, 600), false)
  assert.equal(shouldDropEvent(1000, 1300, 600), true)
  assert.equal(shouldDropEvent(1000, 1600, 600), false)
})

test('action labels are guarded, steppers and Add are not', () => {
  for (const l of ['Save', 'Pay now', 'Place order', 'Confirm payment', 'Delete', 'Create invoice']) assert.equal(isOnceButtonLabel(l), true, l)
  for (const l of ['+', '-', 'Add to cart', 'Next', 'Cancel']) assert.equal(isOnceButtonLabel(l), false, l)
})

test('second submit of the same form is dropped, a later one passes', () => {
  const doc = fakeDoc(); let t = 1000
  installDoubleClickGuard(doc, () => t)
  const form = {}
  const a = evt(form); doc.handlers.submit(a); assert.equal(a.prevented, false)
  t += 200
  const b = evt(form); doc.handlers.submit(b); assert.equal(b.prevented && b.stopped, true)
  t += FORM_WINDOW_MS + 50
  const c = evt(form); doc.handlers.submit(c); assert.equal(c.prevented, false)
})

test('double click on Save is dropped; a stepper is never dropped', () => {
  const doc = fakeDoc(); let t = 5000
  installDoubleClickGuard(doc, () => t)
  const save = btn('Save'); const plus = btn('+')
  const e1 = evt(save); doc.handlers.click(e1); assert.equal(e1.prevented, false)
  t += 100
  const e2 = evt(save); doc.handlers.click(e2); assert.equal(e2.stopped, true)
  const p1 = evt(plus), p2 = evt(plus); doc.handlers.click(p1); t += 50; doc.handlers.click(p2)
  assert.equal(p1.stopped || p2.stopped, false)
})

test('runOnce blocks the same key while in flight, allows other ids, releases after', async () => {
  let runs = 0; let release
  const slow = () => new Promise((r) => { release = r })
  const first = runOnce(flightKey('pay', ['A']), async () => { runs++; await slow() })
  const dup = evt({}); const blocked = await runOnce(flightKey('pay', ['A']), async () => { runs++ }, dup)
  assert.equal(blocked, undefined); assert.equal(dup.prevented, true); assert.equal(runs, 1)
  await runOnce(flightKey('pay', ['B']), async () => { runs++ })
  assert.equal(runs, 2)
  release(); await first
  await runOnce(flightKey('pay', ['A']), async () => { runs++ })
  assert.equal(runs, 3)
})

test('a thrown handler still releases the lock', async () => {
  await assert.rejects(runOnce('boom', async () => { throw new Error('x') }))
  let ran = false; await runOnce('boom', async () => { ran = true }); assert.equal(ran, true)
})
