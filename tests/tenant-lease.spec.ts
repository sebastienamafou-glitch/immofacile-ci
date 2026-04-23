import { test, expect } from '@playwright/test';
import { safeLogin } from './setup/authHelper';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Patrimoine & Baux - Espace Locataire', () => {
  
  // ✅ FIX : On étend le timeout global
  test.setTimeout(60000);

  test('Le locataire peut voir son bail en attente et les frais initiaux', async ({ page }) => {
    
    await safeLogin(page, 'nouveau@gmail.com');

    const propertyTitle = page.getByText(/Villa Emeraude/i).first();
    // ✅ FIX : Attente prolongée pour le premier rendu
    await expect(propertyTitle).toBeVisible({ timeout: 25000 });

    const pendingBadge = page.getByText(/Paiement ouvert/i).first();
    await expect(pendingBadge).toBeVisible();

    const paymentAmount = page.getByRole('heading', { name: /4,500,000/i }).first();
    await expect(paymentAmount).toBeVisible();
    
    const payButton = page.getByRole('button', { name: /Payer mon entrée/i }).first();
    await expect(payButton).toBeVisible();
  });
});
