# Troubleshooting Guide — IDeV Advanced Pro

Common issues and verified solutions for IDeV Advanced Pro.

---

## 1. Local Engine Connection Issues

**Symptom**: App shows a notification stating "Unable to connect to Ollama local engine".  
**Cause**: The local Ollama service is not currently running on `127.0.0.1:11434`.  
**Resolution**:
1. Check your Windows system tray for the Ollama icon.
2. If not running, launch Ollama from the Windows Start menu or run `ollama serve` in PowerShell.
3. Refresh the application with `Ctrl+R`.

---

## 2. Port 2020 Conflict

**Symptom**: Application fails to launch or reports `EADDRINUSE`.  
**Cause**: Another application or an orphaned instance is using port 2020.  
**Resolution**:
Set an alternate port before launching:
```cmd
set PORT=2021
"IDeV Advanced Pro.exe"
```

---

## 3. Multimodal Projector (mmproj) Errors

**Symptom**: When asking about an image, the model outputs an error regarding `mmproj`.  
**Resolution**:
IDeV Advanced Pro automatically routes requests with images to installed vision models (`qwen3.5:2b`, `qwen3.5:4b`, etc.). Ensure you have at least one vision-capable model installed in your local Ollama runtime:
```cmd
ollama pull qwen3.5:2b
```

---

## 4. Windows SmartScreen Dialog

**Symptom**: Windows displays "Windows protected your PC" on first install.  
**Resolution**:
Click **More info** followed by **Run anyway**. This is standard for newly released software builds that have not yet accumulated SmartScreen download history.
