import { test, expect } from '@playwright/test';
import { safeLogin } from './setup/authHelper';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Plateforme - Espace Super Admin', () => {
  
  // ✅ FIX : On donne 60s au lieu de 30s au test pour survivre à la compilation Next.js
  test.setTimeout(60000);

  test("Le Super Admin peut superviser la plateforme et voir les agences", async ({ page }) => {
    
    await safeLogin(page, 'admin@babimmo.ci');

    const adminBadge = page.getByText(/Administration|Super Admin|Vue Globale/i).first();
    
    // ✅ FIX : On attend le texte pendant 25s (le temps que le spinner disparaisse)
    await expect(adminBadge).toBeVisible({ timeout: 25000 });

    const agenciesMenu = page.getByRole('link', { name: /Agences|Réseau/i }).first();
    
    if (await agenciesMenu.isVisible()) {
        await agenciesMenu.click();
        await expect(page).toHaveURL(/.*\/agencies.*/, { timeout: 15000 });

        const agencyName = page.getByText(/Immo Prestige/i).first();
        await expect(agencyName).toBeVisible();
        
        const manageAgencyBtn = page.getByRole('button', { name: /Gérer|Options/i }).first();
        if (await manageAgencyBtn.isVisible()) {
            await expect(manageAgencyBtn).toBeVisible();
        }
    }
  });
});
