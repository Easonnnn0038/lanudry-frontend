const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

// 在 root 用户或容器环境下禁用 sandbox（开发环境兼容）
if (process.getuid && process.getuid() === 0) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('no-sandbox')
}

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: '小木棒洗衣门店端',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  if (isDev) {
    // 开发模式加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadURL('http://124.220.168.222/')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 移除默认菜单栏（可选：保留以方便调试）
if (!isDev) {
  Menu.setApplicationMenu(null)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 安全设置：阻止创建额外的窗口
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})
