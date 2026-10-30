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

- `/lab` Laboratory: one column per role (two to five, add, remove, reorder), space or Generate draws the next palette under the current rule and locks, Alternatives shows eight diverse options at once, Variations moves around the current palette, source-led draws take colours from documented records and name them, Options edits the rule angles and the lightness, chroma and hue bounds, every column names the nearest documented colour and its status, a lightness scale per column, any column can be typed as hex or picked natively, undo and redo (⌘Z, ⇧⌘Z) over every edit, a Contrast table that grades each pair of columns and the two inks by WCAG 2.1, a Wheel panel (OKLCh hue by angle and chroma by radius at one lightness, the sRGB gamut edge drawn as it is, drag turns the rule's constellation, ⌥ frees a dot, click adds a column, documented colours as an overlay, an HSL ghost of the same rule), a view that simulates protan, deutan or tritan vision (labelled an approximation), the URL always holds the palette, export as CSS, JSON, SVG or link, draws are reproducible from their seed. Content drives it: `/lab?from=<concept>,<concept>` opens documented records as locked, named columns (every entry relation, combination layer set and Theory side links there), the wheel panel can load a documented set when qualifying records exist (none in the current release), `/lab?hex=a,b,c` or a paste of hex codes loads a palette, columns can be renamed (names go into exports), ? lists the keys, and each column opens in Theory.
- `/lab` panels added 2026-10-30: Contrast leads with intended text/background pairs and every WCAG threshold; Lightness (OKLCh L only), Neighbours (each colour on each ground), Gradients (sRGB and OKLCh with an explicit hue path, matching CSS), Relations (documented pairs, groups and layerings near the palette by a declared distance). Exports carry record ids, citations, approximation status and an edited flag.
- `/compare?a=&b=` two colours: values, CIEDE2000 and OKLab ΔE with conditions, WCAG thresholds, provenance when the address names records (`ra=`, `rb=`).
- `/munsell?hex=` or `?notation=` Munsell reference: nearest tabulated samples of the 1943 renotation (RIT real.dat, illuminant C, conditions stated) or the tabulated value of a notation; the table is a personal download (`node scripts/fetch-munsell.mjs`; RIT's terms do not allow redistribution, see `content/reference/munsell/README.md`), and the page says so when it is absent.
- `/extract` Image colours: the main colours of an image measured in the browser (never uploaded) as observations with shares; nearest records offered separately.
- Light and dark: white by default, with a toolbar switch to a dark background; content colours are never altered by the theme.
- `/space` Map: the colour space map, every documented colour at its OKLab position with the sRGB solid, the palette plotted among them, and documented relations as lines; distance is shown as a number and never as a cultural link. Three.js is loaded only here; without WebGL the panel lists the same values as text.
- `/theory` Theory: six short lessons in order (Foundations, Representing colour, Perception and context, Designing with colour, Colour in production, History and culture), each with one thing to try and its limits and references folded away; the OKLCh sliders follow lesson 2, a two-surroundings experiment (identical samples revealed after you answer) follows lesson 3, the app's wheel recipes follow lesson 4, labelled as app choices; then the documented records (Chevreul’s circle, Five Phases and Japanese colour, drawn from the records; Chevreul quoted by paragraph, Itten and Albers cited, not reproduced) and the 13-term glossary. Production topics are explanations, not implemented measurement or proofing tools.
- `/colour` Colour inspector: enter an opaque 3- or 6-digit sRGB hex, then open its canonical page (for example `/colour/fc2222`). Copy HEX, RGB, HSL, OKLCh, D50 Lab and D65 XYZ with explicit conversion assumptions; inspect lightness/chroma variations with gamut-mapping labels, black/white text contrast samples and colour-vision simulations; follow nearby documented records with their status and citations. Available from Laboratory columns and Dictionary records/search. No historical identity is inferred from an input or a nearby match.
- `/dictionary` Dictionary: documented colours by tradition, grid or list, a Systems filter for Chevreul’s circle and the Five Phases, near-a-colour search (a hex typed in the search box counts), combinations and sources. `/dictionary/<id>` is the colour entry: source first, then values (with tints and shades that open the Laboratory), meaning (each documented pair or set opens the Laboratory), combinations (layers open the Laboratory in order), structures from here, similar, accessibility (contrast and colour-vision simulation); Save keeps the record in the Library.
- `/library` Library: when no sign-in method is configured (the public demo), saved palettes and colours live in the browser's local storage, with search, rename, delete, reopen and a JSON download; with accounts, the same page reads the server. Server mode: palettes saved from the Laboratory (rule and seed kept, rename, delete, reopen in the Laboratory) and colours saved from their entries (record id kept, remove), with a text search over both.
- `/about` Release inventory. `/account` Your data (export, delete).

The garment studio, compare sessions, discover and import/export screens were removed from the UI on 2026-10-14; their packages (`garment`, parts of `generator` and `db`) stay in the repo.

## Layout

- `packages/colour-engine`, `packages/knowledge`, `packages/garment`, `packages/generator`, `packages/db`: the engines and the data layer.
- `apps/web`: Next.js app. `app/` routes, `components/` UI, `lib/` server helpers, `e2e/` Playwright tests with axe.
- `content/`: knowledge records, curriculum, experiment templates (YAML).
- `docs/`: ADR, runbook, authoring guide, checklists.

## Sign-in is optional

The app runs without accounts. With no `AUTH_GOOGLE_*` or `AUTH_RESEND_KEY` set on Vercel, nothing in the interface mentions signing in and the Library is kept in the browser. Visits to `/signin` redirect home. Setting either turns the server Library and the account page back on; the data layer, Auth.js and Neon stay in place either way.

## Deploying on Vercel

Zero-cost setup: Vercel Hobby, Neon free tier, Resend free tier. The knowledge base is built during the Vercel build and shipped read-only inside the function; only user data lives in Postgres.

1. The repo is linked to a Neon project (`.neon`, `neon.ts`). `pnpm env:pull` pulls `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` into `apps/web/.env.local`; `neon deploy` applies `neon.ts`.
2. Create a Google OAuth client (Google Cloud console → APIs & Services → Credentials → OAuth client ID, type Web application) with the authorised redirect URI `https://<your-domain>/api/auth/callback/google`, and publish the consent screen so anyone can sign in. Optionally also a Resend API key with a verified domain for the email link.
3. Import the repository in Vercel with **Root Directory** `apps/web`. No `vercel.json` is needed: the app's `build` script compiles the knowledge base before `next build`, so the function always ships a release.
4. Set the environment variables: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`; and, for the email link, `AUTH_RESEND_KEY` and `EMAIL_FROM`.
5. Deploy. Migrations run on the first request; the account, library and sign-in pages are the smoke test.

Locally nothing is required: `pnpm dev` uses an embedded Postgres in `apps/web/data/pg`, and the test suites use one in memory.

## Educational scope

The Theory page is an introductory learning path, not a complete university curriculum. Its lesson content is in `content/curriculum/lessons.yaml`; the schema requires objectives, examples, limitations and references. Scientific explanations, design exercises, app-defined recipes and attributed historical claims must remain distinguishable.

| Capability                                                                   | Current status                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Six lessons, glossary, dimension sliders and wheel comparisons               | Available                                               |
| One colour, two surroundings: response, reveal and equal-surround comparison | Available                                               |
| Laboratory proportion preview with per-colour weights, reverse and reset     | Available; weights persist in sharing, saving and undo  |
| Standalone equal-hue comparison and garment context exercises                | Not offered; unavailable definitions removed            |
| ICC soft proofing, spectra, dye formulation, material rendering              | Not implemented; production lesson explains limitations |

Exercise definitions carry `availability`; lesson references say which part of a source supports the explanation. New prose is editorial content awaiting specialist review, not a promoted knowledge record.

The 148 CSS named colours (CSS Color Module Level 4) are present as published values, the only records whose screen value is normative rather than an approximation. The cultural collection is deliberately small: Chevreul’s system entry with six named landmarks, three complementary pairs and two passages, bibliographic leads, Five Phases, a small Japanese vocabulary and the 269 conventional colour names of JIS Z 8102:2001 with their Munsell notations (screen values are the Wikipedia page's reference approximations). It is not a survey of Western or East Asian colour knowledge. Chinese records are the Five Phases categories plus 27 traditional colour names from the Chinese Wikipedia list with its classical quotations kept at discovery level; display values remain secondary, unverified approximations, and four categories have no value; the Japanese dictionary source remains bibliographic. Do not fill these gaps with inferred RGB values. Expansion requires traceable sources and review.

Vercel builds omit the embedded Postgres package from function traces and require a Postgres URL. Local and self-hosted builds keep PGlite. After a Vercel production build, `pnpm check:vercel-output` checks the route manifest and dependency traces. The browser-test login route uses a development-only extension; production builds omit it even if `AUTH_TEST_LOGIN=1` is mistakenly set. Error monitoring currently consists of Vercel logs; no external alerting service is configured. Neon remains provisioned but unused by normal requests while accounts are disabled.

## Library portability and site metadata

Use **Import Library JSON** in the Library to merge a downloaded browser Library or the saved palettes and colours from an account export. Imports preserve names, locks, source IDs, seeds and proportions. They never replace existing items, skip exact palette duplicates and repeated colour record IDs, and reject malformed files before writing. The maximum file size is 2 MiB, with up to 200 palettes and 200 colours in the destination. Account imports do not restore identity, credentials or arbitrary projects. Browser imports stay on the current device; account imports belong to the signed-in user. Keep backups before clearing site data.

Social metadata defaults to `https://colorapp-taupe.vercel.app/`. Set `SITE_URL` to override it when moving to another domain. The app includes an SVG browser icon, ICO fallback, Apple touch icon, and a generated Open Graph image shared by Twitter cards. `robots.txt` blocks account, Library, sign-in and API paths; preview deployments disallow all crawling. Private pages also carry noindex metadata. Robots rules are indexing guidance, not access control.

## License

Original project code, artwork and prose are licensed under [MIT](LICENSE). Source-derived knowledge and dependencies retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md) and the source records. The license does not turn unreviewed or restricted source material into reusable content.

Chevreul’s six screen colours are original editorial illustrations with separate provenance, not historical measurements. His complete construction has 72 scales and 20 tones per scale; the entry explains that scope without fabricating its coordinates. The wheel’s Load set menu offers the three documented pairs. See [source checks](docs/chevreul-source-notes.md) and the [six-lesson specialist review packet](docs/lesson-review-packet.md).
