import { defineConfig } from 'prisma/sdk';

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
});
