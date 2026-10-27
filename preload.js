const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronNative', {
  showContextMenu: (items) => ipcRenderer.invoke('show-context-menu', items)
});

contextBridge.exposeInMainWorld('webview', {
  selectMultipleFiles: () => ipcRenderer.invoke('select-multiple-files')
});
