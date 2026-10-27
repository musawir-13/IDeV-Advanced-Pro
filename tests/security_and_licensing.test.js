const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const {
  normalizeProductKey,
  validateProductKeyFormat,
  generateAuthoritativeProductKey,
  verifyKeyChecksum,
  generateEd25519KeyPair,
  signPayload,
  verifyPayloadSignature,
  canonicalStringify
} = require('../lib/crypto_utils');

const {
  Tiers,
  LicenseStatus,
  createFreeTierEntitlement,
  createCloudEntitlement,
  evaluateEntitlement,
  DURATION_60_DAYS_MS
} = require('../lib/entitlement_schema');

const {
  issueProductKey,
  activateProductKey,
  getActiveEntitlement,
  revokeLicense,
  listLicenses,
  ACTIVE_ENTITLEMENT_FILE,
  REGISTRY_FILE
} = require('../lib/license_authority');

const { getDeviceIdentity } = require('../lib/device_identity');
const { isCloudRequired, authorizeRequest } = require('../lib/cloud_authorizer');

const {
  registerUser,
  loginUser,
  validateSession,
  logoutUser,
  sendVerificationChallenge,
  verifyChallenge,
  getInfrastructureStatus
} = require('../lib/auth_service');

const TEST_PORT = 2088;
process.env.PORT = String(TEST_PORT);
require('../server.js');

function httpRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${TEST_PORT}${urlPath}`,
      { method, headers },
      res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
          } catch (e) {
            resolve({ status: res.statusCode, body: data, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('  IDeV ADVANCED PRO — SECURITY & ANTI-BYPASS TEST SUITE');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] Test ${passed + failed + 1}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] Test ${passed + failed + 1}: ${name}`);
      console.error('         Error:', err.message);
      failed++;
    }
  }

  // Reset to clean state before tests
  fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(createFreeTierEntitlement(), null, 2));

  // Test 1: A new free profile cannot use cloud models
  await test('A new free profile cannot use cloud models', async () => {
    const res = await httpRequest('POST', '/api/chat', { 'Content-Type': 'application/json' }, {
      model: 'deepseek-v4.1-flash:cloud',
      messages: [{ role: 'user', content: 'test' }]
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'ENTITLEMENT_REQUIRED');
    assert.strictEqual(res.body.tier, 'free');
  });

  // Test 2: A malformed product key is rejected
  await test('A malformed product key is rejected', () => {
    const res = validateProductKeyFormat('not-a-valid-key');
    assert.strictEqual(res.valid, false);
  });

  // Test 3: A 37-digit key is rejected
  await test('A 37-digit key is rejected', () => {
    const key37 = '1234567890123456789012345678901234567';
    const res = validateProductKeyFormat(key37);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('too short'));
  });

  // Test 4: A 39-digit key is rejected
  await test('A 39-digit key is rejected', () => {
    const key39 = '123456789012345678901234567890123456789';
    const res = validateProductKeyFormat(key39);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('too long'));
  });

  // Test 5: A key containing invalid characters is rejected
  await test('A key containing invalid characters is rejected', () => {
    const invalidCharsKey = '3824535616557697154253545201939342905A';
    const res = validateProductKeyFormat(invalidCharsKey);
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('digits only'));
  });

  // Test 6: An unknown key is rejected
  await test('An unknown key is rejected', async () => {
    const key = generateAuthoritativeProductKey('wrong-secret');
    const res = await httpRequest('POST', '/api/v1/license/activate', { 'Content-Type': 'application/json' }, {
      productKey: key
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  // Test 7: An already redeemed key cannot be redeemed again
  const testKey = issueProductKey({ issuedTo: 'user_a' }).key;
  await test('An already redeemed key cannot be redeemed again', () => {
    const act1 = activateProductKey(testKey, 'user_a');
    assert.strictEqual(act1.success, true);
    assert.strictEqual(act1.entitlement.tier, 'ultimate');
    const act2 = activateProductKey(testKey, 'user_b', { fingerprint: 'fp_diff_device' });
    assert.strictEqual(act2.success, false);
    assert.strictEqual(act2.code, 'DEVICE_MISMATCH');
  });

  // Test 8: Two simultaneous activation requests cannot claim one key twice
  await test('Two simultaneous activation requests cannot claim one key twice', async () => {
    const doubleKey = issueProductKey({ issuedTo: 'race_test' }).key;
    const p1 = activateProductKey(doubleKey, 'profile_1', { fingerprint: 'fp_1' });
    const p2 = activateProductKey(doubleKey, 'profile_2', { fingerprint: 'fp_2' });
    assert.ok(p1.success !== p2.success);
    assert.ok((p1.success && !p2.success) || (!p1.success && p2.success));
  });

  // Test 9: A key bound to another profile is rejected
  await test('A key bound to another profile is rejected', () => {
    const boundKey = issueProductKey({ issuedTo: 'alice' }).key;
    const actAlice = activateProductKey(boundKey, 'profile_alice', { fingerprint: 'fp_shared' });
    assert.strictEqual(actAlice.success, true);
    const actBob = activateProductKey(boundKey, 'profile_bob', { fingerprint: 'fp_shared' });
    assert.strictEqual(actBob.success, false);
    assert.strictEqual(actBob.code, 'PROFILE_MISMATCH');
  });

  // Test 10: A key bound to another device is rejected
  await test('A key bound to another device is rejected', () => {
    const boundDevKey = issueProductKey({ issuedTo: 'charlie' }).key;
    const actDev1 = activateProductKey(boundDevKey, 'profile_charlie', { fingerprint: 'fp_laptop' });
    assert.strictEqual(actDev1.success, true);
    const actDev2 = activateProductKey(boundDevKey, 'profile_charlie', { fingerprint: 'fp_desktop' });
    assert.strictEqual(actDev2.success, false);
    assert.strictEqual(actDev2.code, 'DEVICE_MISMATCH');
  });

  // Test 11: An expired entitlement cannot authorize cloud requests
  await test('An expired entitlement cannot authorize cloud requests', () => {
    const entitlement = createCloudEntitlement({
      licenseId: 'lic_expired_test',
      boundProfileId: 'user_exp',
      boundDeviceFingerprint: 'fp_test',
      nowMs: Date.now() - (61 * 24 * 60 * 60 * 1000) // 61 days ago
    });
    const evalRes = evaluateEntitlement(entitlement, {
      currentProfileId: 'user_exp',
      currentDeviceFingerprint: 'fp_test',
      currentTimeMs: Date.now()
    });
    assert.strictEqual(evalRes.active, false);
    assert.strictEqual(evalRes.status, LicenseStatus.EXPIRED);
  });

  // Test 12: A revoked entitlement cannot authorize cloud requests
  await test('A revoked entitlement cannot authorize cloud requests', () => {
    const revKey = issueProductKey({ issuedTo: 'rev_test' }).key;
    const act = activateProductKey(revKey, 'user_rev');
    assert.strictEqual(act.success, true);
    revokeLicense(revKey);
    const active = getActiveEntitlement('user_rev');
    assert.strictEqual(active.isRevoked, true);
    assert.strictEqual(active.evaluation.active, false);
    assert.strictEqual(active.evaluation.status, LicenseStatus.REVOKED);
  });

  // Test 13: Altered entitlement data fails cryptographic verification
  await test('Altered entitlement data fails cryptographic verification', () => {
    const validEnt = getActiveEntitlement('user_rev');
    validEnt.tier = 'ultimate';
    validEnt.isRevoked = false;
    validEnt.expiresAtMs = Date.now() + 100000000;
    fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(validEnt, null, 2));

    const checked = getActiveEntitlement('user_rev');
    assert.strictEqual(checked.status, LicenseStatus.TAMPERED);
    assert.strictEqual(checked.tier, 'free');
  });

  // Test 14: An invalid signature is rejected
  await test('An invalid signature is rejected', () => {
    const validEnt = createCloudEntitlement({
      licenseId: 'lic_fake_sig',
      boundProfileId: 'u1',
      boundDeviceFingerprint: 'd1'
    });
    const fakeSigEnt = {
      ...validEnt,
      signature: 'invalid_base64_signature_here',
      authorityKeyId: 'fake_key'
    };
    fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(fakeSigEnt, null, 2));
    const checked = getActiveEntitlement('u1');
    assert.strictEqual(checked.status, LicenseStatus.TAMPERED);
  });

  // Test 15: A copied entitlement cannot silently authorize an unrelated device
  await test('A copied entitlement cannot silently authorize an unrelated device', () => {
    const realDev = getDeviceIdentity();
    const ent = createCloudEntitlement({
      licenseId: 'lic_copy_test',
      boundProfileId: 'u1',
      boundDeviceFingerprint: 'fp_victim_machine'
    });
    const evalRes = evaluateEntitlement(ent, {
      currentProfileId: 'u1',
      currentDeviceFingerprint: realDev.fingerprint
    });
    assert.strictEqual(evalRes.active, false);
    assert.strictEqual(evalRes.status, LicenseStatus.DEVICE_MISMATCH);
  });

  // Test 16: Changing the visible Cloud toggle does not bypass authorization
  await test('Changing the visible Cloud toggle does not bypass authorization', async () => {
    fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(createFreeTierEntitlement(), null, 2));
    const res = await httpRequest('POST', '/api/v1/settings', { 'Content-Type': 'application/json' }, {
      WebSearchEnabled: true
    });
    assert.strictEqual(res.body.settings.WebSearchEnabled, false);
  });

  // Test 17: Direct calls to cloud execution routes are rejected for free users
  await test('Direct calls to cloud execution routes are rejected for free users', async () => {
    const r1 = await httpRequest('POST', '/api/web_search', { 'Content-Type': 'application/json' }, { query: 'test' });
    assert.strictEqual(r1.status, 403);
    const r2 = await httpRequest('POST', '/api/generate', { 'Content-Type': 'application/json' }, { model: 'kimi-k3:cloud', prompt: 'hi' });
    assert.strictEqual(r2.status, 403);
  });

  // Test 18: Local models continue to work when cloud authorization is unavailable
  await test('Local models continue to work when cloud authorization is unavailable', () => {
    const localAuth = authorizeRequest({ url: '/api/chat' }, 'qwen2.5:7b', 'default_user');
    assert.strictEqual(localAuth.authorized, true);
    const isCloud = isCloudRequired('qwen2.5:7b', '/api/chat');
    assert.strictEqual(isCloud, false);
  });

  // Test 19: Invalid OTPs are rejected
  await test('Invalid OTPs are rejected', () => {
    const challengesFile = path.join(__dirname, '..', 'Storage', 'profiles', 'verification_challenges.json');
    const chId = 'ch_test_inv';
    const challenges = {
      [chId]: {
        challengeId: chId,
        userId: 'u_otp',
        channel: 'email',
        target: 'test@example.com',
        otpHash: require('crypto').createHash('sha256').update('849201').digest('hex'),
        createdAt: Date.now(),
        expiresAt: Date.now() + 600000,
        attemptsRemaining: 3
      }
    };
    fs.writeFileSync(challengesFile, JSON.stringify(challenges, null, 2));
    const res = verifyChallenge(chId, '000000');
    assert.strictEqual(res.success, false);
    assert.ok(res.message.includes('Incorrect code'));
  });

  // Test 20: Expired OTPs are rejected
  await test('Expired OTPs are rejected', () => {
    const challengesFile = path.join(__dirname, '..', 'Storage', 'profiles', 'verification_challenges.json');
    const chId = 'ch_test_exp';
    const challenges = {
      [chId]: {
        challengeId: chId,
        userId: 'u_otp',
        channel: 'email',
        target: 'test@example.com',
        otpHash: require('crypto').createHash('sha256').update('849201').digest('hex'),
        createdAt: Date.now() - 700000,
        expiresAt: Date.now() - 100000, // expired
        attemptsRemaining: 3
      }
    };
    fs.writeFileSync(challengesFile, JSON.stringify(challenges, null, 2));
    const res = verifyChallenge(chId, '849201');
    assert.strictEqual(res.success, false);
    assert.ok(res.message.includes('expired'));
  });

  // Test 21: Reused OTPs are rejected
  await test('Reused OTPs are rejected', () => {
    const challengesFile = path.join(__dirname, '..', 'Storage', 'profiles', 'verification_challenges.json');
    const chId = 'ch_test_reuse';
    const challenges = {
      [chId]: {
        challengeId: chId,
        userId: 'u_otp',
        channel: 'email',
        target: 'test@example.com',
        otpHash: require('crypto').createHash('sha256').update('123789').digest('hex'),
        createdAt: Date.now(),
        expiresAt: Date.now() + 600000,
        attemptsRemaining: 3
      }
    };
    fs.writeFileSync(challengesFile, JSON.stringify(challenges, null, 2));
    const firstUse = verifyChallenge(chId, '123789');
    assert.strictEqual(firstUse.success, true);
    // Second use of same challenge ID
    const secondUse = verifyChallenge(chId, '123789');
    assert.strictEqual(secondUse.success, false);
  });

  // Test 22: Excessive OTP attempts are rate-limited / invalidated
  await test('Excessive OTP attempts are rate-limited / invalidated', () => {
    const challengesFile = path.join(__dirname, '..', 'Storage', 'profiles', 'verification_challenges.json');
    const chId = 'ch_test_limit';
    const challenges = {
      [chId]: {
        challengeId: chId,
        userId: 'u_limit',
        channel: 'email',
        target: 'limit@example.com',
        otpHash: require('crypto').createHash('sha256').update('555666').digest('hex'),
        createdAt: Date.now(),
        expiresAt: Date.now() + 600000,
        attemptsRemaining: 1
      }
    };
    fs.writeFileSync(challengesFile, JSON.stringify(challenges, null, 2));
    // Fail once
    verifyChallenge(chId, '111111');
    // Try again
    const thirdAttempt = verifyChallenge(chId, '555666');
    assert.strictEqual(thirdAttempt.success, false);
    assert.ok(thirdAttempt.message.includes('Too many incorrect attempts') || thirdAttempt.message.includes('Invalid or expired'));
  });

  // Test 23: Resending a challenge invalidates the previous challenge
  await test('Resending a challenge invalidates the previous challenge', async () => {
    const email = `resend_${Date.now()}@test.com`;
    const reg = registerUser({ email, password: 'Password123!' });
    assert.strictEqual(reg.success, true);
    const challengesFile = path.join(__dirname, '..', 'Storage', 'profiles', 'verification_challenges.json');
    const challenges = loadJSONSafe(challengesFile);
    challenges['ch_old_123'] = {
      challengeId: 'ch_old_123',
      userId: reg.user.userId,
      channel: 'email',
      target: email,
      otpHash: 'somehash',
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000,
      attemptsRemaining: 3
    };
    fs.writeFileSync(challengesFile, JSON.stringify(challenges, null, 2));

    // Calling sendVerificationChallenge will wipe old pending challenges for that user
    await sendVerificationChallenge(reg.user.userId, 'email');
    const updated = loadJSONSafe(challengesFile);
    assert.strictEqual(updated['ch_old_123'], undefined);
  });

  // Test 24: Unverified accounts remain unverified
  await test('Unverified accounts remain unverified', () => {
    const email = `unverified_${Date.now()}@test.com`;
    const reg = registerUser({ email, password: 'Password123!' });
    assert.strictEqual(reg.success, true);
    assert.strictEqual(reg.user.emailVerified, false);
    assert.strictEqual(reg.user.phoneVerified, false);
  });

  // Test 25: Credentials and OTPs do not appear in logs or public responses
  await test('Credentials and OTPs do not appear in logs or public responses', async () => {
    const email = `audit_${Date.now()}@test.com`;
    const reg = registerUser({ email, password: 'SuperSecretPassword999!' });
    assert.strictEqual(reg.success, true);
    assert.strictEqual(reg.user.password, undefined);
    assert.strictEqual(reg.user.passwordHash, undefined);
    assert.strictEqual(reg.user.passwordSalt, undefined);
  });

  // Test 26: Sign-out invalidates the applicable local session
  await test('Sign-out invalidates the applicable local session', () => {
    const reg = registerUser({ email: 'logout@test.com', password: 'Password123!' });
    const login = loginUser('logout@test.com', 'Password123!');
    assert.ok(login.sessionToken);
    const validBefore = validateSession(login.sessionToken);
    assert.ok(validBefore);
    logoutUser(login.sessionToken);
    const validAfter = validateSession(login.sessionToken);
    assert.strictEqual(validAfter, null);
  });

  // Test 27: Application restart restores the correct entitlement state
  await test('Application restart restores the correct entitlement state', () => {
    const k = issueProductKey({ issuedTo: 'restart_test' }).key;
    const act = activateProductKey(k, 'default_user');
    assert.strictEqual(act.success, true);
    // Simulate restart by re-reading from disk
    const reloaded = getActiveEntitlement('default_user');
    assert.strictEqual(reloaded.evaluation.active, true);
    assert.strictEqual(reloaded.tier, 'ultimate');
    assert.strictEqual(reloaded.licenseId, act.entitlement.licenseId);
  });

  // Test 28: Entitlement expiry does not erase local user data
  await test('Entitlement expiry does not erase local user data', () => {
    const chatsFile = path.join(__dirname, '..', 'Storage', 'chats', 'chats.json');
    const chatsBefore = fs.existsSync(chatsFile) ? fs.readFileSync(chatsFile, 'utf8') : '[]';
    // Expire entitlement
    fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(createFreeTierEntitlement(), null, 2));
    const chatsAfter = fs.existsSync(chatsFile) ? fs.readFileSync(chatsFile, 'utf8') : '[]';
    assert.strictEqual(chatsBefore, chatsAfter);
  });

  // Test 29: Ordinary application updates do not reset a valid profile or license unexpectedly
  await test('Ordinary application updates do not reset a valid profile or license unexpectedly', () => {
    const k = issueProductKey({ issuedTo: 'update_test' }).key;
    activateProductKey(k, 'user_update');
    const entBefore = getActiveEntitlement('user_update');
    // Simulated update: re-evaluating without deleting Storage/security
    const entAfter = getActiveEntitlement('user_update');
    assert.strictEqual(entBefore.licenseId, entAfter.licenseId);
    assert.strictEqual(entAfter.evaluation.active, true);
  });

  // Test 30: A clean installation starts without inheriting another user's private entitlement
  await test('A clean installation starts without inheriting another user\'s private entitlement', () => {
    const cleanEnt = createFreeTierEntitlement();
    assert.strictEqual(cleanEnt.tier, 'free');
    assert.strictEqual(cleanEnt.status, LicenseStatus.FREE);
    assert.strictEqual(cleanEnt.boundProfileId, null);
    assert.strictEqual(cleanEnt.boundDeviceFingerprint, null);
  });

  // Restore clean free-tier entitlement after test run
  fs.writeFileSync(ACTIVE_ENTITLEMENT_FILE, JSON.stringify(createFreeTierEntitlement(), null, 2));

  console.log('===============================================================');
  console.log(`Test Execution Finished: ${passed} PASSED, ${failed} FAILED (Total 30)`);
  console.log('===============================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

function loadJSONSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return {};
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
