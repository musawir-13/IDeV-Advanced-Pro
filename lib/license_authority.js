const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  normalizeProductKey,
  validateProductKeyFormat,
  generateAuthoritativeProductKey,
  verifyKeyChecksum,
  generateEd25519KeyPair,
  signPayload,
  verifyPayloadSignature,
  canonicalStringify
} = require('./crypto_utils');
const {
  createFreeTierEntitlement,
  createCloudEntitlement,
  evaluateEntitlement,
  LicenseStatus
} = require('./entitlement_schema');
const { getDeviceIdentity } = require('./device_identity');

const SECURITY_DIR = path.join(__dirname, '..', 'Storage', 'security');
const REGISTRY_FILE = path.join(SECURITY_DIR, 'license_registry.json');
const ACTIVE_ENTITLEMENT_FILE = path.join(SECURITY_DIR, 'active_entitlement.json');
const AUTHORITY_KEY_FILE = path.join(SECURITY_DIR, 'authority_keys.json');

// Ensure directory exists
if (!fs.existsSync(SECURITY_DIR)) {
  fs.mkdirSync(SECURITY_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Initializes or loads the Authority Ed25519 Signing Keys.
 * In production, the private key lives on the licensing server, and only the public key is on clients.
 */
function getAuthorityKeys() {
  if (fs.existsSync(AUTHORITY_KEY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(AUTHORITY_KEY_FILE, 'utf8'));
    } catch (e) {}
  }
  const keyPair = generateEd25519KeyPair();
  const keys = {
    publicKeyPem: keyPair.publicKeyPem,
    privateKeyPem: keyPair.privateKeyPem,
    keyId: 'idev_auth_v2',
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(AUTHORITY_KEY_FILE, JSON.stringify(keys, null, 2), { encoding: 'utf8', mode: 0o600 });
  return keys;
}

/**
 * Loads the authoritative license registry.
 * Keys are stored as SHA-256 hashes of the normalized 38-digit key to avoid plaintext storage.
 * @returns {Record<string, object>}
 */
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

/**
 * Saves the authoritative license registry.
 * @param {Record<string, object>} registry
 */
function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), { encoding: 'utf8', mode: 0o600 });
}

/**
 * Hashes a normalized product key for secure storage.
 * @param {string} normKey
 * @returns {string}
 */
function hashKey(normKey) {
  return crypto.createHash('sha256').update(`IDEV-LIC:${normKey}`).digest('hex');
}

/**
 * Issues a new 38-digit product key and records it in the authoritative registry.
 * @param {object} [options]
 * @param {string} [options.issuedTo]
 * @param {string} [options.notes]
 * @returns {{ key: string, licenseId: string, state: string, expiresDays: number }}
 */
function issueProductKey(options = {}) {
  const rawKey = generateAuthoritativeProductKey();
  const normKey = normalizeProductKey(rawKey);
  const keyHash = hashKey(normKey);
  const licenseId = 'lic_' + crypto.randomBytes(12).toString('hex');

  const record = {
    licenseId,
    keyHash,
    state: 'ISSUED', // ISSUED -> ACTIVATED -> REVOKED
    issuedAt: new Date().toISOString(),
    issuedTo: options.issuedTo || 'customer',
    notes: options.notes || '60-day single-device cloud access',
    permittedDurationDays: 60,
    activatedAt: null,
    expiresAt: null,
    boundProfileId: null,
    boundDeviceFingerprint: null,
    isRevoked: false,
    revokedAt: null
  };

  const registry = loadRegistry();
  registry[keyHash] = record;
  saveRegistry(registry);

  return {
    key: normKey,
    licenseId,
    state: record.state,
    permittedDurationDays: 60
  };
}

/**
 * Claims and activates a 38-digit product key for a given profile and device.
 * Enforces single-use, single-profile, and single-device atomicity.
 * @param {string} rawKey
 * @param {string} profileId
 * @param {object} [deviceInfo]
 * @returns {{ success: boolean, entitlement?: object, error?: string, code?: string }}
 */
