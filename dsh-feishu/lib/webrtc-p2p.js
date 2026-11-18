import { createCipheriv, createDecipheriv, createECDH, createHash, createHmac, generateKeyPairSync, randomBytes, sign } from 'node:crypto'
import dgram from 'node:dgram'
import { open } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'

const STUN_MAGIC_COOKIE = 0x2112a442
const STUN_FINGERPRINT_XOR = 0x5354554e

const PUBLIC_STUN_SERVERS = [
  { host: 'stun.qq.com', port: 3478 },
  { host: 'stun.miwifi.com', port: 3478 },
  { host: 'stun.cloudflare.com', port: 3478 },
]

// Standard IEEE 802.3 CRC-32 table (for STUN FINGERPRINT)
const CRC32_IEEE_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

// Castagnoli CRC-32c table (polynomial 0x82F63B78, for SCTP RFC 4960)
const CRC32C_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0x82f63b78 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32Ieee(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC32_IEEE_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function crc32c(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC32C_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// ASN.1 DER helpers for self-signed ECDSA P-256 DTLS certificate
function derLen(len) {
  if (len < 128) return Buffer.from([len])
  if (len < 256) return Buffer.from([0x81, len])
  return Buffer.from([0x82, (len >>> 8) & 0xff, len & 0xff])
}

function derNode(tag, content) {
  return Buffer.concat([Buffer.from([tag]), derLen(content.length), content])
}

function formatUtcTimeDer(date) {
  const pad = n => String(n).padStart(2, '0')
  const yy = pad(date.getUTCFullYear() % 100)
  const mm = pad(date.getUTCMonth() + 1)
  const dd = pad(date.getUTCDate())
  const hh = pad(date.getUTCHours())
  const mi = pad(date.getUTCMinutes())
  const ss = pad(date.getUTCSeconds())
  return derNode(0x17, Buffer.from(`${yy}${mm}${dd}${hh}${mi}${ss}Z`, 'ascii'))
}

let cachedDtlsIdentity = null

export function getOrCreateDtlsIdentity() {
  const now = Date.now()
  if (cachedDtlsIdentity && now < cachedDtlsIdentity.expiresAt) {
    return cachedDtlsIdentity
  }
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' })

  const versionExplicit = derNode(0xa0, Buffer.from([0x02, 0x01, 0x02]))
  const serialBytes = randomBytes(8)
  serialBytes[0] &= 0x7f
  if (serialBytes[0] === 0) serialBytes[0] = 0x01
  const serialDer = derNode(0x02, serialBytes)

  // OID 1.2.840.10045.4.3.2 (ecdsa-with-SHA256) — RFC 5758 forbids NULL parameter
  const sigAlgDer = derNode(0x30, Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x04, 0x03, 0x02]))

  // CN=dsh-webrtc
  const cnAttr = derNode(
    0x30,
    Buffer.concat([
      Buffer.from([0x06, 0x03, 0x55, 0x04, 0x03]),
      derNode(0x0c, Buffer.from('dsh-webrtc', 'utf8')),
    ]),
  )
  const nameDer = derNode(0x30, derNode(0x31, cnAttr))
  const notBefore = new Date(now - 24 * 3600_000)
  const notAfter = new Date(now + 14 * 24 * 3600_000)
  const validityDer = derNode(0x30, Buffer.concat([formatUtcTimeDer(notBefore), formatUtcTimeDer(notAfter)]))

  const tbsDer = derNode(
    0x30,
    Buffer.concat([versionExplicit, serialDer, sigAlgDer, nameDer, validityDer, nameDer, spkiDer]),
  )
  const sigDer = sign('sha256', tbsDer, privateKey)
  const bitStringSig = derNode(0x03, Buffer.concat([Buffer.from([0x00]), sigDer]))
  const certDer = derNode(0x30, Buffer.concat([tbsDer, sigAlgDer, bitStringSig]))

  const rawHex = createHash('sha256').update(certDer).digest('hex').toUpperCase()
  const fingerprint = rawHex.match(/.{2}/g).join(':')

  cachedDtlsIdentity = {
    privateKey,
    publicKey,
    certDer,
    fingerprint,
    expiresAt: now + 7 * 24 * 3600_000,
  }
  return cachedDtlsIdentity
}

// TLS 1.2 PRF (P_SHA256, RFC 5246 Section 5)
function tls12Prf(secret, label, seed, outputLength) {
  const labelAndSeed = Buffer.concat([Buffer.from(label, 'ascii'), seed])
  let a = labelAndSeed
  const chunks = []
  let total = 0
  while (total < outputLength) {
    a = createHmac('sha256', secret).update(a).digest()
    const out = createHmac('sha256', secret).update(Buffer.concat([a, labelAndSeed])).digest()
    chunks.push(out)
    total += out.length
  }
  return Buffer.concat(chunks).subarray(0, outputLength)
}

function ipToBytesV4(ip) {
  const parts = String(ip).trim().split('.').map(n => Number.parseInt(n, 10))
  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n) || n < 0 || n > 255)) return null
  return Buffer.from(parts)
}

function pad4(buf) {
  const rem = buf.length % 4
  if (rem === 0) return buf
  return Buffer.concat([buf, Buffer.alloc(4 - rem)])
}

function buildStunAttr(type, valBuf) {
  const hdr = Buffer.allocUnsafe(4)
  hdr.writeUInt16BE(type, 0)
  hdr.writeUInt16BE(valBuf.length, 2)
  return Buffer.concat([hdr, pad4(valBuf)])
}

function encodeXorMappedAddressV4(address, port) {
  const ipBytes = ipToBytesV4(address)
  if (!ipBytes) return null
  const out = Buffer.allocUnsafe(8)
  out[0] = 0x00
  out[1] = 0x01 // IPv4
  out.writeUInt16BE((port ^ (STUN_MAGIC_COOKIE >>> 16)) & 0xffff, 2)
  const cookieBuf = Buffer.allocUnsafe(4)
  cookieBuf.writeUInt32BE(STUN_MAGIC_COOKIE, 0)
  for (let i = 0; i < 4; i += 1) {
    out[4 + i] = ipBytes[i] ^ cookieBuf[i]
  }
  return out
}

function appendStunIntegrityAndFingerprint(msgType, txId, attrBuffers, hmacKeyStr) {
  const bodyBeforeMi = Buffer.concat(attrBuffers)
  // Header length during MESSAGE-INTEGRITY calculation includes the 24-byte MI attribute
  const hdrForMi = Buffer.allocUnsafe(20)
  hdrForMi.writeUInt16BE(msgType, 0)
  hdrForMi.writeUInt16BE(bodyBeforeMi.length + 24, 2)
  hdrForMi.writeUInt32BE(STUN_MAGIC_COOKIE, 4)
  txId.copy(hdrForMi, 8, 0, 12)

  const hmac = createHmac('sha1', Buffer.from(hmacKeyStr, 'utf8'))
    .update(hdrForMi)
    .update(bodyBeforeMi)
    .digest()
  const miAttr = buildStunAttr(0x0008, hmac)

  // Header length during FINGERPRINT calculation includes MI (24B) + FINGERPRINT (8B)
  const hdrFinal = Buffer.allocUnsafe(20)
  hdrFinal.writeUInt16BE(msgType, 0)
  hdrFinal.writeUInt16BE(bodyBeforeMi.length + 24 + 8, 2)
  hdrFinal.writeUInt32BE(STUN_MAGIC_COOKIE, 4)
  txId.copy(hdrFinal, 8, 0, 12)

  const preFp = Buffer.concat([hdrFinal, bodyBeforeMi, miAttr])
  const fpVal = Buffer.allocUnsafe(4)
  fpVal.writeUInt32BE((crc32Ieee(preFp) ^ STUN_FINGERPRINT_XOR) >>> 0, 0)
  const fpAttr = buildStunAttr(0x8028, fpVal)
  return Buffer.concat([preFp, fpAttr])
}

