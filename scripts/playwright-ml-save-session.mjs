import { chromium } from 'playwright';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_STATE_PATH =
  process.env.MERCADO_LIVRE_STORAGE_STATE_PATH ||
  '.auth/mercadolivre-storage-state.json';

const LOGIN_URL =
  process.env.MERCADO_LIVRE_LOGIN_URL || 'https://www.mercadolivre.com.br/';

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 120,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });

  const page = await context.newPage();
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });

  console.log('Navegador aberto para login no Mercado Livre.');
  console.log('1) Faca login manualmente.');
  console.log('2) Se necessario, passe por 2FA.');
  console.log('3) Quando terminar, volte ao terminal e pressione Enter.');

  const rl = readline.createInterface({ input, output });
  await rl.question('Pressione Enter para salvar a sessao... ');
  rl.close();

  const stateDir = path.dirname(STORAGE_STATE_PATH);
  await mkdir(stateDir, { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });

  console.log(`Sessao salva em: ${STORAGE_STATE_PATH}`);

  await context.close();
  await browser.close();
}

main().catch(async (error) => {
  console.error('Falha ao salvar sessao do Mercado Livre:', error);
  process.exit(1);
});
