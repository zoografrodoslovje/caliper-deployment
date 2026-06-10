FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install
COPY . .
RUN bunx prisma generate
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
# Note: We removed --skip-generate and ensured PORT=7860 is used

# Copy the necessary files for the standalone app
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/prisma ./prisma

EXPOSE 7860

# FIXED COMMAND: Removed '--skip-generate' and forced PORT to 7860
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && PORT=7860 bun run server.js"]