function activateProductKey(rawKey, profileId, deviceInfo = null) {
  const validation = validateProductKeyFormat(rawKey);
  if (!validation.valid) {
    return { success: false, error: validation.error, code: 'INVALID_FORMAT' };
  }

  const normKey = validation.normalizedKey;

  // Verify cryptographic checksum embedded in the key
  if (!verifyKeyChecksum(normKey)) {
    return { success: false, error: 'Product key checksum verification failed. The key is invalid.', code: 'CHECKSUM_FAILED' };
  }

  const device = deviceInfo || getDeviceIdentity();
  const keyHash = hashKey(normKey);
  const registry = loadRegistry();
  const record = registry[keyHash];

  if (!record) {
    return { success: false, error: 'Product key was not found in the authoritative license database.', code: 'KEY_NOT_FOUND' };
  }

  if (record.isRevoked) {
    return { success: false, error: 'This product key has been administratively revoked.', code: 'KEY_REVOKED' };
  }

  // Enforce single-use atomicity
  if (record.state === 'ACTIVATED') {
    // Check if it's re-activating on the exact same profile and device
    if (record.boundProfileId === profileId && record.boundDeviceFingerprint === device.fingerprint) {
      // Re-issue active lease
      const active = getActiveEntitlement();
      return { success: true, entitlement: active, message: 'License re-activated on existing bound device.' };
    }

    if (record.boundDeviceFingerprint && record.boundDeviceFingerprint !== device.fingerprint) {
      return { success: false, error: 'This product key is already bound to another device. Single-device restriction strictly enforced.', code: 'DEVICE_MISMATCH' };
    }

    if (record.boundProfileId && record.boundProfileId !== profileId) {
      return { success: false, error: 'This product key is already bound to another profile. Single-profile restriction strictly enforced.', code: 'PROFILE_MISMATCH' };
    }

    return { success: false, error: 'This product key has already been activated and cannot be reused.', code: 'KEY_ALREADY_ACTIVATED' };
  }

  // Atomically claim key
  const now = Date.now();
  const entitlement = createCloudEntitlement({
    licenseId: record.licenseId,
    boundProfileId: profileId,
    boundDeviceFingerprint: device.fingerprint,
    nowMs: now
  });

  // Sign entitlement with Authority private key (signing immutable core claims)
  const authKeys = getAuthorityKeys();
  const { lastObservedTimeMs, ...signableData } = entitlement;
  const canonicalData = canonicalStringify(signableData);
  const signature = signPayload(canonicalData, authKeys.privateKeyPem);

  const signedEntitlement = {
    ...entitlement,
    signature,
    authorityKeyId: authKeys.keyId
  };

  // Update registry record
  record.state = 'ACTIVATED';
  record.activatedAt = entitlement.activatedAt;
  record.expiresAt = entitlement.expiresAt;
  record.boundProfileId = profileId;
  record.boundDeviceFingerprint = device.fingerprint;
  saveRegistry(registry);

  // Save active entitlement locally
  fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(signedEntitlement, null, 2), { encoding: 'utf8', mode: 0o600 });

  return {
    success: true,
    entitlement: signedEntitlement
  };
}

/**
 * Retrieves the currently active local entitlement, verifying its signature and expiry.
 * @param {string} [currentProfileId]
 * @returns {object}
 */
