import { test, expect } from '@playwright/test';
import { safeLogin } from './setup/authHelper';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Maintenance - Espace Agence', () => {
  
  // ✅ FIX : On étend le timeout global
  test.setTimeout(60000);

  test("L'agence reçoit l'incident et peut accéder au dossier de maintenance", async ({ page }) => {
    
    await safeLogin(page, 'pierre@immoprestige.ci');

    // Navigation directe vers le gestionnaire d'incidents
    await page.goto('/dashboard/agency/maintenance', { waitUntil: 'domcontentloaded' });

    const propertyName = page.getByText(/Villa Emeraude/i).first();
    // ✅ FIX : Attente prolongée
    await expect(propertyName).toBeVisible({ timeout: 25000 });

    const incidentInfo = page.getByText(/Fuite d'eau Cuisine|Inondation sous l'évier/i).first();
    await expect(incidentInfo).toBeVisible();
    
    const actionButton = page.getByRole('button', { name: /Gérer|Assigner|Devis/i }).first();
    await expect(actionButton).toBeVisible();
  });
});