function parseStunPacket(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 20) return null
  const msgType = buf.readUInt16BE(0)
  const msgLen = buf.readUInt16BE(2)
  const cookie = buf.readUInt32BE(4)
  if (cookie !== STUN_MAGIC_COOKIE || 20 + msgLen > buf.length) return null
  const txId = buf.subarray(8, 20)
  const attrs = []
  let off = 20
  const end = 20 + msgLen
  while (off + 4 <= end) {
    const aType = buf.readUInt16BE(off)
    const aLen = buf.readUInt16BE(off + 2)
    const valStart = off + 4
    const valEnd = valStart + aLen
    if (valEnd > end) break
    attrs.push({ type: aType, value: buf.subarray(valStart, valEnd) })
    off = valStart + Math.ceil(aLen / 4) * 4
  }
  return { msgType, txId, attrs }
}

function parseXorMappedAddressV4(valBuf) {
  if (!valBuf || valBuf.length < 8 || valBuf[1] !== 0x01) return null
  const xPort = valBuf.readUInt16BE(2)
  const port = (xPort ^ (STUN_MAGIC_COOKIE >>> 16)) & 0xffff
  const cookieBuf = Buffer.allocUnsafe(4)
  cookieBuf.writeUInt32BE(STUN_MAGIC_COOKIE, 0)
  const octets = []
  for (let i = 0; i < 4; i += 1) {
    octets.push(valBuf[4 + i] ^ cookieBuf[i])
  }
  return { address: octets.join('.'), port }
}

async function discoverSrflxCandidate(udpSocket, timeoutMs = 180) {
  return new Promise(resolve => {
    let settled = false
    const txId = randomBytes(12)
    const req = Buffer.allocUnsafe(20)
    req.writeUInt16BE(0x0001, 0)
    req.writeUInt16BE(0, 2)
    req.writeUInt32BE(STUN_MAGIC_COOKIE, 4)
    txId.copy(req, 8)

    const finish = val => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      udpSocket.off('message', onMsg)
      resolve(val)
    }

    const onMsg = msg => {
      const parsed = parseStunPacket(msg)
      if (!parsed || parsed.msgType !== 0x0101 || !parsed.txId.equals(txId)) return
      const xma = parsed.attrs.find(a => a.type === 0x0020)
      const decoded = xma ? parseXorMappedAddressV4(xma.value) : null
      if (decoded) finish(decoded)
    }

    const timer = setTimeout(() => finish(null), timeoutMs)
    timer.unref?.()
    udpSocket.on('message', onMsg)

    for (const srv of PUBLIC_STUN_SERVERS) {
      try {
        udpSocket.send(req, srv.port, srv.host)
      } catch {}
    }
  })
}

function isTailscaleCgnatV4(ip) {
  const parts = String(ip || '').split('.').map(Number)
  return parts.length === 4 && parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127
}

function listLocalIpv4Candidates({ includeLoopback = false } = {}) {
  const primaryLan = []
  const secondaryNet = []
  const seen = new Set()
  const nets = networkInterfaces()
  for (const [ifName, addrs] of Object.entries(nets || {})) {
    if (!Array.isArray(addrs)) continue
    if (/^(docker|br-|veth|vmnet|vboxnet|awdl|llw)/i.test(ifName)) continue
    const isTun = /^(utun|tun|tap|ppp|wg)/i.test(ifName)
    for (const addr of addrs) {
      if (!addr || (addr.family !== 'IPv4' && addr.family !== 4)) continue
      if (addr.internal && !includeLoopback) continue
      const ip = addr.address
      // Skip link-local & proxy fake-IP benchmark ranges (198.18.0.0/15)
      if (ip.startsWith('169.254.') || ip.startsWith('198.18.') || ip.startsWith('198.19.')) continue
      // Skip VPN/proxy virtual TUN addresses unless they are Tailscale 100.64.0.0/10
      if (isTun && !isTailscaleCgnatV4(ip)) continue
      if (seen.has(ip)) continue
      seen.add(ip)
      if (!isTun && /^(en|eth|wlan|wl)/i.test(ifName)) {
        primaryLan.push(ip)
      } else {
        secondaryNet.push(ip)
      }
    }
  }
  const out = [...primaryLan, ...secondaryNet]
  if (includeLoopback && !seen.has('127.0.0.1')) {
    out.push('127.0.0.1')
  }
  return out
}

