import 'dotenv/config';
import { defineConfig } from '@prisma/config';

export default defineConfig({
  migrations: {
    // REMPLACEZ 'tsx' PAR 'ts-node' ICI :
    seed: 'npx ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL, 
  },
});
