# ADR-0001: MVP architecture and stack for the Super Colour App

**Status:** Proposed (framework, hosting and database decided 2026-10-13; see Decision log)
**Date:** 2026-10-12, revised 2026-10-13
**Deciders:** Product owner, lead engineer, colour-science reviewer
**Input:** `Super_Colour_App_Colour_Knowledge_and_Product_Foundation_v0_1.docx` (Foundation 0.1, 27 Sep 2026) and the 27 rendered pages `Analysis output *.png`

> **Two editions exist.** The Word file (25 sections, 35 references) and the PNG pages (22 sections, 26 references, subtitled "experimental design foundation") are different editions of the same document, both dated 27 September 2026. They agree on vision, principles and the core loop. They differ on screen names, data-model entities, roadmap stages and several concrete features. This ADR takes the **union** of their first-release scope so nothing described is dropped, and lists the conflicts under "Open decisions". The team should pick one edition as canonical before Stage 0 ends.

## Context

The foundation document describes six connected capabilities (colour science, theories and traditions, colour dictionary, palette laboratory, fashion laboratory, evaluation and learning) and a core loop: knowledge → generation → garment application → controlled viewing → measurements → human evaluation → further exploration. Every arrow must preserve provenance and settings.

The brief for this ADR: keep it simple, ship an MVP, implement every feature described. Those two goals only reconcile if "every feature" means the document's own **first-release functional definition** (section 24) rather than Stages 2–4, which the document itself defers. This ADR therefore commits to:

**In scope (Stage 0 + Stage 1, section 24 and the first-release definition):**

- A user can discover a source or colour, inspect its status, generate valid candidates, apply them to an unchanged garment, filter and compare, record a judgement, and export a reproducible project.
- Dictionary with the graph record model (section 10), separate confidence dimensions, rights/review status, search by script, transliteration, English, material, source, period, season, region; perceptual search as a separately labelled operation.
- Learn: introductory curriculum, all six wheel structures, original perception exercises (section 6), sourced Wuxing view, source-aware Japanese introduction.
- Palette engine: seeded, constrained generation across all modes in section 12; the full pipeline; 10,000-candidate runs with validation, deduplication, rejection log, manifest.
- One original 2D colour-block garment with stable region IDs, four region presets, measured visible areas, ordered layers and lining/outer relationships as first-class structures (section 16).
- Analysis features in section 13, with metric name and version on every value.
- Compare: synchronous views, difference summary, blinded mode, pairwise and criterion ratings, randomised order and side, equal/skip, session context (sections 14, 19).
- Discover: nearby and contrasting suggestions with explanations and descriptive preference summaries. No predictive model (the document gates that behind Stage 3).
- Library: projects, versions, decision notes, reproducible bundle export, CSS/JSON/SVG/PNG outputs, handoff JSON (sections 18, 22).
- Japanese (Wada bibliographic records, reviewed vocabulary, reusable layering examples) and Chinese (Wuxing module, reviewed dictionary sample) content in the first curated release, with an exact published inventory.
- WCAG 2.2 AA, keyboard, screen reader, reduced motion.
- Colour-engine validation with reference vectors and an independent cross-check.

**Added by the PNG edition and included here:**

- Garment front **and** back views, with visible area measured per view.
- An experiment template library (ten named templates) where each experiment records hypothesis, task wording and planned interpretation; null results are stored; factorial designs supported.
- Metrics for placement and adjacency (shared boundary length between regions) and coverage, alongside the proportion ladder: palette strip, surface share, visible-pixel share.
- Favourites, project tags, tie/neither/skip answers, session-length limits, and full export, reset and deletion of a user's personal data.
- Imports: manual entry, CSV and JSON palettes. Exports: JSON bundle, CSV, SVG/PNG boards, and a readable report.
- Five-level evidence hierarchy and the review chain discovered → bibliographic → extraction → rights → specialist → published. Source records are immutable once published; corrections create new versions.
- Colour spaces also cover linear-light RGB, CIE xyY and CAM16; mixing modes are linear-light and perceptual-gradient only (no pigment simulation).
- Content target for the first release: a few hundred reviewed named-colour records and at least one source-backed relationship per cultural module.

**Explicitly out of the MVP, by the document's own roadmap:** photo and image extraction (Stage 2), material and light rendering, 3D and tool bridges, preference models (Stage 3), spectral data, measurement and print workflows (Stage 4), AI assistant, public sharing and pricing (open decisions). The architecture keeps a seam for each so they can be added without rework.

