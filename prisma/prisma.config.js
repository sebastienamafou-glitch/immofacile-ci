import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: {
    kind: 'static',
    path: 'prisma/schema.prisma',
  },
  datasource: {
    url: {
      kind: 'env',
      name: 'DATABASE_URL',
    },
  },
});
