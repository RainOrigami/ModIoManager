import ModIOInteraction from './mod-io-interaction';
import { Mod } from './models/mod-io/Mod';
import { ModDependency } from './models/mod-io/ModDependency';
import { PaginationResponse } from './models/mod-io/PaginationResponse';

export interface PageRequest<T> {
  Request: (page: number, cancelToken: AbortSignal) => Promise<PaginationResponse<T>>;
}

export interface ProgressCallback {
  Callback: (message: string, current: number, total: number) => Promise<void>;
}

export default class ModList {
  private mods: Map<number, Mod> = new Map();

  public getLoadedMods(): Map<number, Mod> {
    return this.mods;
  }

  constructor(
    public gameId: number,
    private modIo: ModIOInteraction
  ) {}

  public async getModById(
    id: number,
    progressCallback: ProgressCallback,
    cancelToken: AbortSignal
  ): Promise<Mod | undefined> {
    if (cancelToken.aborted) {
      return undefined;
    }

    await progressCallback.Callback(`Loading mod UGC${id}`, 0, 1);
    let mod = this.mods.get(id);

    if (mod) {
      await progressCallback.Callback(`Loading mod ${mod.name}`, 1, 1);
      return cancelToken.aborted ? undefined : mod;
    }

    if (cancelToken.aborted) {
      return undefined;
    }

    mod = await this.modIo.getMod(this.gameId, id, cancelToken);
    if (!mod) {
      await progressCallback.Callback(`Loading mod UGC${id}`, 1, 1);
      return undefined;
    }

    if (cancelToken.aborted) {
      return undefined;
    }

    mod.dependency_mod_ids = [];

    await progressCallback.Callback(`Loading mod ${mod.name}`, 1, 1);
    this.mods.set(mod.id, mod);

    if (mod.dependencies) {
      await this.getModsByIds(mod.dependency_mod_ids, progressCallback, cancelToken);
    }

    return cancelToken.aborted ? undefined : mod;
  }

  public async getModsByIds(
    ids: number[],
    progressCallback: ProgressCallback,
    cancelToken: AbortSignal
  ): Promise<Mod[]> {
    if (cancelToken.aborted) {
      return [];
    }

    ids = [...new Set(ids)];

    await progressCallback.Callback(`Loading ${ids.length} mods`, 0, ids.length);

    const foundMods: Mod[] = [];
    const missingMods: number[] = [];
    ids.forEach((id) => {
      const mod = this.mods.get(id);
      if (mod) {
        foundMods.push(mod);
      } else {
        missingMods.push(id);
      }
    });

    if (foundMods.length === ids.length || cancelToken.aborted) {
      await progressCallback.Callback(`Loading ${ids.length} mods`, 1, 1);
      return cancelToken.aborted ? [] : foundMods;
    }

    // Reason for chunking is that the API takes the ids as a query parameter and the URL length may be limited.
    // Since multiple requests have to be made anyway, we can chunk the requests ourselves.
    const chunks: number[][] = [];
    while (missingMods.length) {
      chunks.push(missingMods.splice(0, this.modIo.limit));
    }

    if (cancelToken.aborted) {
      return [];
    }

    await progressCallback.Callback(`Loading ${chunks.length} mod pages`, 0, chunks.length);
    const loadedMods: Mod[] = (
      await Promise.all(
        chunks.map(async (chunk, index) => {
          await progressCallback.Callback(
            `Loading ${chunks.length} mod pages`,
            index + 1,
            chunks.length
          );

          return (await this.modIo.getModsByModIds(this.gameId, chunk, 0, cancelToken)).data;
        })
      )
    ).flat();

    if (cancelToken.aborted) {
      return [];
    }

    loadedMods.forEach((mod) => {
      mod.dependency_mod_ids = [];
    });

    loadedMods.filter((mod) => !this.mods.has(mod.id)).forEach((mod) => this.mods.set(mod.id, mod));

    const modsWithDependencies = loadedMods.filter((mod) => mod.dependencies);
    await progressCallback.Callback(
      `Resolving dependencies of ${modsWithDependencies.length} mods`,
      0,
      0
    );
    await Promise.all(
      modsWithDependencies.map(async (mod) => {
        await this.resolveDependencies(mod, progressCallback, cancelToken);
      })
    );

    return cancelToken.aborted ? [] : [...foundMods, ...loadedMods];
  }