**Forces:**

- Reproducibility is the central non-functional requirement. Same seed and configuration must reproduce candidates within a declared tolerance; a rating must point to the exact viewed variant.
- Knowledge, colour coordinates, garment appearance and ratings must stay separable (architecture rule, section 21).
- Rights and review are release gates. Content must carry status and must never be fabricated or silently filled in.
- A small team. Fewer moving parts beats theoretical scale.
- The expensive-looking workload (10,000 palettes) is cheap in the MVP: flat SVG region colouring, not photoreal rendering.
- **Self-hosted first**, with a clean path to managed hosting later.
- **This codebase is the base for a mobile app.** The MVP is the web app; the mobile app is a later deliverable, but the architecture must not block it.

## Decision

Build a **single TypeScript web application (Next.js) with a SQLite database**, self-hosted as one container with one volume, structured as a small monorepo with pure, testable packages for the colour engine, generator, garment and knowledge schema. Run palette generation and flat garment previews **in the browser** (Web Worker) from those same pure packages. Keep the curated knowledge base as **versioned content files reviewed through pull requests**, built into a SQLite knowledge release by a seed script. Use **Python Colour only as a development-time oracle** to produce test fixtures, not as a runtime service. Keep every package that a future mobile app needs free of browser and Node specifics so an Expo app can reuse them unchanged.

### Decision log

| Date       | Decision                               | Reason                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-13 | Self-host first                        | Team preference; one Docker Compose file, host-ready later.                                                                                                                                                                                      |
| 2026-10-13 | Next.js                                | Easiest to move to managed hosting later; one deployable.                                                                                                                                                                                        |
| 2026-10-13 | SQLite instead of Postgres             | Primary: self-hosting with no database service, and file-based reproducibility (knowledge releases and experiments as versioned files). Secondary: one Drizzle SQLite schema serves server, web and device. See the database sub-decision below. |
| 2026-10-13 | React Aria Components instead of Radix | Ships accessible colour components; the app's core interaction is colour controls.                                                                                                                                                               |

**Build plan:** the implementation is broken into sixteen hand-off chunks in the companion document "Super Colour MVP Build Plan".

### Stack

| Layer             | Choice                                                                                                                                                 | Why this and not more                                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language          | TypeScript everywhere                                                                                                                                  | One language, one toolchain; pure packages run identically in browser, worker and Node.                                                                                                                                                                                                                     |
| Monorepo          | pnpm workspaces (Turborepo deferred until build times warrant it)                                                                                      | Enforces the separation the document demands without separate deployables.                                                                                                                                                                                                                                  |
| Web framework     | Next.js (App Router, React), standalone output                                                                                                         | Server routes, auth and UI in one deployable. React also means the mobile app (Expo) shares component logic, hooks and state.                                                                                                                                                                               |
| UI primitives     | React Aria Components + Tailwind                                                                                                                       | Accessible primitives (focus, roles, keyboard) plus ready-made ColorWheel, ColorSlider, ColorArea and ColorField. OKLCh sliders are built on its generic Slider with a gradient track. Chosen over Radix on 2026-10-13 because the app's core interaction is accessible colour controls, which Radix lacks. |
| Colour engine     | Color.js (pinned), wrapped by `@sca/colour-engine`                                                                                                     | Spaces, gamut mapping, CIEDE2000, OKLab distance, interpolation already documented in the source register. The wrapper exposes typed colours that always carry space, reference white and conversion path.                                                                                                  |
| Generator         | `@sca/generator`, pure TS, seeded PRNG (xoshiro128**)                                                                                                  | Deterministic candidate IDs; runs in a Web Worker with progress and cancel.                                                                                                                                                                                                                                 |
| Garment           | Hand-authored SVG, front and back views, `data-region` ids; `@sca/garment`                                                                             | Stable region IDs, role→region mapping stored separately from the palette, visible area and region adjacency measured by rasterising each preset and view once.                                                                                                                                             |
| Database          | SQLite (WAL mode) via Drizzle ORM; `better-sqlite3` on the server, `expo-sqlite` on device later                                                       | Explicit relationship tables (section 21), JSON columns for manifests and features, FTS5 with the trigram tokenizer for scripts and transliterations. One schema file in `packages/db` compiles for both drivers. No graph database, no database server.                                                    |
| Knowledge content | YAML files in `content/` validated by JSON Schema in CI, compiled to `knowledge-<version>.sqlite`                                                      | Review by named reviewers, reversible history and a release inventory come free from git and pull requests. The compiled file is attached to the server database and, later, bundled read-only into the mobile app.                                                                                         |
| Auth              | Auth.js, email magic link, Drizzle adapter                                                                                                             | Ratings are per user and must be private. No passwords to manage. SMTP credentials are the only external dependency.                                                                                                                                                                                        |
| Jobs              | Browser Web Worker for generation; `job` table in SQLite                                                                                               | No queue infrastructure. Generation is numeric and cheap; persistence happens in resumable batches. The PNG edition proposes exactly this ("generation in web workers, server added later").                                                                                                                |
| Import / export   | PapaParse for CSV; JSZip in the browser                                                                                                                | Imports CSV and JSON palettes. Bundle = manifest + candidates + knowledge snapshot + SVG/PNG boards + CSV + readable HTML report.                                                                                                                                                                           |
| Testing           | Vitest, Playwright, axe-core; Python `colour` as fixture oracle                                                                                        | Reference vectors from CSS Color 4 and the Sharma CIEDE2000 test set; cross-checks generated once, committed as fixtures.                                                                                                                                                                                   |
| Hosting           | Self-hosted: one Docker Compose file, one container, one volume for `data/*.sqlite`; Caddy for TLS; Litestream to object storage for continuous backup | No database service to run. Moves later to any container or VM host (Fly, Hetzner, Railway with a volume) unchanged. Not serverless: SQLite needs a persistent disk, so Vercel-style hosting would require swapping the driver for libSQL/Turso, which Drizzle supports.                                    |
| Mobile (later)    | Expo (React Native) app in `apps/mobile`, `react-native-svg`, `expo-sqlite`                                                                            | Reuses `colour-engine`, `generator`, `garment`, `knowledge`, `db` unchanged. Not in the MVP; see Mobile path below.                                                                                                                                                                                         |

