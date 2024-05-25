import { Config } from '../preload/Config';
import fs from 'fs';

export class ConfigHandler {
  constructor(public readonly configPath: string) {}

  public getConfig(): Config {
    if (!fs.existsSync(this.configPath)) {
      const config: Config = {
        modIo: {
          apiKey: null,
          baseUrl: 'https://api.mod.io/v1'
        },
        modPath: null
      };

      this.setConfig(config);
      return config;
    }

    const config = fs.readFileSync(this.configPath, 'utf8');
    return JSON.parse(config);
  }

  public setConfig(config: Config): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }
}
