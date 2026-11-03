import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign,
  verify,
} from 'node:crypto'

/**
 * Generate or restore VAPID ECDSA P-256 keypair for W3C Web Push (RFC 8292).
 * Zero external dependencies — uses Node.js built-in node:crypto.
 */
export function generateOrLoadVapidKeys(existing = null) {
  if (existing?.publicKey && existing?.privateJwk && existing?.publicJwk) {
    return existing
  }
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  })
  const publicJwk = publicKey.export({ format: 'jwk' })
  const privateJwk = privateKey.export({ format: 'jwk' })

  // Uncompressed 65-byte EC point (0x04 || X || Y) for browser applicationServerKey
  const xBuf = Buffer.from(publicJwk.x, 'base64url')
  const yBuf = Buffer.from(publicJwk.y, 'base64url')
  const uncompressedPub = Buffer.concat([Buffer.from([0x04]), xBuf, yBuf])

  return {
    publicKey: uncompressedPub.toString('base64url'),
    publicJwk,
    privateJwk,
    createdAt: Date.now(),
  }
}

/**
 * Create RFC 8292 VAPID Authorization header (`vapid t=<jwt>, k=<pubKey>`)
 * Compatible with Apple iOS 16.4+ Web Push (web.push.apple.com), FCM, and Mozilla autopush.
 */
