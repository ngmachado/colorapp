FROM node:22-bookworm-slim AS base
RUN npm install -g pnpm@10.32.1
WORKDIR /repo

FROM base AS build
ENV CI=true
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sca/web build
RUN pnpm content:build /repo/knowledge/knowledge.sqlite

FROM node:22-bookworm-slim AS run
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 KNOWLEDGE_PATH=/app/knowledge/knowledge.sqlite CONTENT_PATH=/app/content
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/packages/db/drizzle ./packages/db/drizzle
COPY --from=build /repo/knowledge ./knowledge
COPY --from=build /repo/content ./content
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
