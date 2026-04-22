import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/unit/**', '**/setup/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    // 1. L'étape de préparation
    { 
        name: 'setup', 
        testMatch: /.*\.setup\.ts/,
        use: { 
            ...devices['Desktop Firefox'] // ✅ CORRECTION : On force Firefox pour le setup aussi !
        }
    },

    // 2. Tes tests normaux
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'], 
    },
  ],

  // ✅ CORRECTION : Le bloc webServer indispensable pour la CI (GitHub Actions)
  webServer: {
    command: 'npm run dev', // Commande pour démarrer ton app
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // Réutilise le serveur si tu es en local, mais en crée un neuf sur GitHub
    timeout: 120 * 1000, // On laisse 2 minutes max au serveur pour s'allumer
  },
});
