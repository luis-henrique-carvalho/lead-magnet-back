import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Marketplace } from '../../../shared/enums/marketplace.enum';
import {
  BrowserSessionNotConfiguredError,
  BrowserSessionStateError,
} from './browser-session.errors';
import {
  MARKETPLACE_STORAGE_STATE_ENV,
  MERCADO_LIVRE_COOKIE_HEADER_ENV,
  MERCADO_LIVRE_COOKIE_HEADER_PATH_ENV,
} from './marketplace-storage-state.constants';
import {
  BrowserStorageState,
  MarketplaceStorageStateProvider,
} from './marketplace-storage-state.provider';

const MERCADO_LIVRE_COOKIE_DOMAIN = '.mercadolivre.com.br';
const MERCADO_LIVRE_REQUIRED_SESSION_COOKIE = 'ssid';
type StorageStateCookie = BrowserStorageState['cookies'][number];

@Injectable()
export class FileMarketplaceStorageStateProvider extends MarketplaceStorageStateProvider {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async getStorageState(
    marketplace: Marketplace,
  ): Promise<BrowserStorageState> {
    if (marketplace === Marketplace.MercadoLivre) {
      const cookieHeaderStorageState =
        await this.getMercadoLivreCookieHeaderStorageState();

      if (cookieHeaderStorageState) {
        return cookieHeaderStorageState;
      }
    }

    return this.getFileStorageState(marketplace);
  }

  private async getFileStorageState(
    marketplace: Marketplace,
  ): Promise<BrowserStorageState> {
    const environmentVariable = MARKETPLACE_STORAGE_STATE_ENV[marketplace];
    const configuredPath = this.configService.get<string>(environmentVariable);
    const defaultPath = this.getDefaultStorageStatePath(marketplace);
    const storageStatePath = resolve(configuredPath?.trim() || defaultPath);

    if (!configuredPath?.trim() && !defaultPath) {
      throw new BrowserSessionNotConfiguredError(
        marketplace,
        environmentVariable,
      );
    }

    try {
      const content = await readFile(storageStatePath, 'utf8');
      const storageState: unknown = JSON.parse(content);

      if (!this.isStorageState(storageState)) {
        throw new BrowserSessionStateError(
          marketplace,
          `Invalid Playwright storageState for ${marketplace}: ${storageStatePath}`,
        );
      }

      return storageState;
    } catch (error) {
      if (error instanceof BrowserSessionStateError) {
        throw error;
      }

      throw new BrowserSessionStateError(
        marketplace,
        `Could not load Playwright storageState for ${marketplace}: ${storageStatePath}`,
        { cause: error },
      );
    }
  }

  private async getMercadoLivreCookieHeaderStorageState(): Promise<
    BrowserStorageState | undefined
  > {
    const configuredCookieHeaderPath = this.configService.get<string>(
      MERCADO_LIVRE_COOKIE_HEADER_PATH_ENV,
    );
    const cookieHeaderPath = configuredCookieHeaderPath?.trim();

    if (cookieHeaderPath) {
      const resolvedCookieHeaderPath = resolve(cookieHeaderPath);

      try {
        const cookieHeader = await readFile(resolvedCookieHeaderPath, 'utf8');

        return this.createMercadoLivreStorageStateFromCookieHeader(
          cookieHeader,
          `Invalid Mercado Livre cookie header file: ${resolvedCookieHeaderPath}`,
        );
      } catch (error) {
        if (error instanceof BrowserSessionStateError) {
          throw error;
        }

        throw new BrowserSessionStateError(
          Marketplace.MercadoLivre,
          `Could not load Mercado Livre cookie header file: ${resolvedCookieHeaderPath}`,
          { cause: error },
        );
      }
    }

    const configuredCookieHeader = this.configService.get<string>(
      MERCADO_LIVRE_COOKIE_HEADER_ENV,
    );

    if (configuredCookieHeader?.trim()) {
      return this.createMercadoLivreStorageStateFromCookieHeader(
        configuredCookieHeader,
        `Invalid Mercado Livre cookie header from ${MERCADO_LIVRE_COOKIE_HEADER_ENV}`,
      );
    }

    return undefined;
  }

  private createMercadoLivreStorageStateFromCookieHeader(
    cookieHeader: string,
    errorMessage: string,
  ): BrowserStorageState {
    const cookies = this.parseMercadoLivreCookieHeader(cookieHeader);

    if (
      cookies.length === 0 ||
      !cookies.some(
        (cookie) => cookie.name === MERCADO_LIVRE_REQUIRED_SESSION_COOKIE,
      )
    ) {
      throw new BrowserSessionStateError(
        Marketplace.MercadoLivre,
        errorMessage,
      );
    }

    return {
      cookies,
      origins: [],
    };
  }

  private parseMercadoLivreCookieHeader(
    cookieHeader: string,
  ): StorageStateCookie[] {
    const normalizedCookieHeader = cookieHeader
      .trim()
      .replace(/^cookie:\s*/i, '');

    if (!normalizedCookieHeader) {
      return [];
    }

    return normalizedCookieHeader
      .split(';')
      .reduce<StorageStateCookie[]>((cookies, part) => {
        const trimmedPart = part.trim();

        if (!trimmedPart) {
          return cookies;
        }

        const separatorIndex = trimmedPart.indexOf('=');

        if (separatorIndex <= 0) {
          return cookies;
        }

        const name = trimmedPart.slice(0, separatorIndex).trim();
        const value = trimmedPart.slice(separatorIndex + 1).trim();

        if (!name || !value) {
          return cookies;
        }

        cookies.push({
          name,
          value,
          domain: MERCADO_LIVRE_COOKIE_DOMAIN,
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        });

        return cookies;
      }, []);
  }

  private getDefaultStorageStatePath(marketplace: Marketplace): string {
    if (marketplace === Marketplace.MercadoLivre) {
      return '.auth/mercadolivre-storage-state.json';
    }

    return '';
  }

  private isStorageState(value: unknown): value is BrowserStorageState {
    return (
      typeof value === 'object' &&
      value !== null &&
      'cookies' in value &&
      Array.isArray(value.cookies) &&
      'origins' in value &&
      Array.isArray(value.origins)
    );
  }
}
