import { defineConfig } from 'prisma/sdk';

export default defineConfig({
  datasource: {
    provider: 'sqlite',
    url: process.env.DATABASE_URL,
  },
});
