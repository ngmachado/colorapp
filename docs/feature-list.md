# Feature list

Updated 2026-10-20. Super Colour is a professional colour tool and a sourced reference. Priorities follow practical work: inspect a supplied colour, understand the assumptions, compare options and take usable values into another application. Theory supports those tasks.

Every value must have a declared origin and status: user input, calculation, measurement or editorial approximation. Numerical proximity does not establish a historical identity. Systems and phases remain distinct from colours. No display-fidelity or physical production-match claims.

## Implemented locally; not yet deployed

- **Chevreul system entry.** Six named landmarks within the documented 72-scale construction, three complementary pairs, and linked simultaneous-contrast passages. The Dictionary now has two systems (Chevreul and the Five Phases), the Laboratory loads the three pairs, and History links to the entry. The screen swatches have separate editorial provenance. Japanese layering remains a different kind of record, not a third system.
- **Colour inspector.** `/colour` accepts opaque 3- or 6-digit hex input. `/colour/fc2222` is an example canonical, shareable page. Short or uppercase route inputs redirect to lowercase six-digit URLs; invalid inputs return 404. Alpha, colour names and other input syntaxes are outside this first release.
  - Copy HEX, RGB, HSL, OKLCh, Lab and XYZ in CSS syntax. sRGB and OKLCh use D65; Lab uses D50 with Bradford adaptation; XYZ is D65 with reference-white Y = 1. Rounded readouts are identified as such. Achromatic polar readouts use an undefined hue.
  - Lightness and chroma variations show requested OKLCh steps and distinguish in-gamut from CSS-gamut-mapped screen values. Each step opens its rendered hex in the Laboratory. Chroma variations are not described as traditional “tones.”
  - Text samples against actual white and black, with numerical WCAG contrast and separate AA/AAA results for normal and large text. Intentionally failing samples remain demonstrations; surrounding controls and results are accessibility-audited.
  - Colour-vision simulations carry their model and limitations.
  - Nearby records show Euclidean OKLab distance, representation status, source citation and research-queue status where applicable. They are suggestions from a small collection, not colour identifications. Comparing display values opens both hex values in the Laboratory without asserting record identity.
  - Entry points: “Inspect colour” on each Laboratory column; “Inspect display colour” on a Dictionary record with a value; “Inspect this colour” on Dictionary hex searches; and “Inspect a hex” on the colour listing.
  - Dictionary entries share the inspector’s lightness-variation and contrast/simulation components. No duplicate conversion engine or new reference dataset was introduced.

These are code implementation statuses, not specialist approval or production deployment claims.

## Next candidates — not implemented

1. **Intended pairs in Laboratory Contrast.** Assign foreground/background roles, lead with the intended combinations, and add samples and explicit thresholds. The inspector’s black/white samples do not complete this task.
2. **Source-aware CSS and SVG exports.** Preserve record identifiers, source citations, approximation status and the distinction between original and edited values. Audit existing JSON fields before claiming that its provenance is complete.
3. **Focused two-colour comparison.** Values, named difference metric, conditions, contrast and provenance in one view. The previous comparison-workspace scope cut remains history; a focused professional comparison is a new candidate, not an approved large workspace.
4. **Lightness view in the Laboratory.** An OKLCh L-only view, labelled with its space and assumptions. It is not a luminance measurement or a substitute for contrast calculations.
5. **Neighbour view.** Samples on each other’s backgrounds to inspect adjacency. Keep numerical values visible and distinguish viewing effects from changes to stored coordinates.
6. **Two-space gradients.** Compare sRGB and OKLCh interpolation, with explicit hue path, gamut handling and matching CSS exports. Useful for production authoring; no universal claim that one interpolation is preferable.
7. **Munsell lookup.** A separately scoped reference integration, not a dependency of the inspector. Select the exact RIT renotation dataset, verify redistribution terms, preserve its illuminant C / CIE 1931 2° conditions, and document chromatic adaptation and gamut handling. Label a nearest tabulated sample as such; it is not an interpolated notation conversion. Report numerical distance without unsupported universal perceptibility bands. See [RIT data documentation](https://www.rit.edu/science/munsell-color-science-lab-educational-resources).
8. **Documented relationships near a palette.** Suggest existing pairs, cycles or layerings by a declared matching method. Explain which numerical representations were compared; never infer a cultural relationship from colour distance.
9. **Image colour extraction.** Preserve extracted values and proportions as image observations; offer nearby documented records separately. Specify image colour-profile handling, privacy and local processing before implementation. Do not rename pixels as historical colours.

Candidate order can change with professional usage evidence. Estimates need a defined scope and acceptance criteria; reference-data acquisition and review are not covered by a generic UI implementation estimate.

## Research required

- **Pantone integration.** No approved dataset or redistribution permission is recorded. A third-party hex table and trademark notice do not establish either. Determine an authorized integration, exact library/version and permitted usage before scheduling. Screen simulations must not be presented as physical-standard matches. See [Pantone’s terms](https://www.pantone.com/uk/en-gb/about/terms-of-use) and [simulation disclaimer](https://connect.pantone.com/?q=032+C).
- **Physical production conversions.** Generic CMYK percentages remain out of scope. A future CMYK workflow needs the relevant profile and output conditions. XYZ and Lab readouts from a declared sRGB input are already supported and do not require an arbitrary output-device profile.
- **Applied previews.** The inspector includes text/background samples. Broader compositions or product mockups are not in the current implementation; evaluate a concrete professional use case before expanding scope.

## Not planned

- Unsourced psychology or meaning prose, and undocumented colour-name databases presented as authority.
- Community feeds, wallpapers, lesson progress tracking or other portal features.
- Universal harmony ratings, perceptibility guarantees or automatic physical colour matching from screen values.

## Review pending

The [six-lesson specialist review packet](lesson-review-packet.md) is prepared; no reviewer is assigned. Scientific review should also cover professional tool labels, conversion assumptions, gamut mapping and interpretation of distance/contrast. Code tests are not specialist review.
