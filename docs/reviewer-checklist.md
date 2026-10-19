# Reviewer checklist

Use one checklist per pull request that changes `content/`. Name yourself in the PR.

## Any record

- [ ] The source record exists, was opened on the stated `access_date`, and the locator points at the passage or table used.
- [ ] `review_state` is not higher than the evidence supports; nothing from Wikipedia or Wiktionary is above `discovered`.
- [ ] `rights_status` matches the publisher's stated terms; restricted sources have nothing reproduced.
- [ ] Unknown facts are absent, not filled in. "not documented" is the app's wording for a missing field.

## Names and translations (Japanese, Chinese)

- [ ] Script checked character by character against the source; transliteration system named.
- [ ] Variant spellings kept in `notes` or `aliases` with their own source, not merged.
- [ ] No aesthetic prefilter (muted, minimalist) added to the record.

## Representations

- [ ] `method` says who produced the number and how; `approximation_status` is honest.
- [ ] A value from an uncited page is `modern-approximation` with `rights_status: unreviewed`.

## Combinations and layerings

- [ ] Order is `order_documented: true` only when the source gives it; inner-to-outer indexes match the source.
- [ ] Season and context keep the source's wording.

## Cultural assertions and relationships

- [ ] The `passage` is quoted from the source; the `claim` does not go beyond it.
- [ ] Symbolic relationships (Wuxing cycles, associations) are not described as physical or aesthetic rules.

## Release

- [ ] `pnpm content:check` passes; the inventory counts changed as expected.
- [ ] Nothing promoted to `published` without a named specialist reviewer.

## Lessons and curriculum

- [ ] Prerequisites are introduced before the tool or exercise that uses them.
- [ ] Scientific explanation, design prompt, app algorithm and historical attribution are distinguishable.
- [ ] Each lesson has an objective, worked or observational example, limitations and scoped references.
- [ ] References support the specific claim; a vocabulary or CSS citation is not evidence for aesthetic success.
- [ ] Historical statements use the author's name rather than the app's authoritative voice.
- [ ] Exercise availability matches the rendered UI and README; unavailable garment workflows are not promised.
- [ ] A specialist has checked scientific accuracy before any claim of specialist review or university-level completeness.
