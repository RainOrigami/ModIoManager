import * as fs from 'fs-extra';
import crypto from 'crypto';
import LocalMod from '../preload/LocalMod';
import { Mod } from '../renderer/src/models/mod-io/Mod';
import { BrowserWindow } from 'electron';
import path from 'path';
import extract from 'extract-zip';
import { Progress, download } from 'electron-dl';

export class LocalModHandler {
  constructor(public readonly modsPath: string) {}

  public async getLocalMods(): Promise<LocalMod[]> {
    const mods = await fs.readdir(this.modsPath);
    const localModPromises = mods
      .filter(
        async (mod) =>
          (await fs.lstat(`${this.modsPath}\\${mod}`)).isDirectory() && mod.match(/UGC\d+/)
      )
      .map(async (mod) => {
        const id = Number(mod.replace('UGC', ''));
        let taint: number = 0;
        if (await fs.pathExists(`${this.modsPath}\\${mod}\\taint`)) {
          taint = Number((await fs.readFile(`${this.modsPath}\\${mod}\\taint`, 'utf8')).trim());
        }
        return {
          Id: id,
          Taint: taint,
          Broken: !(await fs.pathExists(`${this.modsPath}\\${mod}\\Data`)) || taint == 0
        } as LocalMod;
      });

    const localMods = await Promise.all(localModPromises);
    return localMods;
  }

  public static async autodetectModPath(): Promise<string | null> {
    const pavlovConfigPath = `${process.env.LOCALAPPDATA}\\Pavlov\\Saved\\Config\\Windows\\GameUserSettings.ini`;
    if (await fs.pathExists(pavlovConfigPath)) {
      const pavlovConfig = await fs.readFile(pavlovConfigPath, 'utf8');
      const match = pavlovConfig.match(/ModDirectory=(.+)/);
      if (match) {
        return match[1];
      }
    }

    const defaultModPath = `${process.env.LOCALAPPDATA}\\Pavlov\\Saved\\Mods`;
    if (await fs.pathExists(defaultModPath)) {
      return defaultModPath;
    }

    return null;
  }

  public async downloadMod(
    mod: Mod,
    progressCallback: (progress: Progress) => void,
    statusCallback: (status: { message: string; percent: number }) => void
  ): Promise<void> {
    const downloadUrl = mod.modfile.download.binary_url;
    const taint = mod.platforms.find((platform) => platform.platform === 'windows')?.modfile_live;

    if (!taint) {
      throw new Error('Mod does not have a Windows modfile');
    }

    const properties = {
      directory: path.resolve('./download'),
      filename: mod.modfile.filename,
      onProgress: progressCallback,
      overwrite: true
    };

    if (await fs.pathExists(properties.directory)) {
      await fs.rm(properties.directory, { recursive: true });
    }
    await fs.mkdir(properties.directory);

    const fullFilePath = path.join(properties.directory, properties.filename);
    await download(BrowserWindow.getFocusedWindow()!, downloadUrl, properties);

    statusCallback({ message: 'Hashing file...', percent: 0 });
    const fileBuffer = await fs.readFile(fullFilePath);

    statusCallback({ message: 'Hashing file...', percent: 50 });
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex').toLowerCase();
    if (hash !== mod.modfile.filehash.md5) {
      await fs.unlink(fullFilePath);
      throw new Error('Hash mismatch');
    }

    statusCallback({ message: 'Extracting file...', percent: 0 });
    const tempModPath = path.join(properties.directory, `UGC${mod.id}`);
    if (await fs.pathExists(tempModPath)) {
      await fs.rm(tempModPath, { recursive: true });
    }
    await fs.mkdir(tempModPath);

    let itemIndex = 0;
    await extract(fullFilePath, {
      dir: path.join(tempModPath, 'Data'),
      onEntry: (entry, zipFile) => {
        statusCallback({
          message: `Extracting ${entry.fileName} (${itemIndex} / ${zipFile.entryCount})...`,
          percent: Math.round((itemIndex / zipFile.entryCount) * 100)
        });
        itemIndex++;
      }
    });

    statusCallback({ message: 'Writing mod...', percent: 0 });
    await fs.writeFile(path.join(tempModPath, 'taint'), taint.toString());

    const modPath = path.join(this.modsPath, `UGC${mod.id}`);
    if (await fs.pathExists(modPath)) {
      statusCallback({ message: 'Removing old mod...', percent: 0 });
      await fs.rm(modPath, { recursive: true });
    }

    statusCallback({ message: 'Moving mod...', percent: 0 });
    await fs.move(tempModPath, modPath);

    statusCallback({ message: 'Cleaning up...', percent: 0 });
    await fs.unlink(fullFilePath);
  }
}