function parseRemoteOfferSdp(sdp) {
  const lines = String(sdp || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  let mid = '0'
  let ufrag = ''
  let pwd = ''
  let sctpPort = 5000
  const candidates = []
  let hasLoopbackOrLocal = false

  for (const line of lines) {
    if (line.startsWith('a=mid:')) {
      mid = line.slice(6).trim() || '0'
    } else if (line.startsWith('a=ice-ufrag:')) {
      ufrag = line.slice(12).trim()
    } else if (line.startsWith('a=ice-pwd:')) {
      pwd = line.slice(10).trim()
    } else if (line.startsWith('a=sctp-port:')) {
      const p = Number.parseInt(line.slice(12).trim(), 10)
      if (Number.isFinite(p) && p > 0) sctpPort = p
    } else if (line.startsWith('a=sctpmap:')) {
      const p = Number.parseInt(line.slice(10).split(/\s+/)[0], 10)
      if (Number.isFinite(p) && p > 0) sctpPort = p
    } else if (line.startsWith('a=candidate:')) {
      // a=candidate:<foundation> <comp> <proto> <prio> <ip> <port> typ <type>
      const parts = line.slice(12).trim().split(/\s+/)
      if (parts.length >= 8 && parts[2].toLowerCase() === 'udp') {
        const ip = parts[4]
        const port = Number.parseInt(parts[5], 10)
        const typIdx = parts.indexOf('typ')
        const typ = typIdx >= 0 ? parts[typIdx + 1] : 'host'
        if (ip === '127.0.0.1' || ip.endsWith('.local')) {
          hasLoopbackOrLocal = true
        }
        if (ipToBytesV4(ip) && Number.isFinite(port) && port > 0) {
          candidates.push({ address: ip, port, typ })
        }
      }
    }
  }
  return { mid, ufrag, pwd, sctpPort, candidates, hasLoopbackOrLocal }
}

function buildDtlsHandshakeMsg(msgType, msgSeq, bodyBuf) {
  const hdr = Buffer.allocUnsafe(12)
  hdr[0] = msgType
  hdr.writeUIntBE(bodyBuf.length, 1, 3)
  hdr.writeUInt16BE(msgSeq, 4)
  hdr.writeUIntBE(0, 6, 3) // fragment_offset = 0
  hdr.writeUIntBE(bodyBuf.length, 9, 3) // fragment_length = length
  return Buffer.concat([hdr, bodyBuf])
}

function buildDtlsPlainRecord(contentType, version, epoch, seqNum, payload) {
  const hdr = Buffer.allocUnsafe(13)
  hdr[0] = contentType
  hdr.writeUInt16BE(version, 1)
  hdr.writeUInt16BE(epoch, 3)
  hdr.writeUIntBE(seqNum, 5, 6)
  hdr.writeUInt16BE(payload.length, 11)
  return Buffer.concat([hdr, payload])
}

function tsnLt(a, b) {
  const diff = (a - b) >>> 0
  return diff > 0x80000000
}

function tsnLte(a, b) {
  return a === b || tsnLt(a, b)
}

class WebRtcPeerSession {
  constructor({ id, offerInfo, identity, onStreamRequest, onClose, onDebug, enablePublicStun = true }) {
    this.id = id
    this.offerInfo = offerInfo
    this.identity = identity
    this.onStreamRequest = onStreamRequest
    this.onClose = onClose
    this.onDebug = onDebug
    this.enablePublicStun = enablePublicStun

    this.localUfrag = randomBytes(4).toString('hex')
    this.localPwd = randomBytes(16).toString('base64url')
    this.tieBreaker = randomBytes(8)
    this.socket = null
    this.localPort = 0
    this.remoteEndpoint = null
    this.closed = false
    this.lastActiveAt = Date.now()

    // DTLS state
    this.dtlsVersion = 0xfefd
    this.dtlsReady = false
    this.serverEpoch0Seq = 0
    this.serverEpoch1Seq = 0
    this.clientRandom = null
    this.serverRandom = randomBytes(32)
    this.useExtendedMasterSecret = false
    this.serverEcdh = null
    this.serverFlightDatagram = null
    this.serverFlightRecordsTranscript = null
    this.flightRetransmitTimer = null
    this.hsFragments = new Map() // msgSeq -> { msgType, totalLen, chunks: Map<offset, Buffer>, assembled: Buffer|null }
    this.masterSecret = null
    this.clientWriteKey = null
    this.serverWriteKey = null
    this.clientWriteIv = null
    this.serverWriteIv = null

    // SCTP state
    this.sctpPort = offerInfo.sctpPort || 5000
    this.localVerTag = (randomBytes(4).readUInt32BE(0) | 1) >>> 0
    this.peerVerTag = 0
    this.nextTsn = (randomBytes(4).readUInt32BE(0) & 0x7fffffff) >>> 0
    this.peerCumTsn = 0
    this.peerTsnInitialized = false
    this.peerOutOfOrderTsns = new Set()
    this.peerRwnd = 256 * 1024
    this.cwnd = 128 * 1024
    this.inFlightBytes = 0
    this.unackedByTsn = new Map() // tsn -> { tsn, chunkBuf, byteLen, sentAt, missCount }
    this.outboundSeqByStream = new Map()
    this.inboundReassemblyByStream = new Map()
    this.drainWaiters = []
    this.rtoTimer = null
    this.activeFileStreams = new Map() // reqId -> { aborted: boolean }

    this.idleTimer = setInterval(() => {
      if (Date.now() - this.lastActiveAt > 95_000) {
        this.close()
      }
    }, 15_000)
    this.idleTimer.unref?.()
  }

  touch() {
    this.lastActiveAt = Date.now()
  }

  async initAndBuildAnswer() {
    const sock = dgram.createSocket('udp4')
    this.socket = sock
    sock.on('error', () => {})

    await new Promise((resolve, reject) => {
      sock.once('error', reject)
      sock.bind(0, '0.0.0.0', () => {
        sock.off('error', reject)
        resolve()
      })
    })
    this.localPort = sock.address().port

    const includeLoopback =
      Boolean(this.offerInfo.hasLoopbackOrLocal) || this.offerInfo.candidates.length === 0
    const localIps = listLocalIpv4Candidates({ includeLoopback })
    let srflx = null
    if (this.enablePublicStun) {
      srflx = await discoverSrflxCandidate(sock, 180).catch(() => null)
    }

    // Attach main packet demux listener AFTER optional STUN srflx discovery
    sock.on('message', (msg, rinfo) => {
      this.onUdpDatagram(msg, rinfo)
    })

    // Proactively punch outbound NAT pinholes toward browser's offered candidates
    for (const cand of this.offerInfo.candidates.slice(0, 6)) {
      this.sendStunBindingCheck(cand.address, cand.port)
    }

    const candLines = []
    let foundation = 1
    for (const ip of localIps) {
      if (ip === '127.0.0.1' && localIps.length > 1) continue
      const prio = 2122260223 - foundation * 256
      candLines.push(`a=candidate:${foundation} 1 udp ${prio} ${ip} ${this.localPort} typ host`)
      foundation += 1
    }
    if (srflx && !localIps.includes(srflx.address)) {
      const raddr = localIps.find(ip => ip !== '127.0.0.1') || localIps[0] || '0.0.0.0'
      candLines.push(
        `a=candidate:${foundation} 1 udp 1686052607 ${srflx.address} ${srflx.port} typ srflx raddr ${raddr} rport ${this.localPort}`,
      )
      foundation += 1
    }
    if (localIps.includes('127.0.0.1') && localIps.length > 1) {
      candLines.push(`a=candidate:${foundation} 1 udp 1000000 127.0.0.1 ${this.localPort} typ host`)
      foundation += 1
    }

    const primaryIp = localIps[0] || srflx?.address || '127.0.0.1'
    const answerLines = [
      'v=0',
      `o=- ${Date.now()} 2 IN IP4 ${primaryIp}`,
      's=-',
      't=0 0',
      `a=group:BUNDLE ${this.offerInfo.mid}`,
      'a=msid-semantic: WMS',
      `m=application ${this.localPort} UDP/DTLS/SCTP webrtc-datachannel`,
      `c=IN IP4 ${primaryIp}`,
      `a=ice-ufrag:${this.localUfrag}`,
      `a=ice-pwd:${this.localPwd}`,
      'a=ice-options:trickle',
      `a=fingerprint:sha-256 ${this.identity.fingerprint}`,
      'a=setup:passive',
      `a=mid:${this.offerInfo.mid}`,
      `a=sctp-port:${this.sctpPort}`,
      'a=max-message-size:262144',
      ...candLines,
      'a=end-of-candidates',
      '',
    ]
    return answerLines.join('\r\n')
  }

  sendUdp(buf, endpoint = this.remoteEndpoint) {
    if (this.closed || !this.socket || !endpoint) return
    try {
      this.socket.send(buf, endpoint.port, endpoint.address)
    } catch {}
  }

  sendStunBindingCheck(address, port) {
    if (!this.offerInfo.ufrag || !this.offerInfo.pwd) return
    const txId = randomBytes(12)
    const username = Buffer.from(`${this.offerInfo.ufrag}:${this.localUfrag}`, 'utf8')
    const prioBuf = Buffer.allocUnsafe(4)
    prioBuf.writeUInt32BE(0x6e001eff, 0)
    const attrs = [
      buildStunAttr(0x0006, username),
      buildStunAttr(0x8029, this.tieBreaker), // ICE-CONTROLLED
      buildStunAttr(0x0024, prioBuf), // PRIORITY
    ]
    const pkt = appendStunIntegrityAndFingerprint(0x0001, txId, attrs, this.offerInfo.pwd)
    this.sendUdp(pkt, { address, port })
  }

  onUdpDatagram(msg, rinfo) {
    if (this.closed || !msg || msg.length === 0) return
    this.touch()
    const firstByte = msg[0]
    if (firstByte <= 3) {
      this.handleStunDatagram(msg, rinfo)
    } else if (firstByte >= 20 && firstByte <= 63) {
      if (!this.remoteEndpoint) {
        this.remoteEndpoint = { address: rinfo.address, port: rinfo.port }
      }
      this.handleDtlsDatagram(msg, rinfo)
    }
  }

  handleStunDatagram(msg, rinfo) {
    const parsed = parseStunPacket(msg)
    if (!parsed) return
    // STUN Binding Request
    if (parsed.msgType === 0x0001) {
      const hasUseCandidate = parsed.attrs.some(a => a.type === 0x0025)
      if (!this.remoteEndpoint || hasUseCandidate) {
        this.remoteEndpoint = { address: rinfo.address, port: rinfo.port }
      }
      const xma = encodeXorMappedAddressV4(rinfo.address, rinfo.port)
      if (!xma) return
      const resp = appendStunIntegrityAndFingerprint(
        0x0101,
        parsed.txId,
        [buildStunAttr(0x0020, xma)],
        this.localPwd,
      )
      this.sendUdp(resp, rinfo)
      // Also send reciprocal connectivity check so libwebrtc marks pair succeeded immediately
      this.sendStunBindingCheck(rinfo.address, rinfo.port)
    }
  }

  handleDtlsDatagram(buf, rinfo) {
    let offset = 0
    while (offset + 13 <= buf.length) {
      const contentType = buf[offset]
      const version = buf.readUInt16BE(offset + 1)
      const epoch = buf.readUInt16BE(offset + 3)
      const seqNum = buf.readUIntBE(offset + 5, 6)
      const recLen = buf.readUInt16BE(offset + 11)
      const recStart = offset + 13
      const recEnd = recStart + recLen
      if (recEnd > buf.length) break
      const fragment = buf.subarray(recStart, recEnd)
      offset = recEnd

      if (epoch === 0) {
        if (contentType === 22) {
          this.handleDtlsEpoch0Handshake(fragment, rinfo)
        } else if (contentType === 21) {
          this.onDebug?.(`DTLS epoch0 alert: level=${fragment[0]} desc=${fragment[1]}`)
        }
      } else if (epoch === 1 && this.clientWriteKey) {
        const plain = this.decryptDtlsRecord(contentType, version, epoch, seqNum, fragment)
        if (!plain) {
          this.onDebug?.(`DTLS epoch1 decrypt failed: type=${contentType} seq=${seqNum} len=${fragment.length}`)
          continue
        }
        if (contentType === 22) {
          this.handleDtlsEpoch1Handshake(plain, rinfo)
        } else if (contentType === 23 && this.dtlsReady) {
          this.handleSctpPacket(plain)
        } else if (contentType === 21) {
          this.onDebug?.(`DTLS epoch1 alert: level=${plain[0]} desc=${plain[1]}`)
          this.close()
          return
        }
      } else if (epoch === 1 && !this.clientWriteKey) {
        this.onDebug?.(`DTLS epoch1 arrived before clientWriteKey! hsSeqs=${[...this.hsFragments.entries()].map(([k,v])=>`${k}:t${v.msgType}:${v.done}`).join(',')}`)
      }
    }
  }

  ingestHandshakeFragment(buf) {
    let off = 0
    const completed = []
    while (off + 12 <= buf.length) {
      const msgType = buf[off]
      const totalLen = buf.readUIntBE(off + 1, 3)
      const msgSeq = buf.readUInt16BE(off + 4)
      const fragOff = buf.readUIntBE(off + 6, 3)
      const fragLen = buf.readUIntBE(off + 9, 3)
      if (off + 12 + fragLen > buf.length) break
      const fragData = buf.subarray(off + 12, off + 12 + fragLen)
      off += 12 + fragLen

      let state = this.hsFragments.get(msgSeq)
      if (!state) {
        const bufAlloc = Buffer.alloc(totalLen)
        state = { msgType, totalLen, buf: bufAlloc, body: bufAlloc, receivedRanges: [], done: false, fullMsg: null }
        this.hsFragments.set(msgSeq, state)
      }
      if (!state.done && fragOff + fragLen <= state.totalLen) {
        fragData.copy(state.buf, fragOff)
        state.receivedRanges.push([fragOff, fragOff + fragLen])
        // Check if [0, totalLen] is completely covered
        state.receivedRanges.sort((a, b) => a[0] - b[0])
        let covered = 0
        for (const [s, e] of state.receivedRanges) {
          if (s > covered) break
          if (e > covered) covered = e
        }
        if (covered >= state.totalLen) {
          state.done = true
          state.fullMsg = buildDtlsHandshakeMsg(msgType, msgSeq, state.buf)
          completed.push({ msgSeq, msgType, body: state.buf, fullMsg: state.fullMsg })
        }
      }
    }
    return completed
  }

  handleDtlsEpoch0Handshake(fragment, rinfo) {
    this.ingestHandshakeFragment(fragment)

    // Flight 1: ClientHello (msg_seq = 0, msgType = 1)
    const ch = this.hsFragments.get(0)
    if (ch?.done && ch.msgType === 1 && !this.serverFlightDatagram) {
      this.processClientHelloAndSendServerFlight(ch.body, rinfo)
      return
    }
    // Retransmit Server Flight if client retransmits ClientHello before sending Flight 3
    if (ch?.done && this.serverFlightDatagram && !this.masterSecret && fragment[0] === 1) {
      this.sendUdp(this.serverFlightDatagram, rinfo)
      return
    }

    // Check if Client Flight 3 epoch-0 messages arrived (ClientKeyExchange msgType = 16)
    if (this.serverFlightDatagram && !this.masterSecret) {
      let ckeEntry = null
      for (const [seq, st] of this.hsFragments.entries()) {
        if (seq > 0 && st.done && st.msgType === 16) {
          ckeEntry = { seq, ...st }
          break
        }
      }
      if (ckeEntry) {
        this.deriveDtlsKeysFromClientKeyExchange(ckeEntry)
      }
    }
  }

  processClientHelloAndSendServerFlight(chBody, rinfo) {
    if (chBody.length < 38) return
    this.clientRandom = Buffer.from(chBody.subarray(2, 34))
    let pos = 34
    const sidLen = chBody[pos]
    pos += 1 + sidLen
    if (pos >= chBody.length) return
    const cookieLen = chBody[pos]
    pos += 1 + cookieLen
    if (pos + 2 > chBody.length) return
    const csLen = chBody.readUInt16BE(pos)
    const csSlice = chBody.subarray(pos + 2, pos + 2 + csLen)
    let hasScsvReneg = false
    for (let i = 0; i + 1 < csSlice.length; i += 2) {
      if (csSlice.readUInt16BE(i) === 0x00ff) hasScsvReneg = true
    }
    pos += 2 + csLen
    if (pos + 1 > chBody.length) return
    const compLen = chBody[pos]
    pos += 1 + compLen

    let offeredEms = false
    let offeredRenegExt = false
    const seenExts = []
    if (pos + 2 <= chBody.length) {
      const extTotalLen = chBody.readUInt16BE(pos)
      pos += 2
      const extEnd = Math.min(chBody.length, pos + extTotalLen)
      while (pos + 4 <= extEnd) {
        const extType = chBody.readUInt16BE(pos)
        const extLen = chBody.readUInt16BE(pos + 2)
        seenExts.push(extType.toString(16))
        if (extType === 0x0017) offeredEms = true
        if (extType === 0xff01) offeredRenegExt = true
        pos += 4 + extLen
      }
    }
    this.onDebug?.(`ClientHello exts=[${seenExts.join(',')}] scsv=${hasScsvReneg}`)
    this.useExtendedMasterSecret = offeredEms

    this.serverEcdh = createECDH('prime256v1')
    const serverPub = this.serverEcdh.generateKeys()

    // 1. ServerHello (msg_type = 2, seq = 0) — ONLY echo extensions offered by client (or SCSV)
    const shExts = []
    if (offeredRenegExt || hasScsvReneg) {
      shExts.push(Buffer.from([0xff, 0x01, 0x00, 0x01, 0x00]))
    }
    if (this.useExtendedMasterSecret) {
      shExts.push(Buffer.from([0x00, 0x17, 0x00, 0x00]))
    }
    const shExtPart = shExts.length > 0
      ? (() => {
          const b = Buffer.concat(shExts)
          const h = Buffer.allocUnsafe(2)
          h.writeUInt16BE(b.length, 0)
          return Buffer.concat([h, b])
        })()
      : Buffer.alloc(0)
    const shBody = Buffer.concat([
      Buffer.from([0xfe, 0xfd]), // DTLS 1.2
      this.serverRandom,
      Buffer.from([0x00]), // session_id len = 0
      Buffer.from([0xc0, 0x2b]), // TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
      Buffer.from([0x00]), // compression = null
      shExtPart,
    ])
    const msgSh = buildDtlsHandshakeMsg(2, 0, shBody)

    // 2. Certificate (msg_type = 11, seq = 1)
    const certDer = this.identity.certDer
    const certBody = Buffer.allocUnsafe(6 + certDer.length)
    certBody.writeUIntBE(certDer.length + 3, 0, 3)
    certBody.writeUIntBE(certDer.length, 3, 3)
    certDer.copy(certBody, 6)
    const msgCert = buildDtlsHandshakeMsg(11, 1, certBody)

    // 3. ServerKeyExchange (msg_type = 12, seq = 2)
    const ecParams = Buffer.concat([
      Buffer.from([0x03, 0x00, 0x17, serverPub.length]), // named_curve secp256r1 / prime256v1 (0x0017 = 23)
      serverPub,
    ])
    const skeSig = sign(
      'sha256',
      Buffer.concat([this.clientRandom, this.serverRandom, ecParams]),
      this.identity.privateKey,
    )
    const skeSigHdr = Buffer.allocUnsafe(4)
    skeSigHdr[0] = 0x04 // sha256
    skeSigHdr[1] = 0x03 // ecdsa
    skeSigHdr.writeUInt16BE(skeSig.length, 2)
    const msgSke = buildDtlsHandshakeMsg(12, 2, Buffer.concat([ecParams, skeSigHdr, skeSig]))

    // 4. CertificateRequest (msg_type = 13, seq = 3) — RFC 8827 mutual WebRTC DTLS
    const crBody = Buffer.from([
      0x02, 0x40, 0x01, // cert_types: ecdsa_sign (64), rsa_sign (1)
      0x00, 0x08, // sig_algs length = 8
      0x04, 0x03, // ecdsa_secp256r1_sha256
      0x08, 0x04, // rsa_pss_rsae_sha256
      0x04, 0x01, // rsa_pkcs1_sha256
      0x05, 0x03, // ecdsa_secp384r1_sha384
      0x00, 0x00, // certificate_authorities length = 0
    ])
    const msgCr = buildDtlsHandshakeMsg(13, 3, crBody)

    // 5. ServerHelloDone (msg_type = 14, seq = 4)
    const msgShd = buildDtlsHandshakeMsg(14, 4, Buffer.alloc(0))

    this.serverFlightRecordsTranscript = [msgSh, msgCert, msgSke, msgCr, msgShd]
    const records = this.serverFlightRecordsTranscript.map(m =>
      buildDtlsPlainRecord(22, 0xfefd, 0, this.serverEpoch0Seq++, m),
    )
    this.serverFlightDatagram = Buffer.concat(records)
    this.sendUdp(this.serverFlightDatagram, rinfo)

    this.flightRetransmitTimer = setInterval(() => {
      if (this.closed || this.dtlsReady || !this.serverFlightDatagram) {
        clearInterval(this.flightRetransmitTimer)
        this.flightRetransmitTimer = null
        return
      }
      this.sendUdp(this.serverFlightDatagram)
    }, 450)
    this.flightRetransmitTimer.unref?.()
  }

  deriveDtlsKeysFromClientKeyExchange(ckeEntry) {
    // Wait until all preceding client flight messages (e.g. Certificate at seq=1) & CertificateVerify (seq=3 if present) are assembled
    // Note: ClientHello is seq=0; client flight starts at seq=1:
    // If client sent Certificate: seq=1 (Cert, 11), seq=2 (CKE, 16), seq=3 (CertVerify, 15)
    // If client sent empty Certificate: seq=1 (Cert len 0, 11), seq=2 (CKE, 16)
    for (let s = 1; s < ckeEntry.seq; s += 1) {
      const prev = this.hsFragments.get(s)
      if (!prev || !prev.done) return
    }
    const certEntry = this.hsFragments.get(1)
    const clientSentNonEmptyCert =
      certEntry && certEntry.msgType === 11 && certEntry.body.length > 3 && certEntry.body.readUIntBE(0, 3) > 0
    if (clientSentNonEmptyCert) {
      const cvEntry = this.hsFragments.get(ckeEntry.seq + 1)
      if (!cvEntry || !cvEntry.done) return
    }

    const ckeBody = ckeEntry.body
    if (ckeBody.length < 2) return
    const pubLen = ckeBody[0]
    if (1 + pubLen > ckeBody.length) return
    const clientPub = ckeBody.subarray(1, 1 + pubLen)
    const preMasterSecret = this.serverEcdh.computeSecret(clientPub)

    const emsParts = [
      this.hsFragments.get(0).fullMsg,
      ...this.serverFlightRecordsTranscript,
    ]
    for (let s = 1; s <= ckeEntry.seq; s += 1) {
      const item = this.hsFragments.get(s)
      if (item?.fullMsg) emsParts.push(item.fullMsg)
    }
    const emsTranscript = Buffer.concat(emsParts)

    const finParts = [...emsParts]
    if (clientSentNonEmptyCert) {
      const cvItem = this.hsFragments.get(ckeEntry.seq + 1)
      if (cvItem?.fullMsg) finParts.push(cvItem.fullMsg)
    }
    this.preFinishedTranscript = Buffer.concat(finParts)

    if (this.useExtendedMasterSecret) {
      const sessionHash = createHash('sha256').update(emsTranscript).digest()
      this.masterSecret = tls12Prf(preMasterSecret, 'extended master secret', sessionHash, 48)
    } else {
      this.masterSecret = tls12Prf(
        preMasterSecret,
        'master secret',
        Buffer.concat([this.clientRandom, this.serverRandom]),
        48,
      )
    }

    const keyBlock = tls12Prf(
      this.masterSecret,
      'key expansion',
      Buffer.concat([this.serverRandom, this.clientRandom]),
      40,
    )
    this.clientWriteKey = keyBlock.subarray(0, 16)
    this.serverWriteKey = keyBlock.subarray(16, 32)
    this.clientWriteIv = keyBlock.subarray(32, 36)
    this.serverWriteIv = keyBlock.subarray(36, 40)
  }

  decryptDtlsRecord(contentType, version, epoch, seqNum, fragment) {
    if (fragment.length < 24) return null
    const explicitNonce = fragment.subarray(0, 8)
    const tag = fragment.subarray(fragment.length - 16)
    const ciphertext = fragment.subarray(8, fragment.length - 16)
    const plainLen = ciphertext.length

    const nonce = Buffer.concat([this.clientWriteIv, explicitNonce])
    const aad = Buffer.allocUnsafe(13)
    aad.writeUInt16BE(epoch, 0)
    aad.writeUIntBE(seqNum, 2, 6)
    aad[8] = contentType
    aad.writeUInt16BE(version, 9)
    aad.writeUInt16BE(plainLen, 11)

    try {
      const decipher = createDecipheriv('aes-128-gcm', this.clientWriteKey, nonce)
      decipher.setAAD(aad)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ciphertext), decipher.final()])
    } catch {
      return null
    }
  }

  encryptDtlsRecord(contentType, plainBuf) {
    const epoch = 1
    const seqNum = this.serverEpoch1Seq++
    const explicitNonce = Buffer.allocUnsafe(8)
    explicitNonce.writeUInt16BE(epoch, 0)
    explicitNonce.writeUIntBE(seqNum, 2, 6)

    const nonce = Buffer.concat([this.serverWriteIv, explicitNonce])
    const aad = Buffer.allocUnsafe(13)
    aad.writeUInt16BE(epoch, 0)
    aad.writeUIntBE(seqNum, 2, 6)
    aad[8] = contentType
    aad.writeUInt16BE(0xfefd, 9)
    aad.writeUInt16BE(plainBuf.length, 11)

    const cipher = createCipheriv('aes-128-gcm', this.serverWriteKey, nonce)
    cipher.setAAD(aad)
    const enc = Buffer.concat([cipher.update(plainBuf), cipher.final()])
    const tag = cipher.getAuthTag()
    const payload = Buffer.concat([explicitNonce, enc, tag])
    return buildDtlsPlainRecord(contentType, 0xfefd, epoch, seqNum, payload)
  }

  handleDtlsEpoch1Handshake(plain, rinfo) {
    if (plain.length < 24 || plain[0] !== 20 || !this.masterSecret || !this.preFinishedTranscript) return
    const verifyData = plain.subarray(12, 24)
    const expectedHash = createHash('sha256').update(this.preFinishedTranscript).digest()
    const expectedVerify = tls12Prf(this.masterSecret, 'client finished', expectedHash, 12)
    if (!verifyData.equals(expectedVerify)) return

    if (this.flightRetransmitTimer) {
      clearInterval(this.flightRetransmitTimer)
      this.flightRetransmitTimer = null
    }

    if (this.dtlsReady && this.serverFinishedDatagram) {
      this.sendUdp(this.serverFinishedDatagram, rinfo)
      return
    }

    const clientFinishedFull = plain.subarray(0, 24)
    const fullTranscriptForServer = Buffer.concat([this.preFinishedTranscript, clientFinishedFull])
    const srvHash = createHash('sha256').update(fullTranscriptForServer).digest()
    const srvVerify = tls12Prf(this.masterSecret, 'server finished', srvHash, 12)
    const srvFinishedMsg = buildDtlsHandshakeMsg(20, 5, srvVerify)

    const ccsRecord = buildDtlsPlainRecord(20, 0xfefd, 0, this.serverEpoch0Seq++, Buffer.from([0x01]))
    const finRecord = this.encryptDtlsRecord(22, srvFinishedMsg)
    this.serverFinishedDatagram = Buffer.concat([ccsRecord, finRecord])
    this.dtlsReady = true
    this.sendUdp(this.serverFinishedDatagram, rinfo)
  }

  // ==================== SCTP + WebRTC DataChannel (RFC 4960 + RFC 8832) ====================

  sendSctpChunks(chunkBuffers) {
    if (this.closed || !this.dtlsReady || chunkBuffers.length === 0) return
    const body = Buffer.concat(chunkBuffers.map(c => pad4(c)))
    const hdr = Buffer.allocUnsafe(12)
    hdr.writeUInt16BE(this.sctpPort, 0)
    hdr.writeUInt16BE(this.sctpPort, 2)
    hdr.writeUInt32BE(this.peerVerTag, 4)
    hdr.writeUInt32BE(0, 8)
    const pkt = Buffer.concat([hdr, body])
    pkt.writeUInt32LE(crc32c(pkt), 8)
    const dtlsRec = this.encryptDtlsRecord(23, pkt)
    this.sendUdp(dtlsRec)
  }

  buildSctpChunk(type, flags, valueBuf) {
    const hdr = Buffer.allocUnsafe(4)
    hdr[0] = type
    hdr[1] = flags
    hdr.writeUInt16BE(4 + valueBuf.length, 2)
    return Buffer.concat([hdr, valueBuf])
  }

  handleSctpPacket(pkt) {
    if (pkt.length < 16) return
    let off = 12
    let needSack = false
    const responseChunks = []

    while (off + 4 <= pkt.length) {
      const cType = pkt[off]
      const cFlags = pkt[off + 1]
      const cLen = pkt.readUInt16BE(off + 2)
      if (cLen < 4 || off + cLen > pkt.length) break
      const cVal = pkt.subarray(off + 4, off + cLen)
      off += Math.ceil(cLen / 4) * 4

      if (cType === 1) {
        // INIT -> reply INIT-ACK
        if (cVal.length < 16) continue
        this.peerVerTag = cVal.readUInt32BE(0)
        this.peerRwnd = Math.max(32768, cVal.readUInt32BE(4))
        const initTsn = cVal.readUInt32BE(12)
        this.peerCumTsn = (initTsn - 1) >>> 0
        this.peerTsnInitialized = true
        this.peerOutOfOrderTsns.clear()

        const cookieParam = Buffer.allocUnsafe(12)
        cookieParam.writeUInt16BE(7, 0) // State Cookie
        cookieParam.writeUInt16BE(12, 2)
        randomBytes(8).copy(cookieParam, 4)

        const initAckVal = Buffer.allocUnsafe(16 + cookieParam.length)
        initAckVal.writeUInt32BE(this.localVerTag, 0)
        initAckVal.writeUInt32BE(4 * 1024 * 1024, 4) // a_rwnd = 4 MiB
        initAckVal.writeUInt16BE(256, 8)
        initAckVal.writeUInt16BE(256, 10)
        initAckVal.writeUInt32BE(this.nextTsn, 12)
        cookieParam.copy(initAckVal, 16)
        responseChunks.push(this.buildSctpChunk(2, 0, initAckVal))
      } else if (cType === 10) {
        // COOKIE-ECHO -> COOKIE-ACK
        responseChunks.push(this.buildSctpChunk(11, 0, Buffer.alloc(0)))
      } else if (cType === 4) {
        // HEARTBEAT -> HEARTBEAT-ACK
        responseChunks.push(this.buildSctpChunk(5, 0, cVal))
      } else if (cType === 0) {
        // DATA
        if (cVal.length < 12) continue
        const tsn = cVal.readUInt32BE(0)
        const streamId = cVal.readUInt16BE(4)
        const ppid = cVal.readUInt32BE(8)
        const userData = cVal.subarray(12)
        needSack = true

        const expectedNext = (this.peerCumTsn + 1) >>> 0
        if (tsn === expectedNext) {
          this.peerCumTsn = tsn
          while (this.peerOutOfOrderTsns.has((this.peerCumTsn + 1) >>> 0)) {
            this.peerCumTsn = (this.peerCumTsn + 1) >>> 0
            this.peerOutOfOrderTsns.delete(this.peerCumTsn)
          }
          this.onInboundDataChunk(streamId, cFlags, ppid, userData)
        } else if (tsnLt(expectedNext, tsn)) {
          this.peerOutOfOrderTsns.add(tsn)
          this.onInboundDataChunk(streamId, cFlags, ppid, userData)
        }
      } else if (cType === 3) {
        // SACK
        this.handleSctpSack(cVal)
      } else if (cType === 14) {
        // SHUTDOWN_COMPLETE / ABORT
        this.close()
        return
      }
    }

    if (needSack && this.peerTsnInitialized) {
      const sackVal = Buffer.allocUnsafe(12)
      sackVal.writeUInt32BE(this.peerCumTsn, 0)
      sackVal.writeUInt32BE(4 * 1024 * 1024, 4)
      sackVal.writeUInt16BE(0, 8)
      sackVal.writeUInt16BE(0, 10)
      responseChunks.push(this.buildSctpChunk(3, 0, sackVal))
    }

    if (responseChunks.length > 0) {
      this.sendSctpChunks(responseChunks)
    }
  }

  onInboundDataChunk(streamId, flags, ppid, userData) {
    // flags: bit 1 (0x02) = Beginning, bit 0 (0x01) = Ending
    const isBegin = (flags & 0x02) !== 0
    const isEnd = (flags & 0x01) !== 0
    let msgBuf = null
    if (isBegin && isEnd) {
      msgBuf = userData
    } else {
      let parts = this.inboundReassemblyByStream.get(streamId)
      if (isBegin || !parts) {
        parts = []
        this.inboundReassemblyByStream.set(streamId, parts)
      }
      parts.push(Buffer.from(userData))
      if (isEnd) {
        msgBuf = Buffer.concat(parts)
        this.inboundReassemblyByStream.delete(streamId)
      }
    }
    if (!msgBuf) return

    if (ppid === 50) {
      // DCEP: 0x03 = DATA_CHANNEL_OPEN -> reply 0x02 = DATA_CHANNEL_ACK
      if (msgBuf[0] === 0x03) {
        this.sendDataMessage(streamId, 50, Buffer.from([0x02]))
      }
      return
    }
    if (ppid === 51 || ppid === 53) {
      let reqObj = null
      try {
        reqObj = JSON.parse(msgBuf.toString('utf8'))
      } catch {}
      if (reqObj && typeof reqObj === 'object') {
        void this.handleChannelRequest(streamId, reqObj)
      }
    }
  }

  handleSctpSack(sackVal) {
    if (sackVal.length < 12) return
    const cumAck = sackVal.readUInt32BE(0)
    const aRwnd = sackVal.readUInt32BE(4)
    const numGapBlocks = sackVal.readUInt16BE(8)
    this.peerRwnd = Math.max(16384, aRwnd)

    let ackedBytes = 0
    for (const [tsn, entry] of this.unackedByTsn.entries()) {
      if (tsnLte(tsn, cumAck)) {
        ackedBytes += entry.byteLen
        this.unackedByTsn.delete(tsn)
      }
    }
    if (ackedBytes > 0) {
      this.inFlightBytes = Math.max(0, this.inFlightBytes - ackedBytes)
      this.cwnd = Math.min(1024 * 1024, this.cwnd + ackedBytes)
    }

    // Fast retransmit on gap ack blocks
    if (numGapBlocks > 0 && sackVal.length >= 12 + numGapBlocks * 4) {
      const gapRanges = []
      for (let i = 0; i < numGapBlocks; i += 1) {
        const gStart = (cumAck + sackVal.readUInt16BE(12 + i * 4)) >>> 0
        const gEnd = (cumAck + sackVal.readUInt16BE(12 + i * 4 + 2)) >>> 0
        gapRanges.push([gStart, gEnd])
      }
      const highestSacked = gapRanges[gapRanges.length - 1][1]
      const toRetransmit = []
      for (const [tsn, entry] of this.unackedByTsn.entries()) {
        if (!tsnLt(tsn, highestSacked)) continue
        const inGap = gapRanges.some(([gs, ge]) => tsnLte(gs, tsn) && tsnLte(tsn, ge))
        if (!inGap) {
          entry.missCount += 1
          if (entry.missCount >= 3) {
            entry.missCount = 0
            entry.sentAt = Date.now()
            toRetransmit.push(entry.chunkBuf)
            if (toRetransmit.length >= 8) break
          }
        }
      }
      if (toRetransmit.length > 0) {
        for (const c of toRetransmit) {
          this.sendSctpChunks([c])
        }
      }
    }

    if (this.unackedByTsn.size === 0 && this.rtoTimer) {
      clearInterval(this.rtoTimer)
      this.rtoTimer = null
    }
    this.notifyWindowWaiters()
  }

  ensureRtoTimer() {
    if (this.rtoTimer || this.closed) return
    this.rtoTimer = setInterval(() => {
      if (this.closed || this.unackedByTsn.size === 0) {
        clearInterval(this.rtoTimer)
        this.rtoTimer = null
        return
      }
      const now = Date.now()
      let resent = 0
      for (const entry of this.unackedByTsn.values()) {
        if (now - entry.sentAt >= 180) {
          entry.sentAt = now
          this.sendSctpChunks([entry.chunkBuf])
          resent += 1
          if (resent >= 6) break
        }
      }
      if (resent > 0) {
        this.cwnd = Math.max(32 * 1024, this.cwnd >>> 1)
      }
    }, 90)
    this.rtoTimer.unref?.()
  }

  notifyWindowWaiters() {
    if (this.drainWaiters.length === 0) return
    const limit = Math.min(this.cwnd, this.peerRwnd)
    if (this.inFlightBytes < limit || this.closed) {
      const list = this.drainWaiters.splice(0)
      for (const fn of list) fn()
    }
  }

  async waitForSendWindow() {
    while (!this.closed) {
      const limit = Math.min(this.cwnd, this.peerRwnd)
      if (this.inFlightBytes < limit) return
      await new Promise(resolve => {
        const t = setTimeout(resolve, 120)
        t.unref?.()
        this.drainWaiters.push(() => {
          clearTimeout(t)
          resolve()
        })
      })
    }
  }

  sendDataMessage(streamId, ppid, payloadBuf) {
    const maxFrag = 1160 // Fits safely under 1280 MTU after SCTP + DTLS AES-GCM overhead
    const seq = (this.outboundSeqByStream.get(streamId) || 0) & 0xffff
    this.outboundSeqByStream.set(streamId, (seq + 1) & 0xffff)

    const total = payloadBuf.length
    if (total === 0) {
      this.enqueueSingleDataChunk(streamId, seq, 0x03, ppid, Buffer.alloc(0))
      return
    }
    let off = 0
    while (off < total) {
      const end = Math.min(total, off + maxFrag)
      let flags = 0
      if (off === 0) flags |= 0x02 // B
      if (end === total) flags |= 0x01 // E
      this.enqueueSingleDataChunk(streamId, seq, flags, ppid, payloadBuf.subarray(off, end))
      off = end
    }
  }

  enqueueSingleDataChunk(streamId, streamSeq, flags, ppid, sliceBuf) {
    const tsn = this.nextTsn
    this.nextTsn = (this.nextTsn + 1) >>> 0
    const val = Buffer.allocUnsafe(12 + sliceBuf.length)
    val.writeUInt32BE(tsn, 0)
    val.writeUInt16BE(streamId, 4)
    val.writeUInt16BE(streamSeq, 6)
    val.writeUInt32BE(ppid, 8)
    sliceBuf.copy(val, 12)
    const chunkBuf = this.buildSctpChunk(0, flags, val)

    this.unackedByTsn.set(tsn, {
      tsn,
      chunkBuf,
      byteLen: sliceBuf.length + 16,
      sentAt: Date.now(),
      missCount: 0,
    })
    this.inFlightBytes += sliceBuf.length + 16
    this.ensureRtoTimer()
    this.sendSctpChunks([chunkBuf])
  }

  sendJson(streamId, obj) {
    const buf = Buffer.from(JSON.stringify(obj), 'utf8')
    this.sendDataMessage(streamId, 51, buf)
  }

  async handleChannelRequest(streamId, req) {
    if (req.op === 'cancel' && req.reqId) {
      const st = this.activeFileStreams.get(req.reqId)
      if (st) st.aborted = true
      return
    }
    if (req.op === 'ping') {
      this.sendJson(streamId, { type: 'pong', ts: Date.now() })
      return
    }
    if (req.op !== 'stream' || typeof this.onStreamRequest !== 'function') return

    const reqId = String(req.reqId || `p2p-${Date.now()}`)
    const state = { aborted: false }
    this.activeFileStreams.set(reqId, state)

    try {
      const prep = await this.onStreamRequest(req)
      if (!prep || !prep.ok) {
        this.sendJson(streamId, {
          type: 'error',
          reqId,
          status: prep?.status || 404,
          error: prep?.error || 'File not found',
        })
        return
      }

      const filePath = prep.streamSpec?.filePath
      const start = Number(prep.streamSpec?.start ?? 0)
      const end = Number(prep.streamSpec?.end ?? (prep.byteLength ? prep.byteLength - 1 : -1))
      const totalSendBytes = prep.buffer
        ? prep.buffer.length
        : end >= start && filePath
          ? end - start + 1
          : 0

      this.sendJson(streamId, {
        type: 'meta',
        reqId,
        ok: true,
        status: prep.status || 200,
        name: prep.name || '',
        mime: prep.mime || 'application/octet-stream',
        variant: prep.variant || 'orig',
        byteLength: totalSendBytes,
        contentRange: prep.contentRange || '',
      })

      const FRAME_PAYLOAD = 32 * 1024 // 32 KiB app frame (splits into ~28 SCTP MTU packets)
      const reqIdBytes = Buffer.from(reqId, 'utf8')
      const frameHdr = Buffer.allocUnsafe(2 + reqIdBytes.length)
      frameHdr[0] = 0x01 // data frame magic
      frameHdr[1] = reqIdBytes.length
      reqIdBytes.copy(frameHdr, 2)

      if (prep.buffer) {
        let pos = 0
        while (pos < prep.buffer.length && !state.aborted && !this.closed) {
          await this.waitForSendWindow()
          const slice = prep.buffer.subarray(pos, Math.min(prep.buffer.length, pos + FRAME_PAYLOAD))
          this.sendDataMessage(streamId, 53, Buffer.concat([frameHdr, slice]))
          pos += slice.length
        }
      } else if (filePath && totalSendBytes > 0) {
        const fh = await open(filePath, 'r')
        try {
          const readBuf = Buffer.allocUnsafe(FRAME_PAYLOAD)
          let offset = start
          const limit = end + 1
          while (offset < limit && !state.aborted && !this.closed) {
            await this.waitForSendWindow()
            if (state.aborted || this.closed) break
            const toRead = Math.min(FRAME_PAYLOAD, limit - offset)
            const { bytesRead } = await fh.read(readBuf, 0, toRead, offset)
            if (bytesRead <= 0) break
            offset += bytesRead
            const payload = Buffer.concat([frameHdr, readBuf.subarray(0, bytesRead)])
            this.sendDataMessage(streamId, 53, payload)
          }
        } finally {
          await fh.close().catch(() => {})
        }
      }

      if (!state.aborted && !this.closed) {
        this.sendJson(streamId, { type: 'eof', reqId, byteLength: totalSendBytes })
      }
    } catch (err) {
      if (!this.closed) {
        this.sendJson(streamId, {
          type: 'error',
          reqId,
          status: 500,
          error: err?.message || String(err),
        })
      }
    } finally {
      this.activeFileStreams.delete(reqId)
    }
  }

  close() {
    if (this.closed) return
    this.closed = true
    if (this.idleTimer) {
      clearInterval(this.idleTimer)
      this.idleTimer = null
    }
    if (this.flightRetransmitTimer) {
      clearInterval(this.flightRetransmitTimer)
      this.flightRetransmitTimer = null
    }
    if (this.rtoTimer) {
      clearInterval(this.rtoTimer)
      this.rtoTimer = null
    }
    this.unackedByTsn.clear()
    this.notifyWindowWaiters()
    if (this.socket) {
      try {
        this.socket.close()
      } catch {}
      this.socket = null
    }
    this.onClose?.(this.id)
  }
}

