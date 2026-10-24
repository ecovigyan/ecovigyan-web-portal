# Production image for the website and the mobile API (/v1).
# Build: docker build -t ecovigyan .   (needs .env.build with the NEXT_PUBLIC_* values)
# Run:   docker run --env-file .env -p 127.0.0.1:3000:3000 ecovigyan

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: no dependency install hooks run during the build.
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
# they must be present here. Server-only secrets are NOT copied in; they are
# passed at runtime with --env-file.
COPY .env.build .env.production
# Refuse to build if the known postcss.config.mjs payload has come back.
RUN test "$(tr -d '\r' < postcss.config.mjs | wc -c)" -eq 94 && test ! -e api.js
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
CMD ["node", "server.js"]
