# IDeV Advanced Pro

<p align="center">
  <img src="assets/product-logo.png" alt="IDeV Advanced Pro Logo" width="108" height="108" />
</p>

<p align="center">
  <strong>Autonomous AI Desktop Workspace for Windows</strong><br />
  High-performance local model inference, seamless multimodal vision, and comprehensive model access.
</p>

<p align="center">
  <a href="https://github.com/musawir-13/IDeV-Advanced-Pro/releases/latest/download/IDeV-Advanced-Pro-Setup-1.0.0.exe">
    <img src="https://img.shields.io/badge/Download%20for%20Windows-v1.0.0%20(64--bit)-0066cc?style=for-the-badge&logo=windows&logoColor=white" alt="Download IDeV Advanced Pro for Windows" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20(64--bit)-0078d4?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/Release-v1.0.0-008080?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local%20First-2e7d32?style=flat-square" alt="Privacy" />
  <img src="https://img.shields.io/badge/Catalog-1%2C201%20Configurations-4527a0?style=flat-square" alt="Catalog" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square" alt="Status" />
</p>

---

## Workspace Showcase

<p align="center">
  <img src="assets/screenshots/idev-advanced-pro-main-workspace.png" alt="IDeV Advanced Pro Workspace" width="92%" />
  <br />
  <em>IDeV Advanced Pro — clean, distraction-free desktop interface featuring categorized model selection, reasoning toggle, and multimodal prompt composer.</em>
</p>

---

## Product Overview

**IDeV Advanced Pro** is an autonomous desktop artificial intelligence workspace engineered specifically for Windows 10 and Windows 11. Developed by **IDeV**, it delivers an uncompromised, native desktop environment for developers, researchers, technical writers, and creators.

Unlike browser-dependent interfaces or forced cloud subscriptions, IDeV Advanced Pro puts you in full control of your computing environment:
- **Device-Bound Autonomy**: Run state-of-the-art open-weight models directly on your local hardware with 100% data confidentiality and zero external dependency.
- **Multimodal Vision Intelligence**: Paste screenshots directly from the clipboard (`Ctrl+V`), drag and drop diagrams, and automatically route visual queries to vision-capable models without configuration hurdles.
- **Adaptive System Governor**: An intelligent resource manager monitors hardware parameters in real time, preventing memory exhaustion and preserving operating system responsiveness.

---

## Capabilities & Verification Matrix

| Workspace Area | Verified Capability | Availability Status |
|---|---|---|
| **AI Conversation** | Streaming multi-turn chat, markdown rendering, syntax-highlighted code blocks | **Available** |
| **Model Selection** | Instant access across 1,201 total registered model configurations | **Available** |
| **Local Inference** | 100% offline local model execution via local engine (`127.0.0.1:11434`) | **Available** |
| **Cloud Models** | Pinned cloud models with explicit indicator badges (`☁️`) | **Available** (Requires Internet) |
| **Multimodal Vision** | Clipboard screenshot paste (`Ctrl+V`), image file drop, native vision routing | **Available** (Requires Vision Model) |
| **Desktop Integration** | Native Windows multi-file dialogs, system tray support, native right-click edit menu | **Available** |
| **Hardware Management** | Automated thread bounding (`cpuCores - 1`), 5-minute idle model auto-unloading | **Available** |
| **Data Storage** | Local human-readable JSON storage under `Storage/` | **Available** |

---

## Visual Feature Gallery

### 1. Unified Model Catalog & Selector
Access an extensive catalog of 1,201 configurations. Premier cloud models are pinned with distinctive badges at the top, followed by hundreds of local parameter variants.

<p align="center">
  <img src="assets/screenshots/idev-advanced-pro-model-catalog.png" alt="Model Catalog Selector" width="90%" />
</p>

### 2. Multimodal Vision & Attachment Workflow
Attach diagrams, code snippets, or paste clipboard screenshots directly into the composer. The vision engine automatically coordinates with compatible vision weights.

<p align="center">
  <img src="assets/screenshots/idev-advanced-pro-vision-workflow.png" alt="Multimodal Vision Workflow" width="90%" />
</p>

### 3. Settings & Workspace Controls
Manage your workspace preferences, connection endpoints, and appearance themes through a clean, intuitive settings interface.

<p align="center">
  <img src="assets/screenshots/idev-advanced-pro-settings.png" alt="Settings Interface" width="90%" />
</p>

---

## Model Architecture & Support

