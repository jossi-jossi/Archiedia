import { ElectronAPI } from '@electron-toolkit/preload'

interface ArchiediaApi {
  webtoon: {
    request: (url: string) => Promise<unknown>
  }
  aladin: {
    request: (url: string) => Promise<unknown>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ArchiediaApi
  }
}
