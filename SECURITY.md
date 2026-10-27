# Security Policy — IDeV Advanced Pro

**Product:** IDeV Advanced Pro  
**Developer:** IDeV Limited  
**Version:** 3.8.9  

We take the security of IDeV Advanced Pro seriously. This document outlines our supported versions, security architecture, operational boundaries, and vulnerability reporting procedures.

---

## 1. Supported Versions

Security updates and patches are provided exclusively for the current active release line.

| Version | Supported | Status |
|---|---|---|
| **3.8.x** | :white_check_mark: Supported | Active Release Line |
| **< 3.8.9** | :x: End of Life | Unsupported |

---

## 2. Security Architecture & Operational Boundaries

IDeV Advanced Pro v3.8.9 implements defense-in-depth security principles across its desktop client and server layers:

- **Server-Side Authorization Gating**: Client UI state does not determine permissions. Requests to remote cloud endpoints (`:cloud`) and web intelligence routes are gated at the server layer (`lib/cloud_authorizer.js`) and rejected with HTTP 403 `ENTITLEMENT_REQUIRED` for unentitled users.
- **Cryptographic Entitlement Signatures**: Entitlements are signed with Ed25519 digital signatures. Any unauthorized local modification to entitlement documents results in signature verification failure and immediate fallback to the Free tier.
- **Device & Profile Binding**: Entitlements are bound to a local hardware entropy fingerprint (SHA-256 digest of system parameters) and the active profile ID.
- **Clock Rollback Detection**: Backwards system clock tampering exceeding 1 hour triggers immediate state invalidation (`TAMPERED`).
- **Secret & Credential Handling**: User passwords are encrypted using PBKDF2 with SHA-512 (100,000 iterations and 32-byte salts). Product keys are stored as SHA-256 hashes (`IDEV-LIC:<key>`) in the local registry to prevent raw key exposure.
- **Private Storage Isolation**: Developer models (`Storage/models/` and `Storage/cloud models/`) are strictly excluded from repository tracking, installer builds, and runtime distributions.

### Documented Security Boundaries & Limitations
- **Code Signing Status**: The Windows setup executable is self-packaged from source and is currently **unsigned** (no commercial EV code-signing certificate is attached). Windows SmartScreen will display an unrecognized publisher prompt by default. Users must verify the SHA-256 checksum against trusted release metadata prior to installation.
- **Local Key Storage**: Device keys and entitlement tokens are stored as JSON files under `Storage/security/` with user-level filesystem permissions (`0o600`). They are **not** hardware-sealed via Windows DPAPI or TPM hardware in the standalone desktop client.
- **Standalone vs. Global Enforcement**: In standalone desktop mode (Mode B), the license registry is stored on the local drive. A standalone offline client cannot independently prevent a key from being redeemed on a separate, disconnected computer with its own clean registry. Global network-wide single-use enforcement requires deploying a centralized shared licensing server (Mode A).
- **Test Suite Scope**: The 30 automated test cases in `tests/security_and_licensing.test.js` validate client-side authorization logic, signature verification, and route gating. They do not constitute third-party penetration testing or distributed network validation.

---

## 3. Reporting a Vulnerability

If you discover a potential security vulnerability in IDeV Advanced Pro:

1. **Do not disclose the issue publicly** in an open GitHub issue or public forum.
2. Submit a report through **GitHub Private Vulnerability Reporting**:
   - Navigate to: [https://github.com/musawir-13/IDeV-Advanced-Pro/security](https://github.com/musawir-13/IDeV-Advanced-Pro/security)
   - Click **Report a vulnerability** to open an encrypted advisory draft.
3. Provide detailed steps to reproduce the vulnerability, including:
   - Operating system and version.
   - Exact application version.
   - Specific input payloads, commands, or workflow steps.
   - Assessment of the vulnerability's impact and potential attack vector.

### Response Timeline
- **Initial Acknowledgement**: Within 48 hours of report submission.
- **Triage & Assessment**: Within 5 business days.
- **Fix & Public Advisory**: Delivered via an update release as soon as verified.
