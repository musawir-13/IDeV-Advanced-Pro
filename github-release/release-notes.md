# IDeV Advanced Pro v3.8.9 Release Notes

Welcome to **IDeV Advanced Pro v3.8.9**, a production release of the privacy-first, autonomous desktop AI workspace for Windows 10 and Windows 11 (64-bit), engineered and released under the quality standards of **IDeV Limited**.

---

## What's New in v3.8.9

### 🔐 Two-Tier Licensing & 38-Digit Product Key System
- **Strictly Two Tiers (Free & Ultimate)**:
  - **Free**: Default out-of-the-box tier for all profiles. 100% offline local model inference, unlimited conversations, and local tool settings with zero fees and no internet requirement.
  - **Ultimate**: Unlocked exclusively through an authoritative 38-digit product key. Grants 60-day access to premier cloud models (`☁️`), multimodal reasoning, and web search intelligence.
- **Cryptographic Entitlement Engine**: Server-side Ed25519 digital signatures, machine-bound identity fingerprints, single-profile bindings, and clock rollback tamper detection.
- **Settings UI Integration**: Dedicated "Account Tier" and "Ultimate License" card with real-time hyphen formatting, status badges, profile/device binding display, and expiration countdown.
- **Administrative CLI**: Integrated `bin/license-admin.js` for issuing, listing, and revoking 38-digit licenses.
- **Comprehensive QA Test Suite**: 30 passing automated security and anti-bypass tests (`tests/security_and_licensing.test.js`).

### 🎨 Brand Identity & Visual Accessibility Correction
- **Pure White "ADVANCED" Typography**: Corrected the word **“ADVANCED”** across all master logos, web marks, downscaled assets, and Windows application icons to pure white (`#FFFFFF`, `rgb(255, 255, 255)`).
- **Clean Transparent Inner Counters**: Cleared all accidental opaque fills in the enclosed counters of `A` and `D`, eliminating rendering artifacts and visual dropouts on dark backgrounds.
- **Dark Mode Excellence**: Achieved an exceptional **16.6:1 contrast ratio** on GitHub dark theme (`#0d1117`), passing WCAG 2.1 AAA accessibility standards for text of all sizes.
- **Multi-Resolution Windows Icons**: Fully rebuilt multi-frame `.ico` bundles (16×16, 32×32, 48×48, 64×64, 128×128, and 256×256) embedded in the executable, setup wizard, and uninstaller.

### ⚙️ Architecture & Version Management
- **Authoritative Version Unification**: Synchronized application, build metadata, setup wizard configuration, and runtime diagnostic APIs to version `3.8.9`.
- **Dynamic Version API**: Updated the internal server endpoint `/api/version` to dynamically resolve version metadata directly from the authoritative manifest with a reliable fallback mechanism.
- **Enterprise Quality Standards**: Implemented release verification, test logging, and traceability under IDeV Limited QA guidelines.

### 🚀 Core Platform Features (Retained & Verified)
- **1,201-Model Catalog**: Seamless access to 26 pinned cloud models (`:cloud`) and 1,175 local model and quantization variants.
- **Automatic Multimodal Vision Routing**: Intelligent dispatch of image inputs and clipboard screenshots (`Ctrl+V`) to installed vision models (`qwen3.5:2b`, `qwen3.5:4b`, etc.).
- **Hardware-Adaptive Governor**: Dynamic thread allocation (`cpuCores - 1`), context memory throttling, and idle model auto-unloading to safeguard system responsiveness.
- **Strict Privacy Segregation**: Complete exclusion of private development stores (`Storage/models/` and `Storage/cloud models/`) from distribution bundles and user machines.

---

## Downloads & Verification

| Asset | Size | SHA-256 Checksum |
|---|---|---|
| [IDeV-Advanced-Pro-Setup-3.8.9.exe](https://github.com/musawir-13/IDeV-Advanced-Pro/releases/latest/download/IDeV-Advanced-Pro-Setup-3.8.9.exe) | 89.68 MB | `d5375feaa52d3e91c6a1dc7d3c720e6585e70b533055a0c06ed70d7f5d7d5b19` |
| [IDeV-Advanced-Pro-Setup-3.8.9.exe.sha256](https://github.com/musawir-13/IDeV-Advanced-Pro/releases/latest/download/IDeV-Advanced-Pro-Setup-3.8.9.exe.sha256) | 102 bytes | Plaintext checksum verification file |

---

## Installation & Getting Started
1. Download `IDeV-Advanced-Pro-Setup-3.8.9.exe` from the verified download link.
2. (Optional) Verify binary integrity via PowerShell:
   ```powershell
   Get-FileHash -Algorithm SHA256 .\IDeV-Advanced-Pro-Setup-3.8.9.exe
   ```
3. Run the installer and follow the on-screen setup wizard.
4. Launch **IDeV Advanced Pro** from your desktop or start menu.
