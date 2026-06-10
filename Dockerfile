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

# Copy standalone build (includes bundled node_modules + server.js)
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Copy Prisma schema for runtime migration + install CLI globally
COPY --from=base /app/prisma ./prisma
RUN bun install -g prisma@5.22.0 2>&1

EXPOSE 7860

CMD ["sh", "-c", "prisma db push --accept-data-loss 2>&1 && bun server.js"]