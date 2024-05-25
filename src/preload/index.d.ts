import { ElectronAPI } from '@electron-toolkit/preload';
import ModList from '@renderer/ModList';

declare global {
  interface Window {
    electron: ElectronAPI;
    modList: ModList;
  }
}
