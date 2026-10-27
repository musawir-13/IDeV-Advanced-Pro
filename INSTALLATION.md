# Installation & Setup Guide — IDeV Advanced Pro

This guide walks you through installing, configuring, and updating **IDeV Advanced Pro** on Windows 10 and Windows 11 (64-bit).

---

## 1. System Requirements

| Specification | Minimum Requirement | Recommended |
|---|---|---|
| **Operating System** | Windows 10 (Build 19041+) or Windows 11 (64-bit) | Windows 11 (64-bit) |
| **Processor** | Intel Core i3 (8th Gen+) or AMD Ryzen 3 | Intel Core i5/i7 or AMD Ryzen 5/7 |
| **Memory (RAM)** | 8 GB RAM | 16 GB RAM or higher |
| **Disk Space** | 250 MB free disk space for app installation | SSD with 20+ GB for local model weights |
| **Local Inference Engine** | Compatible local inference engine on `127.0.0.1:11434` | Local engine with hardware/GPU acceleration |

---

## 2. Download & Installation

### Step 1: Download the Setup Wizard
Download the official Windows installer executable:
- **Direct Download**: [IDeV-Advanced-Pro-Setup-3.8.9.exe](https://github.com/musawir-13/IDeV-Advanced-Pro/releases/download/v3.8.9/IDeV-Advanced-Pro-Setup-3.8.9.exe)
- **Verified SHA-256 Checksum**:
  ```text
  d5375feaa52d3e91c6a1dc7d3c720e6585e70b533055a0c06ed70d7f5d7d5b19
  ```

### Step 2: Run the Installer
1. Double-click `IDeV-Advanced-Pro-Setup-3.8.9.exe` to launch the IDeV Setup Wizard.
2. Select your desired installation destination (defaults to `%LOCALAPPDATA%\Programs\IDeV Advanced Pro`).
3. Click **Install**. The wizard will copy application assets and configure desktop and start menu shortcuts.
4. On the completion screen, check **Run IDeV Advanced Pro** and click **Finish**.

---

## 3. First-Run & Model Configuration

### Connecting to Local Models
IDeV Advanced Pro connects automatically to your local inference engine:
1. Ensure your local inference engine service is active on `http://127.0.0.1:11434`.
2. Launch **IDeV Advanced Pro**.
3. Open the **Model Selector** dropdown at the top center of the interface.
4. Your installed local models (such as `deepseek-r1:7b`, `qwen3.5:2b`, `qwen2.5:3b`, etc.) appear ready to use.
5. Select any model to start chatting immediately.

### Multimodal Vision & Image Input
To analyze images or documents:
- Paste a screenshot using `Ctrl+V` directly into the input composer, or click the attachment button to select images.
- If your selected model is text-only, the engine automatically routes the image through your installed vision model (e.g. `qwen3.5:2b` or `qwen3.5:4b`) to provide visual explanations without crashing.

### Exploring Cloud Models (Cloud Toggle)
Models marked with a cloud badge (`☁️`) at the top of the dropdown offer access to remote cloud models (`deepseek-v4.1-flash:cloud`, `gemma4:31b-cloud`, `glm-5.3-flash:cloud`, etc.). To use cloud models, simply enable the **Cloud** toggle in **Settings**. When Cloud is enabled, requests route directly to designated providers without requiring any application license or account registration. When Cloud is disabled, the workspace operates in complete local-only mode.

---

## 4. Upgrades & Data Preservation

Upgrades are designed to be seamless:
- When installing a newer version of IDeV Advanced Pro, run the new setup installer.
- Your conversations, customized settings, and model configurations in `Storage/` are automatically preserved.
- **Backup Recommendation**: You can easily back up your entire chat history by copying the `Storage/chats/` directory to a safe location.

---

## 5. Uninstallation

To remove IDeV Advanced Pro from your system:
1. Open Windows **Settings** > **Apps** > **Installed apps**.
2. Locate **IDeV Advanced Pro** and click **Uninstall**.
3. Follow the wizard to remove the application binaries.
4. Your conversation history in your user directory is preserved by default. To delete all data, manually remove the `Storage/` directory.

---

## 6. Troubleshooting

- **App displays connection notice**: Verify that your local inference engine is running on `http://127.0.0.1:11434`.
- **Windows SmartScreen notice**: Because this release executable is self-packaged without a commercial EV code-signing certificate, Windows SmartScreen flags it as unrecognized by default. Do not bypass this warning blindly. Verify that the file was downloaded strictly from the official repository release and compare the SHA-256 hash against the published checksum (`d5375feaa52d3e91c6a1dc7d3c720e6585e70b533055a0c06ed70d7f5d7d5b19`) before running. Do not install the file if the checksum does not match.
- **Port 2020 conflict**: If another application uses port 2020, set the environment variable `PORT=2021` before launching.
- For complete diagnostics, see [docs/troubleshooting.md](docs/troubleshooting.md).
