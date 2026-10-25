import test from 'node:test'
import assert from 'node:assert/strict'
import { NOTES_MAX, chosenFixes, composeOrderNotes, fixChoices, scopeLine } from '../src/lib/geolintBrief.js'

const report = {
  url: 'https://www.example.com/',
  remediation: [
    { id: 'bluf', priority: 'high', title: '26 of 40 sections do not open with a direct answer', upTo: 11.3 },
    { id: 'src', priority: 'medium', title: 'Few outside sources are linked', upTo: 4 },
    { priority: 'odd', title: 'No id and an unknown priority' },
    { id: 'empty' },
  ],
}

test('fix choices come from the audit of the same site, with safe defaults', () => {
  const choices = fixChoices(report, 'example.com')
  assert.deepEqual(choices.map((c) => c.id), ['bluf', 'src', 'fix-3'])
  assert.equal(choices[2].priority, 'medium')
  assert.equal(choices[0].upTo, 11.3)
})

test('an audit of another site is never offered as the client\'s fixes', () => {
  assert.deepEqual(fixChoices(report, 'other.com'), [])
  assert.deepEqual(fixChoices(null, 'example.com'), [])
  assert.deepEqual(fixChoices({ remediation: 'x' }, 'example.com'), [])
})

test('scope says all, some or none, and names what must not be touched', () => {
  const choices = fixChoices(report, 'example.com')
  assert.equal(scopeLine(choices, []), 'Fix scope: all 3 fixes from the audit')
  assert.match(scopeLine(choices, ['src']), /2 of 3 fixes\. Do NOT touch: Few outside sources are linked/)
  assert.match(scopeLine(choices, choices.map((c) => c.id)), /none of the 3/)
  assert.equal(scopeLine([], []), 'Fix scope: everything the audit finds')
  assert.equal(chosenFixes(choices, ['bluf']).length, 2)
})

test('the notes carry every answer and never pass 1000 characters', () => {
  const choices = fixChoices(report, 'example.com')
  const text = composeOrderNotes({ market: 'Pakistan', language: 'Urdu', business: 'We sell POS software.', audience: 'Restaurant owners', choices, off: ['src'], notes: 'Do not touch the blog.' })
  assert.match(text, /^Target market: Pakistan\nLanguage: Urdu\nBusiness: We sell POS software\.\nAudience: Restaurant owners\nFix scope: 2 of 3/m)
  assert.match(text, /Client notes: Do not touch the blog\.$/)
  const long = composeOrderNotes({ market: 'x'.repeat(500), language: 'y'.repeat(500), business: 'b'.repeat(5000), audience: 'a'.repeat(5000), choices: Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, title: 't'.repeat(160), priority: 'high', upTo: 0 })), off: Array.from({ length: 30 }, (_, i) => `f${i}`.slice(0)).slice(0, 15), notes: 'n'.repeat(5000) })
  assert.ok(long.length <= NOTES_MAX)
})

test('empty answers still give a valid, short note', () => {
  assert.equal(composeOrderNotes({}), 'Target market: Worldwide\nLanguage: English\nFix scope: everything the audit finds')
})
