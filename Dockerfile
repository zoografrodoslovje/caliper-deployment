FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV DATABASE_URL=file:./dev.db
RUN bunx prisma generate
RUN bun run build

# Production runner
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=7860
ENV DATABASE_URL=file:./dev.db

# Copy standalone build (includes bundled node_modules)
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Copy Prisma schema + CLI for runtime migration
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/prisma ./node_modules/prisma
COPY --from=base /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

EXPOSE 7860

CMD ["sh", "-c", "bunx prisma db push --skip-generate --accept-data-loss 2>&1 && bun server.js"]