function getActiveEntitlement(currentProfileId = 'default_user') {
  const device = getDeviceIdentity();

  if (!fs.existsSync(ACTIVE_ENTITLEMENT_FILE)) {
    return createFreeTierEntitlement();
  }

  try {
    const raw = fs.readFileSync(ACTIVE_ENTITLEMENT_FILE, 'utf8');
    const signedEntitlement = JSON.parse(raw);

    if (signedEntitlement.tier === 'free') {
      return signedEntitlement;
    }

    // Verify cryptographic signature on core immutable claims
    const authKeys = getAuthorityKeys();
    const { signature, authorityKeyId, lastObservedTimeMs, evaluation: _prevEval, ...dataWithoutSig } = signedEntitlement;
    const canonicalData = canonicalStringify(dataWithoutSig);

    const isSigValid = verifyPayloadSignature(canonicalData, signature, authKeys.publicKeyPem);
    if (!isSigValid) {
      console.warn('[Security] Entitlement signature verification failed: corrupted or tampered file.');
      return {
        ...createFreeTierEntitlement(),
        status: LicenseStatus.TAMPERED,
        error: 'Cryptographic signature verification failed. Entitlement tampered.'
      };
    }

    // Update last observed time to detect rollbacks
    const evaluation = evaluateEntitlement(signedEntitlement, {
      currentProfileId: currentProfileId || signedEntitlement.boundProfileId,
      currentDeviceFingerprint: device.fingerprint,
      currentTimeMs: Date.now()
    });

    if (evaluation.active) {
      signedEntitlement.lastObservedTimeMs = Date.now();
      // Write updated timestamp atomically
      try {
        fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(signedEntitlement, null, 2), { encoding: 'utf8' });
      } catch (e) {}
    }

    return {
      ...signedEntitlement,
      tier: evaluation.active ? 'ultimate' : 'free',
      evaluation
    };
  } catch (err) {
    return createFreeTierEntitlement();
  }
}

/**
 * Administratively revokes a license by key or licenseId.
 * @param {string} keyOrId
 * @returns {{ success: boolean, message: string }}
 */
function revokeLicense(keyOrId) {
  const registry = loadRegistry();
  let found = null;

  // Check if it's a raw key
  const normKey = normalizeProductKey(keyOrId);
  const keyH = hashKey(normKey);
  if (registry[keyH]) {
    found = registry[keyH];
  } else {
    // Check if it's a licenseId
    for (const k of Object.keys(registry)) {
      if (registry[k].licenseId === keyOrId) {
        found = registry[k];
        break;
      }
    }
  }

  if (!found) {
    return { success: false, message: 'License record not found.' };
  }

  found.isRevoked = true;
  found.revokedAt = new Date().toISOString();
  found.state = 'REVOKED';
  saveRegistry(registry);

  // If currently active entitlement matches, invalidate and re-sign immediately
  if (fs.existsSync(ACTIVE_ENTITLEMENT_FILE)) {
    try {
      const active = JSON.parse(fs.readFileSync(ACTIVE_ENTITLEMENT_FILE, 'utf8'));
      if (active.licenseId === found.licenseId) {
        active.isRevoked = true;
        active.revokedAt = found.revokedAt;
        active.status = 'REVOKED';
        const authKeys = getAuthorityKeys();
        const { signature, authorityKeyId, lastObservedTimeMs, evaluation, ...signable } = active;
        active.signature = signPayload(canonicalStringify(signable), authKeys.privateKeyPem);
        fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(active, null, 2), { encoding: 'utf8' });
      }
    } catch (e) {}
  }

  return { success: true, message: `License ${found.licenseId} successfully revoked.` };
}

/**
 * Returns a summary of all licenses in the registry (for admin tools).
 * @returns {Array<object>}
 */
function listLicenses() {
  const registry = loadRegistry();
  return Object.values(registry).map(r => ({
    licenseId: r.licenseId,
    state: r.state,
    issuedAt: r.issuedAt,
    activatedAt: r.activatedAt,
    expiresAt: r.expiresAt,
    boundProfileId: r.boundProfileId,
    boundDeviceFingerprint: r.boundDeviceFingerprint,
    isRevoked: r.isRevoked
  }));
}

module.exports = {
  issueProductKey,
  activateProductKey,
  getActiveEntitlement,
  revokeLicense,
  listLicenses,
  loadRegistry,
  saveRegistry,
  hashKey,
  ACTIVE_ENTITLEMENT_FILE,
  REGISTRY_FILE
};
