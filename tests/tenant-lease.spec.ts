import { test, expect } from '@playwright/test';

// ✅ ASTUCE DE CTO : On désactive le cookie global "Voyageur" pour ce fichier
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Patrimoine & Baux - Espace Locataire', () => {

  test('Le locataire peut voir son bail en attente et les frais initiaux', async ({ page }) => {
    
    // 1. Connexion en tant que Locataire (Données du Seed)
    await page.goto('/login');

    const acceptCookiesBtn = page.getByRole('button', { name: 'Accepter' });
    if (await acceptCookiesBtn.isVisible()) {
        await acceptCookiesBtn.click();
    }

    // Identifiants de Marie Prospect (TENANT)
    await page.getByPlaceholder('Ex: koffi@babimmo.ci').fill('nouveau@gmail.com'); 
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    // 2. Attente de la compilation et redirection vers le dashboard privé
    await page.waitForURL(/.*\/dashboard.*/, { timeout: 20000 });

    // 3. Vérification de la présence du bien immobilier assigné
    // Le seed a créé la "Villa Emeraude"
    const propertyTitle = page.getByText(/Villa Emeraude/i).first();
    await expect(propertyTitle).toBeVisible();

    // 4. Vérification du statut du paiement
    // Le snapshot nous indique que l'UI affiche "Paiement ouvert"
    const pendingBadge = page.getByText(/Paiement ouvert/i).first();
    await expect(pendingBadge).toBeVisible();

    // 5. Vérification du montant de la facture (Caution 3M + Avance 1.5M)
    // L'UI affiche "4,500,000 CFA"
    const paymentAmount = page.getByRole('heading', { name: /4,500,000/i }).first();
    await expect(paymentAmount).toBeVisible();
    
    // 6. Vérification de l'action principale
    // L'UI affiche le bouton "Payer mon entrée"
    const payButton = page.getByRole('button', { name: /Payer mon entrée/i }).first();
    await expect(payButton).toBeVisible();
  });

});
