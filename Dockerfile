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

# Copy Prisma schema + CLI binary for runtime migration
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/prisma ./node_modules/prisma

EXPOSE 7860

# npx prisma is faster than bunx because prisma is already in node_modules
CMD ["sh", "-c", "npx prisma db push --accept-data-loss 2>&1 && bun server.js"]