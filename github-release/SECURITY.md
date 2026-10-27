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

- **Direct Desktop Architecture**: The application operates directly without requiring an IDeV account, sign-in, OTP verification, or product-key activation. No online account credentials or passwords are required or stored.
- **Server-Side Feature Gating**: Cloud endpoints (`:cloud`) and web intelligence routes respect the user's explicit Cloud toggle in Settings. When Cloud is disabled, external network operations are blocked at the internal server layer and return HTTP 403 `CLOUD_DISABLED`.
- **User Data Confidentiality**: Core local model operations execute against `http://127.0.0.1:11434`. Conversations, prompts, and multimodal attachments remain strictly on the local machine when running local models.
- **Private Storage Isolation**: Developer models (`Storage/models/` and `Storage/cloud models/`) are strictly excluded from repository tracking, installer builds, and runtime distributions.
- **Provider Security**: If third-party cloud services are configured, user-supplied credentials are used exclusively for direct communication with the designated provider.

### Documented Security Boundaries & Limitations
- **Code Signing Status**: The Windows setup executable is self-packaged from source and is currently **unsigned** (no commercial EV code-signing certificate is attached). Windows SmartScreen will display an unrecognized publisher prompt by default. Users must verify the SHA-256 checksum against trusted release metadata prior to installation.
- **Local Inference Dependency**: Offline model execution requires an active inference service on `127.0.0.1:11434`.
- **Test Suite Scope**: Automated tests in `tests/direct_access_and_workspace.test.js` validate workspace startup, feature gating, route isolation, and storage preservation.

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
