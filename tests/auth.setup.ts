import { test as setup, expect } from '@playwright/test';

// Le fichier où Playwright va sauvegarder le cookie de session Auth.js
const authFile = 'playwright/.auth/user.json';

setup('Authentification globale', async ({ page }) => {
  // 1. Aller sur ta page de connexion
  await page.goto('/login');

  // 1.5. Écarter la bannière de cookies si elle masque le bouton
  const acceptCookiesBtn = page.getByRole('button', { name: 'Accepter' });
  if (await acceptCookiesBtn.isVisible()) {
      await acceptCookiesBtn.click();
  }

  // 2. Remplir les identifiants avec les VRAIS placeholders de ton UI
  await page.getByPlaceholder('Ex: koffi@babimmo.ci').fill('voyageur@test.com'); 
  await page.getByPlaceholder('••••••••').fill('password123');

  // 3. Valider le formulaire
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // 4. Attendre que la redirection vers le dashboard prouve que la connexion a réussi
  await page.waitForURL(/.*\/dashboard.*/, { timeout: 20000 });

  // 5. Sauvegarder le cookie Auth.js dans notre fichier secret
  await page.context().storageState({ path: authFile });
});
