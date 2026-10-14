const { contextBridge, ipcRenderer } = require('electron')

// 通过 contextBridge 向渲染进程暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  printShelfLabel: (label) => ipcRenderer.invoke('app:print-shelf-label', label),
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
})
