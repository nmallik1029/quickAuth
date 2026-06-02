# quickAuth — Next.js (Node) container. Native argon2 + Prisma run normally here.
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# build tools for native modules (argon2)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Prisma schema must be present because postinstall runs `prisma generate`.
COPY prisma ./prisma
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
EXPOSE 8080
# Requires Postgres (Neon) — see DEPLOY.md for the SQLite -> Postgres switch.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 8080"]
