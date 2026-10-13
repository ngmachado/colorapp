FROM node:22-bookworm-slim AS base
RUN npm install -g pnpm@10.32.1
WORKDIR /repo

FROM base AS build
ENV CI=true
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sca/web build

FROM node:22-bookworm-slim AS run
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 DATABASE_PATH=/data/app.sqlite
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/packages/db/drizzle ./packages/db/drizzle
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
