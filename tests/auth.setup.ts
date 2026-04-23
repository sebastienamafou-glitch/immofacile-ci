import { test as setup } from '@playwright/test';
import { safeLogin } from './setup/authHelper';

const authFile = 'playwright/.auth/user.json';

setup('Authentification globale', async ({ page }) => {
  await safeLogin(page, 'voyageur@test.com');
  await page.context().storageState({ path: authFile });
});
