const { app, BrowserWindow, shell, Menu, MenuItem, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 2020;

// Local developer storage: only configure private model path if present in local development environment
const devModelsDir = path.join(__dirname, 'Storage', 'models');
if (fs.existsSync(devModelsDir)) {
  process.env.OLLAMA_MODELS = devModelsDir;
}

// Start internal HTTP server directly inside the Electron main process
try {
  require('./server.js');
} catch (err) {
  console.error('Failed to start internal server:', err);
}

// Native Windows context menu handler matching Ollama Desktop
ipcMain.handle('show-context-menu', (event, items) => {
  return new Promise((resolve) => {
    const template = (items || []).map(item => ({
      label: item.label,
      enabled: item.enabled !== false,
      click: () => resolve(item.label)
    }));

    // Add native "More tools" -> "Share" matching official WebView2 context menu
    template.push({
      label: 'More tools',
      submenu: [
        {
          label: 'Share',
          click: () => resolve('Share')
        }
      ]
    });

    const menu = Menu.buildFromTemplate(template);
    const win = BrowserWindow.fromWebContents(event.sender);
    menu.popup({
      window: win,
      callback: () => resolve(null)
    });
  });
});

// Native multiple files picker handler
ipcMain.handle('select-multiple-files', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Select Files',
    properties: ['openFile', 'multiSelections']
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return [];
  }

  const files = [];
  for (const filePath of result.filePaths) {
    try {
      const buffer = fs.readFileSync(filePath);
      const filename = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      let mimeType = 'application/octet-stream';
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
        mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      } else if (['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'py'].includes(ext)) {
        mimeType = 'text/plain';
      }
      const dataURL = `data:${mimeType};base64,${buffer.toString('base64')}`;
      files.push({ filename, dataURL });
    } catch (err) {
      console.error('Error reading selected file:', filePath, err);
    }
  }
  return files;
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'IDeV Advanced Pro',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#ffffff',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      v8CacheOptions: 'bypassHeatCheck'
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Native context menu on right click for input box, text selection, etc.
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo' }));
      menu.append(new MenuItem({ role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'cut' }));
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'pasteAndMatchStyle' }));
      menu.append(new MenuItem({ role: 'delete' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
      menu.popup({ window: mainWindow });
      return;
    }

    if (params.selectionText && params.selectionText.trim().length > 0) {
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
      menu.popup({ window: mainWindow });
      return;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
