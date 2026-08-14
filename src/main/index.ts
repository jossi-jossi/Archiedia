import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // 네이버웹툰/카카오웹툰 내부 API는 CORS를 허용하지 않는 비공식 API라, 렌더러(브라우저
  // 컨텍스트)에서 직접 fetch하면 막힐 수 있다. CORS 제약이 없는 메인 프로세스에서 대신
  // 요청한다. 임의 URL을 프록시하면 위험하니 알려진 웹툰 도메인으로만 제한한다.
  const WEBTOON_REFERERS: Record<string, string> = {
    'comic.naver.com': 'https://comic.naver.com/',
    'gateway-kw.kakao.com': 'https://webtoon.kakao.com/'
  }
  ipcMain.handle('webtoon:request', async (_event, url: string) => {
    const parsed = new URL(url)
    const referer = WEBTOON_REFERERS[parsed.hostname]
    if (!referer) {
      throw new Error('허용되지 않은 도메인입니다')
    }
    const res = await fetch(url, {
      headers: {
        Referer: referer,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    if (!res.ok) throw new Error(`웹툰 API 요청 실패 (${res.status})`)
    return res.json()
  })

  // 알라딘 Open API는 서버사이드 호출을 전제로 만들어져 있어 CORS 헤더가 없을 수 있으니,
  // 웹툰과 같은 이유로 메인 프로세스에서 대신 요청한다.
  ipcMain.handle('aladin:request', async (_event, url: string) => {
    const parsed = new URL(url)
    if (parsed.hostname !== 'www.aladin.co.kr') {
      throw new Error('허용되지 않은 도메인입니다')
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error(`알라딘 API 요청 실패 (${res.status})`)
    return res.json()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
