const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { shelfLabelHtml } = require('./shelf-label')

const isDev = !app.isPackaged

// 在 root 用户或容器环境下禁用 sandbox（开发环境兼容）
if (process.getuid && process.getuid() === 0) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('no-sandbox')
}

let mainWindow = null

function productionUrl() {
  const configured = process.env.LAUNDRY_APP_URL || appConfig().productionUrl
  const url = new URL(configured)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('productionUrl 仅支持 http/https')
  return url.toString()
}

function appConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'app-config.json'), 'utf8'))
}

async function printShelfLabel(label) {
  const printerName = (process.env.LAUNDRY_SHELF_PRINTER || appConfig().shelfLabelPrinter || '').trim()
  if (!printerName) return { ok: false, reason: 'NOT_CONFIGURED' }
  const printers = await mainWindow.webContents.getPrintersAsync()
  if (!printers.some(printer => printer.name === printerName)) return { ok: false, reason: 'NOT_FOUND' }
  const html = shelfLabelHtml(label)
  const printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } })
  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    return await new Promise(resolve => printWindow.webContents.print({
      silent: true, deviceName: printerName, printBackground: true,
      pageSize: { width: 30000, height: 110000 }, margins: { marginType: 'none' }
    }, (success, failureReason) => resolve({ ok: success, reason: success ? 'QUEUED' : failureReason || 'FAILED' })))
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close()
  }
}

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
    mainWindow.loadURL(productionUrl())
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
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:open-external', (_event, target) => {
    const url = new URL(target)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅允许打开网页链接')
    return shell.openExternal(url.toString())
  })
  ipcMain.handle('app:print-shelf-label', (event, label) => {
    if (event.sender !== mainWindow?.webContents) throw new Error('只允许门店主窗口打印衣架号标签')
    return printShelfLabel(label)
  })
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

// 收衣凭证和送厂标签会打开空白打印窗口；其余新窗口仍禁止。
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) =>
    contents === mainWindow?.webContents && url === 'about:blank'
      ? { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } } }
      : { action: 'deny' })
})
