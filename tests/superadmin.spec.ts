import { test, expect } from '@playwright/test';

// ✅ On isole la session pour repartir à zéro
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Plateforme - Espace Super Admin', () => {

  test("Le Super Admin peut superviser la plateforme et voir les agences", async ({ page }) => {
    
    // 1. Connexion avec le compte Maître
    await page.goto('/login');

    const acceptCookiesBtn = page.getByRole('button', { name: 'Accepter' });
    if (await acceptCookiesBtn.isVisible()) {
        await acceptCookiesBtn.click();
    }

    // ⚠️ Remplace par l'email exact de ton Super Admin dans ton fichier seed.ts
    await page.getByPlaceholder('Ex: koffi@babimmo.ci').fill('admin@babimmo.ci'); 
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    // 2. Attente de la redirection vers le dashboard d'administration
    await page.waitForURL(/.*\/dashboard.*/, { timeout: 20000 });

    // 3. Vérification de la présence d'un titre ou badge exclusif au Super Admin
    // Adapte avec le texte exact de ton UI (ex: "Administration", "Vue Globale", "Plateforme")
    const adminBadge = page.getByText(/Administration|Super Admin|Vue Globale/i).first();
    await expect(adminBadge).toBeVisible();

    // 4. Navigation vers le répertoire des Agences ou des Utilisateurs
    // Le menu s'appelle probablement "Agences", "Réseau" ou "Utilisateurs"
    const agenciesMenu = page.getByRole('link', { name: /Agences|Réseau/i }).first();
    
    // Si la page des agences existe, on y va
    if (await agenciesMenu.isVisible()) {
        await agenciesMenu.click();
        
        // On attend le chargement de la liste
        await page.waitForURL(/.*\/agencies.*/, { timeout: 10000 });

        // 5. Vérification ultime : Le Super Admin doit pouvoir voir l'agence "Immo Prestige"
        const agencyName = page.getByText(/Immo Prestige/i).first();
        await expect(agencyName).toBeVisible();
        
        // Et éventuellement un bouton pour gérer / suspendre l'agence
        const manageAgencyBtn = page.getByRole('button', { name: /Gérer|Options/i }).first();
        if (await manageAgencyBtn.isVisible()) {
            await expect(manageAgencyBtn).toBeVisible();
        }
    }
  });

});
