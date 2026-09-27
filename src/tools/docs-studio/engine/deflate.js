/**
 * Minimal raw DEFLATE (RFC 1951) in pure JS, no dependencies.
 *
 * Used for share links only when the runtime has no CompressionStream /
 * DecompressionStream('deflate-raw'). Output is standard deflate-raw, so a
 * link compressed by either path decodes with either path.
 *
 *   deflateRaw  LZ77 (hash chains, 32 KiB window) + the fixed Huffman code.
 *               Not zlib's ratio, but documents are small JSON.
 *   inflateRaw  full decoder (stored, fixed and dynamic blocks), with an
 *               output cap so a hostile link cannot expand without bound.
 */

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

const WINDOW = 32768
const MIN_MATCH = 3
const MAX_MATCH = 258
const MAX_CHAIN = 128

// ── Compressor ───────────────────────────────────────────────────────────────

function reverseBits(code, length) {
  let result = 0
  for (let i = 0; i < length; i++) {
    result = (result << 1) | (code & 1)
    code >>>= 1
  }
  return result
}

/** @param {Uint8Array} input @returns {Uint8Array} */
export function deflateRaw(input) {
  const bytes = []
  let acc = 0
  let accBits = 0
  const write = (value, bits) => {
    acc |= value << accBits
    accBits += bits
    while (accBits >= 8) {
      bytes.push(acc & 0xff)
      acc >>>= 8
      accBits -= 8
    }
  }
  const writeSymbol = (sym) => {
    if (sym < 144) write(reverseBits(0x30 + sym, 8), 8)
    else if (sym < 256) write(reverseBits(0x190 + sym - 144, 9), 9)
    else if (sym < 280) write(reverseBits(sym - 256, 7), 7)
    else write(reverseBits(0xc0 + sym - 280, 8), 8)
  }
  const writeMatch = (length, distance) => {
    let li = LENGTH_BASE.length - 1
    while (LENGTH_BASE[li] > length) li--
    writeSymbol(257 + li)
    if (LENGTH_EXTRA[li]) write(length - LENGTH_BASE[li], LENGTH_EXTRA[li])
    let di = DIST_BASE.length - 1
    while (DIST_BASE[di] > distance) di--
    write(reverseBits(di, 5), 5)
    if (DIST_EXTRA[di]) write(distance - DIST_BASE[di], DIST_EXTRA[di])
  }

  write(1, 1) // BFINAL
  write(1, 2) // BTYPE = fixed Huffman
  const n = input.length
  const head = new Int32Array(1 << 15).fill(-1)
  const prev = new Int32Array(Math.max(n, 1))
  const hash = (i) => ((input[i] << 10) ^ (input[i + 1] << 5) ^ input[i + 2]) & 0x7fff
  const insert = (p) => {
    if (p + 2 >= n) return
    const h = hash(p)
    prev[p] = head[h]
    head[h] = p
  }

  let i = 0
  while (i < n) {
    let bestLength = 0
    let bestDistance = 0
    if (i + 2 < n) {
      const max = Math.min(MAX_MATCH, n - i)
      let candidate = head[hash(i)]
      let chain = MAX_CHAIN
      while (candidate >= 0 && i - candidate <= WINDOW && chain-- > 0) {
        let length = 0
        while (length < max && input[candidate + length] === input[i + length]) length++
        if (length > bestLength) {
          bestLength = length
          bestDistance = i - candidate
          if (length === max) break
        }
        candidate = prev[candidate]
      }
    }
    if (bestLength >= MIN_MATCH) {
      writeMatch(bestLength, bestDistance)
      for (let k = 0; k < bestLength; k++) insert(i + k)
      i += bestLength
    } else {
      writeSymbol(input[i])
      insert(i)
      i += 1
    }
  }
  writeSymbol(256)
  if (accBits > 0) bytes.push(acc & 0xff)
  return Uint8Array.from(bytes)
}

// ── Decompressor ─────────────────────────────────────────────────────────────

function buildTree(lengths) {
  const counts = new Uint16Array(16)
  for (const length of lengths) counts[length]++
  counts[0] = 0
  const offsets = new Uint16Array(16)
  for (let len = 1; len < 16; len++) offsets[len] = offsets[len - 1] + counts[len - 1]
  const symbols = new Uint16Array(lengths.length)
  for (let sym = 0; sym < lengths.length; sym++) {
    if (lengths[sym]) symbols[offsets[lengths[sym]]++] = sym
  }
  return { counts, symbols }
}

