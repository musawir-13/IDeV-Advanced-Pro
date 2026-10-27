# Privacy Policy & Data Architecture — IDeV Advanced Pro

**Product:** IDeV Advanced Pro (v3.8.9)  
**Developer:** IDeV Limited  

IDeV Advanced Pro is built with a local-first foundation, providing users with transparent control over their prompts, documents, and data.

---

## 1. Local Processing vs. Cloud Services

IDeV Advanced Pro strictly differentiates between local operations and optional external services:

### A. Local Model Processing (Default)
When you interact with local models (such as `deepseek-r1:7b`, `qwen3.5:2b`, `llama3.2:3b`, etc.):
- **Device-Bound Execution**: All inference runs directly on your personal computer via your local inference service (`http://127.0.0.1:11434`).
- **No External Transmission**: Prompts, input tokens, model outputs, and attached files remain strictly on your local machine and are not transmitted over the internet.
- **Offline Capable**: Local model processing functions completely without internet connectivity.

### B. Cloud Models (`:cloud`) & Web Intelligence (Ultimate Tier)
When an authorized user explicitly selects a model marked with a cloud badge (`☁️`) or enables web search:
- **Remote Model Execution**: Requests for cloud models are transmitted to and processed by the corresponding remote model provider.
- **Web Search & Fetch**: Search queries and target URLs are transmitted externally over HTTPS to fetch public web contents.
- **Provider Policies**: Transmitted prompts and attachments are subject to the data handling terms and privacy policies of the respective remote cloud providers.
- **Transparent Indicator**: Every cloud model is visibly labeled with a `☁️` indicator, ensuring you always know whether an operation is local or remote before dispatching a message.

---

## 2. Storage & Personal Data

### Local-Only Storage
All persistent user data is kept inside your dedicated local application storage directory (`Storage/`):
- **Conversations**: Saved locally in human-readable JSON files under `Storage/chats/`.
- **User Settings**: Stored locally in `Storage/settings/settings.json`.
- **Attached Files & Images**: Processed in-memory or stored locally; never synced to any proprietary IDeV server.

IDeV Limited does not operate external tracking servers, telemetry harvesters, or centralized user conversation databases.

---

## 3. Image & Document Attachments

When you attach files, paste screenshots (`Ctrl+V`), or select documents:
- Files are converted to local data streams for model processing.
- For local models, image feature processing occurs locally using your machine's multimodal vision model.
- For cloud models, image data is transmitted to the chosen cloud provider as part of the multimodal request payload.

---

## 4. Telemetry & Analytics Audit

- **No First-Party Analytics**: IDeV Advanced Pro bundles no Google Analytics, Mixpanel, or custom telemetry SDKs in its application source.
- **No Commercial Trackers**: The application contains no advertising networks, tracking cookies, or commercial trackers.
- **External Web Links**: Clicking external documentation or repository links opens them in your default web browser, governed by your browser's security and privacy configuration.

---

## 5. Security & Data Ownership

You own all conversations, generated outputs, and customized configurations created with IDeV Advanced Pro. You can backup, export, or permanently delete your chat histories at any time simply by managing the files inside `Storage/chats/`.
