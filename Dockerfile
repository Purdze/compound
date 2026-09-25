# syntax=docker/dockerfile:1

# ── Stage 1: install dependencies with Bun ────────────────────────────────────
FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# ── Stage 2: build the standalone Next.js output ──────────────────────────────
FROM oven/bun:1.3 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate && bun run build

# ── Stage 3: minimal Node runtime ─────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ARG APP_VERSION=dev
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data \
    APP_VERSION=${APP_VERSION}

LABEL org.opencontainers.image.source="https://github.com/Purdze/compound" \
      org.opencontainers.image.description="Compound: a calm, self-hosted Trading 212 portfolio viewer and goal simulator" \
      org.opencontainers.image.version="${APP_VERSION}"

# openssl is needed by the Prisma engines on Alpine. /data holds the generated
# secrets and must be writable by the app user.
RUN apk add --no-cache openssl \
 && addgroup -S -g 1001 compound \
 && adduser -S -u 1001 -G compound compound \
 && mkdir -p /data && chown compound:compound /data

# Prisma CLI for the entrypoint's migrate step, with the same version and dependency
# overrides as package.json (a global npm install would ignore the overrides).
COPY --from=build /app/package.json /tmp/package.json
RUN mkdir -p /opt/prisma \
 && node -e "const p = require('/tmp/package.json'); require('fs').writeFileSync('/opt/prisma/package.json', JSON.stringify({ private: true, dependencies: { prisma: p.devDependencies.prisma }, overrides: p.overrides }))" \
 && cd /opt/prisma && npm install --omit=dev --no-audit --no-fund \
 && ln -s /opt/prisma/node_modules/.bin/prisma /usr/local/bin/prisma \
 && npm cache clean --force && rm /tmp/package.json

COPY --from=build --chown=compound:compound /app/.next/standalone ./
COPY --from=build --chown=compound:compound /app/.next/static ./.next/static
COPY --from=build --chown=compound:compound /app/public ./public
COPY --from=build --chown=compound:compound /app/prisma ./prisma
COPY --chown=compound:compound docker-entrypoint.sh ./
COPY --chmod=755 scripts/compound-reset-password /usr/local/bin/

USER compound
VOLUME /data
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
