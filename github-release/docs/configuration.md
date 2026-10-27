# Configuration Guide — IDeV Advanced Pro

This guide outlines advanced configuration options and environment overrides for IDeV Advanced Pro.

---

## 1. Storage Layout

IDeV Advanced Pro organizes all persistent state in a central `Storage/` directory:
- `Storage/models/`: Local model definitions and descriptors.
- `Storage/cloud models/`: Cloud model catalog and metadata.
- `Storage/chats/`: Saved chat threads in JSON format.
- `Storage/settings/`: Application appearance and preferences (`settings.json`).

---

## 2. Environment Variables

You can customize port bindings and host addresses via environment variables or a `.env` file:

```env
# Port for the internal application proxy server (default: 2020)
PORT=2020

# Host address for the local Ollama inference service (default: http://127.0.0.1:11434)
OLLAMA_HOST=http://127.0.0.1:11434
```

---

## 3. Hardware Governor Tuning

The built-in resource governor in `server.js` automatically manages system load:
- **Thread Allocation**: Uses `cpuCores - 1` threads to ensure system responsiveness.
- **Context Length**: Automatically bounded to `8,192` tokens to prevent memory overflow on budget GPUs.
- **Idle Timeout**: Automatically unloads models after 5 minutes of inactivity (`keep_alive: "5m"`).
