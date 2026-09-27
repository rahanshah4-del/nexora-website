/**
 * Exact money arithmetic for Docs Studio.
 *
 * Every amount is an integer count of the currency's minor unit (cents, fils,
 * yen…). Quantities and percentages are scaled integers too, so no value the
 * engine calculates with is ever a binary float:
 *
 *   amount_minor  integer minor units          $12.34        → 1234
 *   qty_milli     quantity × 1000              2.5 hours     → 2500
 *   rate_micro    fraction × 1 000 000         7.25 %        → 72500
 *
 * Products of those are computed in BigInt (a price × a quantity × a rate
 * overflows 2^53 long before any real invoice does in minor units), rounded
 * once, and handed back as plain Numbers.
 */

export const QTY_SCALE = 1000n
export const RATE_ONE = 1_000_000n

/** @typedef {'half_up' | 'half_even'} RoundingMode */

/** @type {RoundingMode[]} */
export const ROUNDING_MODES = ['half_up', 'half_even']

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

export function absBig(value) {
  return value < 0n ? -value : value
}

export function gcd(a, b) {
  let x = absBig(a)
  let y = absBig(b)
  while (y) [x, y] = [y, x % y]
  return x
}

export function lcm(a, b) {
  if (!a || !b) return 0n
  return absBig(a / gcd(a, b) * b)
}

/** Floor division (toward −∞) for BigInt; `den` must be positive. */
export function floorDiv(num, den) {
  const q = num / den
  return (num % den !== 0n && num < 0n) ? q - 1n : q
}

/**
 * num / den rounded to an integer. half_up rounds ties away from zero
 * (commercial rounding, symmetric for credits); half_even rounds ties to the
 * even neighbour (banker's rounding).
 * @param {bigint} num
 * @param {bigint} den  non-zero
 * @param {RoundingMode} [mode]
 */
export function roundDiv(num, den, mode = 'half_up') {
  if (den === 0n) throw new RangeError('roundDiv: division by zero')
  if (den < 0n) { num = -num; den = -den }
  const negative = num < 0n
  const n = negative ? -num : num
  let q = n / den
  const twiceRemainder = (n % den) * 2n
  if (twiceRemainder > den || (twiceRemainder === den && (mode !== 'half_even' || q % 2n === 1n))) q += 1n
  return negative ? -q : q
}

/** Rounds `value` to the nearest multiple of `increment` (cash rounding). */
export function roundToIncrement(value, increment, mode = 'half_up') {
  if (!increment || increment <= 0n) return value
  return roundDiv(value, increment, mode) * increment
}

/**
 * Integers a_i with Σa_i === target, each within one unit of the exact value
 * n_i / d_i (largest-remainder method). Fractions may have different
 * denominators and either sign; they are brought to a common denominator
 * first. When the target is further than one unit per part from the exact
 * sum (callers pass clamped targets), the surplus keeps cycling through the
 * parts in remainder order, so the sum still always matches.
 * @param {{ n: bigint, d: bigint }[]} fractions  d > 0
 * @param {bigint} target
 * @returns {bigint[]}
 */
export function apportion(fractions, target) {
  if (!fractions.length) return []
  const common = fractions.reduce((acc, f) => lcm(acc, f.d), 1n)
  const parts = fractions.map((f, index) => {
    const n = f.n * (common / f.d)
    const floor = floorDiv(n, common)
    return { index, floor, remainder: n - floor * common }
  })
  let extra = target - parts.reduce((sum, p) => sum + p.floor, 0n)
  const result = parts.map((p) => p.floor)
  const byRemainder = [...parts].sort((a, b) => (b.remainder === a.remainder ? a.index - b.index : (b.remainder > a.remainder ? 1 : -1)))
  let i = 0
  while (extra > 0n) {
    result[byRemainder[i % byRemainder.length].index] += 1n
    extra -= 1n
    i += 1
  }
  i = byRemainder.length - 1
  while (extra < 0n) {
    const idx = byRemainder[((i % byRemainder.length) + byRemainder.length) % byRemainder.length].index
    result[idx] -= 1n
    extra += 1n
    i -= 1
  }
  return result
}

