import { Browser, BrowserContext, BrowserType, Page } from 'playwright';

export type PlaywrightBrowserType = Pick<BrowserType<Browser>, 'launch'>;

export type AuthenticatedBrowserPage = {
  context: BrowserContext;
  page: Page;
  close(): Promise<void>;
};
