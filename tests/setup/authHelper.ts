import { Page, expect } from '@playwright/test';

export async function safeLogin(page: Page, email: string, password = 'password123') {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Accepter' }).click({ timeout: 3000 }).catch(() => {});
  await page.getByPlaceholder('Ex: koffi@babimmo.ci').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // On valide juste que la connexion a réussi via l'URL
  await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 30000 });
}
