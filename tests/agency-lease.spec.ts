import { test, expect } from '@playwright/test';

// ✅ On désactive toujours le cookie global "Voyageur" pour se connecter en tant qu'Agent
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Patrimoine & Baux - Espace Agence', () => {

  test("L'agent peut gérer le bien et voir le bail en cours", async ({ page }) => {
    
    // 1. Connexion en tant qu'Agent (Données du Seed)
    await page.goto('/login');

    const acceptCookiesBtn = page.getByRole('button', { name: 'Accepter' });
    if (await acceptCookiesBtn.isVisible()) {
        await acceptCookiesBtn.click();
    }

    // Identifiants de Pierre Admin (Rôle: AGENCY_ADMIN)
    await page.getByPlaceholder('Ex: koffi@babimmo.ci').fill('pierre@immoprestige.ci'); 
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    // 2. Attente de la redirection vers le dashboard agence
    await page.waitForURL(/.*\/dashboard.*/, { timeout: 20000 });

    // 3. Navigation vers la liste des biens (Patrimoine)
    // ✅ CORRECTION : Le menu du Directeur d'Agence s'appelle "Biens Gérés"
    const propertiesLink = page.getByRole('link', { name: 'Biens Gérés' });
    await propertiesLink.click();

    // On attend explicitement que l'URL change pour être sûr que la page a chargé
    await page.waitForURL(/.*\/properties.*/, { timeout: 10000 });

    // 4. Vérification de la présence du bien de la base de données
    const propertyTitle = page.getByText(/Villa Emeraude/i).first();
    await expect(propertyTitle).toBeVisible();

    // 5. Vérification de l'association avec le PROPRIÉTAIRE (UI Design)
    // Sur la vue "Biens Gérés", la carte affiche le propriétaire et non le locataire
    const ownerName = page.getByText(/Kouassi/i).first();
    await expect(ownerName).toBeVisible();

    // 6. Vérification des données financières du bail (Loyer mensuel = 1 500 000)
    const rentAmount = page.getByText(/1.*500.*000/i).first();
    await expect(rentAmount).toBeVisible();
  });

});
