import { logger } from '@lolz-bots/shared';

export interface MethodArgs {
  key: string;
  value: unknown;
}

export class LolzApi {
  apiKey: string;
  url: string;

  constructor(apiKey: string, url?: string) {
    this.apiKey = apiKey;
    this.url = url ?? '';
  }

  buildUrl(method: string, args: MethodArgs[]): string {
    const argumentsString = args
      .map((v, i) => {
        let key = '?';
        if (this.url.includes('?') || i === 0) {
          key = '&';
        }
        return `${key}${v.key}=${v.value}`;
      })
      .join('');
    return this.url + method + argumentsString;
  }

  async sendRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T | null> {
    try {
      const headers: { [key: string]: string } = {
        accept: 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      };
      if (options.body) {
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: headers,
        ...options,
      });
      if (response.status === 429) {
        return { status: 429 } as T;
      }
      return (await response.json()) as Promise<T>;
    } catch (error) {
      logger.error(error);
    }
    return null;
  }
}