  public async getDependencies(
    mod: Mod,
    progressCallback: ProgressCallback,
    cancelToken: AbortSignal
  ): Promise<Mod[]> {
    if (!mod.dependencies || cancelToken.aborted) {
      return [];
    }

    await progressCallback.Callback(`Resolving dependencies for ${mod.name}`, 0, 0);
    await this.resolveDependencies(mod, progressCallback, cancelToken);

    return cancelToken.aborted
      ? []
      : this.getModsByIds(mod.dependency_mod_ids, progressCallback, cancelToken);
  }

  public async getSubscribedMods(
    progressCallback: ProgressCallback,
    cancelToken: AbortSignal
  ): Promise<Mod[]> {
    if (!this.modIo.apiToken || cancelToken.aborted) {
      return [];
    }

    await progressCallback.Callback('Loading subscribed mods', 0, 0);
    let subscribedMods = await this.loadAllPages<Mod>(
      {
        Request: (page, cancelToken) => this.modIo.getSubscribedMods(this.gameId, page, cancelToken)
      },
      progressCallback,
      cancelToken,
      'Loading subscribed mods'
    );

    if (cancelToken.aborted) {
      return [];
    }

    subscribedMods.forEach((mod) => {
      mod.dependency_mod_ids = [];
    });

    // Add new mods to the list
    subscribedMods
      .filter((mod) => !this.mods.has(mod.id))
      .forEach((mod) => this.mods.set(mod.id, mod));

    // Mark subscribed mods as such
    subscribedMods = subscribedMods.map((mod) => this.mods.get(mod.id) as Mod);
    subscribedMods.forEach((mod) => (mod.subscribed = true));

    const modsWithDependencies = subscribedMods.filter((mod) => mod.dependencies);
    await progressCallback.Callback(
      `Resolving dependencies of ${modsWithDependencies.length} mods`,
      0,
      0
    );
    await Promise.all(
      modsWithDependencies.map(async (mod) => {
        await this.resolveDependencies(mod, progressCallback, cancelToken);
      })
    );

    return cancelToken.aborted ? [] : subscribedMods;
  }

  private async loadAllPages<T>(
    singlePageRequest: PageRequest<T>,
    progressCallback: ProgressCallback,
    cancelToken: AbortSignal,
    progressMessage: string
  ): Promise<T[]> {
    if (cancelToken.aborted) {
      return [];
    }

    const data: T[] = [];
    let page = 0;

    let response: PaginationResponse<T> | null = null;
    do {
      if (cancelToken.aborted) {
        return [];
      }

      let totalPages = 0;
      if (response) {
        totalPages = Math.ceil(response.result_total / this.modIo.limit);
      }
      progressCallback.Callback(progressMessage, page + 1, totalPages);

      response = await singlePageRequest.Request(page, cancelToken);

      data.push(...response.data);
    } while (page++ * response.result_limit < response.result_total && !cancelToken.aborted);

    return cancelToken.aborted ? [] : data;
  }

  private async loadDependencies(
    mod: Mod,
    progressCallback: ProgressCallback,
    cancelToken: AbortSignal
  ): Promise<void> {
    if (!mod.dependencies) {
      return;
    }

    await progressCallback.Callback(`Loading dependencies for ${mod.name}`, 0, 0);
    const dependencies = await this.loadAllPages<ModDependency>(
      {
        Request: (page, cancelToken) =>
          this.modIo.getDependencies(this.gameId, mod.id, page, cancelToken)
      },
      progressCallback,
      cancelToken,
      `Loading dependencies for ${mod.name}`
    );

    if (cancelToken.aborted) {
      return;
    }

    mod.dependency_mod_ids = dependencies.map((dependency) => dependency.mod_id);
  }

  private async resolveDependencies(
    mod: Mod,
    progressCallback: ProgressCallback,
    cancelToken: AbortSignal
  ): Promise<void> {
    if (!mod.dependencies || cancelToken.aborted) {
      return;
    }

    if (mod.dependency_mod_ids.length === 0) {
      await this.loadDependencies(mod, progressCallback, cancelToken);
    }

    if (cancelToken.aborted) {
      return;
    }

    const unloadedDependencies = mod.dependency_mod_ids.filter((id) => !this.mods.has(id));

    if (unloadedDependencies.length === 0 || cancelToken.aborted) {
      return;
    }

    await progressCallback.Callback(`Resolving dependencies for ${mod.name}`, 0, 0);

    await this.getModsByIds(unloadedDependencies, progressCallback, cancelToken);
  }
}
