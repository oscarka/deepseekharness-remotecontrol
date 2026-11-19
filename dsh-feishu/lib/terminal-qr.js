// Zero-dependency ISO/IEC 18004 QR Code matrix builder & Unicode half-block terminal renderer
// Byte mode, ECC Level L, Versions 1-6 (supports up to 134 UTF-8 bytes — ideal for LAN/HTTPS pairing URLs)

const VERSION_SPECS = [
  null,
  { size: 21, totalCodewords: 26, ecCodewords: 7, dataBytes: 17, align: [] },
  { size: 25, totalCodewords: 44, ecCodewords: 10, dataBytes: 32, align: [6, 18] },
  { size: 29, totalCodewords: 70, ecCodewords: 15, dataBytes: 53, align: [6, 22] },
  { size: 33, totalCodewords: 100, ecCodewords: 20, dataBytes: 78, align: [6, 26] },
  { size: 37, totalCodewords: 134, ecCodewords: 26, dataBytes: 106, align: [6, 30] },
  { size: 41, totalCodewords: 172, ecCodewords: 36, dataBytes: 134, align: [6, 34] },
]

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i += 1) {
    const next = new Uint8Array(poly.length + 1)
    const factor = GF_EXP[i]
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], factor)
    }
    poly = next
  }
  return poly
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen)
  const rem = new Uint8Array(ecLen)
  for (let i = 0; i < data.length; i += 1) {
    const factor = data[i] ^ rem[0]
    for (let j = 0; j < ecLen - 1; j += 1) {
      rem[j] = rem[j + 1] ^ gfMul(gen[j + 1], factor)
    }
    rem[ecLen - 1] = gfMul(gen[ecLen], factor)
  }
  return rem
}

function encodeDataCodewords(utf8Bytes, spec) {
  const bits = []
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((val >>> i) & 1)
    }
  }
  // Byte mode indicator (0100) + 8-bit character count (Versions 1-9)
  pushBits(0b0100, 4)
  pushBits(utf8Bytes.length, 8)
  for (const b of utf8Bytes) pushBits(b, 8)
  const maxBits = (spec.totalCodewords - spec.ecCodewords) * 8
  for (let i = 0; i < 4 && bits.length < maxBits; i += 1) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)
  const codewords = new Uint8Array(maxBits / 8)
  for (let i = 0; i < bits.length / 8; i += 1) {
    let byte = 0
    for (let b = 0; b < 8; b += 1) byte = (byte << 1) | bits[i * 8 + b]
    codewords[i] = byte
  }
  const pads = [0xec, 0x11]
  for (let i = bits.length / 8, p = 0; i < codewords.length; i += 1, p ^= 1) {
    codewords[i] = pads[p]
  }
  if (spec.totalCodewords === 172) {
    const b1 = codewords.slice(0, 68)
    const b2 = codewords.slice(68, 136)
    const ec1 = rsEncode(b1, 18)
    const ec2 = rsEncode(b2, 18)
    const out = new Uint8Array(172)
    let idx = 0
    for (let i = 0; i < 68; i += 1) {
      out[idx++] = b1[i]
      out[idx++] = b2[i]
    }
    for (let i = 0; i < 18; i += 1) {
      out[idx++] = ec1[i]
      out[idx++] = ec2[i]
    }
    return out
  }
  const ec = rsEncode(codewords, spec.ecCodewords)
  const out = new Uint8Array(spec.totalCodewords)
  out.set(codewords, 0)
  out.set(ec, codewords.length)
  return out
}

/**
 * Build an ISO/IEC 18004 QR boolean matrix (`Int8Array[]` where 1 = dark module, 0 = light).
 * Returns `null` if payload exceeds Version 6-L (134 UTF-8 bytes).
 */
