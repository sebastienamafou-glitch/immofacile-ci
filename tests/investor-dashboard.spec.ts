import { test, expect } from '@playwright/test';

// ✅ On isole la session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Investissement - Espace Investisseur', () => {

  test("L'investisseur peut consulter son portefeuille et ses contrats actifs", async ({ page }) => {
    
    // 1. Connexion en tant qu'Investisseur (Gilles Invest)
    await page.goto('/login');

    const acceptCookiesBtn = page.getByRole('button', { name: 'Accepter' });
    if (await acceptCookiesBtn.isVisible()) {
        await acceptCookiesBtn.click();
    }

    await page.getByPlaceholder('Ex: koffi@babimmo.ci').fill('investisseur@gmail.com'); 
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await page.waitForURL(/.*\/dashboard.*/, { timeout: 20000 });

    // 2. Navigation vers la section Mes Contrats
    // ✅ CORRECTION : On cible le nom exact de ton menu latéral
    const investLink = page.getByRole('link', { name: 'Mes Contrats' });
    await investLink.click();
    
    // ✅ CORRECTION : On attend la bonne URL
    await page.waitForURL(/.*\/contract.*/, { timeout: 10000 });

    // 3. Vérification du Pack souscrit (PREMIUM ou Investisseur)
    const packName = page.getByText(/PREMIUM|Investisseur/i).first();
    await expect(packName).toBeVisible();

    // 4. Vérification du montant investi (10 000 000 FCFA)
    const amount = page.getByText(/10.*000.*000/i).first();
    await expect(amount).toBeVisible();

    // 5. Vérification du statut du contrat
    // ✅ CORRECTION : Sur cette page, l'UI affiche l'état légal "Signé"
    const statusBadge = page.getByText(/Signé/i).first();
    await expect(statusBadge).toBeVisible();
    
    // 6. Vérification de l'action pour voir les détails
    // ✅ CORRECTION : La carte entière est un lien cliquable
    const contractCard = page.getByRole('link', { name: /Contrat : PREMIUM/i }).first();
    await expect(contractCard).toBeVisible();
  });

});
