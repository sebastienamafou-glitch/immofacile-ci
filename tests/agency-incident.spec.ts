import { test, expect } from '@playwright/test';

// On désactive le cookie global
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Maintenance - Espace Agence', () => {

  test("L'agence reçoit l'incident et peut accéder au dossier de maintenance", async ({ page }) => {
    
    // 1. Connexion en tant que Directeur d'Agence (Pierre)
    await page.goto('/login');

    const acceptCookiesBtn = page.getByRole('button', { name: 'Accepter' });
    if (await acceptCookiesBtn.isVisible()) {
        await acceptCookiesBtn.click();
    }

    await page.getByPlaceholder('Ex: koffi@babimmo.ci').fill('pierre@immoprestige.ci'); 
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await page.waitForURL(/.*\/dashboard.*/, { timeout: 20000 });

    // 2. Vérification du widget d'urgence sur le dashboard
    // Le dashboard Agence affiche directement les urgences techniques
    const urgencyWidgetTitle = page.getByText(/Urgences Techniques/i).first();
    await expect(urgencyWidgetTitle).toBeVisible();

    // 3. Navigation vers le gestionnaire de maintenance via le bouton du widget
    const manageMaintenanceBtn = page.getByRole('link', { name: 'Gérer la maintenance' });
    await manageMaintenanceBtn.click();
    
    // On attend d'être sur la page de listing des maintenances
    await page.waitForURL(/.*\/maintenance.*/, { timeout: 10000 });

    // 4. Vérification que l'incident est bien listé avec le nom du bien
    const propertyName = page.getByText(/Villa Emeraude/i).first();
    await expect(propertyName).toBeVisible();

    const incidentInfo = page.getByText(/Fuite d'eau Cuisine|Inondation sous l'évier/i).first();
    await expect(incidentInfo).toBeVisible();
    
    // 5. Vérification de la présence d'un bouton d'action (Assigner, Gérer, ou Devis)
    // Adapte le texte selon ton design si besoin
    const actionButton = page.getByRole('button', { name: /Gérer|Assigner|Devis/i }).first();
    await expect(actionButton).toBeVisible();
  });

});