let fixedTrees = null
function getFixedTrees() {
  if (!fixedTrees) {
    const lit = new Array(288)
    for (let i = 0; i < 288; i++) lit[i] = i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8
    fixedTrees = { lit: buildTree(lit), dist: buildTree(new Array(30).fill(5)) }
  }
  return fixedTrees
}

/**
 * @param {Uint8Array} input
 * @param {{ maxOutput?: number }} [options]
 * @returns {Uint8Array}
 * @throws {Error} on corrupt data or when output would exceed maxOutput
 */
export function inflateRaw(input, { maxOutput = 16 * 1024 * 1024 } = {}) {
  let pos = 0
  let bitBuf = 0
  let bitCount = 0
  let out = new Uint8Array(Math.min(Math.max(input.length * 4, 1024), maxOutput))
  let outLen = 0

  const bits = (need) => {
    while (bitCount < need) {
      if (pos >= input.length) throw new Error('inflate: unexpected end of data')
      bitBuf |= input[pos++] << bitCount
      bitCount += 8
    }
    const value = bitBuf & ((1 << need) - 1)
    bitBuf >>>= need
    bitCount -= need
    return value
  }
  const decode = (tree) => {
    let code = 0
    let first = 0
    let index = 0
    for (let len = 1; len < 16; len++) {
      code |= bits(1)
      const count = tree.counts[len]
      if (code - count < first) return tree.symbols[index + (code - first)]
      index += count
      first += count
      first <<= 1
      code <<= 1
    }
    throw new Error('inflate: invalid Huffman code')
  }
  const ensure = (extra) => {
    if (outLen + extra > maxOutput) throw new Error('inflate: output too large')
    if (outLen + extra <= out.length) return
    let size = out.length * 2
    while (size < outLen + extra) size *= 2
    const grown = new Uint8Array(Math.min(size, maxOutput))
    grown.set(out.subarray(0, outLen))
    out = grown
  }

  let final
  do {
    final = bits(1)
    const type = bits(2)
    if (type === 0) {
      bitBuf = 0
      bitCount = 0
      if (pos + 4 > input.length) throw new Error('inflate: truncated stored block')
      const len = input[pos] | (input[pos + 1] << 8)
      const nlen = input[pos + 2] | (input[pos + 3] << 8)
      if ((len ^ 0xffff) !== nlen) throw new Error('inflate: corrupt stored block')
      pos += 4
      if (pos + len > input.length) throw new Error('inflate: truncated stored block')
      ensure(len)
      out.set(input.subarray(pos, pos + len), outLen)
      outLen += len
      pos += len
      continue
    }
    let lit
    let dist
    if (type === 1) {
      ({ lit, dist } = getFixedTrees())
    } else if (type === 2) {
      const hlit = bits(5) + 257
      const hdist = bits(5) + 1
      const hclen = bits(4) + 4
      const clLengths = new Array(19).fill(0)
      for (let i = 0; i < hclen; i++) clLengths[CODE_LENGTH_ORDER[i]] = bits(3)
      const clTree = buildTree(clLengths)
      const lengths = []
      while (lengths.length < hlit + hdist) {
        const sym = decode(clTree)
        if (sym < 16) lengths.push(sym)
        else if (sym === 16) {
          if (!lengths.length) throw new Error('inflate: repeat with no previous length')
          const previous = lengths[lengths.length - 1]
          for (let r = 3 + bits(2); r > 0; r--) lengths.push(previous)
        } else if (sym === 17) {
          for (let r = 3 + bits(3); r > 0; r--) lengths.push(0)
        } else {
          for (let r = 11 + bits(7); r > 0; r--) lengths.push(0)
        }
      }
      if (lengths.length > hlit + hdist) throw new Error('inflate: too many code lengths')
      lit = buildTree(lengths.slice(0, hlit))
      dist = buildTree(lengths.slice(hlit))
    } else {
      throw new Error('inflate: invalid block type')
    }
    for (;;) {
      const sym = decode(lit)
      if (sym < 256) {
        ensure(1)
        out[outLen++] = sym
      } else if (sym === 256) {
        break
      } else {
        const li = sym - 257
        if (li >= LENGTH_BASE.length) throw new Error('inflate: invalid length symbol')
        const length = LENGTH_BASE[li] + bits(LENGTH_EXTRA[li])
        const di = decode(dist)
        if (di >= DIST_BASE.length) throw new Error('inflate: invalid distance symbol')
        const distance = DIST_BASE[di] + bits(DIST_EXTRA[di])
        if (distance > outLen) throw new Error('inflate: distance too far back')
        ensure(length)
        for (let k = 0; k < length; k++) {
          out[outLen] = out[outLen - distance]
          outLen += 1
        }
      }
    }
  } while (!final)
  return out.slice(0, outLen)
}
