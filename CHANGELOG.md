# Changelog — IDeV Advanced Pro

All notable changes to **IDeV Advanced Pro** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.8.9] — 2026-10-27

### Added
- **Two-Tier System (Free & Ultimate)**:
  - **Free Tier**: 100% offline local model inference, unlimited conversations, and full workspace settings with zero cost.
  - **Ultimate Tier**: 60-day cloud model execution, multimodal vision intelligence, and web search activated via 38-digit product keys.
- **Cryptographic Licensing Engine**:
  - Ed25519-signed entitlements with device identity binding (`Storage/security/device_identity.json`) and profile binding.
  - 38-digit product key generation, HMAC-SHA256 checksums, and single-use registry tracking.
  - Clock rollback and system tampering detection.
  - Backend activation and entitlement enforcement via internal licensing endpoints.
  - Administrative CLI tool (`bin/license-admin.js`) for key lifecycle operations.
  - 30-case automated security and anti-bypass QA test suite (`tests/security_and_licensing.test.js`).

### Changed
- **Authoritative Version Upgrade**: Upgraded application and package metadata across all desktop, runtime, installer, and documentation layers to `3.8.9`.
- **Dynamic Version API**: Updated internal HTTP server `/api/version` to dynamically resolve version from authoritative manifest with high-reliability fallback.
- **Enterprise Release Quality**: Implemented release verification and engineering standards following IDeV Limited QA guidelines.

### Fixed
- **Brand Visual Defect Resolved**: Corrected the word **“ADVANCED”** across all master raster images, downscaled logos, favicons, and multi-resolution Windows `.ico` icon sets to pure white (`#FFFFFF`) with transparent inner letter counters, restoring full legibility on dark themes and surfaces (GitHub dark theme contrast ratio: 16.6:1).
- **Setup Wizard Branding**: Rebuilt Windows NSIS installer and application binary embedding corrected branding icons.
- **Private Storage Protection**: Confirmed strict segregation and zero-leakage of private developer model stores (`Storage/models/` and `Storage/cloud models/`).

---

## [1.0.0] — 2026-10-27

### Added
- **Complete Local AI Architecture**: 100% offline desktop workspace with native local inference engine integration.
- **Universal Model Catalog (1,201 Entries)**:
  - 26 Cloud models (`:cloud` variants) pinned at the top with cloud badges.
  - 1,175 Local models and size variants indexed with all specific parameter types (`deepseek-r1:1.5b` through `671b`, `qwen2.5:0.5b` through `72b`, `d3:2b` through `27b`, `codellama`, etc.).
- **Automatic Multimodal Vision Router**: Intelligent detection for image attachments that routes requests to installed vision models (`qwen3.5:2b`, `qwen3.5:4b`, etc.) without `mmproj` errors.
- **Native Desktop Integrations**:
  - Direct screenshot pasting from clipboard using `Ctrl+V`.
  - Native multi-file picker dialogs via Windows dialog integration.
  - Native Windows right-click edit context menus (Cut, Copy, Paste, Select All).
- **Hardware-Adaptive Governor**:
  - Automatically bounds CPU threads (`cpuCores - 1`) to preserve operating system responsiveness.
  - Caps context length to 8,192 tokens and batch size to 256 for low-VRAM stability.
  - Automatic model unloading (`keep_alive: 5m`) to recover system RAM when idle.
- **High-Performance In-Memory Caching**:
  - Model tags endpoint response time reduced from ~120ms to ~18ms.
  - Model inspections execute in ~2ms using $O(1)$ indexed hash lookups.
  - Static asset browser caching headers configured for faster UI reloads.
- **Centralized Storage Hub**: Consolidated all chats, settings, and model definitions under `Storage/`.

### Changed
- Rebranded application interface and assets to **IDeV Advanced Pro**.
- Cleaned model dropdown interface by removing unneeded download glyphs.
- Isolated technical diagnostic logs from conversation flow.

### Fixed
- Fixed input box disable lock when switching between cloud and local models.
- Fixed recursive call stack overflow in chat persistence routines.
- Fixed global clipboard event handling for images.
- Excluded heavy weight blobs from distribution installer, keeping the setup wizard lightweight (~89.6 MB).
