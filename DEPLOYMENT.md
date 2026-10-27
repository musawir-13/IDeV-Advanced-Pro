# IDeV Advanced Pro — Deployment & Infrastructure Guide

**Product Version:** 3.8.9  
**Developer:** IDeV Limited  
**Target Platform:** Windows 10 / Windows 11 (64-bit)  

---

## 1. Operating Modes Overview

IDeV Advanced Pro operates in two architectural modes:

```
┌────────────────────────────────────────────────────────┐
│                     OPERATION MODES                    │
├────────────────────────────┬───────────────────────────┤
│ Mode B: Standalone Local   │ Mode A: Production Online │
│ (Default / Zero-Config)    │ (Full Enterprise Auth)    │
├────────────────────────────┼───────────────────────────┤
│ • 100% Offline Local Model │ • Online PBKDF2 Sessions  │
│   Inference                │ • External SMTP/SMS OTP   │
│ • Local Account Profiles   │ • Centralized Authority   │
│ • 38-Digit Local License   │ • Distributed Device Sync │
│ • No External Credentials  │ • Twilio / SendGrid Pipe  │
└────────────────────────────┴───────────────────────────┘
```

---

## 2. Mode B: Standalone Local Deployment (Default)

Mode B requires zero external service configuration. It is the default out-of-the-box configuration for single-user workstations:

- **Local Inference Engine**: Connects to `http://127.0.0.1:11434`.
- **Database/Storage**: Plain JSON documents under `Storage/` (`chats/`, `settings/`, `security/`, `profiles/`).
- **Product Key Validation**: Handled by the internal cryptographic authority (`lib/license_authority.js`).
- **External Challenge Delivery**: Marked honestly as `BLOCKED` via the `/api/v1/auth/infrastructure` diagnostic endpoint.

---

## 3. Mode A: Production Online Enterprise Deployment

To enable genuine email verification and SMS OTP delivery, supply the appropriate provider credentials through environment variables or a `.env` file (never committed to git):

### Configuration Parameters

```ini
# Server Binding
PORT=2088
HOST=127.0.0.1

# SMTP Email Verification Provider
SMTP_HOST=smtp.mailprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=your-secure-smtp-password
SMTP_FROM="IDeV Advanced Pro Security" <no-reply@yourdomain.com>

# Twilio SMS Verification Provider (Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

> [!CAUTION]
> **Credential Hygiene**  
> Never commit `.env` files, private signing keys, or cloud provider tokens to the git repository. Ensure `.env` is listed in `.gitignore`.

---

## 4. Administrative Key Issuance & Provisioning

To issue an Ultimate product key for a customer or enterprise workstation:

```powershell
# 1. Open a PowerShell prompt in the application root directory
cd "C:\Program Files\IDeV Advanced Pro" # or your installation root

# 2. Issue a new 38-digit key
node bin/license-admin.js issue --customer "Client Organization" --notes "60-Day Workstation Seat"
```

The tool generates a high-entropy 38-digit key with a cryptographically verifiable HMAC-SHA256 checksum:
```text
=== NEW 38-DIGIT PRODUCT KEY ISSUED ===
Raw Key:          98729104820194829104820194829104820194
Display Grouped:  98729-10482-01948-29104-82019-48291-04820-194
License ID:       lic_7b29e01f4c3a
Tier Granted:     Ultimate
Entitlement:      60-day Ultimate Cloud Access (Single Device, Single Profile)
Status:           ISSUED
=======================================
```

---

## 5. Security & Verification Diagnostics

Verify the running server's security and licensing status using standard curl or browser requests:

```bash
# Check runtime version
curl http://127.0.0.1:2088/api/version

# Check effective entitlement status
curl http://127.0.0.1:2088/api/v1/license/status

# Check infrastructure connectivity mode
curl http://127.0.0.1:2088/api/v1/auth/infrastructure
```
