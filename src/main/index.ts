import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join, resolve } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/modio-cog-black.png?asset';
import { Config } from '../preload/Config';
import fs from 'fs';
import { LocalModHandler } from './LocalModHandler';
import { ConfigHandler } from './ConfigHandler';
import { Mod } from '../renderer/src/models/mod-io/Mod';
import byteSize from 'byte-size';
// import { Mod } from '../renderer/src/models/mod-io/Mod';

let mainWindow: BrowserWindow;

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 900,
    minWidth: 1260,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'win32' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  let configPath = resolve('./config.json');
  // when in development, the config file is in a safe location
  if (is.dev) {
    configPath = join(process.env.APPDATA!, 'mod-io-manager/config.json');

    if (!fs.existsSync(join(process.env.APPDATA!, 'mod-io-manager'))) {
      fs.mkdirSync(join(process.env.APPDATA!, 'mod-io-manager'));
    }
  }

  const configHandler = new ConfigHandler(configPath);

  let modHandler: LocalModHandler | null = null;

  const modPath = await LocalModHandler.autodetectModPath();
  if (modPath !== null) {
    modHandler = new LocalModHandler(modPath);
  }

  ipcMain.handle('get-mods', async () => {
    return (await modHandler?.getLocalMods()) || [];
  });

  ipcMain.handle('get-config', () => {
    return configHandler.getConfig();
  });
  ipcMain.handle('save-config', async (_, config: Config) => {
    configHandler.setConfig(config);
  });

  ipcMain.on('open-external', (_, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.on('cancel-batch-element', () => {});
  ipcMain.on('download-mod', async (_, mods: Mod[]) => {
    if (!modHandler) {
      throw new Error('No mod path found');
    }

    for (let i = 0; i < mods.length; i++) {
      const mod = mods[i];
      const size = byteSize(mod.modfile.filesize);
      mainWindow.webContents.send('start-batch-element', {
        message: `Starting download of ${mod.name} (${size.value} ${size.unit})...`,
        batchSize: mods.length,
        currentIndex: i + 1,
        percent: 0
      });

      await modHandler.downloadMod(
        mod,
        (progress) => {
          const progressSize = byteSize(progress.transferredBytes);
          const totalSize = byteSize(progress.totalBytes);
          mainWindow.webContents.send('progress-batch-element', {
            message: `Downloading ${mod.name}: ${progressSize.value} ${progressSize.unit} / ${totalSize.value} ${totalSize.unit}`,
            percent: Math.round(progress.percent * 100)
          });
        },
        (status) => {
          mainWindow.webContents.send('start-batch-element', {
            message: status.message,
            percent: status.percent
          });
        }
      );
    }

    mainWindow.webContents.send('complete-batch-element');
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
