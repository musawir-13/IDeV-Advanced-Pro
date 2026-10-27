# Troubleshooting Guide — IDeV Advanced Pro

This guide outlines common diagnostic steps and resolutions for **IDeV Advanced Pro**.

---

## Common Issues & Solutions

### 1. Model Selector Shows "Loading..." or Connection Warning

**Cause:** The application cannot establish a connection with the local inference engine on `http://127.0.0.1:11434`.

**Resolution:**
1. Verify that your local inference engine service is running:
   - Open a browser and visit `http://127.0.0.1:11434`.
   - You should see: `Ollama is running`.
2. If it is not running, launch it from your Start Menu or execute `ollama serve` in PowerShell.
3. Once started, IDeV Advanced Pro will automatically detect the service and populate the model list.

---

### 2. Port Conflict (Port 2020 Already in Use)

**Cause:** Another local development tool or process is bound to port 2020.

**Resolution:**
Launch IDeV Advanced Pro with an alternate port by setting the `PORT` environment variable:
```powershell
$env:PORT = "2025"
& "$env:LOCALAPPDATA\Programs\IDeV Advanced Pro\IDeV Advanced Pro.exe"
```

---

### 3. Windows SmartScreen Prompt During Installation

**Cause:** The release binary is newly generated and published directly from the open-source repository.

**Resolution:**
1. Click **More info** on the Windows SmartScreen dialog.
2. Click **Run anyway**.
3. Verify the installer hash before installation to confirm binary integrity:
   ```powershell
   Get-FileHash -Algorithm SHA256 .\IDeV-Advanced-Pro-Setup-3.8.9.exe
   # Expected: d5375feaa52d3e91c6a1dc7d3c720e6585e70b533055a0c06ed70d7f5d7d5b19
   ```

---

### 4. High System Memory Utilization

**Cause:** A large model (e.g. 14B or larger) has been loaded into system memory.

**Resolution:**
- IDeV Advanced Pro includes an automated **Hardware Governor** that automatically unloads idle models after 5 minutes of inactivity (`keep_alive: 5m`).
- To manually free memory immediately, switch to a smaller model (such as `qwen3.5:2b`) or restart the application.

---

### 5. Chat History and Settings Backup

All conversations are stored in plain, readable JSON files on your local drive:
- **Location:** `Storage/chats/`
- To create a backup, copy the `Storage/` directory to your preferred backup drive.

---

### 6. Product Key Activation & Licensing Diagnostics

- **"Cloud feature access requires an active Ultimate tier license"**:
  - The Free tier permits only offline local models. To unlock cloud models (`:cloud`) and web intelligence, enter your 38-digit product key in **Settings** > **Ultimate License**.
- **"Malformed product key" or "Expected 38 digits"**:
  - Ensure all 38 decimal digits are entered. The key format separator hyphens are optional and ignored during validation.
- **"Key is bound to another profile or device"**:
  - Each 38-digit Ultimate license is bound to a single local profile and hardware machine. Contact your administrator to issue a replacement key if you have migrated to a new computer.
- **"System clock tampering detected"**:
  - Ensure your Windows system clock is synchronized with internet time (NTP). Rolling the system clock back will disable active entitlements.
