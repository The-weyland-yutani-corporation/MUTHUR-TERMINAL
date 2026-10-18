# ── Stage 1: Install dependencies ──
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build ──
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Production ──
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Copy built app (public first, then standalone which includes server.js + node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Preserve lockfile-installed SDK/CLI platform packages and executable permissions.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@github ./node_modules/@github
ENV PATH="/app/node_modules/.bin:${PATH}"
RUN mkdir -p node_modules/.bin && \
    ln -s ../@github/copilot/npm-loader.js node_modules/.bin/copilot

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
