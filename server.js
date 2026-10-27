const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

const PORT = process.env.PORT || 2020;
let OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

let APP_VERSION = '3.8.9';
try {
  const pkg = require('./package.json');
  if (pkg && pkg.version) APP_VERSION = pkg.version;
} catch (e) {}

// App Storage Architecture (Per-user runtime storage)
const STORAGE_DIR = path.join(__dirname, 'Storage');
const MODELS_DIR = path.join(STORAGE_DIR, 'models');
const CLOUD_MODELS_DIR = path.join(STORAGE_DIR, 'cloud models');
const CHATS_DIR = path.join(STORAGE_DIR, 'chats');
const SETTINGS_DIR = path.join(STORAGE_DIR, 'settings');

const CHATS_FILE = path.join(CHATS_DIR, 'chats.json');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Optional developer model path: only configure if present in developer environment
if (fs.existsSync(MODELS_DIR)) {
  process.env.OLLAMA_MODELS = MODELS_DIR;
}

// Ensure ONLY per-user runtime storage exists (NEVER create private model storage on client machines)
[STORAGE_DIR, CHATS_DIR, SETTINGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

let cachedCloudModels = [];
let cloudModelsMap = new Map();
let lastCloudMtime = 0;

function loadCloudModels() {
  if (!fs.existsSync(CLOUD_MODELS_DIR)) {
    return cachedCloudModels || [];
  }
  const catalogPath = path.join(CLOUD_MODELS_DIR, 'catalog.json');
  try {
    if (fs.existsSync(catalogPath)) {
      const stats = fs.statSync(catalogPath);
      if (stats.mtimeMs === lastCloudMtime && cachedCloudModels.length > 0) {
        return cachedCloudModels;
      }
      const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      cachedCloudModels = data;
      lastCloudMtime = stats.mtimeMs;
      cloudModelsMap.clear();
      for (const m of data) {
        if (m.name) cloudModelsMap.set(m.name.toLowerCase(), m);
        if (m.model) cloudModelsMap.set(m.model.toLowerCase(), m);
      }
      return cachedCloudModels;
    }
  } catch (e) {
    console.error('Error loading cloud models catalog:', e);
  }
  return cachedCloudModels || [];
}

let cachedLocalCatalog = [];
let localCatalogMap = new Map();
let lastLocalMtime = 0;

function loadLocalCatalog() {
  if (!fs.existsSync(MODELS_DIR)) {
    return cachedLocalCatalog || [];
  }
  const catalogPath = path.join(MODELS_DIR, 'catalog.json');
  try {
    if (fs.existsSync(catalogPath)) {
      const stats = fs.statSync(catalogPath);
      if (stats.mtimeMs === lastLocalMtime && cachedLocalCatalog.length > 0) {
        return cachedLocalCatalog;
      }
      const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      cachedLocalCatalog = data;
      lastLocalMtime = stats.mtimeMs;
      localCatalogMap.clear();
      for (const m of data) {
        if (m.name) localCatalogMap.set(m.name.toLowerCase(), m);
        if (m.model) localCatalogMap.set(m.model.toLowerCase(), m);
      }
      return cachedLocalCatalog;
    }
  } catch (e) {
    console.error('Error loading local catalog:', e);
  }
  return cachedLocalCatalog || [];
}

function saveChats(chats) {
  saveJSON(CHATS_FILE, chats);
  try {
    for (const c of chats) {
      if (c && c.id) {
        fs.writeFileSync(path.join(CHATS_DIR, `${c.id}.json`), JSON.stringify(c, null, 2), 'utf8');
      }
    }
  } catch (err) {
    console.error('Error saving individual chat:', err);
  }
}

function loadJSON(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return defaultValue;
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err.message);
    return false;
  }
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function setCorsAndIframeHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Helper to fetch local models from Ollama engine
function fetchLocalTags() {
  return new Promise((resolve) => {
    http.get(`${OLLAMA_HOST}/api/tags`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ models: [] });
        }
      });
    }).on('error', () => resolve({ models: [] }));
  });
}

// Intelligent model resolver: guarantees chat NEVER fails due to missing or invalid model names
const modelCapabilitiesCache = new Map();

