import { ElectronAPI } from '@electron-toolkit/preload'

interface ArchiediaApi {
  naverWebtoon: {
    request: (url: string) => Promise<unknown>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ArchiediaApi
  }
}
