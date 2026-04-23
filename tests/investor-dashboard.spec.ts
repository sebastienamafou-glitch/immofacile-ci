import { test, expect } from '@playwright/test';
import { safeLogin } from './setup/authHelper';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Investissement - Espace Investisseur', () => {
  test("L'investisseur peut consulter son portefeuille et ses contrats actifs", async ({ page }) => {
    
    await safeLogin(page, 'investisseur@gmail.com');

    // ✅ FIX : Tout est déjà sur le dashboard principal selon ta capture d'écran !
    const packName = page.getByText(/Pack Investisseur|PREMIUM/i).first();
    await expect(packName).toBeVisible();

    const contractPdf = page.getByText(/Contrat_Investissement.pdf/i).first();
    await expect(contractPdf).toBeVisible();

    const signedStatus = page.getByText(/Signé/i).first();
    await expect(signedStatus).toBeVisible();
  });
});