### System shape

```
apps/web                 Next.js: screens, API routes, auth, exports
apps/mobile              (later) Expo app reusing the packages below
packages/db              Drizzle SQLite schema, migrations, seed and knowledge-release builder
packages/colour-engine   typed spaces, conversions, gamut mapping, differences, contrast
packages/generator       constraints, seeded sampling, rules, dedupe, features, diverse subset
packages/garment         SVG assets, region presets, role mapping, visible-area measurement
packages/knowledge       record schemas, content loader, validators, release manifest
content/knowledge/       YAML knowledge records (concepts, names, sources, combinations …)
content/experiments/     the ten experiment templates (hypothesis, factors, task wording)
content/curriculum/      Learn topics and exercise definitions
data/                    runtime volume: app.sqlite, knowledge-<version>.sqlite
```

**Package rule for mobile readiness.** `colour-engine`, `generator`, `garment` and `knowledge` import nothing from `window`, `document`, `fs` or Node APIs. Threading is injected: the web app wraps the generator in a Web Worker; the mobile app will run it in chunks on the JS thread or in a worklet. Rendering is data: the garment package returns region ids and fills, and the host draws them with DOM SVG on the web or `react-native-svg` on device.

Mapping to the document's six components (section 21):

| Document component             | Where it lives in the MVP                                                     |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Knowledge service              | `content/` + `packages/knowledge` + the compiled knowledge SQLite file        |
| Colour engine                  | `packages/colour-engine`                                                      |
| Generator / experiment service | `packages/generator` running in a Web Worker; experiment and candidate tables |
| Asset / render service         | `packages/garment`; previews rendered on demand from SVG, no render farm      |
| Evaluation service             | evaluation tables + descriptive statistics in `apps/web`                      |
| Application / export layer     | `apps/web`                                                                    |

### Two SQLite files, not one

- `knowledge-<version>.sqlite`: read-only, built from `content/` in CI, content-hashed. The server attaches it; the mobile app bundles it. A new release is a new file, so an experiment pinned to an older `content_version` can still be replayed.
- `app.sqlite`: users, projects, experiments, candidates, evaluations. Read-write, WAL mode, backed up continuously by Litestream.

### Data model (core tables)

Knowledge (all rows carry `content_version`, `review_state`, `rights_status`, source locator):