/**
 * Splits `total` across non-negative integer `weights` in proportion, with
 * the parts summing exactly to `total`. All-zero weights split evenly.
 * @param {bigint} total
 * @param {bigint[]} weights
 */
export function allocate(total, weights) {
  if (!weights.length) return []
  const sum = weights.reduce((acc, w) => acc + (w > 0n ? w : 0n), 0n)
  if (sum === 0n) return apportion(weights.map(() => ({ n: total, d: BigInt(weights.length) })), total)
  return apportion(weights.map((w) => ({ n: total * (w > 0n ? w : 0n), d: sum })), total)
}

/**
 * Coerces a stored amount to BigInt. Never throws: anything that is not a
 * safe integer is reported through `onIssue` and replaced (rounded, or 0).
 * @param {unknown} value
 * @param {(code: string) => void} [onIssue]
 * @returns {bigint}
 */
export function toBigInt(value, onIssue) {
  if (typeof value === 'bigint') return value
  if (value === null || value === undefined || value === '') return 0n
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value)) return BigInt(value)
    if (Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      onIssue?.('non_integer_amount')
      return BigInt(Math.round(value))
    }
    onIssue?.('invalid_number')
    return 0n
  }
  if (typeof value === 'string' && /^-?\d{1,30}$/.test(value.trim())) return BigInt(value.trim())
  onIssue?.('invalid_number')
  return 0n
}

/**
 * BigInt → Number for results. Values beyond ±2^53 cannot be represented
 * exactly; they are reported through `onIssue` rather than silently rounded.
 */
export function toSafeNumber(value, onIssue) {
  if (value > MAX_SAFE || value < -MAX_SAFE) onIssue?.('amount_overflow')
  return Number(value)
}

/** Scaled integer → plain decimal string: (123456n, 3) → "123.456". */
export function scaledToDecimalString(value, digits) {
  const big = typeof value === 'bigint' ? value : BigInt(Math.trunc(Number(value) || 0))
  const negative = big < 0n
  const s = (negative ? -big : big).toString().padStart(digits + 1, '0')
  const intPart = digits ? s.slice(0, -digits) : s
  const fracPart = digits ? s.slice(-digits) : ''
  return `${negative ? '-' : ''}${intPart}${fracPart ? `.${fracPart}` : ''}`
}

/**
 * Parses a plain decimal string ("12.345", "-0.5", ".25") into an integer
 * scaled by 10^digits. Extra fractional digits are rounded with `mode`.
 * Returns null for anything that is not a plain decimal.
 * @param {string} input
 * @param {number} digits
 * @param {RoundingMode} [mode]
 * @returns {bigint | null}
 */
export function parseScaledDecimal(input, digits, mode = 'half_up') {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(String(input ?? '').trim())
  if (!match || (!match[2] && !match[3])) return null
  const [, sign, intPart, fracPart = ''] = match
  const scale = 10n ** BigInt(digits)
  const fracScale = 10n ** BigInt(fracPart.length)
  const numerator = BigInt(intPart || '0') * fracScale + BigInt(fracPart || '0')
  const scaled = roundDiv(numerator * scale, fracScale, mode)
  return sign === '-' ? -scaled : scaled
}

/** "7.25" (percent) → 72500 rate_micro. Null when not a number. */
export function percentToMicro(input) {
  const value = parseScaledDecimal(input, 4)
  return value === null ? null : Number(value)
}

/** 72500 rate_micro → "7.25" (percent, trailing zeros trimmed). */
export function microToPercentString(rateMicro) {
  return trimZeros(scaledToDecimalString(BigInt(Math.trunc(Number(rateMicro) || 0)), 4))
}

/** "2.5" → 2500 qty_milli. Null when not a number. */
export function quantityToMilli(input) {
  const value = parseScaledDecimal(input, 3)
  return value === null ? null : Number(value)
}

/** 2500 qty_milli → "2.5". */
export function milliToQuantityString(qtyMilli) {
  return trimZeros(scaledToDecimalString(BigInt(Math.trunc(Number(qtyMilli) || 0)), 3))
}

function trimZeros(decimal) {
  return decimal.includes('.') ? decimal.replace(/\.?0+$/, '') : decimal
}