export class WebRtcMediaServer {
  constructor({ onStreamRequest, onDebug, enablePublicStun = true, maxSessions = 16 } = {}) {
    this.onStreamRequest = onStreamRequest
    this.onDebug = onDebug
    this.enablePublicStun = enablePublicStun
    this.maxSessions = maxSessions
    this.sessions = new Map()
  }

  async acceptOffer(offerSdp, streamContext = {}) {
    const offerInfo = parseRemoteOfferSdp(offerSdp)
    if (!offerInfo.ufrag || !offerInfo.pwd) {
      return { ok: false, status: 400, error: 'Invalid WebRTC SDP offer (missing ice-ufrag/ice-pwd)' }
    }

    while (this.sessions.size >= this.maxSessions) {
      const oldestId = this.sessions.keys().next().value
      const oldest = this.sessions.get(oldestId)
      oldest?.close()
      this.sessions.delete(oldestId)
    }

    const peerId = `rtc-${randomBytes(6).toString('hex')}`
    const identity = getOrCreateDtlsIdentity()
    const session = new WebRtcPeerSession({
      id: peerId,
      offerInfo,
      identity,
      enablePublicStun: this.enablePublicStun,
      onDebug: this.onDebug,
      onStreamRequest: req => this.onStreamRequest?.(req, streamContext),
      onClose: id => this.sessions.delete(id),
    })
    this.sessions.set(peerId, session)
    try {
      const answerSdp = await session.initAndBuildAnswer()
      return { ok: true, peerId, sdp: answerSdp }
    } catch (error) {
      session.close()
      return { ok: false, status: 500, error: error?.message || String(error) }
    }
  }

  closeAll() {
    for (const s of this.sessions.values()) {
      s.close()
    }
    this.sessions.clear()
  }
}
