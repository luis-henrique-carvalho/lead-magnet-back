import { chromium } from 'playwright';

const STORAGE_STATE_PATH =
  process.env.MERCADO_LIVRE_STORAGE_STATE_PATH ||
  '.auth/mercadolivre-storage-state.json';

const HUB_URL =
  process.env.MERCADO_LIVRE_HUB_URL ||
  'https://www.mercadolivre.com.br/afiliados/hub?is_affiliate=true#menu-user';

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 120,
  });

  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });

  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    if (!contentType.includes('application/json')) return;
    if (!/affiliate|search|items|catalog|graphql/i.test(url)) return;

    console.log(`[json] ${response.status()} ${url}`);
  });

  await page.goto(HUB_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });

  console.log('Playwright Inspector aberto.');
  console.log('Use page.pause() para clicar na interface e testar seletores.');
  console.log('Feche o browser para encerrar.');

  await page.pause();

  await context.close();
  await browser.close();
}

main().catch((error) => {
  console.error('Failed to run Mercado Livre playground:', error);
  process.exit(1);
});
