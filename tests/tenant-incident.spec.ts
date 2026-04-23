import { test, expect } from '@playwright/test';
import { safeLogin } from './setup/authHelper';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Maintenance - Espace Locataire', () => {
  test('Le locataire peut voir son incident en cours', async ({ page }) => {
    
    await safeLogin(page, 'nouveau@gmail.com');

    const maintenanceLink = page.getByRole('link', { name: /Incident|Maintenance/i }).first();
    await maintenanceLink.click();
    
    await expect(page).toHaveURL(/.*\/incidents.*/, { timeout: 10000 });

    const incidentDesc = page.getByText(/Inondation sous l'évier/i).first();
    await expect(incidentDesc).toBeVisible();

    const statusBadge = page.getByText(/En attente/i).first();
    await expect(statusBadge).toBeVisible();
    
    const incidentCard = page.getByRole('link', { name: /Inondation sous l'évier/i }).first();
    await expect(incidentCard).toBeVisible();
  });
});
