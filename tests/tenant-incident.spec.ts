import { test, expect } from '@playwright/test';

// On désactive le cookie global "Voyageur"
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Maintenance - Espace Locataire', () => {

  test('Le locataire peut voir son incident en cours', async ({ page }) => {
    
    // 1. Connexion en tant que Locataire (Marie Prospect)
    await page.goto('/login');

    const acceptCookiesBtn = page.getByRole('button', { name: 'Accepter' });
    if (await acceptCookiesBtn.isVisible()) {
        await acceptCookiesBtn.click();
    }

    await page.getByPlaceholder('Ex: koffi@babimmo.ci').fill('nouveau@gmail.com'); 
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await page.waitForURL(/.*\/dashboard.*/, { timeout: 20000 });

    // 2. Navigation vers la section Maintenance/Incidents
    // Le menu s'appelle généralement "Signaler Incident" ou "Maintenance" selon ton UI
    const maintenanceLink = page.getByRole('link', { name: /Incident|Maintenance/i }).first();
    await maintenanceLink.click();
    
    await page.waitForURL(/.*\/incidents.*/, { timeout: 10000 });

    // 3. Vérification de la présence de l'incident du Seed
    // ✅ L'UI affiche la description ("Inondation...") et non le titre court
    const incidentDesc = page.getByText(/Inondation sous l'évier/i).first();
    await expect(incidentDesc).toBeVisible();

    // 4. Vérification du statut
    // ✅ Le statut OPEN est affiché comme "En attente"
    const statusBadge = page.getByText(/En attente/i).first();
    await expect(statusBadge).toBeVisible();
    
    // 5. Vérification de l'action principale (La carte est un lien)
    const incidentCard = page.getByRole('link', { name: /Inondation sous l'évier/i }).first();
    await expect(incidentCard).toBeVisible();
  });

});
