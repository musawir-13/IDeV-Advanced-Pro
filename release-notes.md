# IDeV Advanced Pro v1.0.0 Release Notes

Welcome to the initial public release of **IDeV Advanced Pro** (v1.0.0), a privacy-first, autonomous desktop AI workspace for Windows 10 and Windows 11 (64-bit).

---

## What's New in v1.0.0

### 🚀 Massive Model Catalog
- Access to **1,201 model configurations**:
  - **26 Cloud Models**: Premier cloud models pinned with `☁️` badges at the top of the selector (`deepseek-v4.1-flash:cloud`, `gemma4:31b-cloud`, `glm-5.3-flash:cloud`, `kimi-k3:cloud`, etc.).
  - **1,175 Local Models & Size Variants**: Specific parameter variants indexed across 244 open-weight model families (`deepseek-r1:1.5b` through `671b`, `qwen2.5:0.5b` through `72b`, `d3`, `bonsai-2`, etc.).

### 🖼️ Seamless Multimodal Vision
- Automatic detection of image attachments and clipboard screenshot pastes (`Ctrl+V`).
- Native vision routing directs visual queries through installed multimodal models (`qwen3.5:2b`, `qwen3.5:4b`, etc.) without `mmproj` errors.

### ⚡ High-Speed Architecture & Hardware Governor
- In-memory catalog caching drops model list load times to **~18ms**.
- $O(1)$ indexed model inspection executes in **~2ms**.
- Hardware governor allocates `cpuCores - 1` threads to preserve system responsiveness and auto-unloads idle models after 5 minutes.

### 💻 Native Desktop Integration
- Native Windows multi-file attachment dialogs.
- Native right-click context menu with Undo, Redo, Cut, Copy, Paste, and Select All.
- All chats, settings, and model metadata centralized in a single [`Storage/`](Storage/) directory.

---

## Downloads & Verification

| Asset | Size | SHA-256 Checksum |
|---|---|---|
| [IDeV-Advanced-Pro-Setup-1.0.0.exe](https://github.com/musawir-13/IDeV-Advanced-Pro/releases/latest/download/IDeV-Advanced-Pro-Setup-1.0.0.exe) | 89.78 MB | `a2bea77be3cf620bfc0eccad048d9f2b03d0b0c809548e28175d8c3326bd5f58` |
| [SHA256SUMS.txt](output/IDeV-Advanced-Pro-Setup-1.0.0.exe.sha256) | 102 bytes | Plaintext checksum verification file |

---

## Getting Started
1. Download and run `IDeV-Advanced-Pro-Setup-1.0.0.exe`.
2. Follow the setup wizard to install the application.
3. Ensure your compatible local inference engine is running (`http://127.0.0.1:11434`).
4. Launch **IDeV Advanced Pro** from your desktop or start menu and start chatting!
