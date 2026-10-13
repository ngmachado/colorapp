# Super Colour

A colour knowledge and experimentation app for fashion. Architecture: `docs/ADR-0001-mvp-architecture-and-stack.md`. Foundation documents: `docs/foundation/`.

## Commands

```sh
pnpm install && pnpm dev      # develop at http://localhost:3000
pnpm check                    # lint, typecheck, test, validate content
pnpm content:build            # compile content/knowledge into data/knowledge-<version>.sqlite
docker compose up --build     # run at https://localhost (Caddy, self-signed)
```

## Layout

```
apps/web                 Next.js app
packages/colour-engine   typed colours, conversions, differences
packages/generator       seeded palette generation
packages/garment         garment regions and presets
packages/knowledge       knowledge record schemas and release builder
packages/db              Drizzle SQLite schema and migrations
content/knowledge/       YAML knowledge records, validated by schema.json (editors) and Zod (CI)
deploy/                  Caddyfile and Litestream config
data/                    runtime SQLite files (git-ignored)
```

The four packages under `packages/` other than `db` must stay free of browser and Node APIs; lint enforces it.
