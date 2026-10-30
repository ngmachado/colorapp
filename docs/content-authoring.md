# Content authoring guide

Knowledge records live in `content/knowledge/**/*.yaml`, curriculum topics in `content/curriculum`, experiment templates in `content/experiments`. `pnpm content:check` validates all three; `pnpm content:build` compiles the knowledge release.

## Rules that the schema enforces

- Every record has a stable slug `id`, a `review_state`, a `rights_status`, and (except a source) `evidence: { source, locator }` pointing at a source record.
- Unknown fields are rejected. Confidence is five separate optional numbers; leave one out rather than guessing.
- A representation must state `space`, `coords` (or a spectrum), `method` and `approximation_status`. Quote any value containing `#` so YAML does not read it as a comment.
- A combination may set `layer_index` only when `order_documented: true`.
- A curriculum topic of kind `term`, `tradition` or `lesson` cites at least one source id. Lessons require an objective, explanatory paragraphs, an example, limits, and scoped references; each reference must also appear in the source list.

## Rules the reviewers enforce

- Record what the source says, in its own words where it matters (seasons, passages). Disagreements between sources stay visible in `notes`, never resolved silently.
- Wikipedia and Wiktionary are discovery routes only: records that cite them stay `discovered` (a test enforces this).
- A restricted publication (Wada, IEP, CIE) gets a bibliographic source record and nothing reproduced from it.
- Never add an RGB value without naming where it came from and that it is a modern approximation.
- Open each page you cite and record the `access_date`.

## Generated files

`content/knowledge/japanese/jis-z8102.yaml` is written by `scripts/import-jis-z8102.mjs` from saved copies of the Japanese Wikipedia pages JIS慣用色名 and 日本の色の一覧 (download them with a descriptive User-Agent, keep them out of the repo). Edit the script's tables (existing-concept map, editor readings, notes), rerun it, then `pnpm content:build`. Do not hand-edit the generated file.

`content/knowledge/web/css-named-colours.yaml` is written by `scripts/import-css-named-colours.mjs` from a saved copy of the CSS Color Module Level 4 specification; the same rule applies.

A concept may carry `tags.standard` (for example `jis-z8102`) and `tags.munsell`; the app groups documented points by standard before tradition, and `primaryRepresentation` in `apps/web/lib/records.ts` decides which of several values an entry shows first.

## Reference data outside the knowledge release

`content/reference/` holds tables the app consults but does not turn into records: `munsell/real.dat` (RIT's transcription of the 1943 Munsell renotation) with a README stating its source, conditions, the Y scaling the app applies, and what is known about reuse terms. These files are not validated by `pnpm content:check`, are traced into the deployment with the rest of `content/`, and are read only on the server. A concept's `tags.munsell` links its entry to the tabulated value of that notation on `/munsell`.

## Review chain

`discovered` → `bibliographic` → `extracted` → `rights-checked` → `specialist-reviewed` → `published`. Only the last two show as source-verified in the app. Promotion happens in a pull request with the reviewer named in the description.

## Adding a source

```yaml
- type: source
  id: my-source
  review_state: bibliographic
  rights_status: verified-restricted
  author: Who
  title: What
  url: https://…
  access_date: '2026-10-14'
  rights_notes: What the rights page says.
```

## Teaching content

The learning path is Foundations → Representing colour → Perception and context → Designing with colour → Colour in production → History and culture. Maintain that prerequisite order in `/theory`.

- Distinguish perceptual attributes from coordinates and physical measurements. State which model and viewing conditions a claim concerns.
- Attribute historical claims in the sentence itself. Historical models are not the scientific basis of current colour measurement.
- Label palette recipes as app-defined algorithms. A reference supporting OKLCh does not establish an angle recipe as a law of harmony.
- Give references a specific supporting scope. A publication overview supports a description of its scope, not details of an unread report. Do not imply specialist review from the presence of citations.
- Keep unavailable activities out of the learning flow. Exercise definitions carry `available`, `planned` or `removed`; synchronize the README when status changes.
- Separate explanations of a production workflow from implemented tools. Do not imply that screen swatches perform spectral matching, textile simulation or ICC proofing.
- Original summaries and exercises are distinct from reproducing a source's prose, diagrams or plates. Record attribution and reuse status separately from scientific validity.
