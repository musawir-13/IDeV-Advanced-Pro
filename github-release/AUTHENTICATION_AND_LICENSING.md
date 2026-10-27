# IDeV Advanced Pro — Authentication & Licensing Architecture

**Target Version:** 3.8.9  
**Organization:** IDeV Limited  
**Security Boundary:** Server-Side Cryptographic Authorization  

---

## 1. Executive Summary & Tier Policy

IDeV Advanced Pro strictly enforces **exactly two user-facing tiers**:

| Dimension | **Free Tier** | **Ultimate Tier** |
|---|---|---|
| **Eligibility** | Default out-of-the-box tier for all profiles | Granted exclusively via valid 38-digit key activation |
| **Local Inference** | **Available** — 100% offline, unlimited, zero network calls | **Available** — Full local engine access |
| **Local Chat History** | **Available** — Stored locally in `Storage/chats/` | **Available** — Fully preserved across updates |
| **Local Tool Settings** | **Available** — Hardware governor, thread tuning, themes | **Available** — Full workspace preferences |
| **Cloud Models** | **Locked** — Blocked at server middleware with HTTP 403 | **Available** — Pinned remote models (`☁️`) enabled |
| **Cloud Web Search** | **Locked** — Blocked for unentitled profiles | **Available** — Web intelligence & link fetching |
| **Entitlement Scope** | Offline local operations only | 60-day cloud execution bound to 1 device & 1 profile |
| **Network Outage Impact** | Zero impact — runs entirely local | Local models continue running uninterrupted |
| **Expiry Behavior** | N/A (permanent free local access) | Gracefully reverts to Free tier; local data preserved |
| **Revocation Behavior** | Local functionality remains fully functional | Immediate termination of cloud execution permissions |

> [!IMPORTANT]
> **No Intermediate or Extraneous Tiers**  
> IDeV Advanced Pro recognizes **only** `Free` and `Ultimate`. There are no intermediate tiers such as Pro, Premium, Enterprise, Gold, or VIP. Administrator roles represent operational permissions, not consumer subscription tiers.

---

## 2. 38-Digit Product Key Specifications

Ultimate tier cloud access is activated using a cryptographic 38-digit product key.

### Key Anatomy & Encoding
Each product key is a high-precision 38-character decimal string structured as follows:

```
[ 98 ] [ 26 Digits Cryptographic Entropy ] [ 10 Digits HMAC-SHA256 Checksum ]
  │                     │                                   │
Prefix            CSPRNG Entropy                    Timing-Safe Checksum
```

- **Prefix (`98`)**: 2-digit identifier designating the IDeV v2 licensing protocol.
- **Entropy (26 digits)**: Generated via `crypto.randomBytes(32)` converted into high-precision decimal representations.
- **HMAC Checksum (10 digits)**: SHA-256 HMAC digest computed across the prefix and entropy payload, truncated to 10 decimal digits.
- **High-Precision Storage**: JavaScript `Number` loses precision beyond 15–17 digits. All product keys are parsed, stored, and verified strictly as **`String`** primitives.

### Display Formatting
For human entry, keys are formatted into groups of 5 digits separated by hyphens:
```
XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXX
```
The normalizer strips all formatting hyphens and whitespace prior to validation.

---

## 3. Cryptographic Entitlement & Device Binding

When a user activates a valid 38-digit key:
1. **Format & Checksum Validation**: The server verifies length (38), numeric composition, and HMAC checksum.
2. **Registry Lookup**: The key's SHA-256 hash (`IDEV-LIC:<key>`) is matched against the authoritative registry in `Storage/security/license_registry.json`.
3. **Single-Use Enforcement**: Keys marked as `ACTIVATED` or `REVOKED` are immediately rejected.
4. **Device Identity Fingerprinting**:
   - Each client generates a persistent Ed25519 identity keypair stored securely in `Storage/security/device_identity.json`.
   - The device fingerprint (`dev_<sha256>`) is cryptographically tied to the hardware environment.
5. **Authoritative Signature**:
   - The licensing authority signs the entitlement object using an Ed25519 private key (`signPayload`).
   - The active entitlement document is stored in `Storage/security/active_entitlement.json`.
6. **Time-Tampering & Clock Rollback Safeguards**:
   - The runtime records `lastObservedTimeMs`. If system time moves backwards by more than 1 hour, the state immediately transitions to `TAMPERED` and fails closed.

---

## 4. Server-Side Enforcement (Defense in Depth)

The desktop UI does not decide security authorization. All execution endpoints pass through `lib/cloud_authorizer.js`:

```mermaid
flowchart TD
    Req[Incoming HTTP Request] --> Route{Route or Model Type}
    Route -->|Local Model: 127.0.0.1:11434| Allow[Allow Execution - HTTP 200]
    Route -->|Cloud Model :cloud or Web Search| Gate[Cloud Authorization Middleware]
    Gate --> CheckEntitlement{Active Ultimate Entitlement?}
    CheckEntitlement -->|Yes: Valid, Unexpired, Bound| ExecCloud[Execute Cloud Request]
    CheckEntitlement -->|No: Free, Expired, Revoked, Mismatch| Deny[Reject with HTTP 403 ENTITLEMENT_REQUIRED]
```

### Protected Endpoints
- `/api/chat` (requests specifying `:cloud` models)
- `/api/generate` (requests specifying `:cloud` models)
- `/api/v1/chat/:id` (cloud thread routing)
- `/api/web_search` and `/api/web_fetch` (cloud intelligence tools)
- `/api/v1/settings` (preventing unauthorized activation of `WebSearchEnabled`)

---

## 5. Authentication Architecture (Mode A vs. Mode B)

IDeV Advanced Pro implements a production account authentication service (`lib/auth_service.js`):

- **Password Storage**: PBKDF2 with SHA-512, 100,000 iterations, 32-byte cryptographically random salt.
- **Session Tokens**: 256-bit cryptographically secure tokens expiring after 30 days.
- **Verification Challenges**: Real 6-digit numeric verification challenges with 10-minute validity and 3-attempt brute-force protection.
- **Infrastructure Reporting**:
  - **Mode A (Online Production)**: Operates when SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) or Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) credentials are present in environment variables. Genuine external OTP transmission occurs.
  - **Mode B (Local Profile Mode)**: Default standalone operation. Honest diagnostic endpoint (`/api/v1/auth/infrastructure`) explicitly flags external OTP delivery as `BLOCKED` with detailed required configuration fields. No fake OTPs (e.g., `123456`) are accepted.

---

## 6. Administrative CLI

Authorized operators manage licenses using `bin/license-admin.js`:

```bash
# Issue a new 38-digit key with 60-day Ultimate entitlement
node bin/license-admin.js issue --customer "Enterprise Client" --notes "Contract Q4"

# List all issued keys and device bindings
node bin/license-admin.js list

# Immediately revoke an issued or active key
node bin/license-admin.js revoke 98452109845210984521098452109845210984

# Inspect the active entitlement on the local workstation
node bin/license-admin.js status
```

---

## 7. Recovery & Reinstallation Policy

- **Application Updates**: Running the Windows installer for version updates preserves `Storage/security/` and `Storage/profiles/`. Active Ultimate entitlements remain intact.
- **Clean OS Reinstallation**: Reinstalling the OS resets the hardware fingerprint. An administrator must revoke the previous activation and issue a replacement key.
- **Local Data Preservation**: Expiration of an Ultimate entitlement never touches conversations, downloaded models, or custom settings. All assets remain completely accessible under the Free tier.
