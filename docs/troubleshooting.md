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
   # Expected: a55e18d0d7f0e79f19a6b49d4d0f225e5ecdde8d3c2a864da34bd3c34278dc61
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
