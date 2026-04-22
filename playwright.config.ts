import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
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
});