- `source` (author/institution, title, date, edition, locator, URL, access date, rights metadata)
- `colour_concept` (stable id, preferred label, description, scope)
- `colour_name` (script, language, transliteration system, aliases, translation notes → source)
- `representation` (space, coordinates or spectrum, reference white, profile, conditions, method, `approximation_status`, OKLab columns for perceptual search by linear scan)
- `material_sample` (substrate, dye/pigment, sample id, measurement metadata)
- `combination` + `combination_item` (ordered, `layer_index`, `role`, `visibility`, proportion, inner/outer, lining flag)
- `cultural_assertion` (claim, community/period/context, passage, contributor, review state)
- `relationship` (from, to, edge type such as translation-of, measured-from, lining-of, variant-of, adaptation-of, evidence)
- `confidence` columns on each record: transcription, translation, attribution, measurement, display, each nullable with "not documented" rendered when null.

Laboratory:

- `project`, `project_version`, `decision_note`, `project_tag`, `favourite`
- `garment_asset` (SVG hash per view, region ids), `region_preset` (role→regions, measured visible areas and adjacency per view)
- `experiment_template` (loaded from content; hypothesis, factors, task wording, planned interpretation)
- `experiment` (schema version, parent id, template id, manifest JSONB mirroring section 22, engine versions, seed, content version, result status including null result)
- `candidate` (experiment id, deterministic `candidate_id`, palette JSONB with source and mapped values, features JSONB with metric versions, status, rejection reason)
- `evaluation_session` (brief, criterion set, blinded flag, presentation settings, session length limit)
- `response` (session, question, criterion, mode pairwise or rating, left and right candidate ids, position, order index, answer including equal, neither and skip, timestamp, consent)
- `user_data_export` / deletion: one endpoint exports everything a user owns as a bundle; one endpoint deletes it, cascading through responses and sessions.

### Key behaviours

- **No hex as truth.** A colour value is `{space, coords, white, source: {…}, mapped: {policy, result, delta}}`. Hex is a derived display string.
- **Deterministic candidate IDs:** `sha256(generatorVersion, contentVersion, seed, normalisedParams, index)`. Reproducibility test: regenerate and compare within tolerance.
- **Generation pipeline** exactly as section 12: validate constraints (fail with a conflict explanation, never relax a lock) → seeded draw → rules → convert and gamut-map (store original, mapped, method) → dedupe exact and near-duplicate (OKLab distance under a declared threshold, role order preserved) → features → diverse subset (farthest-point sampling in feature space, method named) → previews on demand.
- **Previews** are SVG with CSS custom properties per region; a 10,000-item gallery uses a virtualised grid and renders only visible cells. Thumbnails are never stored.
- **Compare** randomises order and side with a seeded shuffle stored in the session; blinded mode hides source badges; every response stores the candidate id and the exact render settings hash.
- **Explanations** are three labelled parts: measured, documented, predicted. Predicted is empty in the MVP and the UI says so.
- **Discover** = nearest and farthest candidates by named feature distance, plus filterable rating summaries and response-versus-feature plots. No model.
- **Rights gate in code:** `rights_status` controls what renders. Restricted records show bibliographic metadata only; approximations always carry a badge; unreviewed records never appear outside the research queue.
- **Content version pinning:** an experiment records the `content_version` it was created against; a later translation fix does not rewrite the experiment. Published source records are immutable; a correction is a new version linked to the old one.
- **Rendering is deterministic SVG only.** No image model ever regenerates an experiment (PNG edition rule); replay is exact because the inputs are vector regions and numeric colours.

### Mobile path (not in the MVP)

1. Add `apps/mobile` with Expo. It imports the five shared packages and the knowledge SQLite file.
2. Phone-local `app.sqlite` holds the user's projects and responses via `expo-sqlite` with the same Drizzle schema.
3. Sync is a separate, later decision. The simplest candidate is a push/pull API on the self-hosted server keyed by `updated_at` with last-write-wins, which the server schema already supports because every row has an id, owner and timestamp. Nothing in the MVP depends on this choice.

## Options Considered

### Option A: TypeScript monolith + SQLite, generation in the browser (chosen)

| Dimension        | Assessment                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| Complexity       | Low: one app, one file-based database, no queue                             |
| Cost             | Lowest: one small VM or container                                           |
| Scalability      | Fine for the MVP workload; generator package can move server-side unchanged |
| Team familiarity | High for any web team                                                       |

**Pros:** every feature in scope is implementable; pure packages keep the four concerns separable; reproducibility is easy to test; content governance via git.
**Cons:** scientific cross-checks are offline fixtures, not live; heavy future rendering would need a worker tier added.

### Option B: TypeScript client + Python FastAPI backend + Redis queue

