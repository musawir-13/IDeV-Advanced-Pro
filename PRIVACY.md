# Privacy Policy & Data Architecture — IDeV Advanced Pro

**Product:** IDeV Advanced Pro (v1.0.0)  
**Developer:** IDeV  

IDeV Advanced Pro is built with a privacy-first foundation, empowering users with complete control and transparency over their conversations, documents, and data.

---

## 1. Local Processing vs. Cloud Processing

IDeV Advanced Pro strictly differentiates between **Local Model Processing** and **Optional Cloud Model Connections**:

### A. Local Model Processing
When you select and interact with local models (such as `deepseek-r1`, `qwen2.5`, `llama3.3`, `d3`, `phi4`, etc.):
- **Device-Bound Execution**: All inference runs directly on your personal computer via your local inference service (`127.0.0.1:11434`).
- **No Internet Transmission**: Prompts, input tokens, responses, and attached documents remain on your machine and never leave your local device.
- **Offline Capable**: Local model processing functions completely without internet access.

### B. Cloud Model Connections
When you explicitly select a model marked with a cloud badge (such as `deepseek-v4.1-flash:cloud`, `gemma4:31b-cloud`, `glm-5.3-flash:cloud`, or `kimi-k3:cloud`):
- **Remote Processing**: Requests for cloud models are transmitted to and processed by the corresponding remote model provider.
- **Provider Policies**: Transmitted prompts and attachments are subject to the data handling terms and privacy policies of the respective cloud provider.
- **Transparent Indicator**: Every cloud model is visibly labeled with a cloud indicator in the model selector, ensuring you always know whether an operation is local or remote before sending a message.

---

## 2. Storage & Personal Data

### Local-Only Storage
All persistent user data is kept inside your dedicated local application storage directory (`Storage/`):
- **Conversations**: Saved locally in human-readable JSON files under `Storage/chats/`.
- **User Settings**: Stored locally in `Storage/settings/settings.json`.
- **Attached Files & Images**: Processed in-memory or stored locally; never synced to any proprietary IDeV server.

IDeV does **not** operate external tracking servers, telemetry harvesters, or centralized user databases.

---

## 3. Image & Document Attachments

When you attach files, paste screenshots (`Ctrl+V`), or select documents:
- Files are converted to local data streams for model processing.
- For local models, image feature processing occurs locally using your machine's multimodal inference pipeline.
- For cloud models, image data is transmitted to the chosen cloud provider as part of the multimodal request payload.

---

## 4. Third-Party Services & Telemetry

- **No Third-Party Analytics**: IDeV Advanced Pro does not bundle Google Analytics, Mixpanel, or telemetry daemons.
- **No Advertising**: The application contains no ad networks, tracking cookies, or commercial trackers.
- **External Links**: Clicking external links (such as model documentation or GitHub project links) will open them in your default web browser, governed by your browser's privacy settings.

---

## 5. Security & Data Ownership

You own all conversations, generated outputs, and customized configurations created with IDeV Advanced Pro. You can backup, export, or permanently delete your chat histories at any time simply by managing the files inside `Storage/chats/`.
