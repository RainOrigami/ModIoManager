import { Mod } from './models/mod-io/Mod';
import { ModDependency } from './models/mod-io/ModDependency';
import { PaginationResponse } from './models/mod-io/PaginationResponse';

export default class ModIOInteraction {
  constructor(
    public readonly apiToken: string | null,
    public readonly baseUrl: string,
    public readonly limit: number = 50
  ) {
    if (baseUrl.endsWith('/')) {
      this.baseUrl = baseUrl.slice(0, -1);
    }
  }

  private getHeaders(): Record<string, string> {
    if (this.apiToken) {
      return {
        Authorization: `Bearer ${this.apiToken}`
      };
    } else {
      return {};
    }
  }

  async getModsByGame(
    gameId: number,
    page: number,
    cancelToken: AbortSignal
  ): Promise<PaginationResponse<Mod>> {
    const response = await fetch(
      `${this.baseUrl}/games/${gameId}/mods?_limit=${this.limit}&_offset=${page * this.limit}`,
      { headers: this.getHeaders(), signal: cancelToken }
    );

    const data: PaginationResponse<Mod> = await response.json();
    return data;
  }

  async getMod(gameId: number, modId: number, cancelToken: AbortSignal): Promise<Mod> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/mods/${modId}`, {
      headers: this.getHeaders(),
      signal: cancelToken
    });

    const data: Mod = await response.json();
    return data;
  }

  async getModsByModIds(
    gameId: number,
    modIds: number[],
    page: number,
    cancelToken: AbortSignal
  ): Promise<PaginationResponse<Mod>> {
    const response = await fetch(
      `${this.baseUrl}/games/${gameId}/mods?_limit=${this.limit}&_offset=${page * this.limit}&id-in=${modIds.join(
        ','
      )}`,
      { headers: this.getHeaders(), signal: cancelToken }
    );

    const data: PaginationResponse<Mod> = await response.json();
    return data;
  }

  async getDependencies(
    gameId: number,
    modId: number,
    page: number,
    cancelToken: AbortSignal
  ): Promise<PaginationResponse<ModDependency>> {
    const response = await fetch(
      `${this.baseUrl}/games/${gameId}/mods/${modId}/dependencies?_limit=${this.limit}&_offset=${page * this.limit}&recursive=true`,
      { headers: this.getHeaders(), signal: cancelToken }
    );

    const data: PaginationResponse<ModDependency> = await response.json();
    return data;
  }

  async getSubscribedMods(
    gameId: number,
    page: number,
    cancelToken: AbortSignal
  ): Promise<PaginationResponse<Mod>> {
    this.requireToken();

    const response = await fetch(
      `${this.baseUrl}/me/subscribed?_limit=${this.limit}&_offset=${page * this.limit}&game_id=${gameId}`,
      { headers: this.getHeaders(), signal: cancelToken }
    );

    const data: PaginationResponse<Mod> = await response.json();
    data.data.forEach((mod: Mod) => {
      mod.subscribed = true;
    });
    return data;
  }

  private requireToken(): void {
    if (!this.apiToken) {
      throw new Error('No API token provided');
    }
  }
}