| Dimension        | Assessment                                    |
| ---------------- | --------------------------------------------- |
| Complexity       | Medium-high: two languages, three services    |
| Cost             | Higher: always-on worker and queue            |
| Scalability      | Better for future rendering and spectral work |
| Team familiarity | Requires both ecosystems                      |

**Pros:** Python Colour available at runtime; natural home for Stage 3–4 work.
**Cons:** two colour engines that must agree; double the type definitions; queue only earns its keep in Stage 3.

### Option C: Local-first single-page app, SQLite in the browser, no backend

| Dimension        | Assessment         |
| ---------------- | ------------------ |
| Complexity       | Lowest             |
| Cost             | Near zero          |
| Scalability      | Single device only |
| Team familiarity | High               |

**Pros:** simplest possible build.
**Cons:** no multi-user ratings, no reviewed central knowledge base, no project sharing or governance; breaks the Library and privacy requirements.

### Sub-decision: SQLite or Postgres on the server

| Dimension            | SQLite (chosen)                                                                       | Postgres                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Operations           | One file on a volume; no service; backup is a file copy or Litestream                 | A second container, credentials, upgrades, dumps                         |
| Mobile alignment     | Same Drizzle dialect and schema on device; knowledge release ships as a file          | Separate dialect on device; knowledge must be exported to another format |
| Concurrency          | One writer at a time; WAL gives concurrent readers. Fine for a small team and the MVP | Many writers                                                             |
| Search               | FTS5 with trigram tokenizer; JSON1 for manifests and features                         | Full text, trigram, JSONB, all richer                                    |
| Perceptual search    | Linear scan on OKLab columns; fine to low thousands of rows                           | Could add a vector index later                                           |
| Hosting              | Needs a persistent disk; not serverless. libSQL/Turso is the escape hatch             | Works anywhere                                                           |
| Migration cost later | Drizzle schema ports; JSON columns and FTS queries need rewriting                     | None                                                                     |

SQLite wins on the two constraints that matter now: self-hosting with the fewest parts, and sharing one schema with the mobile app. The write-concurrency limit is irrelevant at MVP scale because the heavy work (generation) happens in the browser and persists in batches. Revisit if the app becomes multi-tenant with many simultaneous writers.

## Trade-off Analysis

The decisive question is where the 10,000-candidate workload runs. The document's "scale distinction" notes that generating 10,000 numeric palettes is not the same as rendering 10,000 garments. In the MVP the garment is flat SVG, so the whole pipeline is a few seconds of arithmetic. That removes the only reason for a queue and a worker tier (Option B) and lets one deployable carry the full loop.

Option C is tempting but fails three hard requirements: per-user private ratings, a centrally reviewed knowledge base with rights enforcement, and reproducible shared projects.

Option A keeps Option B available: the generator and colour engine are pure packages, so moving them behind a job table and a Node worker is a deployment change, not a rewrite. Python Colour still participates as a test oracle, which satisfies "independent cross-checks" at zero runtime cost.

## Consequences

**Easier**

- One codebase, one container, two SQLite files; a solo developer runs the whole stack with `docker compose up` and no database service.
- The mobile app starts from five finished packages and a knowledge file, not from scratch.
- Reproducibility is testable in unit tests: same seed in, same candidate IDs out.
- Content review, correction channels and history come from pull requests and git, with a generated release inventory.
- Every record and every value carries its status, so UI badges are a rendering of data rather than a bolt-on.

**Harder**

- Any future server-side rendering (materials, 3D) adds a worker tier and object storage. Seams exist; infrastructure does not.
- Perceptual search in SQL is linear scan; fine for a curated dictionary of hundreds to low thousands of representations, revisit beyond that.
- Browser-side generation depends on the client machine; a very low-end device will be slow. Batched persistence and cancel mitigate this.
- SQLite has one writer at a time and needs a persistent disk. Serverless hosting is off the table unless the driver is swapped for libSQL.
- Backups are the team's responsibility: Litestream or a nightly file copy must be configured on day one.

**Revisit when**

- Stage 2 image input arrives: add object storage and profile extraction.
- Stage 3 materials or preference models arrive: add a Node or Python worker and a job queue; the job table already exists.
- The dictionary grows past a few thousand representations: move perceptual search into the engine with an in-memory index, or revisit Postgres.
- The mobile app ships: decide the sync strategy; consider libSQL if the server moves to managed hosting.

## Action Items

