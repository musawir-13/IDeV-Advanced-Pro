const { getActiveEntitlement, LicenseStatus } = require('./license_authority');
const { evaluateEntitlement } = require('./entitlement_schema');
const { getDeviceIdentity } = require('./device_identity');

/**
 * Checks whether a requested model or operation requires a cloud entitlement.
 * @param {string} [modelName]
 * @param {string} [pathname]
 * @returns {boolean}
 */
function isCloudRequired(modelName, pathname = '') {
  if (pathname.includes('/web_search') || pathname.includes('/web_fetch')) {
    return true;
  }
  if (!modelName || typeof modelName !== 'string') {
    return false;
  }
  const lower = modelName.toLowerCase().trim();
  return lower.endsWith(':cloud') || lower.endsWith('-cloud') || lower.includes(':cloud') || lower === 'cloud';
}

/**
 * Authorizes or rejects a request based on licensing status.
 * @param {object} req - Incoming HTTP request
 * @param {string} [modelName] - Requested model name
 * @param {string} [profileId] - Optional current profile ID
 * @returns {{ authorized: boolean, statusCode?: number, error?: string, code?: string, entitlement?: object }}
 */
function authorizeRequest(req, modelName = null, profileId = 'default_user') {
  const pathname = req.url ? req.url.split('?')[0] : '';
  const needsCloud = isCloudRequired(modelName, pathname);

  if (!needsCloud) {
    // Free local operations always permitted
    return { authorized: true };
  }

  // Cloud operation requested: enforce entitlement at security boundary
  const activeEntitlement = getActiveEntitlement(profileId);
  const device = getDeviceIdentity();

  const evalResult = activeEntitlement.evaluation || evaluateEntitlement(activeEntitlement, {
    currentProfileId: profileId,
    currentDeviceFingerprint: device.fingerprint,
    currentTimeMs: Date.now()
  });

  if (!evalResult.active) {
    console.warn(`[Security Authorization] Blocked unauthorized cloud request: path="${pathname}", model="${modelName}", status="${evalResult.status}"`);

    return {
      authorized: false,
      statusCode: 403,
      error: `Cloud model access denied: ${evalResult.error || 'A valid 60-day IDeV Advanced Pro product key is required.'}`,
      code: 'ENTITLEMENT_REQUIRED',
      status: evalResult.status,
      tier: 'free'
    };
  }

  return {
    authorized: true,
    entitlement: activeEntitlement
  };
}

module.exports = {
  isCloudRequired,
  authorizeRequest
};
