import { test, expect } from '@playwright/test';

test.describe('Dashboard Voyageur', () => {
  
  test('Le voyageur accède à ses réservations privées sans se reconnecter', async ({ page }) => {
    await page.goto('/dashboard/guest/history');

    // ✅ CORRECTION : On cherche le titre exact affiché sur ton interface
    const title = page.getByRole('heading', { name: /Mes Séjours/i });
    await expect(title).toBeVisible();

    // ✅ BONUS : Le snapshot montre que ton "Studio Cosy Plateau" est bien là !
    // On vérifie que la réservation s'affiche correctement
    const studioCard = page.getByText(/Studio Cosy Plateau/i).first();
    await expect(studioCard).toBeVisible();
  });

});