1. [ ] Scaffold the monorepo (pnpm, Turborepo, Next.js standalone, Drizzle + better-sqlite3, Dockerfile, Docker Compose with Caddy and Litestream, `data/` volume).
2. [ ] `colour-engine`: typed colour value, conversions, gamut mapping with recorded policy, CIEDE2000 and OKLab distance, contrast; reference-vector tests from CSS Color 4 and the Sharma CIEDE2000 set; Python Colour fixture script.
3. [ ] `knowledge` + `db`: JSON Schemas for the eight record types, confidence and rights fields, content loader, knowledge SQLite builder with FTS5 index, release-inventory generator, CI validation; seed the first Wada bibliographic records, the ten Japanese candidate names as research-queue entries, the Wuxing module and a reviewed Chinese sample.
4. [ ] `garment`: author the original colour-block jacket SVG, front and back views, with region ids, four region presets, measured visible areas and adjacency, ordered layers and lining regions.
5. [ ] `generator`: constraint validation with conflict explanations, seeded sampling, six wheel rules plus neutral+accent, free-form and source-led modes, mutation, gamut mapping with re-check, dedupe, features including adjacency and coverage, diverse subset; reproducibility test.
6. [ ] Experiment templates: write the ten templates as content files, including the collar lightness/chroma sweep and the 10 × 5 × 5 × 5 × 4 jacket study.
7. [ ] Web app screens: Explore, Dictionary, Laboratory (Palette Studio), Garment studio (Garment Lab), Compare, Discover, Learn, Library (Project Notebook); auth; CSV/JSON import; export bundle and readable report; personal-data export and deletion.
8. [ ] Run the 10,000-candidate starter experiment end to end and record benchmarks for generation, features, gallery load.
9. [ ] Accessibility pass: axe in CI, keyboard and screen-reader walkthrough, contrast check on all UI tokens.
10. [ ] Rights and review: named reviewers for colour science, Japanese and Chinese content; Seigensha permission request before any Wada combination reproduction.
11. [ ] Decide the open items below.

## Open decisions for the deciders

1. **Canonical edition.** Pick the Word file or the PNG edition as the source of truth, or merge them into a 0.2. Concrete conflicts: screen names (Laboratory / Garment studio / Library versus Palette Studio / Garment Lab / Project Notebook); data-model entities (eight linked record types with explicit Name and Relationship entities versus seven with Palette, Application and Experiment/observation); roadmap (five stages versus six with a separate cultural release slice); the Japanese candidate name list (with or without Shiro); Wada Volume 2 counts. This ADR's schema follows the Word file's eight entities because they are the finer-grained set, and adds `palette` and `application` as views over `candidate` and `region_preset`.
2. **Offline workflow** (raised in the PNG edition). Recommended: not in the MVP. Generation already runs client-side and the knowledge release is a file, so a later offline mode is a cached knowledge file plus deferred sync, not a redesign. It is the same work as mobile sync.
3. **Mobile sync strategy.** Decide when `apps/mobile` starts. Candidates: simple push/pull API (recommended first), or a CRDT library if real-time multi-device editing turns out to matter.

Decided and closed: framework (Next.js), hosting (self-hosted Docker Compose), database (SQLite).

## Amendment, 2026-10-18: hosting on Vercel, user data in Postgres

The self-hosted SQLite plan above is superseded for the app database. The decider chose Vercel for hosting with no running costs at this phase. Vercel functions have no durable disk, so user data (accounts, sessions, saved palettes and colours) moved to Postgres through the same Drizzle schema package:

- **Production:** Neon free tier over `DATABASE_URL=postgres://…`, node-postgres driver. Compute suspends between requests; the project never pauses.
- **Development:** PGlite, an embedded Postgres, in `apps/web/data/pg`. Nothing to install.
- **Tests and browser tests:** PGlite in memory (`pglite://memory`).
- **Sign-in mail:** Auth.js Resend provider when `AUTH_RESEND_KEY` is set, SMTP (Mailpit) otherwise.
- **Knowledge release:** still read-only SQLite, built during the Vercel build and traced into the function as `data/knowledge-current.sqlite`.
- **Schema:** reduced to what the app uses. Experiment, evaluation and job tables left with the dropped scope and can return from git history when experiments do.

Self-hosting still works: `docker compose up` runs the app against a Postgres container. The SQLite-for-mobile argument no longer applies to the app database; it still applies to the knowledge release, which a mobile app could bundle unchanged.
