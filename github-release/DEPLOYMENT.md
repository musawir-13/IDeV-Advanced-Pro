# IDeV Advanced Pro — Deployment & Infrastructure Guide

**Product Version:** 3.8.9  
**Developer:** IDeV Limited  
**Target Platform:** Windows 10 / Windows 11 (64-bit)  

---

## 1. Architecture Overview

IDeV Advanced Pro operates as a direct-access, local-first desktop artificial intelligence workspace:

```
┌────────────────────────────────────────────────────────┐
│             DIRECT WORKSPACE ARCHITECTURE              │
├────────────────────────────┬───────────────────────────┤
│ Core Desktop Workspace     │ Optional Cloud Services   │
├────────────────────────────┼───────────────────────────┤
│ • 100% Offline Local Model │ • Optional Cloud Toggle   │
│   Inference                │ • External Provider APIs  │
│ • Zero Account Credentials │ • Remote Cloud Models     │
│ • Zero Product Keys        │ • Web Search / Retrieval  │
│ • Local File Storage       │ • Direct HTTPS Routing    │
└────────────────────────────┴───────────────────────────┘
```

---

## 2. Desktop Workspace Deployment (Default)

The standard installation requires zero external infrastructure configuration:

- **Local Inference Engine**: Connects to `http://127.0.0.1:11434`.
- **Database/Storage**: Plain JSON documents under `Storage/` (`chats/`, `settings/`).
- **Internal Server**: Binds to `127.0.0.1` on port `2020` by default.
- **Direct Access**: No user account, registration, login screen, or product key is required.

---

## 3. Server Configuration & Environment Variables

You can configure runtime parameters via environment variables when launching the application:

### Configuration Parameters

```ini
# Server Binding Port (defaults to 2020)
PORT=2020

# Local Inference Host (defaults to http://127.0.0.1:11434)
OLLAMA_HOST=http://127.0.0.1:11434
```

To run on an alternate port:
```powershell
$env:PORT = "2025"
& "$env:LOCALAPPDATA\Programs\IDeV Advanced Pro\IDeV Advanced Pro.exe"
```

---

## 4. Cloud Feature Enablement

Cloud features are governed by user preference in Settings:
- When the **Cloud** toggle is **OFF** (default), external operations are disabled and blocked for privacy.
- When the **Cloud** toggle is **ON**, cloud models (`:cloud`) and web intelligence route directly to configured providers without requiring an application license.

---

## 5. Diagnostics & Health Endpoints

Verify the running server status using standard HTTP requests:

```bash
# Check runtime version
curl http://127.0.0.1:2020/api/version

# Check direct profile
curl http://127.0.0.1:2020/api/me

# Check cloud feature status
curl http://127.0.0.1:2020/api/v1/cloud
```