export function createVapidHeaders(endpoint, vapidKeys, subject = 'mailto:admin@dsh-hub.local') {
  const urlObj = new URL(endpoint)
  const aud = `${urlObj.protocol}//${urlObj.host}`
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600

  const headerB64 = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify({ aud, exp, sub: subject })).toString('base64url')
  const signingInput = `${headerB64}.${payloadB64}`

  const privKeyObj = createPrivateKey({ key: vapidKeys.privateJwk, format: 'jwk' })
  const signature = sign('sha256', Buffer.from(signingInput, 'utf8'), {
    key: privKeyObj,
    dsaEncoding: 'ieee-p1363',
  })

  const jwt = `${signingInput}.${signature.toString('base64url')}`
  return {
    authorization: `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
    jwt,
  }
}

/**
 * Verify a VAPID JWT token against the VAPID public key (used in tests and diagnostics).
 */
export function verifyVapidJwt(jwt, vapidKeys) {
  const parts = String(jwt || '').split('.')
  if (parts.length !== 3) return false
  const pubKeyObj = createPublicKey({ key: vapidKeys.publicJwk, format: 'jwk' })
  const signingInput = `${parts[0]}.${parts[1]}`
  const sigBuf = Buffer.from(parts[2], 'base64url')
  const ok = verify('sha256', Buffer.from(signingInput, 'utf8'), {
    key: pubKeyObj,
    dsaEncoding: 'ieee-p1363',
  }, sigBuf)
  if (!ok) return false
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  return payload
}

/**
 * Encrypt a Web Push notification payload using RFC 8291 (`aes128gcm` content encoding).
 * @param {string|Buffer} payload - JSON string or buffer to encrypt
 * @param {{ p256dh: string, auth: string }} subscriptionKeys - Client subscription keys from PushSubscription.toJSON()
 */
export function encryptWebPushPayload(payload, subscriptionKeys) {
  if (!subscriptionKeys?.p256dh || !subscriptionKeys?.auth) {
    throw new Error('Missing subscription p256dh or auth key')
  }
  const uaPublicKey = decodeBase64Any(subscriptionKeys.p256dh)
  const authSecret = decodeBase64Any(subscriptionKeys.auth)
  if (uaPublicKey.length !== 65 || uaPublicKey[0] !== 0x04) {
    throw new Error('Invalid subscriber p256dh public key (must be 65-byte uncompressed P-256 point)')
  }
  if (authSecret.length < 16) {
    throw new Error('Invalid subscriber auth secret (must be at least 16 bytes)')
  }

  const localEcdh = createECDH('prime256v1')
  localEcdh.generateKeys()
  const asPublicKey = localEcdh.getPublicKey()
  const ecdhSecret = localEcdh.computeSecret(uaPublicKey)
  const salt = randomBytes(16)

  // RFC 8291 Section 3.3 & 3.4: Combine ECDH and authentication secret via HKDF-SHA256
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'ascii'),
    uaPublicKey,
    asPublicKey,
  ])
  const ikm = Buffer.from(hkdfSync('sha256', ecdhSecret, authSecret, keyInfo, 32))

  const cekInfo = Buffer.from('Content-Encoding: aes128gcm\0', 'ascii')
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, cekInfo, 16))

  const nonceInfo = Buffer.from('Content-Encoding: nonce\0', 'ascii')
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, nonceInfo, 12))

  // Pad payload with single final record delimiter 0x02 (RFC 8188 / RFC 8291)
  const plainBuf = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), 'utf8')
  const paddedPlain = Buffer.concat([plainBuf, Buffer.from([0x02])])

  const cipher = createCipheriv('aes-128-gcm', cek, nonce)
  const encrypted = Buffer.concat([cipher.update(paddedPlain), cipher.final()])
  const authTag = cipher.getAuthTag()

  // RFC 8188 aes128gcm binary header: salt (16B) || rs (4B, 4096) || idlen (1B, 65) || keyid (65B asPublicKey)
  const header = Buffer.alloc(21 + asPublicKey.length)
  salt.copy(header, 0)
  header.writeUInt32BE(4096, 16)
  header.writeUInt8(asPublicKey.length, 20)
  asPublicKey.copy(header, 21)

  const body = Buffer.concat([header, encrypted, authTag])
  return {
    body,
    salt,
    asPublicKey,
  }
}

/**
 * Decrypt an RFC 8291 `aes128gcm` Web Push payload (used in unit/integration tests to verify client decryption).
 */
export function decryptWebPushPayload(encryptedBody, clientEcdh, authSecretBuf) {
  const buf = Buffer.isBuffer(encryptedBody) ? encryptedBody : Buffer.from(encryptedBody)
  const salt = buf.subarray(0, 16)
  const idlen = buf.readUInt8(20)
  const asPublicKey = buf.subarray(21, 21 + idlen)
  const cipherAndTag = buf.subarray(21 + idlen)
  const ciphertext = cipherAndTag.subarray(0, cipherAndTag.length - 16)
  const authTag = cipherAndTag.subarray(cipherAndTag.length - 16)

  const uaPublicKey = clientEcdh.getPublicKey()
  const ecdhSecret = clientEcdh.computeSecret(asPublicKey)
  const authBuf = decodeBase64Any(authSecretBuf)

  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'ascii'),
    uaPublicKey,
    asPublicKey,
  ])
  const ikm = Buffer.from(hkdfSync('sha256', ecdhSecret, authBuf, keyInfo, 32))
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'ascii'), 16))
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'ascii'), 12))

  const decipher = createDecipheriv('aes-128-gcm', cek, nonce)
  decipher.setAuthTag(authTag)
  const padded = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  const delimIdx = padded.lastIndexOf(0x02)
  const unpadded = delimIdx >= 0 ? padded.subarray(0, delimIdx) : padded
  return unpadded.toString('utf8')
}

/**
 * Send an encrypted Web Push notification to a subscriber endpoint (e.g. web.push.apple.com).
 */
export async function sendWebPushNotification(
  subscription,
  payloadObj,
  vapidKeys,
  { fetchImpl = globalThis.fetch, urgency = 'high', ttl = 3600 } = {},
) {
  if (!subscription?.endpoint || !subscription?.keys) {
    return { ok: false, status: 400, error: 'Invalid push subscription object' }
  }
  const payloadStr = typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj)
  const { body } = encryptWebPushPayload(payloadStr, subscription.keys)
  const { authorization } = createVapidHeaders(subscription.endpoint, vapidKeys)

  const res = await fetchImpl(subscription.endpoint, {
    method: 'POST',
    headers: {
      authorization,
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      'content-length': String(body.length),
      ttl: String(ttl),
      urgency,
    },
    body,
  })

  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    expired: res.status === 404 || res.status === 410,
  }
}

function decodeBase64Any(input) {
  if (Buffer.isBuffer(input)) return input
  const str = String(input || '').trim()
  if (str.includes('-') || str.includes('_')) {
    return Buffer.from(str, 'base64url')
  }
  return Buffer.from(str, 'base64')
}

