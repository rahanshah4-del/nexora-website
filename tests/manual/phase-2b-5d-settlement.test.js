/**
 * Manual tests for Phase 2B-5D: Automatic Shift Settlement & Ledger Aggregation
 *
 * Run: node tests/manual/phase-2b-5d-settlement.test.js
 * From the project root: node tests/manual/phase-2b-5d-settlement.test.js
 */
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')

// Use createRequire for the project root
const projectRoot = rootDir

// Dynamic import with absolute paths for ESM
async function run() {
  const cashData = await import(path.join(projectRoot, 'src/crm/data/restaurantCashData.js').replace(/\\/g, '/'))
  const movData = await import(path.join(projectRoot, 'src/crm/data/restaurantCashMovementsData.js').replace(/\\/g, '/'))

  const {
    buildRestaurantCashSessionCloseData,
    calculateExpectedRestaurantCash,
    classifyRestaurantCashVariance,
    createRestaurantCashSessionRecord,
  } = cashData

  const {
    createRestaurantCashMovementRecord,
    validateRestaurantCashMovement,
    calculateRestaurantCashMovementTotals,
  } = movData

  /* ═══════════════════════════════════════════════════════════════
     SECTION 1 — VALIDATION TESTS (25 tests)
     ═══════════════════════════════════════════════════════════════ */

  let passed = 0
  let failed = 0

  function test(description, fn) {
    try {
      fn()
      passed++
      console.log(`  ✓ ${description}`)
    } catch (e) {
      failed++
      console.error(`  ✗ ${description}: ${e.message}`)
    }
  }

  console.log('\n═══ SECTION 1: VALIDATION TESTS ═══\n')

  test('1. buildRestaurantCashSessionCloseData computes correct expectedCash', () => {
    const r = buildRestaurantCashSessionCloseData({
      openingCash: 1000, cashSales: 5000, cashDeposits: 200,
      cashRefunds: 300, cashWithdrawals: 100, cashExpenses: 150, cashAdjustments: 50,
      actualClosingCash: 5700,
    })
    if (r.expectedCash !== 5700) throw new Error(`expected 5700, got ${r.expectedCash}`)
  })

  test('2. Correct variance: major_excess', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 7000 })
    if (r.varianceStatus !== 'major_excess') throw new Error(`expected major_excess, got ${r.varianceStatus}`)
  })

  test('3. Correct variance: major_short', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 5200 })
    if (r.varianceStatus !== 'major_short') throw new Error(`expected major_short, got ${r.varianceStatus}`)
  })

  test('4. Correct variance: balanced', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000 })
    if (r.varianceStatus !== 'balanced') throw new Error(`expected balanced, got ${r.varianceStatus}`)
  })

  test('5. Valid movement requires workspaceId', () => {
    const v = validateRestaurantCashMovement({ sessionId: 's1', cashierId: 'c1', type: 'deposit', amount: 100, reason: 'test' })
    if (v.valid) throw new Error('should be invalid without workspaceId')
  })

  test('6. Valid movement requires sessionId', () => {
    const v = validateRestaurantCashMovement({ workspaceId: 'w1', cashierId: 'c1', type: 'deposit', amount: 100, reason: 'test' })
    if (v.valid) throw new Error('should be invalid without sessionId')
  })

  test('7. Valid movement requires cashierId', () => {
    const v = validateRestaurantCashMovement({ workspaceId: 'w1', sessionId: 's1', type: 'deposit', amount: 100, reason: 'test' })
    if (v.valid) throw new Error('should be invalid without cashierId')
  })

  test('8. Valid movement requires reason', () => {
    const v = validateRestaurantCashMovement({ workspaceId: 'w1', sessionId: 's1', cashierId: 'c1', type: 'deposit', amount: 100 })
    if (v.valid) throw new Error('should be invalid without reason')
  })

  test('9. Valid deposit passes validation', () => {
    const v = validateRestaurantCashMovement({ workspaceId: 'w1', sessionId: 's1', cashierId: 'c1', type: 'deposit', amount: 100, reason: 'Bank deposit' })
    if (!v.valid) throw new Error(`should be valid: ${v.errors.join(', ')}`)
  })

  test('10. Open session has null settlement fields', () => {
    const r = createRestaurantCashSessionRecord({ workspaceId: 'w1', cashierId: 'c1', status: 'open', openingCash: 1000 })
    if (r.cashSales !== null) throw new Error(`cashSales should be null for open, got ${r.cashSales}`)
    if (r.averageSale !== null) throw new Error(`averageSale should be null for open`)
    if (r.largestSale !== null) throw new Error(`largestSale should be null for open`)
    if (r.largestRefund !== null) throw new Error(`largestRefund should be null for open`)
  })

  test('11. Closed session stores settlement fields', () => {
    const r = createRestaurantCashSessionRecord({
      workspaceId: 'w1', cashierId: 'c1', status: 'closed', openingCash: 1000,
      cashSales: 5000, cashRefunds: 200, averageSale: 250, largestSale: 1000, largestRefund: 200,
      expectedCash: 5700, actualClosingCash: 5700, cashDifference: 0, varianceStatus: 'balanced',
    })
    if (r.cashSales !== 5000) throw new Error(`cashSales should be 5000, got ${r.cashSales}`)
    if (r.averageSale !== 250) throw new Error(`averageSale should be 250, got ${r.averageSale}`)
    if (r.largestSale !== 1000) throw new Error(`largestSale should be 1000, got ${r.largestSale}`)
    if (r.largestRefund !== 200) throw new Error(`largestRefund should be 200, got ${r.largestRefund}`)
  })

  test('12. calculateExpectedRestaurantCash with full formula', () => {
    const r = calculateExpectedRestaurantCash({ openingCash: 1000, completedCashPayments: 5000, cashDeposits: 200, completedCashRefunds: 300, cashWithdrawals: 100, cashExpenses: 150, cashAdjustments: 50 })
    if (r !== 5700) throw new Error(`expected 5700, got ${r}`)
  })

  test('13. calculateExpectedRestaurantCash negative adjustments subtract', () => {
    const r = calculateExpectedRestaurantCash({ openingCash: 1000, completedCashPayments: 5000, cashAdjustments: -200 })
    if (r !== 5800) throw new Error(`expected 5800, got ${r}`)
  })

  test('14. calculateRestaurantCashMovementTotals aggregates correctly', () => {
    const t = calculateRestaurantCashMovementTotals([{ type: 'deposit', amount: 500 }, { type: 'deposit', amount: 300 }, { type: 'withdrawal', amount: 200 }])
    if (t.deposits !== 800) throw new Error(`deposits expected 800, got ${t.deposits}`)
    if (t.withdrawals !== 200) throw new Error(`withdrawals expected 200, got ${t.withdrawals}`)
  })

  test('15. classifyRestaurantCashVariance balanced on zero', () => {
    if (classifyRestaurantCashVariance(0) !== 'balanced') throw new Error('should be balanced')
  })

  test('16. classifyRestaurantCashVariance minor excess', () => {
    if (classifyRestaurantCashVariance(100) !== 'minor_excess') throw new Error('should be minor_excess')
  })

  test('17. classifyRestaurantCashVariance minor short', () => {
    if (classifyRestaurantCashVariance(-100) !== 'minor_short') throw new Error('should be minor_short')
  })

  test('18. classifyRestaurantCashVariance major excess', () => {
    if (classifyRestaurantCashVariance(600) !== 'major_excess') throw new Error('should be major_excess')
  })

  test('19. classifyRestaurantCashVariance major short', () => {
    if (classifyRestaurantCashVariance(-600) !== 'major_short') throw new Error('should be major_short')
  })

  test('20. Movement totals handles expenses', () => {
    const t = calculateRestaurantCashMovementTotals([{ type: 'expense', amount: 150 }, { type: 'expense', amount: 75 }])
    if (t.expenses !== 225) throw new Error(`expenses expected 225, got ${t.expenses}`)
  })

  test('21. Movement totals netMovements formula', () => {
    const t = calculateRestaurantCashMovementTotals([{ type: 'deposit', amount: 1000 }, { type: 'withdrawal', amount: 200 }, { type: 'expense', amount: 150 }, { type: 'adjustment', amount: -50 }])
    if (t.netMovements !== 600) throw new Error(`netMovements expected 600, got ${t.netMovements}`)
  })

  test('22. Empty movements return zeros', () => {
    const t = calculateRestaurantCashMovementTotals([])
    if (t.deposits !== 0 || t.withdrawals !== 0 || t.expenses !== 0 || t.adjustments !== 0) throw new Error('all should be 0')
  })

  test('23. Null movements no error', () => {
    const t = calculateRestaurantCashMovementTotals(null)
    if (t.deposits !== 0) throw new Error('should handle null')
  })

  test('24. Custom thresholds change classification', () => {
    const v = classifyRestaurantCashVariance(100, { thresholdMajor: 200, thresholdMinor: 50 })
    if (v !== 'minor_excess') throw new Error(`expected minor_excess, got ${v}`)
  })

  test('25. Classify balanced at threshold boundary (50)', () => {
    const v = classifyRestaurantCashVariance(50)
    if (v !== 'balanced') throw new Error(`expected balanced, got ${v}`)
  })

  /* ═══════════════════════════════════════════════════════════════
     SECTION 2 — SETTLEMENT TESTS (15 tests)
     ═══════════════════════════════════════════════════════════════ */

  console.log('\n═══ SECTION 2: SETTLEMENT TESTS ═══\n')

  test('26. Settlement expected cash correct with all values', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 5000, cashSales: 25000, cashDeposits: 1000, cashRefunds: 500, cashWithdrawals: 2000, cashExpenses: 3000, cashAdjustments: 0, actualClosingCash: 25500 })
    if (r.expectedCash !== 25500) throw new Error(`expected 25500, got ${r.expectedCash}`)
    if (r.cashDifference !== 0) throw new Error('should be balanced')
  })

  test('27. Settlement stores totalTransactions', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, totalTransactions: 25 })
    if (r.totalTransactions !== 25) throw new Error(`expected 25, got ${r.totalTransactions}`)
  })

  test('28. Settlement stores largestSale', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, totalTransactions: 20, averageSale: 250, largestSale: 1500, largestRefund: 0 })
    if (r.largestSale !== 1500) throw new Error(`expected 1500, got ${r.largestSale}`)
  })

  test('29. Settlement stores largestRefund', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, totalTransactions: 20, averageSale: 250, largestSale: 1500, largestRefund: 300 })
    if (r.largestRefund !== 300) throw new Error(`expected 300, got ${r.largestRefund}`)
  })

  test('30. Settlement includes settledBy', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, settledBy: 'user_abc' })
    if (r.settledBy !== 'user_abc') throw new Error(`expected user_abc, got ${r.settledBy}`)
  })

  test('31. Settlement includes managerApprovedBy', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, managerApprovedBy: 'Manager A' })
    if (r.managerApprovedBy !== 'Manager A') throw new Error()
  })

  test('32. Settlement includes notes', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, notes: 'All good' })
    if (r.notes !== 'All good') throw new Error()
  })

  test('33. Settlement status is closed', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000 })
    if (r.status !== 'closed') throw new Error(`expected closed, got ${r.status}`)
  })

  test('34. Cash movement type normalization', () => {
    const r = createRestaurantCashMovementRecord({ type: 'adj', amount: 100, reason: 'test' })
    if (r.type !== 'adjustment') throw new Error(`expected adjustment, got ${r.type}`)
  })

  test('35. Negative expense clamps to 0', () => {
    const r = createRestaurantCashMovementRecord({ type: 'expense', amount: -50, reason: 'test' })
    if (r.amount !== 0) throw new Error(`expected 0, got ${r.amount}`)
  })

  test('36. Adjustment allows negative amounts', () => {
    const r = createRestaurantCashMovementRecord({ type: 'adjustment', amount: -200, reason: 'correction' })
    if (r.amount !== -200) throw new Error(`expected -200, got ${r.amount}`)
  })

  test('37. "dep" normalizes to deposit', () => {
    const r = createRestaurantCashMovementRecord({ type: 'dep', amount: 100, reason: 'test' })
    if (r.type !== 'deposit') throw new Error(`expected deposit, got ${r.type}`)
  })

  test('38. "with" normalizes to withdrawal', () => {
    const r = createRestaurantCashMovementRecord({ type: 'with', amount: 100, reason: 'test' })
    if (r.type !== 'withdrawal') throw new Error(`expected withdrawal, got ${r.type}`)
  })

  test('39. "exp" normalizes to expense', () => {
    const r = createRestaurantCashMovementRecord({ type: 'exp', amount: 100, reason: 'test' })
    if (r.type !== 'expense') throw new Error(`expected expense, got ${r.type}`)
  })

  test('40. Unknown type defaults to deposit', () => {
    const r = createRestaurantCashMovementRecord({ type: 'unknown', amount: 100, reason: 'test' })
    if (r.type !== 'deposit') throw new Error(`expected deposit, got ${r.type}`)
  })

  /* ═══════════════════════════════════════════════════════════════
     SECTION 3 — RECONCILIATION TESTS (15 tests)
     ═══════════════════════════════════════════════════════════════ */

  console.log('\n═══ SECTION 3: RECONCILIATION TESTS ═══\n')

  test('41. Expected = opening + sales with no movements', () => {
    const r = calculateExpectedRestaurantCash({ openingCash: 1000, completedCashPayments: 5000 })
    if (r !== 6000) throw new Error(`expected 6000, got ${r}`)
  })

  test('42. Refunds reduce expected', () => {
    const r = calculateExpectedRestaurantCash({ openingCash: 1000, completedCashPayments: 5000, completedCashRefunds: 500 })
    if (r !== 5500) throw new Error(`expected 5500, got ${r}`)
  })

  test('43. Deposits increase expected', () => {
    const r = calculateExpectedRestaurantCash({ openingCash: 1000, completedCashPayments: 5000, cashDeposits: 1000 })
    if (r !== 7000) throw new Error(`expected 7000, got ${r}`)
  })

  test('44. Expenses decrease expected', () => {
    const r = calculateExpectedRestaurantCash({ openingCash: 1000, completedCashPayments: 5000, cashExpenses: 300 })
    if (r !== 5700) throw new Error(`expected 5700, got ${r}`)
  })

  test('45. All fields combined match formula', () => {
    const expected = 2000 + 15000 + 500 - 1000 - 2000 - 1000 + 300
    const r = calculateExpectedRestaurantCash({ openingCash: 2000, completedCashPayments: 15000, cashDeposits: 500, completedCashRefunds: 1000, cashWithdrawals: 2000, cashExpenses: 1000, cashAdjustments: 300 })
    if (r !== expected) throw new Error(`expected ${expected}, got ${r}`)
  })

  test('46. buildRestaurantCashSessionCloseData matches calculateExpectedRestaurantCash', () => {
    const input = { openingCash: 1000, cashSales: 5000, cashDeposits: 200, cashRefunds: 300, cashWithdrawals: 100, cashExpenses: 150, cashAdjustments: 50, actualClosingCash: 5700 }
    const closeData = buildRestaurantCashSessionCloseData(input)
    const formula = calculateExpectedRestaurantCash({ openingCash: 1000, completedCashPayments: 5000, cashDeposits: 200, completedCashRefunds: 300, cashWithdrawals: 100, cashExpenses: 150, cashAdjustments: 50 })
    if (closeData.expectedCash !== formula) throw new Error(`expected ${formula}, got ${closeData.expectedCash}`)
  })

  test('47. Difference is actual - expected', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6500 })
    if (r.cashDifference !== 500) throw new Error(`expected 500, got ${r.cashDifference}`)
  })

  test('48. Negative difference stays negative', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 5500 })
    if (r.cashDifference !== -500) throw new Error(`expected -500, got ${r.cashDifference}`)
  })

  test('49. Exact match is balanced', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 2000, actualClosingCash: 3000 })
    if (r.varianceStatus !== 'balanced') throw new Error(`expected balanced, got ${r.varianceStatus}`)
  })

  test('50. Minor difference within threshold is balanced', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6020 })
    if (r.varianceStatus !== 'balanced') throw new Error(`expected balanced, got ${r.varianceStatus}`)
  })

  test('51. Movement validation rejects amount 0 for non-adjustment', () => {
    const v = validateRestaurantCashMovement({ workspaceId: 'w1', sessionId: 's1', cashierId: 'c1', type: 'deposit', amount: 0, reason: 'test' })
    if (v.valid) throw new Error('should be invalid for zero amount')
  })

  test('52. Movement totals null returns zeros', () => {
    const t = calculateRestaurantCashMovementTotals(null)
    if (t.deposits !== 0) throw new Error()
  })

  test('53. Session close handles null openingCash', () => {
    const r = buildRestaurantCashSessionCloseData({ cashSales: 5000, actualClosingCash: 5000 })
    if (r.expectedCash !== 5000) throw new Error(`expected 5000, got ${r.expectedCash}`)
  })

  test('54. Session close clamps negative cashSales to 0', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: -500, actualClosingCash: 1000 })
    if (r.expectedCash !== 1000) throw new Error(`expected 1000, got ${r.expectedCash}`)
  })

  test('55. Negative adjustments reduce as expected', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, cashAdjustments: -200, actualClosingCash: 5800 })
    if (r.expectedCash !== 5800) throw new Error(`expected 5800, got ${r.expectedCash}`)
  })

  /* ═══════════════════════════════════════════════════════════════
     SECTION 4 — REPORT TESTS (15 tests)
     ═══════════════════════════════════════════════════════════════ */

  console.log('\n═══ SECTION 4: REPORT TESTS ═══\n')

  test('56. Session record includes all new fields', () => {
    const r = createRestaurantCashSessionRecord({ workspaceId: 'w1', cashierId: 'c1', status: 'closed', averageSale: 250, largestSale: 1000, largestRefund: 200 })
    if (r.averageSale !== 250) throw new Error(`expected 250, got ${r.averageSale}`)
    if (r.largestSale !== 1000) throw new Error(`expected 1000, got ${r.largestSale}`)
    if (r.largestRefund !== 200) throw new Error(`expected 200, got ${r.largestRefund}`)
  })

  test('57. Open session has null settlement fields', () => {
    const r = createRestaurantCashSessionRecord({ workspaceId: 'w1', cashierId: 'c1', status: 'open' })
    if (r.averageSale !== null) throw new Error()
    if (r.largestSale !== null) throw new Error()
    if (r.largestRefund !== null) throw new Error()
    if (r.totalTransactions !== null) throw new Error()
  })

  test('58. buildRestaurantCashSessionCloseData sets status closed', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000 })
    if (r.status !== 'closed') throw new Error()
  })

  test('59. Major excess at 501', () => {
    if (classifyRestaurantCashVariance(501) !== 'major_excess') throw new Error()
  })

  test('60. Minor excess at 100', () => {
    if (classifyRestaurantCashVariance(100) !== 'minor_excess') throw new Error()
  })

  test('61. Balanced at 50', () => {
    if (classifyRestaurantCashVariance(50) !== 'balanced') throw new Error()
  })

  test('62. Minor short at -100', () => {
    if (classifyRestaurantCashVariance(-100) !== 'minor_short') throw new Error()
  })

  test('63. Custom thresholds work', () => {
    if (classifyRestaurantCashVariance(100, { thresholdMajor: 200, thresholdMinor: 50 }) !== 'minor_excess') throw new Error()
  })

  test('64. Large major threshold', () => {
    if (classifyRestaurantCashVariance(1000, { thresholdMajor: 800 }) !== 'major_excess') throw new Error()
  })

  test('65. "adjust" normalizes to adjustment', () => {
    const r = createRestaurantCashMovementRecord({ type: 'adjust', amount: 100, reason: 'test' })
    if (r.type !== 'adjustment') throw new Error()
  })

  test('66. "wd" normalizes to withdrawal', () => {
    const r = createRestaurantCashMovementRecord({ type: 'wd', amount: 100, reason: 'test' })
    if (r.type !== 'withdrawal') throw new Error()
  })

  test('67. Session close totalTransactions floored', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, totalTransactions: 25.7 })
    if (r.totalTransactions !== 25) throw new Error(`expected 25, got ${r.totalTransactions}`)
  })

  test('68. totalTransactions negative floored to 0', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, totalTransactions: -5 })
    if (r.totalTransactions !== 0) throw new Error()
  })

  test('69. Manager approved by defaults to empty', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000 })
    if (r.managerApprovedBy !== '') throw new Error()
  })

  test('70. Notes defaults to empty', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000 })
    if (r.notes !== '') throw new Error()
  })

  /* ═══════════════════════════════════════════════════════════════
     SECTION 5 — DUPLICATE PREVENTION TESTS (15 tests)
     ═══════════════════════════════════════════════════════════════ */

  console.log('\n═══ SECTION 5: DUPLICATE PREVENTION TESTS ═══\n')

  test('71. Empty input to build returns zeros', () => {
    const r = buildRestaurantCashSessionCloseData({})
    if (r.expectedCash !== 0) throw new Error()
  })

  test('72. Deterministic movement records match', () => {
    const r1 = createRestaurantCashMovementRecord({ type: 'deposit', amount: 100, reason: 'test', sessionId: 's1', workspaceId: 'w1', cashierId: 'c1' })
    const r2 = createRestaurantCashMovementRecord({ type: 'deposit', amount: 100, reason: 'test', sessionId: 's1', workspaceId: 'w1', cashierId: 'c1' })
    if (JSON.stringify(r1) !== JSON.stringify(r2)) throw new Error('deterministic record mismatch')
  })

  test('73. Non-numeric openingCash handled', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 'abc', cashSales: 5000, actualClosingCash: 5000 })
    if (!Number.isFinite(r.expectedCash)) throw new Error('expectedCash must be finite')
  })

  test('74. null cashSales handled', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: null, actualClosingCash: 1000 })
    if (r.expectedCash !== 1000) throw new Error(`expected 1000, got ${r.expectedCash}`)
  })

  test('75. undefined cashRefunds handled', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000 })
    if (r.expectedCash !== 6000) throw new Error(`expected 6000, got ${r.expectedCash}`)
  })

  test('76. Negative cashDeposits clamped', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, cashDeposits: -200, actualClosingCash: 6000 })
    if (r.expectedCash !== 6000) throw new Error()
  })

  test('77. Negative cashExpenses clamped', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, cashExpenses: -100, actualClosingCash: 6000 })
    if (r.expectedCash !== 6000) throw new Error()
  })

  test('78. Negative cashAdjustments preserved', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, cashAdjustments: -200, actualClosingCash: 5800 })
    if (r.expectedCash !== 5800) throw new Error(`expected 5800, got ${r.expectedCash}`)
  })

  test('79. cashDifference preserves negative sign', () => {
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 5500 })
    if (r.cashDifference >= 0) throw new Error('difference should be negative')
  })

  test('80. settlementCompletedAt always set with closedAt', () => {
    const ts = new Date().toISOString()
    const r = buildRestaurantCashSessionCloseData({ openingCash: 1000, cashSales: 5000, actualClosingCash: 6000, closedAt: ts })
    if (!r.settlementCompletedAt) throw new Error('settlementCompletedAt should be set')
  })

  test('81. sessionId included in movement record', () => {
    const r = createRestaurantCashMovementRecord({ sessionId: 'sess_123', type: 'deposit', amount: 100, reason: 'test' })
    if (r.sessionId !== 'sess_123') throw new Error()
  })

  test('82. workspaceId included in movement record', () => {
    const r = createRestaurantCashMovementRecord({ workspaceId: 'w_abc', sessionId: 's1', type: 'deposit', amount: 100, reason: 'test' })
    if (r.workspaceId !== 'w_abc') throw new Error()
  })

  test('83. cashierId included in movement record', () => {
    const r = createRestaurantCashMovementRecord({ cashierId: 'c_user', sessionId: 's1', type: 'deposit', amount: 100, reason: 'test' })
    if (r.cashierId !== 'c_user') throw new Error()
  })

  test('84. Movement validation rejects invalid type', () => {
    const v = validateRestaurantCashMovement({ workspaceId: 'w1', sessionId: 's1', cashierId: 'c1', type: 'invalid', amount: 100, reason: 'test' })
    if (v.valid) throw new Error('should reject invalid type')
  })

  test('85. Negative adjustment passes validation', () => {
    const v = validateRestaurantCashMovement({ workspaceId: 'w1', sessionId: 's1', cashierId: 'c1', type: 'adjustment', amount: -100, reason: 'correction' })
    if (!v.valid) throw new Error(`adjustment validation should pass: ${v.errors.join(', ')}`)
  })

  /* ═══════════════════════════════════════════════════════════════
     SUMMARY
     ═══════════════════════════════════════════════════════════════ */

  console.log('\n═══════════════════════════════════════════════════════')
  console.log(`  ${passed} passed, ${failed} failed, ${passed + failed} total`)
  console.log('═══════════════════════════════════════════════════════\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
