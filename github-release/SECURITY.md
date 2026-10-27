# Security Policy — IDeV Advanced Pro

**Product:** IDeV Advanced Pro  
**Developer:** IDeV Limited  

We take the security of IDeV Advanced Pro seriously. This document describes our supported versions and the process for reporting security vulnerabilities.

---

## Supported Versions

Only the latest release of IDeV Advanced Pro receives active security patches.

| Version | Supported |
|---|---|
| 3.8.x | :white_check_mark: Supported |
| < 3.8.9 | :x: End of Life |

---

## Security Architecture & Safeguards

IDeV Advanced Pro v3.8.9 employs defense-in-depth principles:
- **Server-Side Authorization Boundary**: Client UI elements cannot grant access to cloud models or features. Requests to remote cloud endpoints (`:cloud`) and web intelligence are verified server-side against cryptographic entitlements.
- **Cryptographic Entitlement Signatures**: Entitlements are signed with Ed25519 digital signatures. Any local modification or tampering results in signature verification failure and immediate fallback to the Free tier.
- **Device & Profile Binding**: Entitlements are bound to unique hardware fingerprints and specific profile IDs, preventing unauthorized copy/paste migrations between machines.
- **Clock Rollback Detection**: Backwards system clock tampering exceeding 1 hour triggers immediate state invalidation (`TAMPERED`).
- **Zero Plaintext Secrets**: Passwords are protected using PBKDF2 with SHA-512 (100,000 iterations and 32-byte salts). Product keys are stored as SHA-256 hashes in the authoritative registry.
- **Private Storage Isolation**: Developer models (`Storage/models/` and `Storage/cloud models/`) are excluded from repository tracking, installer builds, and runtime distributions.

---

## Reporting a Vulnerability

If you discover a security vulnerability in IDeV Advanced Pro:

1. **Do not disclose the issue publicly** in a standard GitHub issue or forum discussion.
2. Submit a report through **GitHub Private Vulnerability Reporting**:
   - Navigate to the repository: [https://github.com/musawir-13/IDeV-Advanced-Pro/security](https://github.com/musawir-13/IDeV-Advanced-Pro/security)
   - Click **Report a vulnerability** to open an encrypted advisory draft.
3. Provide detailed steps to reproduce the vulnerability, including:
   - Operating system version.
   - Exact application version.
   - Specific input payloads or workflow steps.
   - Assessment of the vulnerability's impact.

### Response Timeline
- **Initial Acknowledgement**: Within 48 hours of report submission.
- **Triage & Assessment**: Within 5 business days.
- **Fix & Public Advisory**: Delivered via an update release as soon as verified.
