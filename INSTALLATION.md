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
- **Direct Download**: [IDeV-Advanced-Pro-Setup-1.0.0.exe](https://github.com/musawir-13/IDeV-Advanced-Pro/releases/latest/download/IDeV-Advanced-Pro-Setup-1.0.0.exe)
- **Verified SHA-256 Checksum**:
  ```text
  a2bea77be3cf620bfc0eccad048d9f2b03d0b0c809548e28175d8c3326bd5f58
  ```

### Step 2: Run the Installer
1. Double-click `IDeV-Advanced-Pro-Setup-1.0.0.exe` to launch the IDeV Setup Wizard.
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

### Exploring Cloud Models
Models marked with a cloud badge (`☁️`) at the top of the dropdown offer access to frontier cloud models (`deepseek-v4.1-flash:cloud`, `gemma4:31b-cloud`, `glm-5.3-flash:cloud`, etc.). Ensure you have internet connectivity when interacting with cloud models.

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
- **Windows SmartScreen prompt**: Because this is a newly built release, click **More info** > **Run anyway** if prompted by Windows SmartScreen.
- **Port 2020 conflict**: If another application uses port 2020, set the environment variable `PORT=2021` before launching.
- For complete diagnostics, see [docs/troubleshooting.md](docs/troubleshooting.md).
