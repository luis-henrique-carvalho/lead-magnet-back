import { Marketplace } from '../../../shared/enums/marketplace.enum';

export class BrowserSessionNotConfiguredError extends Error {
  constructor(
    readonly marketplace: Marketplace,
    readonly environmentVariable: string,
  ) {
    super(
      `Authenticated browser session is not configured for ${marketplace}. Set ${environmentVariable}.`,
    );
    this.name = BrowserSessionNotConfiguredError.name;
  }
}

export class BrowserSessionStateError extends Error {
  constructor(
    readonly marketplace: Marketplace,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = BrowserSessionStateError.name;
  }
}
