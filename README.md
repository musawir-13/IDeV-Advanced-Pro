# IDeV Advanced Pro — Autonomous AI Desktop Workspace

<p align="center">
  <img src="assets/logo.png" alt="IDeV Advanced Pro Logo" width="128" />
</p>

<p align="center">
  <strong>Autonomous AI Desktop Workspace · 1,200+ Model Catalog · Multimodal Vision · Privacy-First Local Inference</strong>
</p>

<p align="center">
  <a href="https://github.com/musawir-13/IDeV-Advanced-Pro/releases/latest/download/IDeV-Advanced-Pro-Setup-1.0.0.exe">
    <img src="https://img.shields.io/badge/Download%20for%20Windows-v1.0.0%20(64--bit)-2563eb?style=for-the-badge&logo=windows&logoColor=white" alt="Download IDeV Advanced Pro for Windows" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20(x64)-0078d4?style=flat-square&logo=windows" alt="Windows Support" />
  <img src="https://img.shields.io/badge/Version-1.0.0-success?style=flat-square" alt="Version 1.0.0" />
  <img src="https://img.shields.io/badge/Privacy-Local--First-22c55e?style=flat-square" alt="Local First" />
  <img src="https://img.shields.io/badge/Models-1%2C200%2B%20Catalog-6366f1?style=flat-square" alt="1,200+ Models" />
  <img src="https://img.shields.io/badge/License-Proprietary%20%2F%20IDeV-blue?style=flat-square" alt="License" />
</p>

---

## Overview

**IDeV Advanced Pro** is an autonomous desktop artificial intelligence workspace for Windows, developed by **IDeV**. Designed for developers, researchers, and creators, it brings conversational intelligence, coding assistance, document reasoning, and multimodal image understanding directly to your personal computer.

IDeV Advanced Pro combines a massive catalog of local open-weight model architectures with an adaptive hardware governor, delivering fluid AI performance on everyday laptops and workstations without forced third-party cloud subscriptions.

---

## Product Showcase

<p align="center">
  <img src="assets/screenshots/01-hero-main.png" alt="IDeV Advanced Pro Interface" width="95%" />
  <br />
  <em>IDeV Advanced Pro — clean, high-performance desktop workspace with categorized model switcher and multimodal composer.</em>
</p>

---

## Core Features

### 1. Universal Model Catalog (1,201 Entries & Variants)
Access an extensive library of models through a clean, categorized model selector:
- **Premier Cloud Models (26 Variants)**: Pinned at the top of the selector with cloud badges (`☁️`), including `deepseek-v4.1-flash:cloud`, `gemma4:31b-cloud`, `glm-5.3-flash:cloud`, `kimi-k3:cloud`, and `minimax-m3.1-flash:cloud`.
- **Local Model Variants (1,175 Entries)**: Indexed across 244 open-weight model families with every specific parameter type (`deepseek-r1:1.5b` through `671b`, `qwen2.5:0.5b` through `72b`, `llama3.3:70b`, `d3:2b` through `27b`, `bonsai-2`, `codellama`, etc.).
- **Zero-Delay Switching**: Models switch instantaneously with clean typography and no download delay glyphs.

<p align="center">
  <img src="assets/screenshots/02-chat-interface.png" alt="IDeV Advanced Pro Chat Interface" width="95%" />
  <br />
  <em>Chat Interface — Multi-turn reasoning, streaming token generation, and syntax-highlighted code blocks.</em>
</p>

---

### 2. Native Multimodal Vision Intelligence
- **Seamless Image Input**: Drag and drop images, select multiple files via native Windows dialogs, or paste screenshots directly from your clipboard using `Ctrl+V`.
- **Intelligent Vision Router**: When an image is supplied, the engine automatically routes the request through a vision-capable local model (`qwen3.5:2b`, `qwen3.5:4b`, `gemma3:4b`), completely eliminating missing multimodal projector (`mmproj`) errors.

---

### 3. Hardware-Adaptive Resource Governor
Engineered to keep your PC silky smooth, even on budget 8 GB–16 GB RAM systems:
- **CPU Throttling**: Automatically allocates `cpuCores - 1` worker threads, keeping 1 full core reserved so Windows OS never freezes.
- **Context Protection**: Enforces smart context-length caps (`8,192` tokens) and small batch processing (`256`) to prevent memory overflows.
- **Memory Recovery**: Automatically unloads inactive models from RAM after 5 minutes of idle time.

---

### 4. Local vs. Cloud Processing Transparency

IDeV Advanced Pro clearly delineates data boundaries:

| Execution Mode | Where Processing Occurs | Data Destination | Internet Requirement |
|---|---|---|---|
| **Local Models** | On your local device (`127.0.0.1:11434`) | Device-bound only; never leaves your PC | **100% Offline** |
| **Cloud Models (`:cloud`)** | Remote cloud model provider | Transmitted securely to designated provider | Active internet connection |

---

## System Requirements

- **Operating System**: Windows 10 (Build 19041+) or Windows 11 (64-bit)
- **Processor**: Intel Core i3 / AMD Ryzen 3 or higher
- **Memory**: 8 GB RAM minimum (16 GB recommended)
- **Disk Space**: ~250 MB for application installation (plus storage for any downloaded GGUF weights)
- **Inference Service**: Ollama running locally (`http://127.0.0.1:11434`) for local models

---

## Installation & Setup

1. **Download**: Obtain the latest setup wizard:
   👉 **[Download IDeV Advanced Pro v1.0.0 for Windows](https://github.com/musawir-13/IDeV-Advanced-Pro/releases/latest/download/IDeV-Advanced-Pro-Setup-1.0.0.exe)**
2. **Verify Checksum (Optional)**:
   ```powershell
   Get-FileHash -Algorithm SHA256 .\IDeV-Advanced-Pro-Setup-1.0.0.exe
   # Expected: e4367b7d78d3e9ad5eaf964f2f08b87505147cab0b25a5e8e94884088f7f10fc
   ```
3. **Install**: Run `IDeV-Advanced-Pro-Setup-1.0.0.exe` and follow the guided setup steps.
4. **Launch**: Start IDeV Advanced Pro and ensure your local Ollama runtime is active.

For detailed steps, see [INSTALLATION.md](INSTALLATION.md).

---

## Data Privacy & Storage

All user data, conversations, and settings are kept in your local application directory:
- **Conversations**: Saved in readable JSON files under `Storage/chats/`.
- **Settings**: Stored locally in `Storage/settings/settings.json`.
- **Model Metadata**: Cataloged in `Storage/models/` and `Storage/cloud models/`.

For complete details, review our [PRIVACY.md](PRIVACY.md) and [Security Policy](SECURITY.md).

---

## Documentation Links

- 📖 [Installation Guide](INSTALLATION.md)
- 🔒 [Privacy Policy & Architecture](PRIVACY.md)
- 🛡️ [Security Policy](SECURITY.md)
- 📋 [Changelog](CHANGELOG.md)
- 📜 [Third-Party Notices](THIRD_PARTY_NOTICES.md)
- 📝 [Release Notes](release-notes.md)

---

## License & Support

IDeV Advanced Pro is proprietary software developed by **IDeV**.  
For bug reports and feature suggestions, please open an issue on the [Official Issue Tracker](https://github.com/musawir-13/IDeV-Advanced-Pro/issues).
