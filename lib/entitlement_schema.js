/**
 * Entitlement Schema & Lifecycle Validator for IDeV Advanced Pro.
 */

const DURATION_60_DAYS_MS = 60 * 24 * 60 * 60 * 1000; // Exact 60 days in milliseconds

const Tiers = {
  FREE: 'free',
  ULTIMATE: 'ultimate'
};

const LicenseStatus = {
  FREE: 'FREE',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  DEVICE_MISMATCH: 'DEVICE_MISMATCH',
  PROFILE_MISMATCH: 'PROFILE_MISMATCH',
  TAMPERED: 'TAMPERED'
};

/**
 * Normalizes any legacy or external tier string into canonical 'free' or 'ultimate'.
 * @param {string} [tierStr]
 * @returns {'free' | 'ultimate'}
 */
function normalizeTier(tierStr) {
  if (!tierStr) return Tiers.FREE;
  const lower = String(tierStr).toLowerCase().trim();
  if (lower === 'ultimate' || lower === 'cloud_pro' || lower === 'active') {
    return Tiers.ULTIMATE;
  }
  return Tiers.FREE;
}

/**
 * Creates the default Free-tier entitlement object.
 * @returns {object}
 */
function createFreeTierEntitlement() {
  return {
    schemaVersion: 2,
    licenseId: 'free_tier_local_only',
    tier: Tiers.FREE,
    status: LicenseStatus.FREE,
    boundProfileId: null,
    boundDeviceFingerprint: null,
    product: 'IDeV Advanced Pro',
    scope: ['local_models'],
    activatedAt: null,
    activatedAtMs: null,
    expiresAt: null,
    expiresAtMs: null,
    isRevoked: false,
    revokedAt: null,
    issuedBy: 'IDeV Limited',
    lastObservedTimeMs: Date.now()
  };
}

/**
 * Creates an authoritative Ultimate 60-day Entitlement.
 * @param {object} params
 * @param {string} params.licenseId
 * @param {string} params.boundProfileId
 * @param {string} params.boundDeviceFingerprint
 * @param {number} [params.nowMs]
 * @returns {object}
 */
function createCloudEntitlement({ licenseId, boundProfileId, boundDeviceFingerprint, nowMs = Date.now() }) {
  const activatedAtMs = nowMs;
  const expiresAtMs = activatedAtMs + DURATION_60_DAYS_MS;

  return {
    schemaVersion: 2,
    licenseId,
    tier: Tiers.ULTIMATE,
    status: LicenseStatus.ACTIVE,
    boundProfileId,
    boundDeviceFingerprint,
    product: 'IDeV Advanced Pro',
    scope: ['local_models', 'cloud_models', 'multimodal_cloud', 'web_search'],
    activatedAt: new Date(activatedAtMs).toISOString(),
    activatedAtMs,
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresAtMs,
    isRevoked: false,
    revokedAt: null,
    issuedBy: 'IDeV Limited Licensing Authority',
    lastObservedTimeMs: activatedAtMs
  };
}

/**
 * Evaluates an entitlement against the current execution context and time.
 * @param {object} entitlement
 * @param {object} context
 * @param {string} context.currentProfileId
 * @param {string} context.currentDeviceFingerprint
 * @param {number} [context.currentTimeMs]
 * @returns {{ active: boolean, status: string, error?: string, remainingDays: number, remainingHours: number }}
 */
function evaluateEntitlement(entitlement, context) {
  if (!entitlement || normalizeTier(entitlement.tier) === Tiers.FREE || !entitlement.licenseId || entitlement.licenseId === 'free_tier_local_only') {
    return {
      active: false,
      tier: Tiers.FREE,
      status: LicenseStatus.FREE,
      remainingDays: 0,
      remainingHours: 0,
      error: 'Free tier: Local models only. Cloud access requires an active Ultimate product key.'
    };
  }

  const nowMs = (context && context.currentTimeMs) ? context.currentTimeMs : Date.now();

  // 1. Revocation check
  if (entitlement.isRevoked) {
    return {
      active: false,
      tier: Tiers.FREE,
      status: LicenseStatus.REVOKED,
      remainingDays: 0,
      remainingHours: 0,
      error: 'License entitlement has been administratively revoked.'
    };
  }

  // 2. Profile binding check
  if (entitlement.boundProfileId && context && context.currentProfileId && entitlement.boundProfileId !== context.currentProfileId) {
    return {
      active: false,
      tier: Tiers.FREE,
      status: LicenseStatus.PROFILE_MISMATCH,
      remainingDays: 0,
      remainingHours: 0,
      error: `Entitlement bound to another profile (${entitlement.boundProfileId}).`
    };
  }

  // 3. Device binding check
  if (entitlement.boundDeviceFingerprint && context && context.currentDeviceFingerprint && entitlement.boundDeviceFingerprint !== context.currentDeviceFingerprint) {
    return {
      active: false,
      tier: Tiers.FREE,
      status: LicenseStatus.DEVICE_MISMATCH,
      remainingDays: 0,
      remainingHours: 0,
      error: 'Entitlement bound to another hardware device.'
    };
  }

  // 4. Clock rollback detection (more than 1 hour backwards)
  if (entitlement.lastObservedTimeMs && nowMs < entitlement.lastObservedTimeMs - 3600000) {
    return {
      active: false,
      tier: Tiers.FREE,
      status: LicenseStatus.TAMPERED,
      remainingDays: 0,
      remainingHours: 0,
      error: 'System clock tampering detected. System time is earlier than previous verification timestamp.'
    };
  }

  // 5. Expiration check
  if (nowMs >= entitlement.expiresAtMs) {
    return {
      active: false,
      tier: Tiers.FREE,
      status: LicenseStatus.EXPIRED,
      remainingDays: 0,
      remainingHours: 0,
      error: `Cloud entitlement expired on ${entitlement.expiresAt}. Local models remain available under Free tier.`
    };
  }

  // Valid and active Ultimate entitlement
  const remainingMs = Math.max(0, entitlement.expiresAtMs - nowMs);
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingDays = Math.floor(remainingHours / 24);

  return {
    active: true,
    tier: Tiers.ULTIMATE,
    status: LicenseStatus.ACTIVE,
    remainingDays,
    remainingHours,
    expiresAt: entitlement.expiresAt
  };
}

module.exports = {
  Tiers,
  LicenseStatus,
  DURATION_60_DAYS_MS,
  normalizeTier,
  createFreeTierEntitlement,
  createCloudEntitlement,
  evaluateEntitlement
};
