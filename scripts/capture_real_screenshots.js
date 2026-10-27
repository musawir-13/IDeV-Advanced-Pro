const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Start internal HTTP server
require(path.join(__dirname, '..', 'server.js'));

const outDir = path.join(__dirname, '..', 'github-release', 'assets', 'screenshots');
const rootAssetsDir = path.join(__dirname, '..', 'assets', 'screenshots');

[outDir, rootAssetsDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function saveCapture(name, buffer) {
  fs.writeFileSync(path.join(outDir, name), buffer);
  fs.writeFileSync(path.join(rootAssetsDir, name), buffer);
  console.log(`Saved screenshot: ${name} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  console.log('1. Loading main chat workspace (http://localhost:2020)...');
  await win.loadURL('http://localhost:2020');
  await new Promise(r => setTimeout(r, 3000));

  // Capture 1: Main Workspace / Empty state
  const img1 = await win.webContents.capturePage();
  saveCapture('idev-advanced-pro-main-workspace.png', img1.toPNG());

  // Capture 2: Model Selector Catalog
  console.log('2. Opening Model Selector Dropdown...');
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      // Find model selector button (contains model name or cloud badge)
      const modelBtn = btns.find(b => b.innerText && (b.innerText.includes('cloud') || b.innerText.includes('qwen') || b.innerText.includes(':') || b.className.includes('rounded-full px-3.5')));
      if (modelBtn) {
        modelBtn.click();
        return 'Clicked model button: ' + modelBtn.innerText;
      }
      return 'Model button not found';
    })()
  `).then(res => console.log('Model button click result:', res));

  await new Promise(r => setTimeout(r, 1200));
  const img2 = await win.webContents.capturePage();
  saveCapture('idev-advanced-pro-model-catalog.png', img2.toPNG());

  // Close model dropdown by clicking outside or pressing Escape
  await win.webContents.executeJavaScript(`document.body.click();`);
  await new Promise(r => setTimeout(r, 500));

  // Capture 3: Vision & Multi-file Workflow
  console.log('3. Simulating Vision & Attachment input...');
  await win.webContents.executeJavaScript(`
    (() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = 'Analyze the architectural data flow diagram and highlight any local vs cloud boundaries.';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 800));
  const img3 = await win.webContents.capturePage();
  saveCapture('idev-advanced-pro-vision-workflow.png', img3.toPNG());

  // Capture 4: Settings Interface
  console.log('4. Navigating to Settings (/settings)...');
  await win.loadURL('http://localhost:2020/settings');
  await new Promise(r => setTimeout(r, 2500));

  const img4 = await win.webContents.capturePage();
  saveCapture('idev-advanced-pro-settings.png', img4.toPNG());

  console.log('All current-version screenshots captured successfully!');
  app.quit();
});
