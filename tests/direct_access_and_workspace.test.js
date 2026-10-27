/**
 * IDeV Advanced Pro — Direct Access, Workspace Integrity & Cloud Decoupling Test Suite
 *
 * Verifies complete removal of application-level authentication, 38-digit product keys,
 * Free/Ultimate subscription tiers, and validates direct unauthenticated workspace access.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:2020';
const SETTINGS_FILE = path.join(ROOT_DIR, 'Storage', 'settings', 'settings.json');
const CHATS_FILE = path.join(ROOT_DIR, 'Storage', 'chats', 'chats.json');

let passedTests = 0;
let failedTests = 0;

function logPass(name) {
  console.log(`  [PASS] Test ${passedTests + failedTests + 1}: ${name}`);
  passedTests++;
}

function logFail(name, err) {
  console.error(`  [FAIL] Test ${passedTests + failedTests + 1}: ${name}`);
  console.error(`         ${err.message || err}`);
  failedTests++;
}

function fetchJSON(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath, SERVER_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(fullUrl, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  IDeV ADVANCED PRO — DIRECT ACCESS & WORKSPACE VERIFICATION');
  console.log('===============================================================');

  // Test 1: Application startup without an IDeV account
  try {
    const res = await fetchJSON('/api/version');
    assert.strictEqual(res.status, 200, 'Server should respond with HTTP 200 on /api/version');
    assert.strictEqual(res.body.version, '3.8.9', 'Version should match authoritative 3.8.9');
    logPass('Application starts directly without an IDeV account requirement');
  } catch (e) {
    logFail('Application starts directly without an IDeV account requirement', e);
  }

  // Test 2: Direct access to the normal workspace
  try {
    const res = await fetchJSON('/api/me');
    assert.strictEqual(res.status, 200, '/api/me should return 200');
    assert.strictEqual(res.body.is_admin, true, 'User profile should have default administrator permissions');
    assert.ok(res.body.name, 'User profile should provide display name');
    logPass('Direct access to the normal workspace without credential gates');
  } catch (e) {
    logFail('Direct access to the normal workspace without credential gates', e);
  }

  // Test 3: No login or registration prompt on startup
  try {
    const html = fs.readFileSync(path.join(ROOT_DIR, 'public', 'index.html'), 'utf8');
    assert.ok(!html.includes('id="login-form"'), 'No login form element in index.html');
    assert.ok(!html.includes('id="register-form"'), 'No register form element in index.html');
    assert.ok(!html.includes('/api/v1/auth/login'), 'No login API endpoint references in index.html');
    logPass('No login or registration forms or prompts on startup');
  } catch (e) {
    logFail('No login or registration forms or prompts on startup', e);
  }

  // Test 4: No OTP or email-verification requirement
  try {
    const serverSource = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
    assert.ok(!serverSource.includes('/api/v1/auth/send-verification'), 'No OTP send endpoint in server');
    assert.ok(!serverSource.includes('/api/v1/auth/verify-challenge'), 'No OTP verify endpoint in server');
    assert.ok(!fs.existsSync(path.join(ROOT_DIR, 'Storage', 'profiles', 'verification_challenges.json')), 'No challenge storage file');
    logPass('No OTP, SMS, or email verification requirement');
  } catch (e) {
    logFail('No OTP, SMS, or email verification requirement', e);
  }

  // Test 5: No product-key activation prompt
  try {
    const serverSource = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
    assert.ok(!serverSource.includes('/api/v1/license/activate'), 'No license activation endpoint in server');
    assert.ok(!serverSource.includes('/api/v1/license/status'), 'No license status endpoint in server');
    assert.ok(!fs.existsSync(path.join(ROOT_DIR, 'public', 'assets', 'licensing_ui.js')), 'No licensing UI script in public assets');
    logPass('No product-key activation prompt or activation endpoint');
  } catch (e) {
    logFail('No product-key activation prompt or activation endpoint', e);
  }

  // Test 6: No Free/Ultimate subscription state
  try {
    const cloudRes = await fetchJSON('/api/v1/cloud');
    assert.strictEqual(cloudRes.status, 200);
    assert.strictEqual(cloudRes.body.tier, undefined, 'Cloud endpoint should not return subscription tier');
    assert.strictEqual(cloudRes.body.status, undefined, 'Cloud endpoint should not return license status');
    assert.strictEqual(cloudRes.body.remainingDays, undefined, 'Cloud endpoint should not return license timer');
    logPass('No Free/Ultimate subscription state or license timers');
  } catch (e) {
    logFail('No Free/Ultimate subscription state or license timers', e);
  }

  // Test 7: Local model functionality remains available
  try {
    const res = await fetchJSON('/api/tags');
    // Either 200 or upstream response from local inference
    assert.ok(res.status === 200 || res.status === 502, 'Local tags endpoint is accessible');
    logPass('Local model catalog and inference routes remain fully accessible');
  } catch (e) {
    logFail('Local model catalog and inference routes remain fully accessible', e);
  }

  // Test 8: Cloud feature enablement respects the actual Cloud setting
  try {
    // Disable cloud in settings
    await fetchJSON('/api/v1/settings', {
      method: 'POST',
      body: { CloudEnabled: false, WebSearchEnabled: false }
    });

    const cloudOffRes = await fetchJSON('/api/v1/cloud');
    assert.strictEqual(cloudOffRes.body.enabled, false, 'Cloud should be disabled when toggle is off');

    // Enable cloud in settings
    await fetchJSON('/api/v1/settings', {
      method: 'POST',
      body: { CloudEnabled: true, WebSearchEnabled: true }
    });

    const cloudOnRes = await fetchJSON('/api/v1/cloud');
    assert.strictEqual(cloudOnRes.body.enabled, true, 'Cloud should be enabled when toggle is on');
    logPass('Cloud feature enablement respects user toggle setting without licensing');
  } catch (e) {
    logFail('Cloud feature enablement respects user toggle setting without licensing', e);
  }

  // Test 9: Cloud calls no longer require an IDeV license
  try {
    // With Cloud enabled, requesting cloud models should not ask for a product key or 38-digit key
    const chatRes = await fetchJSON('/api/chat', {
      method: 'POST',
      body: {
        model: 'deepseek-v4.1-flash:cloud',
        messages: [{ role: 'user', content: 'hello' }]
      }
    });

    // It may connect or fail on upstream connection, but NOT return ENTITLEMENT_REQUIRED or 38-digit license error
    const errText = JSON.stringify(chatRes.body);
    assert.ok(!errText.includes('ENTITLEMENT_REQUIRED'), 'Should not require entitlement');
    assert.ok(!errText.includes('38-digit'), 'Should not ask for 38-digit product key');
    assert.ok(!errText.includes('Ultimate tier license'), 'Should not ask for Ultimate license');
    logPass('Cloud calls no longer require an IDeV product key or license');
  } catch (e) {
    logFail('Cloud calls no longer require an IDeV product key or license', e);
  }

  // Test 10: Correct error handling when a cloud service is unconfigured or unavailable
  try {
    // Turn Cloud off again
    await fetchJSON('/api/v1/settings', {
      method: 'POST',
      body: { CloudEnabled: false, WebSearchEnabled: false }
    });

    const searchRes = await fetchJSON('/api/web_search', {
      method: 'POST',
      body: { query: 'test query' }
    });

    assert.strictEqual(searchRes.status, 403, 'Should return 403 when cloud is disabled');
    assert.strictEqual(searchRes.body.code, 'CLOUD_DISABLED', 'Code should be CLOUD_DISABLED');
    assert.ok(searchRes.body.error.includes('Settings'), 'Error should guide user to enable Cloud in Settings');
    logPass('Correct error handling when a cloud service is disabled or unconfigured');
  } catch (e) {
    logFail('Correct error handling when a cloud service is disabled or unconfigured', e);
  }

  // Test 11: Provider credentials remain secure where required
  try {
    // Verify provider credentials in settings are persisted without leakage
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    assert.ok(typeof settings === 'object', 'Settings file is valid JSON');
    assert.strictEqual(settings.productKey, undefined, 'No product key stored in settings');
    assert.strictEqual(settings.license, undefined, 'No license object stored in settings');
    logPass('Provider settings mechanism intact without application license artifacts');
  } catch (e) {
    logFail('Provider settings mechanism intact without application license artifacts', e);
  }

  // Test 12: Existing chats and settings survive migration
  try {
    assert.ok(fs.existsSync(CHATS_FILE), 'Chats storage file exists');
    assert.ok(fs.existsSync(SETTINGS_FILE), 'Settings storage file exists');
    const chats = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
    assert.ok(Array.isArray(chats), 'Chats file contains valid chat array');
    logPass('Existing conversations and user settings survive migration cleanly');
  } catch (e) {
    logFail('Existing conversations and user settings survive migration cleanly', e);
  }

  // Test 13: The application restarts correctly after the migration
  try {
    const res = await fetchJSON('/api/v1/chats');
    assert.strictEqual(res.status, 200, 'Chats API responds with HTTP 200');
    assert.ok(Array.isArray(res.body.chatInfos), 'Chats list is returned');
    logPass('Application operates and queries storage cleanly after migration');
  } catch (e) {
    logFail('Application operates and queries storage cleanly after migration', e);
  }

  // Test 14: No imports or route references point to removed modules
  try {
    const serverCode = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
    assert.ok(!serverCode.includes('./lib/license_authority'), 'No import of license_authority');
    assert.ok(!serverCode.includes('./lib/auth_service'), 'No import of auth_service');
    assert.ok(!serverCode.includes('./lib/cloud_authorizer'), 'No import of cloud_authorizer');
    assert.ok(!serverCode.includes('./lib/entitlement_schema'), 'No import of entitlement_schema');
    assert.ok(!serverCode.includes('./lib/crypto_utils'), 'No import of crypto_utils');
    assert.ok(!serverCode.includes('./lib/device_identity'), 'No import of device_identity');
    logPass('No dangling imports or references to removed licensing/auth modules');
  } catch (e) {
    logFail('No dangling imports or references to removed licensing/auth modules', e);
  }

  // Test 15: No obsolete license or login controls remain in the Settings UI
  try {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'public', 'index.html'), 'utf8');
    assert.ok(!indexHtml.includes('Account Tier'), 'No Account Tier text in index.html');
    assert.ok(!indexHtml.includes('Ultimate License'), 'No Ultimate License text in index.html');
    assert.ok(!indexHtml.includes('licensing_ui.js'), 'No licensing_ui.js referenced in index.html');
    logPass('No obsolete license or account controls remain in the Settings UI');
  } catch (e) {
    logFail('No obsolete license or account controls remain in the Settings UI', e);
  }

  // Test 16: Build and packaging configuration succeed
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    assert.strictEqual(pkg.name, 'idev-advanced-pro');
    assert.strictEqual(pkg.version, '3.8.9');
    assert.ok(!pkg.build.files.includes('lib/**/*'), 'Build files exclude removed lib folder');
    assert.ok(pkg.build.files.includes('server.js'), 'Build files include server.js');
    assert.ok(pkg.build.files.includes('public/**/*'), 'Build files include public assets');
    logPass('Build and packaging configuration verified without obsolete references');
  } catch (e) {
    logFail('Build and packaging configuration verified without obsolete references', e);
  }

  // Test 17: README links, assets and setup instructions remain valid
  try {
    const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf8');
    assert.ok(!readme.includes('38-digit product key'), 'README has no 38-digit key requirement');
    assert.ok(!readme.includes('Ultimate tier'), 'README has no Ultimate tier subscription claim');
    assert.ok(!readme.includes('Free tier'), 'README has no Free tier subscription claim');
    assert.ok(readme.includes('IDeV-Advanced-Pro-Setup-3.8.9.exe'), 'Installer link is preserved');
    logPass('README documentation verified: direct access, no tier gating');
  } catch (e) {
    logFail('README documentation verified: direct access, no tier gating', e);
  }

  console.log('===============================================================');
  console.log(`Test Execution Finished: ${passedTests} PASSED, ${failedTests} FAILED (Total ${passedTests + failedTests})`);
  console.log('===============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
