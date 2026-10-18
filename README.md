# Super Colour

A tool to explore, understand and create with colour: a palette laboratory, a dictionary of documented colours with their sources, and the theory behind both. Architecture: `docs/ADR-0001-mvp-architecture-and-stack.md`. Foundation documents: `docs/foundation/`.

## Commands

```sh
pnpm install && pnpm dev      # develop at http://localhost:3000
pnpm check                    # lint, typecheck, test, validate content
pnpm e2e                      # browser tests with axe (Playwright, Chromium and WebKit)
pnpm starter                  # run the 10,000-candidate starter experiment into apps/web/data/starter
pnpm content:build            # compile content/knowledge into data/knowledge-<version>.sqlite
docker compose up --build     # self-host: app, Postgres, Caddy (https://localhost, self-signed); sign-in mails at http://localhost:8025
```

## Environment

| Variable                | Purpose                                                                                                               | Default                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `DATABASE_URL`          | User data: `postgres://…` (Neon in production), `pglite://data/pg` (embedded, development), `pglite://memory` (tests) | `pglite://data/pg`                           |
| `DATABASE_URL_UNPOOLED` | Direct (non-pooled) Neon URL, used only for migrations                                                                | unset: migrations use `DATABASE_URL`         |
| `AUTH_RESEND_KEY`       | Resend API key for sign-in mail in production; unset means SMTP via `EMAIL_SERVER`                                    | unset                                        |
| `AUTH_SECRET`           | Signs session cookies; generate with `openssl rand -base64 32`                                                        | dev-only value in Compose                    |
| `EMAIL_SERVER`          | SMTP URL for magic-link mail                                                                                          | `smtp://localhost:1025` (mailpit in Compose) |
| `EMAIL_FROM`            | Sender address                                                                                                        | `Super Colour <noreply@localhost>`           |

To check the app without mail, put `AUTH_DISABLED=1` in `apps/web/.env`: every request then acts as one local user (development only; production builds ignore it). Sign-in is otherwise by email magic link. Sessions are stored in the database. Deleting an account cascades through every row the user owns.

## Documents

`docs/ADR-0001-mvp-architecture-and-stack.md` (architecture), `docs/runbook.md` (self-hosting, backups, restore), `docs/content-authoring.md`, `docs/reviewer-checklist.md`, `docs/release-checklist.md`, `docs/benchmarks.md`, `docs/release-inventory.md`.

## Screens

Coolors-style: the palette is the screen.

- `/lab` Laboratory: one column per role (two to five, add, remove, reorder), space or Generate draws the next palette under the current rule and locks, Alternatives shows eight diverse options at once, Variations moves around the current palette, source-led draws take colours from documented records and name them, Options edits the rule angles and the lightness, chroma and hue bounds, every column names the nearest documented colour and its status, a lightness scale per column, any column can be typed as hex or picked natively, undo and redo (⌘Z, ⇧⌘Z) over every edit, a Contrast table that grades each pair of columns and the two inks by WCAG 2.1, a Wheel panel (OKLCh hue by angle and chroma by radius at one lightness, the sRGB gamut edge drawn as it is, drag turns the rule's constellation, ⌥ frees a dot, click adds a column, documented colours as an overlay, an HSL ghost of the same rule), a view that simulates protan, deutan or tritan vision (labelled an approximation), the URL always holds the palette, export as CSS, JSON, SVG or link, draws are reproducible from their seed. Content drives it: `/lab?from=<concept>,<concept>` opens documented records as locked, named columns (every entry relation, combination layer set and Theory side links there), the wheel panel loads a documented set whole (group concepts and complementary or characteristic pairs, read from the records), `/lab?hex=a,b,c` or a paste of hex codes loads a palette, columns can be renamed (names go into exports), ? lists the keys, and each column opens in Theory.
- `/theory` Theory: three dimensions with locks and a readout in any space; structures on the OKLCh wheel next to a free-form draw with the same seed; traditions drawn from the records (Five Phases, Japanese colour, Goethe's circle of 1810 with its six colours, three complements and four characteristic chords, Chevreul quoted by paragraph; Itten and Albers cited, not reproduced); the 13 curriculum terms as a glossary; the structures section has the same wheel at 420px showing the chosen rule, with documented colours and the HSL ghost as overlays.
- `/dictionary` Dictionary: documented colours by tradition, grid or list, systems (Goethe's circle, the Five Phases) on their own list, near-a-colour search (a hex typed in the search box counts), combinations and sources. `/dictionary/<id>` is the colour entry: source first, then values (with tints and shades that open the Laboratory), meaning (each documented pair or set opens the Laboratory), combinations (layers open the Laboratory in order), structures from here, similar, accessibility (contrast and colour-vision simulation); Save keeps the record in the Library.
- `/library` Library: palettes saved from the Laboratory (rule and seed kept, rename, delete, reopen in the Laboratory) and colours saved from their entries (record id kept, remove), with a text search over both.
- `/about` Release inventory. `/account` Your data (export, delete).

The garment studio, compare sessions, discover and import/export screens were removed from the UI on 2026-10-14; their packages (`garment`, parts of `generator` and `db`) stay in the repo.

## Layout

- `packages/colour-engine`, `packages/knowledge`, `packages/garment`, `packages/generator`, `packages/db`: the engines and the data layer.
- `apps/web`: Next.js app. `app/` routes, `components/` UI, `lib/` server helpers, `e2e/` Playwright tests with axe.
- `content/`: knowledge records, curriculum, experiment templates (YAML).
- `docs/`: ADR, runbook, authoring guide, checklists.

## Deploying on Vercel

Zero-cost setup: Vercel Hobby, Neon free tier, Resend free tier. The knowledge base is built during the Vercel build and shipped read-only inside the function; only user data lives in Postgres.

1. The repo is linked to a Neon project (`.neon`, `neon.ts`). `pnpm env:pull` pulls `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` into `apps/web/.env.local`; `neon deploy` applies `neon.ts`.
2. Create a Resend API key and verify a sending domain (or use their onboarding sender for your own address while testing).
3. Import the repository in Vercel with **Root Directory** `apps/web`. `apps/web/vercel.json` sets the build command (`pnpm -w content:build && pnpm build`).
4. Set the environment variables: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_RESEND_KEY`, `EMAIL_FROM` (an address on the verified domain). The Vercel–Neon integration can set the two database URLs for you.
5. Deploy. Migrations run on the first request; the account, library and sign-in pages are the smoke test.

Locally nothing is required: `pnpm dev` uses an embedded Postgres in `apps/web/data/pg`, and the test suites use one in memory.
