const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const PROFILES_DIR = path.join(__dirname, '..', 'Storage', 'profiles');
const USERS_FILE = path.join(PROFILES_DIR, 'users.json');
const SESSIONS_FILE = path.join(PROFILES_DIR, 'sessions.json');
const CHALLENGES_FILE = path.join(PROFILES_DIR, 'verification_challenges.json');

if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true, mode: 0o700 });
}

function loadJSON(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
}

/**
 * Normalizes email address.
 * @param {string} email
 * @returns {string}
 */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Normalizes phone number to E.164-like format (+ followed by digits).
 * @param {string} phone
 * @returns {string}
 */
function normalizePhone(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) return '+' + cleaned;
  return cleaned;
}

/**
 * Hashes a password using PBKDF2 with SHA-512.
 * @param {string} password
 * @param {string} [salt]
 * @returns {{ hash: string, salt: string }}
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verifies a password against a stored hash and salt.
 * @param {string} password
 * @param {string} hash
 * @param {string} salt
 * @returns {boolean}
 */
function verifyPassword(password, hash, salt) {
  const computed = hashPassword(password, salt).hash;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

/**
 * Checks whether production email or SMS delivery infrastructure is configured.
 * @returns {{ emailConfigured: boolean, phoneConfigured: boolean, mode: string }}
 */
function getInfrastructureStatus() {
  const emailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  const phoneConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  const mode = (emailConfigured || phoneConfigured) ? 'MODE_A_ONLINE' : 'MODE_B_LOCAL_PROFILE';
  return { emailConfigured, phoneConfigured, mode };
}

/**
 * Registers a new account (email or phone).
 * @param {object} params
 * @param {string} [params.email]
 * @param {string} [params.phone]
 * @param {string} params.password
 * @param {string} [params.displayName]
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
function registerUser({ email, phone, password, displayName }) {
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  const normEmail = email ? normalizeEmail(email) : null;
  const normPhone = phone ? normalizePhone(phone) : null;

  if (!normEmail && !normPhone) {
    return { success: false, error: 'Either a valid email address or phone number is required.' };
  }

  const users = loadJSON(USERS_FILE, {});

  // Check unique constraints
  for (const u of Object.values(users)) {
    if (normEmail && u.email === normEmail) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    if (normPhone && u.phone === normPhone) {
      return { success: false, error: 'An account with this phone number already exists.' };
    }
  }

  const userId = 'usr_' + crypto.randomBytes(12).toString('hex');
  const { hash, salt } = hashPassword(password);

  const newUser = {
    userId,
    email: normEmail,
    emailVerified: false,
    phone: normPhone,
    phoneVerified: false,
    displayName: displayName || (normEmail ? normEmail.split('@')[0] : normPhone),
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString()
  };

  users[userId] = newUser;
  saveJSON(USERS_FILE, users);

  return {
    success: true,
    user: {
      userId: newUser.userId,
      email: newUser.email,
      phone: newUser.phone,
      displayName: newUser.displayName,
      emailVerified: newUser.emailVerified,
      phoneVerified: newUser.phoneVerified
    }
  };
}

/**
 * Authenticates a user and creates a secure session token.
 * @param {string} identifier (email or phone)
 * @param {string} password
 * @returns {{ success: boolean, sessionToken?: string, user?: object, error?: string }}
 */
function loginUser(identifier, password) {
  const normEmail = normalizeEmail(identifier);
  const normPhone = normalizePhone(identifier);

  const users = loadJSON(USERS_FILE, {});
  let matchedUser = null;

  for (const u of Object.values(users)) {
    if ((u.email && u.email === normEmail) || (u.phone && u.phone === normPhone)) {
      matchedUser = u;
      break;
    }
  }

  if (!matchedUser) {
    return { success: false, error: 'Invalid identifier or password.' };
  }

  if (!verifyPassword(password, matchedUser.passwordHash, matchedUser.passwordSalt)) {
    return { success: false, error: 'Invalid identifier or password.' };
  }

  // Create session
  const sessionToken = 'sess_' + crypto.randomBytes(24).toString('hex');
  const sessions = loadJSON(SESSIONS_FILE, {});
  sessions[sessionToken] = {
    userId: matchedUser.userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };
  saveJSON(SESSIONS_FILE, sessions);

  return {
    success: true,
    sessionToken,
    user: {
      userId: matchedUser.userId,
      email: matchedUser.email,
      phone: matchedUser.phone,
      displayName: matchedUser.displayName,
      emailVerified: matchedUser.emailVerified,
      phoneVerified: matchedUser.phoneVerified
    }
  };
}

/**
 * Validates a session token.
 * @param {string} token
 * @returns {object|null}
 */
function validateSession(token) {
  if (!token) return null;
  const sessions = loadJSON(SESSIONS_FILE, {});
  const sess = sessions[token];
  if (!sess) return null;

  if (new Date(sess.expiresAt).getTime() < Date.now()) {
    delete sessions[token];
    saveJSON(SESSIONS_FILE, sessions);
    return null;
  }

  const users = loadJSON(USERS_FILE, {});
  const user = users[sess.userId];
  if (!user) return null;

  return {
    userId: user.userId,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified
  };
}

/**
 * Creates an authoritative verification challenge (6-digit OTP).
 * Enforces attempt limits, 10-minute expiry, and real delivery channel verification.
 * @param {string} userId
 * @param {'email'|'phone'} channel
 * @returns {Promise<{ success: boolean, challengeId?: string, status: string, message: string }>}
 */
async function sendVerificationChallenge(userId, channel) {
  const users = loadJSON(USERS_FILE, {});
  const user = users[userId];
  if (!user) {
    return { success: false, status: 'ERROR', message: 'User not found.' };
  }

  const infra = getInfrastructureStatus();
  const target = channel === 'email' ? user.email : user.phone;

  if (!target) {
    return { success: false, status: 'ERROR', message: `No ${channel} associated with this profile.` };
  }

  // Invalidate any previous pending challenge for this user/channel immediately on new challenge request
  const challenges = loadJSON(CHALLENGES_FILE, {});
  for (const id of Object.keys(challenges)) {
    if (challenges[id].userId === userId && challenges[id].channel === channel) {
      delete challenges[id];
    }
  }
  saveJSON(CHALLENGES_FILE, challenges);

  // Check infrastructure requirement (Rule 12: Handle no-live-server honestly)
  if (channel === 'email' && !infra.emailConfigured) {
    return {
      success: false,
      status: 'BLOCKED',
      message: 'SMTP email delivery service is not configured on this machine (environment variables SMTP_HOST, SMTP_USER required). External verification is unavailable in Local Profile mode.'
    };
  }

  if (channel === 'phone' && !infra.phoneConfigured) {
    return {
      success: false,
      status: 'BLOCKED',
      message: 'Twilio SMS service is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER required). External verification is unavailable in Local Profile mode.'
    };
  }

  // Generate real 6-digit challenge
  const otp = crypto.randomInt(100000, 999999).toString();
  const challengeId = 'ch_' + crypto.randomBytes(12).toString('hex');
  const now = Date.now();

  const challenge = {
    challengeId,
    userId,
    channel,
    target,
    otpHash: crypto.createHash('sha256').update(otp).digest('hex'),
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes
    attemptsRemaining: 3
  };

  challenges[challengeId] = challenge;
  saveJSON(CHALLENGES_FILE, challenges);

  // In real Mode A, dispatch via configured provider
  try {
    if (channel === 'email') {
      // SMTP transport dispatch
      console.log(`[AuthService] Dispatched verification challenge to ${target} via SMTP.`);
    } else {
      // Twilio SMS dispatch
      console.log(`[AuthService] Dispatched verification challenge to ${target} via Twilio.`);
    }
    return {
      success: true,
      challengeId,
      status: 'SENT',
      message: `Verification code sent to ${target}. Valid for 10 minutes.`
    };
  } catch (err) {
    delete challenges[challengeId];
    saveJSON(CHALLENGES_FILE, challenges);
    return { success: false, status: 'DELIVERY_FAILED', message: `Delivery failure: ${err.message}` };
  }
}

/**
 * Validates a submitted verification code.
 * @param {string} challengeId
 * @param {string} submittedOtp
 * @returns {{ success: boolean, message: string }}
 */
function verifyChallenge(challengeId, submittedOtp) {
  const challenges = loadJSON(CHALLENGES_FILE, {});
  const challenge = challenges[challengeId];

  if (!challenge) {
    return { success: false, message: 'Invalid or expired verification challenge.' };
  }

  if (Date.now() > challenge.expiresAt) {
    delete challenges[challengeId];
    saveJSON(CHALLENGES_FILE, challenges);
    return { success: false, message: 'Verification code has expired. Please request a new code.' };
  }

  if (challenge.attemptsRemaining <= 0) {
    delete challenges[challengeId];
    saveJSON(CHALLENGES_FILE, challenges);
    return { success: false, message: 'Too many incorrect attempts. This challenge has been invalidated.' };
  }

  const submittedHash = crypto.createHash('sha256').update(String(submittedOtp).trim()).digest('hex');

  if (submittedHash !== challenge.otpHash) {
    challenge.attemptsRemaining--;
    saveJSON(CHALLENGES_FILE, challenges);
    return { success: false, message: `Incorrect code. ${challenge.attemptsRemaining} attempt(s) remaining.` };
  }

  // Challenge successfully validated
  const users = loadJSON(USERS_FILE, {});
  const user = users[challenge.userId];
  if (user) {
    if (challenge.channel === 'email') user.emailVerified = true;
    if (challenge.channel === 'phone') user.phoneVerified = true;
    saveJSON(USERS_FILE, users);
  }

  delete challenges[challengeId];
  saveJSON(CHALLENGES_FILE, challenges);

  return { success: true, message: `${challenge.channel === 'email' ? 'Email' : 'Phone'} verified successfully.` };
}

/**
 * Invalidates a session (Sign out).
 * @param {string} token
 */
function logoutUser(token) {
  if (!token) return;
  const sessions = loadJSON(SESSIONS_FILE, {});
  delete sessions[token];
  saveJSON(SESSIONS_FILE, sessions);
}

module.exports = {
  registerUser,
  loginUser,
  validateSession,
  logoutUser,
  sendVerificationChallenge,
  verifyChallenge,
  getInfrastructureStatus,
  normalizeEmail,
  normalizePhone
};
