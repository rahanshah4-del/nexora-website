/**
 * School fee maths (pure, no Firebase): class fee structures, discounts/scholarships and the sibling rule.
 *
 * Data (all per workspace):
 *   feeStructures  one doc per class:   { className, academicYear, fees: [{ head, amount, frequency }] }
 *   feeConcessions discounts:           { name, kind: 'scholarship'|'staff'|'custom'|'sibling', type: 'percent'|'fixed',
 *                                         value, heads: 'tuition'|'all' }, plus one { kind: 'sibling', secondPercent, thirdPlusPercent }
 *   customers      students:            { className, section, parentPhone, concessionIds: [...] }
 *
 * Discounts only ever reduce a fee head, never below zero, and every number is rounded to whole currency units.
 */

export const FEE_FREQUENCIES = [
  { value: 'monthly', label: 'Every month' },
  { value: 'term', label: 'Every term' },
  { value: 'annual', label: 'Once a year' },
  { value: 'one-time', label: 'One time (admission)' },
]

export const DEFAULT_FEE_HEADS = [
  { head: 'Tuition Fee', frequency: 'monthly' },
  { head: 'Transport Fee', frequency: 'monthly' },
  { head: 'Exam Fee', frequency: 'term' },
  { head: 'Annual Charges', frequency: 'annual' },
  { head: 'Admission Fee', frequency: 'one-time' },
]

export const money = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

const clean = (value) => String(value ?? '').trim()
const lower = (value) => clean(value).toLowerCase()

/** Same class however it was typed: "Grade 5", "grade  5" -> "grade 5". */
export const classKey = (value) => lower(value).replace(/\s+/g, ' ')

export function normalizeStructure(row = {}) {
  const fees = (Array.isArray(row.fees) ? row.fees : [])
    .map((fee) => ({
      head: clean(fee.head || fee.name),
      amount: money(fee.amount),
      frequency: FEE_FREQUENCIES.some((f) => f.value === fee.frequency) ? fee.frequency : 'monthly',
    }))
    .filter((fee) => fee.head)
  return {
    id: row.id || '',
    className: clean(row.className),
    academicYear: clean(row.academicYear),
    fees,
  }
}

export function findStructure(structures = [], className) {
  const key = classKey(className)
  if (!key) return null
  return structures.map(normalizeStructure).find((s) => classKey(s.className) === key) || null
}

/** Which heads does a concession touch? 'tuition' = heads whose name contains "tuition"; 'all'; or a list of head names. */
function appliesToHead(concession, head) {
  const target = concession.heads ?? 'tuition'
  if (target === 'all') return true
  if (Array.isArray(target)) return target.some((name) => lower(name) === lower(head))
  if (target === 'tuition') return lower(head).includes('tuition')
  return lower(target) === lower(head)
}

/** Percent or fixed discount of one concession on one head, based on the head's full amount. */
function discountOn(concession, amount) {
  if (concession.type === 'fixed') return money(concession.value)
  return Math.round((amount * Math.min(100, Math.max(0, Number(concession.value) || 0))) / 100)
}

export const siblingRuleOf = (concessions = []) => concessions.find((c) => c.kind === 'sibling') || null

/**
 * Brothers and sisters are students who share a parent phone number. The eldest admission (then earliest created)
 * is #1, the next #2, and so on. Returns { [studentId]: rank } for every student (a lone child is rank 1).
 */
export function siblingRanks(students = []) {
  const phone = (s) => clean(s.parentPhone || s.phone).replace(/\D/g, '').replace(/^0+/, '').slice(-10)
  const groups = new Map()
  for (const s of students) {
    const key = phone(s)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  }
  const ranks = {}
  for (const s of students) ranks[s.id] = 1
  const order = (s) => clean(s.admissionNo).padStart(12, '0') + '|' + String(s.createdAt?.seconds ?? s.createdAt ?? '')
  for (const group of groups.values()) {
    group.sort((a, b) => order(a).localeCompare(order(b)))
    group.forEach((s, index) => { ranks[s.id] = index + 1 })
  }
  return ranks
}

function siblingPercent(rule, rank) {
  if (!rule || rank < 2) return 0
  const pct = rank === 2 ? rule.secondPercent : rule.thirdPlusPercent ?? rule.secondPercent
  return Math.min(100, Math.max(0, Number(pct) || 0))
}

/**
 * What one student is charged. Result:
 *   { lines: [{ head, frequency, amount, discount, net }], gross, discount, net, applied: [{ name, amount }], missingStructure }
 * `concessionsOf` is the student's own concessionIds; the sibling rule is applied from the rank automatically.
 */
export function computeStudentFees({ student = {}, structure = null, concessions = [], siblingRank = 1, frequencies = null } = {}) {
  const base = structure ? normalizeStructure(structure) : null
  if (!base || !base.fees.length) {
    return { lines: [], gross: 0, discount: 0, net: 0, applied: [], missingStructure: true }
  }
  const assigned = (Array.isArray(student.concessionIds) ? student.concessionIds : [])
    .map((id) => concessions.find((c) => c.id === id && c.kind !== 'sibling'))
    .filter(Boolean)
  const rule = siblingRuleOf(concessions)
  const siblingPct = siblingPercent(rule, siblingRank)
  const siblingHeads = rule?.heads ?? 'tuition'

  const appliedTotals = new Map()
  const note = (name, amount) => { if (amount > 0) appliedTotals.set(name, (appliedTotals.get(name) || 0) + amount) }

  const lines = base.fees
    .filter((fee) => !frequencies || frequencies.includes(fee.frequency))
    .map((fee) => {
      let discount = 0
      for (const concession of assigned) {
        if (!appliesToHead(concession, fee.head)) continue
        const amount = Math.min(discountOn(concession, fee.amount), fee.amount - discount)
        discount += amount
        note(concession.name || 'Discount', amount)
      }
      if (siblingPct && appliesToHead({ heads: siblingHeads }, fee.head)) {
        const amount = Math.min(Math.round((fee.amount * siblingPct) / 100), fee.amount - discount)
        discount += amount
        note(`Sibling discount (child #${siblingRank})`, amount)
      }
      return { head: fee.head, frequency: fee.frequency, amount: fee.amount, discount, net: fee.amount - discount }
    })

  const gross = lines.reduce((sum, l) => sum + l.amount, 0)
  const discount = lines.reduce((sum, l) => sum + l.discount, 0)
  return {
    lines,
    gross,
    discount,
    net: gross - discount,
    applied: [...appliedTotals].map(([name, amount]) => ({ name, amount })),
    missingStructure: false,
  }
}

/** What a student pays every month (monthly heads only, after discounts). */
export function monthlyFeeOf(args) {
  return computeStudentFees({ ...args, frequencies: ['monthly'] })
}

/** Distinct class names from structures and students, in a natural order (Nursery, KG, Grade 1 ... Grade 10). */
export function classNames(structures = [], students = []) {
  const seen = new Map()
  for (const name of [...structures.map((s) => s.className), ...students.map((s) => s.className)]) {
    const key = classKey(name)
    if (key && !seen.has(key)) seen.set(key, clean(name))
  }
  const rank = (name) => {
    const n = lower(name)
    if (/(play|nursery|prep|pre-?k)/.test(n)) return [0, n]
    if (/(^|\s)kg|kinder/.test(n)) return [1, n]
    const digits = n.match(/\d+/)
    return digits ? [2 + Number(digits[0]) / 100, n] : [9, n]
  }
  return [...seen.values()].sort((a, b) => {
    const [ra, na] = rank(a)
    const [rb, nb] = rank(b)
    return ra - rb || na.localeCompare(nb)
  })
}