| Model Category | Processing Location | Requirements | Verification Status |
|---|---|---|---|
| **Local Models** | Local Device (CPU / GPU) | Compatible local inference engine on `127.0.0.1:11434` | **Verified & Operational** |
| **Cloud Models** | Remote Provider Endpoint | Active internet connection | **Verified & Operational** |
| **Multimodal Vision** | Local or Cloud | Vision-capable model weights (e.g. `qwen3.5:2b`, `qwen3.5:4b`) | **Verified & Operational** |

> [!NOTE]
> All local model inference is computed directly on your device. Conversation histories, prompt tokens, and attachments never leave your machine when operating local models.

---

## System Requirements

| Specification | Minimum Tested | Recommended Configuration |
|---|---|---|
| **Operating System** | Windows 10 (Build 19041+) 64-bit | Windows 11 (64-bit) |
| **Processor** | Intel Core i3 (8th Gen+) or AMD Ryzen 3 | Intel Core i5/i7 (11th Gen+) or AMD Ryzen 5/7 |
| **System Memory (RAM)** | 8 GB RAM | 16 GB – 32 GB RAM |
| **Disk Storage** | 250 MB free space for application | SSD with 20+ GB for model weights |
| **Graphics (GPU)** | Integrated graphics supported | Dedicated NVIDIA / AMD GPU (6 GB+ VRAM) |
| **Local Inference** | Engine active on `http://127.0.0.1:11434` | Hardware-accelerated local engine |

---

## Quick Installation Guide

1. **Download the Setup Wizard**:
   Obtain the verified installer from the official release page:
   👉 **[Download IDeV Advanced Pro v1.0.0](https://github.com/musawir-13/IDeV-Advanced-Pro/releases/latest/download/IDeV-Advanced-Pro-Setup-1.0.0.exe)**

2. **Verify Cryptographic Hash (Optional)**:
   Confirm installer authenticity using PowerShell:
   ```powershell
   Get-FileHash -Algorithm SHA256 .\IDeV-Advanced-Pro-Setup-1.0.0.exe
   # Expected Hash: e4367b7d78d3e9ad5eaf964f2f08b87505147cab0b25a5e8e94884088f7f10fc
   ```

3. **Install & Launch**:
   Run `IDeV-Advanced-Pro-Setup-1.0.0.exe`, follow the setup wizard prompts, and launch the application.

For comprehensive first-run steps and network configuration, see the [Installation Guide](INSTALLATION.md).

---

## Release Information

| Property | Value |
|---|---|
| **Product Version** | `1.0.0` |
| **Target Architecture** | Windows `x64` (64-bit) |
| **Installer Name** | `IDeV-Advanced-Pro-Setup-1.0.0.exe` |
| **Installer Size** | 93,950,109 bytes (~89.59 MB) |
| **SHA-256 Checksum** | `e4367b7d78d3e9ad5eaf964f2f08b87505147cab0b25a5e8e94884088f7f10fc` |
| **Release Status** | Official Production Release |

---

## Privacy & Security Summary

- **Local-Bound Confidentiality**: Prompts and generated text stay on your local computer when interacting with local models.
- **Zero Third-Party Telemetry**: IDeV Advanced Pro includes no analytics SDKs, trackers, or telemetry beacons.
- **Transparent Boundaries**: Remote cloud models are visibly badged with `☁️` so you always retain full awareness of data destinations.
- **Data Ownership**: Your chat sessions are stored in plain JSON files in [`Storage/chats/`](Storage/chats/) on your local machine.

Review our full policies in [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

---

## Documentation & Resources

- 📖 [Installation & First Run Guide](INSTALLATION.md)
- 🧠 [Model Setup & Hardware Sizing](docs/model-setup.md)
- 🔧 [Troubleshooting Guide](docs/troubleshooting.md)
- 🔒 [Privacy Policy & Data Architecture](PRIVACY.md)
- 🛡️ [Security Policy & Vulnerability Reporting](SECURITY.md)
- 📋 [Changelog & Version History](CHANGELOG.md)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)
- 📜 [Third-Party Notices & Licenses](THIRD_PARTY_NOTICES.md)

---

## Support & Contributing

IDeV Advanced Pro is actively maintained by **IDeV**.

- **Issue Tracker**: Report bugs and submit feature requests on [GitHub Issues](https://github.com/musawir-13/IDeV-Advanced-Pro/issues).
- **Security Disclosures**: Report security issues confidentially via [GitHub Security Advisories](https://github.com/musawir-13/IDeV-Advanced-Pro/security).
- **Releases**: View all builds on the [GitHub Releases Page](https://github.com/musawir-13/IDeV-Advanced-Pro/releases).

Copyright © 2026 IDeV. All rights reserved.
