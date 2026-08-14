const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development'

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
    title: '小木棒洗衣管理系统',
    icon: path.join(__dirname, '../src/assets/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  if (isDev) {
    // 开发模式加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173')
    // 自动打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
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
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
  })
})
