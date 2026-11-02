import test from 'node:test'
import assert from 'node:assert/strict'
import { classKey, classNames, computeStudentFees, findStructure, monthlyFeeOf, normalizeStructure, siblingRanks } from '../src/crm/lib/schoolFees.js'

const structure = {
  className: 'Grade 5',
  fees: [
    { head: 'Tuition Fee', amount: 5000, frequency: 'monthly' },
    { head: 'Transport Fee', amount: 2000, frequency: 'monthly' },
    { head: 'Annual Charges', amount: 3000, frequency: 'annual' },
  ],
}

test('classes match however they are typed', () => {
  assert.equal(classKey('  Grade   5 '), 'grade 5')
  assert.equal(findStructure([structure], 'grade 5')?.className, 'Grade 5')
  assert.equal(findStructure([structure], 'Grade 6'), null)
})

test('no structure means nothing is charged and the caller is told', () => {
  const r = computeStudentFees({ student: {}, structure: null })
  assert.equal(r.missingStructure, true)
  assert.equal(r.net, 0)
})

test('plain student pays every head; monthly view leaves out yearly heads', () => {
  const r = computeStudentFees({ student: {}, structure })
  assert.equal(r.gross, 10000)
  assert.equal(r.net, 10000)
  assert.equal(monthlyFeeOf({ student: {}, structure }).net, 7000)
})

test('percent scholarship hits tuition only by default; fixed concession is capped at the head', () => {
  const concessions = [
    { id: 'a', name: 'Merit 20%', kind: 'scholarship', type: 'percent', value: 20, heads: 'tuition' },
    { id: 'b', name: 'Big grant', kind: 'custom', type: 'fixed', value: 99999, heads: 'all' },
  ]
  const a = computeStudentFees({ student: { concessionIds: ['a'] }, structure, concessions })
  assert.equal(a.lines[0].discount, 1000)
  assert.equal(a.lines[1].discount, 0)
  assert.equal(a.net, 9000)
  const b = computeStudentFees({ student: { concessionIds: ['b'] }, structure, concessions })
  assert.equal(b.net, 0) // never negative
  assert.ok(b.lines.every((l) => l.net === 0))
})

test('discounts stack on one head but never go past the head amount', () => {
  const concessions = [
    { id: 'a', name: 'A', type: 'percent', value: 60, heads: 'tuition' },
    { id: 'b', name: 'B', type: 'percent', value: 60, heads: 'tuition' },
  ]
  const r = computeStudentFees({ student: { concessionIds: ['a', 'b'] }, structure, concessions })
  assert.equal(r.lines[0].discount, 5000)
  assert.equal(r.lines[0].net, 0)
})

test('brothers and sisters are found by parent phone; the sibling rule gives child #2 and #3 their discount', () => {
  const students = [
    { id: 's3', admissionNo: '30', parentPhone: '0300-1234567' },
    { id: 's1', admissionNo: '10', parentPhone: '03001234567' },
    { id: 's2', admissionNo: '20', parentPhone: '+92 300 1234567' },
    { id: 'x', admissionNo: '11', parentPhone: '03119999999' },
    { id: 'n', admissionNo: '12', parentPhone: '' },
  ]
  const ranks = siblingRanks(students)
  assert.deepEqual([ranks.s1, ranks.s2, ranks.s3, ranks.x, ranks.n], [1, 2, 3, 1, 1])
  const concessions = [{ id: 'sib', kind: 'sibling', secondPercent: 10, thirdPlusPercent: 20, heads: 'tuition' }]
  assert.equal(computeStudentFees({ student: {}, structure, concessions, siblingRank: 1 }).discount, 0)
  assert.equal(computeStudentFees({ student: {}, structure, concessions, siblingRank: 2 }).discount, 500)
  const third = computeStudentFees({ student: {}, structure, concessions, siblingRank: 3 })
  assert.equal(third.discount, 1000)
  assert.match(third.applied[0].name, /child #3/)
})

test('class list is ordered naturally and has no duplicates', () => {
  const names = classNames([{ className: 'Grade 10' }, { className: 'Grade 2' }], [{ className: 'grade 2' }, { className: 'Nursery' }, { className: 'KG' }])
  assert.deepEqual(names, ['Nursery', 'KG', 'Grade 2', 'Grade 10'])
})

test('structure rows are cleaned', () => {
  const n = normalizeStructure({ className: ' Grade 1 ', fees: [{ head: ' ', amount: 10 }, { name: 'Tuition', amount: '4500.6', frequency: 'weird' }] })
  assert.deepEqual(n.fees, [{ head: 'Tuition', amount: 4501, frequency: 'monthly' }])
})
