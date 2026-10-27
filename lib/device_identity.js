const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { generateEd25519KeyPair, signPayload, verifyPayloadSignature } = require('./crypto_utils');

const SECURITY_DIR = path.join(__dirname, '..', 'Storage', 'security');
const DEVICE_KEY_FILE = path.join(SECURITY_DIR, 'device_identity.json');

/**
 * Initializes or retrieves the device's persistent cryptographic identity.
 * Combines an asymmetric Ed25519 keypair with machine-specific entropy.
 * @returns {{ deviceId: string, fingerprint: string, publicKeyPem: string, sign: (data: string) => string }}
 */
function getDeviceIdentity() {
  if (!fs.existsSync(SECURITY_DIR)) {
    fs.mkdirSync(SECURITY_DIR, { recursive: true, mode: 0o700 });
  }

  let identity = null;
  if (fs.existsSync(DEVICE_KEY_FILE)) {
    try {
      identity = JSON.parse(fs.readFileSync(DEVICE_KEY_FILE, 'utf8'));
    } catch (e) {
      identity = null;
    }
  }

  if (!identity || !identity.publicKeyPem || !identity.privateKeyPem || !identity.deviceId) {
    const keyPair = generateEd25519KeyPair();
    const deviceId = 'dev_' + crypto.randomBytes(16).toString('hex');
    const machineEntropy = `${os.platform()}-${os.arch()}-${os.userInfo().username}-${deviceId}`;
    const fingerprint = 'fp_' + crypto.createHash('sha256').update(keyPair.publicKeyPem + machineEntropy).digest('hex').slice(0, 32);

    identity = {
      deviceId,
      fingerprint,
      publicKeyPem: keyPair.publicKeyPem,
      privateKeyPem: keyPair.privateKeyPem,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(DEVICE_KEY_FILE, JSON.stringify(identity, null, 2), { encoding: 'utf8', mode: 0o600 });
  }

  return {
    deviceId: identity.deviceId,
    fingerprint: identity.fingerprint,
    publicKeyPem: identity.publicKeyPem,
    sign: (data) => signPayload(data, identity.privateKeyPem)
  };
}

/**
 * Verifies that a given signature was created by a device matching the public key / fingerprint.
 * @param {string} data
 * @param {string} signatureBase64
 * @param {string} publicKeyPem
 * @returns {boolean}
 */
function verifyDeviceSignature(data, signatureBase64, publicKeyPem) {
  return verifyPayloadSignature(data, signatureBase64, publicKeyPem);
}

module.exports = {
  getDeviceIdentity,
  verifyDeviceSignature,
  SECURITY_DIR
};
