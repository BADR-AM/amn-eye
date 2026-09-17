const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  quitApp: () => {
    try {
      ipcRenderer.send('app-quit');
    } catch (e) {}
    return ipcRenderer.invoke('app-quit');
  },
});
