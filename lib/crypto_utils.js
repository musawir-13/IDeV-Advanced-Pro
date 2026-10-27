const crypto = require('crypto');

// Secret seed for 38-digit key checksum verification (kept strictly in licensing authority)
const MASTER_KEY_SECRET = process.env.IDEV_KEY_HMAC_SECRET || 'idev-pro-cloud-master-secret-seed-9823471089234';

/**
 * Normalizes a product key string by removing all visual grouping separators (hyphens, spaces, dots).
 * @param {string} rawKey
 * @returns {string} Digits-only string
 */
function normalizeProductKey(rawKey) {
  if (typeof rawKey !== 'string') return '';
  return rawKey.replace(/[\s\-\._]/g, '').trim();
}

/**
 * Validates the lexical format of a 38-digit product key.
 * @param {string} rawKey
 * @returns {{ valid: boolean, error?: string, normalizedKey?: string }}
 */
function validateProductKeyFormat(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') {
    return { valid: false, error: 'Product key is required' };
  }

  const normalized = normalizeProductKey(rawKey);

  if (!/^\d+$/.test(normalized)) {
    return { valid: false, error: 'Product key must contain digits only' };
  }

  if (normalized.length < 38) {
    return { valid: false, error: `Product key is too short (${normalized.length}/38 digits)` };
  }

  if (normalized.length > 38) {
    return { valid: false, error: `Product key is too long (${normalized.length}/38 digits)` };
  }

  // Format valid: exactly 38 digits
  return { valid: true, normalizedKey: normalized };
}

/**
 * Formats a 38-digit key into readable visual groups for UI display.
 * Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX (7 groups of 5 + 1 group of 3)
 * @param {string} rawKey
 * @returns {string}
 */
function formatProductKeyDisplay(rawKey) {
  const norm = normalizeProductKey(rawKey);
  if (!norm) return '';
  const parts = [];
  let remaining = norm;
  while (remaining.length > 5) {
    parts.push(remaining.slice(0, 5));
    remaining = remaining.slice(5);
  }
  if (remaining.length > 0) {
    parts.push(remaining);
  }
  return parts.join('-');
}

/**
 * Computes a 10-digit HMAC checksum for a 28-digit payload.
 * @param {string} payload - 28 digits
 * @param {string} secret
 * @returns {string} 10-digit string
 */
function computeKeyChecksum(payload, secret = MASTER_KEY_SECRET) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`IDEV-KEY-PAYLOAD:${payload}`);
  const digest = hmac.digest('hex'); // 64 hex chars
  // Extract big integer from first 16 hex chars and map to 10 decimal digits
  const sliceHex = digest.slice(0, 16);
  const bigVal = BigInt('0x' + sliceHex);
  const checksumNum = bigVal % 10000000000n; // 10 decimal digits modulo
  return checksumNum.toString().padStart(10, '0');
}

/**
 * Generates an authoritative 38-digit product key.
 * Structure:
 * - Prefix: 2 digits ("38")
 * - Entropy: 26 random decimal digits (86 bits of entropy)
 * - Checksum: 10 HMAC checksum digits
 * Total: 2 + 26 + 10 = exactly 38 digits
 * @param {string} [secret]
 * @returns {string} 38-digit normalized key string
 */
function generateAuthoritativeProductKey(secret = MASTER_KEY_SECRET) {
  const prefix = '38';

  // Generate 26 random decimal digits
  let entropy = '';
  while (entropy.length < 26) {
    const bytes = crypto.randomBytes(16);
    let numStr = BigInt('0x' + bytes.toString('hex')).toString();
    entropy += numStr;
  }
  entropy = entropy.slice(0, 26);

  const payload = prefix + entropy; // 28 digits
  const checksum = computeKeyChecksum(payload, secret); // 10 digits
  const fullKey = payload + checksum; // exactly 38 digits

  if (fullKey.length !== 38) {
    throw new Error(`Assertion failed: generated key length ${fullKey.length} !== 38`);
  }
  return fullKey;
}

/**
 * Verifies the cryptographic checksum embedded in a 38-digit key.
 * @param {string} key
 * @param {string} [secret]
 * @returns {boolean}
 */
function verifyKeyChecksum(key, secret = MASTER_KEY_SECRET) {
  const validation = validateProductKeyFormat(key);
  if (!validation.valid) return false;
  const norm = validation.normalizedKey;
  const payload = norm.slice(0, 28);
  const providedChecksum = norm.slice(28);
  const expectedChecksum = computeKeyChecksum(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(providedChecksum), Buffer.from(expectedChecksum));
}

/**
 * Generates an Ed25519 Key Pair for signing/verification.
 * @returns {{ publicKeyPem: string, privateKeyPem: string }}
 */
function generateEd25519KeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey
  };
}

/**
 * Signs a canonical data string with an Ed25519 private key.
 * @param {string} data
 * @param {string} privateKeyPem
 * @returns {string} Base64 signature
 */
function signPayload(data, privateKeyPem) {
  const signature = crypto.sign(null, Buffer.from(data, 'utf8'), privateKeyPem);
  return signature.toString('base64');
}

/**
 * Verifies an Ed25519 signature against data.
 * @param {string} data
 * @param {string} signatureBase64
 * @param {string} publicKeyPem
 * @returns {boolean}
 */
function verifyPayloadSignature(data, signatureBase64, publicKeyPem) {
  try {
    return crypto.verify(
      null,
      Buffer.from(data, 'utf8'),
      publicKeyPem,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch (err) {
    return false;
  }
}

/**
 * Produces a canonical string representation of an object (sorted keys).
 * @param {object} obj
 * @returns {string}
 */
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const entries = keys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
  return '{' + entries.join(',') + '}';
}

module.exports = {
  normalizeProductKey,
  validateProductKeyFormat,
  formatProductKeyDisplay,
  computeKeyChecksum,
  generateAuthoritativeProductKey,
  verifyKeyChecksum,
  generateEd25519KeyPair,
  signPayload,
  verifyPayloadSignature,
  canonicalStringify
};
