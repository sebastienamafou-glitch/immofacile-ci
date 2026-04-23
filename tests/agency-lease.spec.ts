import { test, expect } from '@playwright/test';
import { safeLogin } from './setup/authHelper';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Module Patrimoine & Baux - Espace Agence', () => {
  test("L'agent peut gérer le bien et voir le bail en cours", async ({ page }) => {
    
    await safeLogin(page, 'pierre@immoprestige.ci');

    // ✅ FIX : Navigation directe vers le module métier
    await page.goto('/dashboard/agency/properties', { waitUntil: 'domcontentloaded' });

    const propertyTitle = page.getByText(/Villa Emeraude/i).first();
    await expect(propertyTitle).toBeVisible({ timeout: 15000 });

    const ownerName = page.getByText(/Kouassi/i).first();
    await expect(ownerName).toBeVisible();

    const rentAmount = page.getByText(/1.*500.*000/i).first();
    await expect(rentAmount).toBeVisible();
  });
});
