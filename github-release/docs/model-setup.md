# Model Setup Guide — IDeV Advanced Pro

This guide explains how to configure, load, and manage both local and cloud models in **IDeV Advanced Pro**.

---

## 1. Overview of Model Support

IDeV Advanced Pro provides access to **1,201 model configurations** organized into two primary tiers:

| Tier | Processing Location | Internet Requirement | Key Strengths |
|---|---|---|---|
| **Local Models** | Local GPU / CPU | **100% Offline** | Complete privacy, zero latency to cloud, device-bound data |
| **Cloud Models** | Remote provider endpoint | Active Connection | Access to frontier parameter scales and specialized cloud reasoning |

---

## 2. Setting Up Local Models

### Prerequisites
Local inference requires a compatible local inference engine running on your system (listening on `http://127.0.0.1:11434`).

### Using Local Models
1. Ensure your local engine is running.
2. Launch **IDeV Advanced Pro**.
3. Click the **Model Selector** at the top center of the interface.
4. Installed models appear immediately in the list.
5. Select any model (e.g., `qwen3.5:2b`, `deepseek-r1:8b`, `llama3.3:70b`) to activate it.

### Multimodal Vision Routing
When an image or document is attached:
- If your currently selected model does not include multimodal vision weights, IDeV Advanced Pro automatically routes the image through an installed vision model (such as `qwen3.5:2b` or `qwen3.5:4b`).
- This guarantees you never encounter missing multimodal projector (`mmproj`) errors.

---

## 3. Configuring Cloud Models

Models pinned with a cloud badge (`☁️`) at the top of the selector (such as `deepseek-v4.1-flash:cloud`, `gemma4:31b-cloud`, `glm-5.3-flash:cloud`, and `kimi-k3:cloud`) route requests to configured cloud endpoints:
1. Ensure your computer has an active internet connection.
2. Select any `:cloud` model from the top of the model selector.
3. Your prompt and conversation turn are transmitted securely to the designated provider.
4. Cloud models display a distinctive badge so you always know when data leaves your device.

---

## 4. Hardware Sizing Recommendations

| Model Size | Minimum RAM | Recommended Hardware | Use Case |
|---|---|---|---|
| **0.5B – 3B** | 8 GB RAM | Any modern CPU / integrated graphics | Rapid everyday tasks, lightweight vision, summaries |
| **7B – 9B** | 16 GB RAM | Dedicated GPU (6 GB+ VRAM) or Apple Silicon | Deep reasoning, high-quality code generation |
| **14B – 32B** | 32 GB RAM | Dedicated GPU (12 GB–16 GB VRAM) | Complex architectural problem solving |
| **70B+** | 64 GB RAM | Multi-GPU or 24 GB+ VRAM | Frontier-level autonomous reasoning |