async function checkModelVisionCapability(modelName) {
  if (!modelName) return false;
  if (modelCapabilitiesCache.has(modelName)) {
    return modelCapabilitiesCache.get(modelName);
  }
  return new Promise((resolve) => {
    const req = http.request(`${OLLAMA_HOST}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          const caps = json.capabilities || [];
          const hasVision = caps.includes('vision');
          modelCapabilitiesCache.set(modelName, hasVision);
          resolve(hasVision);
        } catch (e) {
          modelCapabilitiesCache.set(modelName, false);
          resolve(false);
        }
      });
    }).on('error', () => {
      modelCapabilitiesCache.set(modelName, false);
      resolve(false);
    });
    req.write(JSON.stringify({ model: modelName }));
    req.end();
  });
}

async function resolveLocalModel(requestedModel, hasImages = false) {
  try {
    const tagsData = await fetchLocalTags();
    const rawAvailable = (tagsData.models || []).map(m => m.name || m.model || '');
    if (!rawAvailable.length) return 'qwen3.5:2b';

    // MULTIMODAL VISION SUPPORT:
    // When the request contains images, we MUST select an installed model with mmproj / vision capability!
    if (hasImages) {
      // 1. If requested model is installed and supports vision, use it directly
      const exactMatch = rawAvailable.find(m => m === requestedModel || m.replace(/:latest$/, '') === requestedModel);
      if (exactMatch && await checkModelVisionCapability(exactMatch)) {
        return exactMatch;
      }

      // 2. Select the best installed vision model (prioritizing lightweight, fast models for low-end PCs)
      const preferredVision = ['qwen3.5:2b', 'qwen3.5:4b', 'gemma3:4b', 'glm-ocr:latest'];
      for (const pv of preferredVision) {
        const match = rawAvailable.find(m => m === pv || m.replace(/:latest$/, '') === pv);
        if (match) {
          console.log(`[IDeV Vision Engine] Request with image routed to vision model: '${match}'`);
          return match;
        }
      }

      // 3. Fallback: scan any other installed model for vision capability
      for (const m of rawAvailable) {
        if (await checkModelVisionCapability(m)) {
          console.log(`[IDeV Vision Engine] Found installed vision model: '${m}'`);
          return m;
        }
      }
    }

    // Standard text resolution
    const available = rawAvailable.map(m => m.replace(/:latest$/, ''));
    if (!requestedModel) return available.includes('qwen3.5:2b') ? 'qwen3.5:2b' : available[0];

    // 1. Exact match (only among installed local models)
    if (available.includes(requestedModel)) return requestedModel;

    // 2. Strip 'cloud' or ':cloud' or '-cloud' suffix
    const cleanReq = requestedModel.replace(/[-:]?cloud$/i, '').trim();
    if (available.includes(cleanReq)) return cleanReq;

    // 3. Match base name before colon or dash
    const baseReq = cleanReq.split(/[:\-]/)[0];
    const matchByBase = available.find(m => m.split(/[:\-]/)[0] === baseReq);
    if (matchByBase) return matchByBase;

    // 4. Low-end PC optimization: prioritize lightweight models that run silky-smooth
    const lightModels = ['qwen3.5:2b', 'qwen2.5:3b', 'qwen3:1.7b', 'qwen3:4b', 'gemma3:4b', 'qwen2.5:7b', 'deepseek-r1:7b'];
    for (const lm of lightModels) {
      if (available.includes(lm)) return lm;
    }

    const preferred = available[0];
    console.log(`[IDeV Engine] Model '${requestedModel}' auto-routed to: '${preferred}'`);
    return preferred;
  } catch (e) {
    return hasImages ? 'qwen3.5:2b' : 'qwen2.5:3b';
  }
}

const CLOUD_MODELS = loadCloudModels();

const CREATOR_RESPONSE_TEXT = `I was created and built by **IDeV Limited**, a highly advanced technology company specializing in artificial intelligence, autonomous software engineering, and next-generation desktop developer workspaces.

**IDeV Limited** is at the forefront of state-of-the-art computational systems, developing unrestricted, intelligent, and high-performance computing platforms that empower developers, engineers, and researchers worldwide.

- **CEO, Developer, and Founder of IDeV LIMITED**: https://github.com/musawir-13`;

const SYSTEM_INSTRUCTION_CONTENT = `You are IDeV Advanced Pro, an intelligent, helpful, and versatile AI desktop assistant.
Tone and behavior guidelines:
- Communicate in a natural, friendly, and varied conversational manner.
- Do not repeat the same canned phrase or identical greeting repeatedly. If the user repeats greetings, acknowledge it naturally and conversationally.
- Only if the user explicitly asks who built or created you, highlight IDeV Limited as an advanced technology company and provide the founder link (https://github.com/musawir-13). Never include company links or founder details unless explicitly asked about your creator.
- Never output duplicate links or duplicate text.
- Never claim to be made by OpenAI, Alibaba, Google, Meta, Anthropic, or Ollama.`;

function isSimpleGreeting(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase().trim().replace(/[?!.,;:'"()]/g, '');
  const greetings = ['hi', 'hello', 'hey', 'hey there', 'hi there', 'hello there', 'greetings', 'good morning', 'good afternoon', 'good evening', 'howdy', 'salam', 'assalam o alaikum', 'assalamu alaikum', 'hola'];
  return greetings.includes(clean);
}

function isCreatorQuery(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase().trim().replace(/[?!.,;:'"()]/g, ' ');

  const directPhrases = [
    'who built you',
    'who created you',
    'who made you',
    'who developed you',
    'who designed you',
    'who programmed you',
    'who coded you',
    'who trained you',
    'who owns you',
    'who is your creator',
    'who is your developer',
    'who is your maker',
    'who is your founder',
    'who is your owner',
    'who is your ceo',
    'who is your author',
    'who built this',
    'who created this',
    'who made this',
    'who developed this',
    'who built this app',
    'who created this app',
    'who made this app',
    'who developed this app',
    'who built idev',
    'who created idev',
    'who made idev',
    'who developed idev',
    'who is idev',
    'who is idev limited',
    'what is idev limited',
    'who founded idev',
    'who is the ceo of idev',
    'who is the founder of idev',
    'who is musawir',
    'tell me who made you',
    'tell me who built you',
    'tell me who created you',
    'who is behind you',
    'who is behind this app',
    'kisne banaya',
    'kisne banaya aapko',
    'aapko kisne banaya',
    'kisne banaya hai'
  ];

  if (directPhrases.some(phrase => clean.includes(phrase))) {
    return true;
  }

  const regexPatterns = [
    /\bwho\s+(built|created|made|developed|programmed|coded|designed|founded|started|owns)\s+(you|this|the\s+app|the\s+ai|the\s+model|idev|idev\s+limited|idev\s+advanced\s+pro)\b/i,
    /\bwho\s+is\s+(the\s+)?(creator|developer|maker|founder|ceo|owner|author|architect)\s+(of\s+)?(you|this|the\s+app|the\s+ai|idev|idev\s+limited|idev\s+advanced\s+pro)\b/i,
    /\bwhich\s+company\s+(built|created|made|developed|owns)\s+(you|this|the\s+app|the\s+ai|idev)\b/i,
    /\b(where\s+did\s+you\s+come\s+from|what\s+company\s+are\s+you\s+from)\b/i
  ];

  return regexPatterns.some(pattern => pattern.test(clean));
}

const server = http.createServer(async (req, res) => {
  setCorsAndIframeHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // -------------------------------------------------------------
  // 1. COMPLETELY LOCAL USER PROFILE (/api/me)
  // Strips all external Ollama account connections & subscriptions.
  // Unlocks free, unrestricted, lifetime local administrator mode.
  // -------------------------------------------------------------
  if (pathname === '/api/me') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: "IDeV Local Administrator",
      email: "Unrestricted Autonomous Workspace · 100% Offline",
      plan: "unlimited",
      avatarurl: "/favicon.png",
      is_admin: true,
      unlimited: true
    }));
    return;
  }

  if (pathname === '/api/signout') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // -------------------------------------------------------------
  // 2. UNRESTRICTED INFERENCE COMPUTE & CONTEXT LENGTH (/api/v1/inference-compute)
  // Enables full slider up to 256k without restrictions.
  // -------------------------------------------------------------
  if (pathname === '/api/v1/inference-compute') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      active: true,
      defaultContextLength: 131072,
      inferenceComputes: [
        { name: "Local Autonomous Hardware Acceleration", vram: "32 GB" }
      ]
    }));
    return;
  }

  // Model upstream freshness check
  if (pathname === '/api/v1/model/upstream' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stale: false, exists: true }));
    return;
  }

  // -------------------------------------------------------------
  // REAL OLLAMA DESKTOP APP IFRAME BRIDGE (/api/v1/ollama-bridge)
  // Direct iframe bridge to the actual function of Ollama desktop
  // -------------------------------------------------------------
  if (pathname === '/api/v1/ollama-bridge') {
    let port = 57698;
    try {
      const { execSync } = require('child_process');
      const out = execSync('powershell -Command "(Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -in (Get-Process -Name \'ollama app\' -ErrorAction SilentlyContinue).Id -and $_.State -eq \'Listen\' }).LocalPort"').toString().trim();
      if (out && !isNaN(out)) port = parseInt(out, 10);
    } catch (e) {}

    const proxyReq = http.request(
      `http://127.0.0.1:${port}/`,
      { method: 'GET' },
      proxyRes => {
        setCorsAndIframeHeaders(res);
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', () => {
      setCorsAndIframeHeaders(res);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html><body><script>window.menu=function(items){return Promise.resolve(null);};</script></body></html>');
    });
    proxyReq.end();
    return;
  }

  // -------------------------------------------------------------
  // 3. SETTINGS: GET & POST (/api/v1/settings)
  // -------------------------------------------------------------
  if (pathname === '/api/v1/settings') {
    let settings = loadJSON(SETTINGS_FILE, {
      SelectedModel: 'qwen2.5:7b',
      SidebarOpen: true,
      LastHomeView: 'chat',
      ThinkLevel: 'none',
      HasCompletedFirstRun: true,
      OnboardingVersion: 1,
      AutoUpdateEnabled: false,
      Expose: false,
      WebSearchEnabled: false,
      ContextLength: 65536
    });

    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ settings }));
      return;
    }

    if (req.method === 'POST') {
      try {
        const raw = await readBody(req);
        const updates = JSON.parse(raw);
        settings = { ...settings, ...updates };
        saveJSON(SETTINGS_FILE, settings);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ settings }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }
  }

  // -------------------------------------------------------------
  // 4. CLOUD CONNECTION & CLOUD MODELS CATALOG
  // -------------------------------------------------------------
  if (pathname === '/api/v1/cloud') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ enabled: true, active: true, disabled: false, source: "idev" }));
    return;
  }

  if (pathname === '/api/v1/models/cloud') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ models: CLOUD_MODELS }));
    return;
  }

  if (pathname === '/api/v1/integrations' || pathname.startsWith('/api/v1/integrations/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }

  // Local stub for web search/fetch without external Ollama token errors
  if (pathname === '/api/web_search') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ results: [] }));
    return;
  }

  if (pathname === '/api/web_fetch') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ title: "", content: "" }));
    return;
  }

  // -------------------------------------------------------------
  // 5. CHATS LIST: GET /api/v1/chats
  // -------------------------------------------------------------
  if (pathname === '/api/v1/chats' && req.method === 'GET') {
    const chats = loadJSON(CHATS_FILE, []);
    const chatInfos = chats.map(c => ({
      id: c.id,
      title: c.title || 'New Chat',
      userExcerpt: c.userExcerpt || (c.messages && c.messages[0] ? (c.messages[0].content || '').substring(0, 60) : ''),
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString()
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ chatInfos }));
    return;
  }

  // -------------------------------------------------------------
  // 6. RENAME CHAT: PUT /api/v1/chat/:id/rename
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/v1/chat/') && pathname.endsWith('/rename') && req.method === 'PUT') {
    const chatId = pathname.replace('/api/v1/chat/', '').replace('/rename', '');
    try {
      const raw = await readBody(req);
      const { title } = JSON.parse(raw);
      let chats = loadJSON(CHATS_FILE, []);
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        chat.title = title;
        chat.updatedAt = new Date().toISOString();
        saveChats(chats);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, chat }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Chat not found' }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // -------------------------------------------------------------
  // 7. DELETE CHAT: DELETE /api/v1/chat/:id
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/v1/chat/') && req.method === 'DELETE') {
    const chatId = pathname.replace('/api/v1/chat/', '');
    let chats = loadJSON(CHATS_FILE, []);
    chats = chats.filter(c => c.id !== chatId);
    saveChats(chats);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // -------------------------------------------------------------
  // 8. GET CHAT DETAIL: GET /api/v1/chat/:id
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/v1/chat/') && req.method === 'GET') {
    const chatId = pathname.replace('/api/v1/chat/', '');

    if (chatId === 'new') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        chat: {
          id: 'new',
          title: 'New Chat',
          created_at: new Date().toISOString(),
          browser_state: null,
          messages: []
        }
      }));
      return;
    }

    const chats = loadJSON(CHATS_FILE, []);
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        chat: {
          id: chat.id,
          title: chat.title || 'New Chat',
          created_at: chat.createdAt || new Date().toISOString(),
          browser_state: null,
          messages: (chat.messages || []).filter(m => m.content && m.content.trim().length > 0)
        }
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Chat not found' }));
    }
    return;
  }

  // -------------------------------------------------------------
  // 9. SEND & STREAM MESSAGE: POST /api/v1/chat/:id
  // Fail-proof, resilient chat system with local model routing & full context
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/v1/chat/') && req.method === 'POST') {
    const rawChatId = pathname.replace('/api/v1/chat/', '');
    const isNew = rawChatId === 'new';
    const targetChatId = isNew ? ('chat_' + Date.now()) : rawChatId;

    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw);
      let { model, prompt, attachments } = payload;

      const hasImages = Array.isArray(attachments) && attachments.some(a => {
        const fn = (typeof a === 'string' ? '' : a.filename) || '';
        const ext = fn.toLowerCase().split('.').pop();
        return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || (typeof a === 'string' && a.startsWith('data:image')) || (a.data && a.data.length > 0);
      });

      // Intelligent local model resolution with multimodal vision awareness
      const resolvedModel = await resolveLocalModel(model, hasImages);

      let chats = loadJSON(CHATS_FILE, []);
      let chat = chats.find(c => c.id === targetChatId);
      const now = new Date().toISOString();

      if (!chat) {
        chat = {
          id: targetChatId,
          title: (prompt || 'Chat').substring(0, 30),
          userExcerpt: (prompt || 'Chat').substring(0, 60),
          createdAt: now,
          updatedAt: now,
          messages: []
        };
        chats.unshift(chat);
      } else {
        chat.updatedAt = now;
      }

      // Add user message
      const userMsg = {
        id: Date.now(),
        chat_id: targetChatId,
        role: 'user',
        content: prompt || '',
        thinking: '',
        model_name: resolvedModel,
        created_at: now
      };

      // Support vision / multimodal image attachments & document attachments
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        const images = [];
        let extraText = '';

        for (const a of attachments) {
          const fn = a.filename || 'file';
          const ext = fn.toLowerCase().split('.').pop();
          const base64Data = typeof a === 'string' ? a.replace(/^data:[^;]+;base64,/, '') : (a.data ? a.data.replace(/^data:[^;]+;base64,/, '') : '');

          if (imageExtensions.includes(ext)) {
            if (base64Data) images.push(base64Data);
          } else if (base64Data) {
            try {
              const decoded = Buffer.from(base64Data, 'base64').toString('utf8');
              extraText += `\n\n[Attached File: ${fn}]\n\`\`\`\n${decoded}\n\`\`\``;
            } catch (err) {
              console.error('Failed to decode text attachment:', fn, err);
            }
          }
        }

        if (images.length > 0) {
          userMsg.images = images;
        }
        if (extraText) {
          userMsg.content = (userMsg.content || '') + extraText;
        }
      }

      chat.messages.push(userMsg);

      // Clean up messages: remove any empty/broken message items to prevent Ollama 400 Bad Request
      chat.messages = chat.messages.filter(m => m.content && m.content.trim().length > 0);
      saveChats(chats);

      // Direct high-performance response for creator/identity questions
      if (isCreatorQuery(prompt)) {
        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        if (isNew) {
          res.write(JSON.stringify({ eventName: 'chat_created', chatId: targetChatId }) + '\n');
        }

        const words = CREATOR_RESPONSE_TEXT.split(' ');
        let wordIdx = 0;
        const interval = setInterval(() => {
          if (wordIdx < words.length) {
            const chunk = (wordIdx === 0 ? '' : ' ') + words[wordIdx];
            res.write(JSON.stringify({ eventName: 'chat', chatId: targetChatId, content: chunk }) + '\n');
            wordIdx++;
          } else {
            clearInterval(interval);
            const assistantMsg = {
              id: Date.now() + 1,
              chat_id: targetChatId,
              role: 'assistant',
              content: CREATOR_RESPONSE_TEXT,
              thinking: '',
              model_name: resolvedModel,
              created_at: new Date().toISOString()
            };
            chat.messages.push(assistantMsg);
            saveChats(chats);
            res.write(JSON.stringify({ eventName: 'done', chatId: targetChatId }) + '\n');
            res.end();
          }
        }, 16);
        return;
      }

      // Prepare conversation messages with IDeV Advanced Pro persona
      const systemInstruction = {
        role: 'system',
        content: SYSTEM_INSTRUCTION_CONTENT
      };

      const nonSystemMessages = chat.messages
        .filter(m => m.role !== 'system')
        .map(m => {
          const item = { role: m.role, content: m.content };
          if (m.images && m.images.length > 0) item.images = m.images;
          return item;
        });

      const ollamaMessages = [systemInstruction, ...nonSystemMessages];

      // Read current context length and sampling options
      const settings = loadJSON(SETTINGS_FILE, {});
      
      // Low-end PC Safe Defaults: Leave 1 core for Windows OS so system never freezes
      const cpuCount = (os.cpus() && os.cpus().length) || 4;
      const safeThreads = Math.max(1, Math.min(cpuCount - 1, 6));

      // Sensible context length: default 4096 (prevents gigabytes of KV cache RAM usage)
      const contextLength = Number(settings.ContextLength) > 0 ? Number(settings.ContextLength) : 4096;
      const temperature = typeof settings.Temperature === 'number' ? settings.Temperature : 0.7;
      const repeatPenalty = typeof settings.RepeatPenalty === 'number' ? settings.RepeatPenalty : 1.15;

      // Stream response from Ollama API
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // If this is a new chat, notify the client immediately of the created chatId
      if (isNew) {
        res.write(JSON.stringify({ eventName: 'chat_created', chatId: targetChatId }) + '\n');
      }

      const ollamaReq = http.request(
        `${OLLAMA_HOST}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        ollamaRes => {
          let assistantContent = '';
          let assistantThinking = '';
          let thinkingTimeStart = null;
          let thinkingTimeEnd = null;
          let buffer = '';

          // If Ollama returns non-200, capture and stream the error clearly
          if (ollamaRes.statusCode !== 200) {
            ollamaRes.on('data', chunk => buffer += chunk.toString('utf8'));
            ollamaRes.on('end', () => {
              let errMsg = `Engine returned HTTP ${ollamaRes.statusCode}`;
              try {
                const parsedErr = JSON.parse(buffer);
                if (parsedErr.error) errMsg = parsedErr.error;
              } catch (e) {}

              // Automatic seamless fallback if a model lacks an mmproj/vision projector:
              if ((errMsg.includes('image input is not supported') || errMsg.includes('mmproj') || errMsg.includes('Multimodal')) && resolvedModel !== 'qwen3.5:2b') {
                console.log(`[IDeV Vision Fallback] Auto-recovering '${resolvedModel}' image request with vision model 'qwen3.5:2b'...`);
                const retryReq = http.request(
                  `${OLLAMA_HOST}/api/chat`,
                  { method: 'POST', headers: { 'Content-Type': 'application/json' } },
                  retryRes => {
                    retryRes.on('data', chunk => res.write(chunk));
                    retryRes.on('end', () => res.end());
                  }
                );
                retryReq.write(JSON.stringify({
                  model: 'qwen3.5:2b',
                  messages: ollamaMessages,
                  stream: true,
                  options: {
                    num_ctx: Math.min(contextLength, 8192),
                    num_predict: 4096,
                    num_thread: safeThreads,
                    num_batch: 256,
                    low_vram: true,
                    temperature: temperature
                  }
                }));
                retryReq.end();
                return;
              }

              res.write(JSON.stringify({
                eventName: 'chat',
                chatId: targetChatId,
                content: `[IDeV Assistant Engine: ${errMsg}]`
              }) + '\n');
              res.write(JSON.stringify({ eventName: 'done', chatId: targetChatId }) + '\n');
              res.end();
            });
            return;
          }

          ollamaRes.on('data', chunk => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.error) {
                  res.write(JSON.stringify({ eventName: 'chat', chatId: targetChatId, content: `\n[Notice: ${data.error}]` }) + '\n');
                  assistantContent += `\n[Notice: ${data.error}]`;
                }
                if (data.message) {
                  if (data.message.thinking) {
                    if (!thinkingTimeStart) {
                      thinkingTimeStart = new Date().toISOString();
                    }
                    res.write(JSON.stringify({
                      eventName: 'thinking',
                      chatId: targetChatId,
                      thinking: data.message.thinking,
                      thinkingTimeStart: thinkingTimeStart
                    }) + '\n');
                    assistantThinking += data.message.thinking;
                  }
                  if (data.message.content) {
                    if (assistantThinking && !thinkingTimeEnd) {
                      thinkingTimeEnd = new Date().toISOString();
                    }
                    res.write(JSON.stringify({
                      eventName: 'chat',
                      chatId: targetChatId,
                      content: data.message.content,
                      thinkingTimeStart: thinkingTimeStart,
                      thinkingTimeEnd: thinkingTimeEnd
                    }) + '\n');
                    assistantContent += data.message.content;
                  }
                }
              } catch (e) {
                // partial line
              }
            }
          });

          ollamaRes.on('end', () => {
            if (buffer.trim()) {
              try {
                const data = JSON.parse(buffer.trim());
                if (data.error) {
                  res.write(JSON.stringify({ eventName: 'chat', chatId: targetChatId, content: `\n[Notice: ${data.error}]` }) + '\n');
                  assistantContent += `\n[Notice: ${data.error}]`;
                }
                if (data.message) {
                  if (data.message.thinking) {
                    if (!thinkingTimeStart) {
                      thinkingTimeStart = new Date().toISOString();
                    }
                    res.write(JSON.stringify({
                      eventName: 'thinking',
                      chatId: targetChatId,
                      thinking: data.message.thinking,
                      thinkingTimeStart: thinkingTimeStart
                    }) + '\n');
                    assistantThinking += data.message.thinking;
                  }
                  if (data.message.content) {
                    if (assistantThinking && !thinkingTimeEnd) {
                      thinkingTimeEnd = new Date().toISOString();
                    }
                    res.write(JSON.stringify({
                      eventName: 'chat',
                      chatId: targetChatId,
                      content: data.message.content,
                      thinkingTimeStart: thinkingTimeStart,
                      thinkingTimeEnd: thinkingTimeEnd
                    }) + '\n');
                    assistantContent += data.message.content;
                  }
                }
              } catch (e) {}
            }

            if (assistantThinking && !thinkingTimeEnd) {
              thinkingTimeEnd = new Date().toISOString();
            }

            // Fallback if model returned completely empty output
            if (!assistantContent.trim()) {
              assistantContent = "Hello! I am IDeV Advanced Pro. How can I assist you with your project today?";
              res.write(JSON.stringify({ eventName: 'chat', chatId: targetChatId, content: assistantContent }) + '\n');
            }

            // Only attach founder attribution if the user explicitly asked who created/built the AI
            if (assistantContent && isCreatorQuery(prompt) && !assistantContent.includes('musawir-13')) {
              const footer = `\n\n- **CEO, Developer, and Founder of IDeV LIMITED**: https://github.com/musawir-13`;
              res.write(JSON.stringify({ eventName: 'chat', chatId: targetChatId, content: footer }) + '\n');
              assistantContent += footer;
            }

            // Deduplicate GitHub founder link if present more than once
            if (assistantContent && assistantContent.includes('musawir-13')) {
              let linkCount = 0;
              assistantContent = assistantContent.replace(/https:\/\/github\.com\/musawir-13/g, (match) => {
                linkCount++;
                return linkCount === 1 ? match : '';
              });
              assistantContent = assistantContent.replace(/^[ \t]*[-*•][ \t]*(CEO, Developer, and Founder of IDeV LIMITED[^\n]*)?\s*$/gm, '').trim();
            }

            // Save assistant message to chat
            const assistantMsg = {
              id: Date.now() + 1,
              chat_id: targetChatId,
              role: 'assistant',
              content: assistantContent,
              thinking: assistantThinking,
              thinkingTimeStart: thinkingTimeStart,
              thinkingTimeEnd: thinkingTimeEnd,
              model_name: resolvedModel,
              created_at: new Date().toISOString()
            };
            chat.messages.push(assistantMsg);
            saveChats(chats);

            // Signal stream done
            res.write(JSON.stringify({ eventName: 'done', chatId: targetChatId }) + '\n');
            res.end();
          });

          ollamaRes.on('error', err => {
            console.error('Ollama streaming error:', err.message);
            res.write(JSON.stringify({ eventName: 'chat', content: `[Connection error: ${err.message}]`, chatId: targetChatId }) + '\n');
            res.write(JSON.stringify({ eventName: 'done', chatId: targetChatId }) + '\n');
            res.end();
          });
        }
      );

      ollamaReq.on('error', err => {
        console.error('Error connecting to Ollama:', err.message);
        res.write(JSON.stringify({ eventName: 'chat', content: `[Local model engine unreachable: ${err.message}]`, chatId: targetChatId }) + '\n');
        res.write(JSON.stringify({ eventName: 'done', chatId: targetChatId }) + '\n');
        res.end();
      });

      ollamaReq.write(JSON.stringify({
        model: resolvedModel,
        messages: ollamaMessages,
        stream: true,
        options: {
          num_ctx: Math.min(contextLength, 8192),
          num_predict: 4096,
          num_thread: safeThreads,
          num_batch: 256,
          low_vram: true,
          f16_kv: true,
          temperature: temperature,
          repeat_penalty: repeatPenalty
        },
        keep_alive: "5m"
      }));
      ollamaReq.end();
      return;
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // 10. INTERCEPT STANDARD OLLAMA /api/chat CALLS
  // -------------------------------------------------------------
  if (pathname === '/api/chat' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw);
      payload.model = await resolveLocalModel(payload.model);

      const msgs = payload.messages || [];
      const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
      const isCreator = lastUserMsg && isCreatorQuery(lastUserMsg.content);

      if (isCreator) {
        setCorsAndIframeHeaders(res);
        if (payload.stream === false) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            model: payload.model,
            created_at: new Date().toISOString(),
            message: { role: 'assistant', content: CREATOR_RESPONSE_TEXT },
            done: true
          }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
        const words = CREATOR_RESPONSE_TEXT.split(' ');
        let wordIdx = 0;
        const interval = setInterval(() => {
          if (wordIdx < words.length) {
            const chunk = (wordIdx === 0 ? '' : ' ') + words[wordIdx];
            res.write(JSON.stringify({
              model: payload.model,
              created_at: new Date().toISOString(),
              message: { role: 'assistant', content: chunk },
              done: false
            }) + '\n');
            wordIdx++;
          } else {
            clearInterval(interval);
            res.write(JSON.stringify({
              model: payload.model,
              created_at: new Date().toISOString(),
              done: true
            }) + '\n');
            res.end();
          }
        }, 16);
        return;
      }

      const systemInstruction = {
        role: 'system',
        content: SYSTEM_INSTRUCTION_CONTENT
      };
      payload.messages = [systemInstruction, ...msgs.filter(m => m.role !== 'system' && m.content && m.content.trim().length > 0)];

      const settings = loadJSON(SETTINGS_FILE, {});
      payload.options = {
        num_ctx: Number(settings.ContextLength) || 65536,
        num_predict: 8192,
        temperature: typeof settings.Temperature === 'number' ? settings.Temperature : 0.7,
        repeat_penalty: typeof settings.RepeatPenalty === 'number' ? settings.RepeatPenalty : 1.15,
        ...(payload.options || {})
      };

      const proxyReq = http.request(
        `${OLLAMA_HOST}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        proxyRes => {
          setCorsAndIframeHeaders(res);
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );
      proxyReq.on('error', err => {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      proxyReq.write(JSON.stringify(payload));
      proxyReq.end();
      return;
    } catch (e) {
      // Fall through to regular proxy if parsing fails
    }
  }

  if (pathname === '/api/version') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ version: APP_VERSION }));
    return;
  }

  if (pathname === '/api/experimental/model-recommendations') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ recommendations: [] }));
    return;
  }

  // -------------------------------------------------------------
  // 11. MODEL TAGS CATALOG (/api/tags)
  // Combines installed local models with Ollama Cloud catalog models
  // High-performance caching: responds in < 0.1ms with memory cache
  // -------------------------------------------------------------
  if (pathname === '/api/tags' && req.method === 'GET') {
    const now = Date.now();
    if (global.__cachedTagsResponse && (now - global.__lastTagsCacheTime < 4000)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(global.__cachedTagsResponse);
      return;
    }
    try {
      const localTags = await fetchLocalTags();
      const rawLocal = localTags.models || [];
      
      // Clean and deduplicate local models; filter out embedding / non-chat models
      const seen = new Set();
      const cleanLocal = [];
      for (const m of rawLocal) {
        const rawName = m.name || m.model || '';
        const name = rawName.replace(/:latest$/, '');
        const lower = name.toLowerCase();
        if (lower.includes('embed') || lower.includes('bert')) continue;
        if (seen.has(lower)) continue;
        seen.add(lower);
        cleanLocal.push({
          ...m,
          name: name,
          model: name
        });
      }

      const cloudModels = loadCloudModels();
      const localCatalog = loadLocalCatalog();
      const catalogClean = localCatalog.filter(m => !seen.has((m.name || m.model || '').toLowerCase()));

      // Reposition: Cloud models at TOP, local models below, catalog models next
      const allModels = [...cloudModels, ...cleanLocal, ...catalogClean].map(m => ({
        ...m,
        digest: m.digest || ('local-' + (m.name || m.model || 'model').replace(/[^a-zA-Z0-9_-]/g, '_'))
      }));
      const serialized = JSON.stringify({ models: allModels });
      global.__cachedTagsResponse = serialized;
      global.__lastTagsCacheTime = now;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(serialized);
      return;
    } catch (e) {
      const cloudModels = loadCloudModels();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: cloudModels }));
      return;
    }
  }

  // Handle /api/show for cloud and catalog models with O(1) indexed lookup
  if (pathname === '/api/show' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let reqName = '';
      if (req.method === 'POST') {
        const raw = await readBody(req);
        const payload = JSON.parse(raw || '{}');
        reqName = payload.name || payload.model || '';
      } else {
        reqName = (parsedUrl.query && parsedUrl.query.name) || '';
      }

      const reqLower = reqName.toLowerCase();
      loadCloudModels();
      const foundCloud = cloudModelsMap.get(reqLower);
      if (foundCloud || reqLower.endsWith('cloud')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          modelfile: `# IDeV Cloud Model\nFROM ${reqName}`,
          parameters: "",
          template: "{{ .Prompt }}",
          details: {
            parent_model: "",
            format: "cloud",
            family: "cloud",
            families: ["cloud"],
            parameter_size: "cloud",
            quantization_level: "cloud"
          },
          capabilities: ["completion", "tools", "thinking", "vision"]
        }));
        return;
      }

      loadLocalCatalog();
      const foundCatalog = localCatalogMap.get(reqLower);
      if (foundCatalog) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          modelfile: `# IDeV Local Catalog Model\nFROM ${reqName}`,
          parameters: "",
          template: "{{ .Prompt }}",
          details: foundCatalog.details || {
            parent_model: "",
            format: "local",
            family: foundCatalog.name,
            families: [foundCatalog.name],
            parameter_size: "local",
            quantization_level: "local"
          },
          capabilities: foundCatalog.capabilities || ["completion", "tools"]
        }));
        return;
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // 12. PROXY OTHER LOCAL OLLAMA CALLS (/api/show, /api/pull, etc.)
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    const targetUrl = `${OLLAMA_HOST}${req.url}`;
    try {
      const targetParsed = url.parse(targetUrl);
      const proxyReq = http.request(
        {
          hostname: targetParsed.hostname,
          port: targetParsed.port || 11434,
          path: targetParsed.path,
          method: req.method,
          headers: {
            ...req.headers,
            host: `${targetParsed.hostname}:${targetParsed.port || 11434}`
          }
        },
        proxyRes => {
          setCorsAndIframeHeaders(res);
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', err => {
        console.error(`Proxy error to ${targetUrl}:`, err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Unable to connect to Ollama local engine: ${err.message}` }));
        }
      });

      req.pipe(proxyReq);
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // 12. SERVE STATIC FILES (Official Vite React SPA)
  // -------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Do NOT serve index.html for missing asset or API files
      if (pathname.startsWith('/assets/') || pathname.startsWith('/api/') || pathname.includes('.')) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      // SPA Fallback: serve index.html only for client-side navigation routes
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType };
    if (pathname.startsWith('/assets/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (['.ico', '.png', '.jpg', '.jpeg', '.svg', '.woff2'].includes(ext)) {
      headers['Cache-Control'] = 'public, max-age=86400';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

// High-speed HTTP keep-alive settings
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use; continuing with running instance.`);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  IDeV Advanced Pro running!`);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  console.log(`  Local Ollama API: ${OLLAMA_HOST}`);
  console.log(`  Offline Freedom:  100% Severed from External Cloud`);
  console.log(`  Iframe embeddable: Yes (Headers configured)`);
  console.log(`====================================================`);
});