export function buildQrMatrix(text) {
  const utf8 = new TextEncoder().encode(String(text || ''))
  let version = 1
  while (version <= 6 && VERSION_SPECS[version].dataBytes < utf8.length) {
    version += 1
  }
  if (version > 6) return null

  const spec = VERSION_SPECS[version]
  const n = spec.size
  const grid = Array.from({ length: n }, () => new Int8Array(n))
  const reserved = Array.from({ length: n }, () => new Uint8Array(n))

  const setModule = (r, c, dark, isReserved = true) => {
    if (r < 0 || r >= n || c < 0 || c >= n) return
    grid[r][c] = dark ? 1 : 0
    if (isReserved) reserved[r][c] = 1
  }

  const placeFinder = (row, col) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const r = row + dr
        const c = col + dc
        if (r < 0 || r >= n || c < 0 || c >= n) continue
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
        const inRing = dr === 0 || dr === 6 || dc === 0 || dc === 6
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        setModule(r, c, inOuter && (inRing || inCore), true)
      }
    }
  }

  placeFinder(0, 0)
  placeFinder(0, n - 7)
  placeFinder(n - 7, 0)

  for (let i = 8; i < n - 8; i += 1) {
    setModule(6, i, i % 2 === 0, true)
    setModule(i, 6, i % 2 === 0, true)
  }

  for (const ar of spec.align) {
    for (const ac of spec.align) {
      if ((ar === 6 && ac === 6) || (ar === 6 && ac === n - 7) || (ar === n - 7 && ac === 6)) continue
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1
          setModule(ar + dr, ac + dc, dark, true)
        }
      }
    }
  }

  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = 1
      reserved[i][8] = 1
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][n - 1 - i] = 1
    reserved[n - 1 - i][8] = 1
  }
  setModule(n - 8, 8, true, true)

  // Data bits with mask 0 ((r + c) % 2 === 0)
  const codewords = encodeDataCodewords(utf8, spec)
  let bitIdx = 0
  const totalBits = codewords.length * 8
  let upward = true
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1
    for (let step = 0; step < n; step += 1) {
      const r = upward ? n - 1 - step : step
      for (let dc = 0; dc < 2; dc += 1) {
        const c = col - dc
        if (reserved[r][c]) continue
        let bit = 0
        if (bitIdx < totalBits) {
          bit = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1
          bitIdx += 1
        }
        if ((r + c) % 2 === 0) bit ^= 1
        grid[r][c] = bit
      }
    }
    upward = !upward
  }

  // Format info for ECC Level L (01) + Mask 0 (000): 0x77c4
  const formatBits = 0x77c4
  const fCoords1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ]
  for (let i = 0; i < 15; i += 1) {
    const bit = (formatBits >>> i) & 1
    const [r1, c1] = fCoords1[i]
    grid[r1][c1] = bit
    if (i < 8) {
      grid[8][n - 1 - i] = bit
    } else {
      grid[n - 15 + i][8] = bit
    }
  }

  return { version, size: n, grid }
}

/**
 * Render a compact, high-contrast Unicode half-block QR code for terminals.
 * Uses explicit ANSI black-on-white (\x1b[30;47m) by default so both dark and light
 * terminal themes produce crisp, instantly scannable phone QR codes.
 */
export function renderTerminalQr(
  text,
  { margin = 2, indent = '  ', useAnsi = true } = {},
) {
  const built = buildQrMatrix(text)
  if (!built) return ''
  const { size: n, grid } = built
  const total = n + margin * 2
  const isDark = (r, c) => {
    const gr = r - margin
    const gc = c - margin
    if (gr < 0 || gr >= n || gc < 0 || gc >= n) return 0
    return grid[gr][gc] ? 1 : 0
  }

  const prefix = useAnsi ? '\x1b[30;47m' : ''
  const suffix = useAnsi ? '\x1b[0m' : ''
  const lines = []
  for (let r = 0; r < total; r += 2) {
    let row = ''
    for (let c = 0; c < total; c += 1) {
      const top = isDark(r, c)
      const bot = r + 1 < total ? isDark(r + 1, c) : 0
      if (top && bot) row += '█'
      else if (top && !bot) row += '▀'
      else if (!top && bot) row += '▄'
      else row += ' '
    }
    lines.push(`${indent}${prefix}${row}${suffix}`)
  }
  return lines.join('\n')
}
