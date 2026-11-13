/**
 * What the server tells an agent about itself. `INSTRUCTIONS` goes in the initialize result and so into
 * the agent's system prompt: short, in the app's words. `GUIDE` is the same, in full, as a resource.
 */

export const INSTRUCTIONS = `Super Colour measures colours and cites documented colour records. It never judges taste.

State needs as numbers, not moods. A word such as "warm" or "trustworthy" is refused; say instead a hue arc in OKLCh degrees, a lightness or chroma range, a contrast ratio between two roles, a minimum distance between colours, or a record to start from.

A nearby record is a measured distance, never a name. Report the distance and the record's source; do not say a colour "is" that record.

Every value carries its origin. When you cite a record, cite the source and locator the answer gives, in the record's own words. Do not paraphrase a system's text; read the resource and quote it.

Order of work: request_palette from requirements, check_palette on the result, inspect_colour on what fails, lookup_record to cite what you keep. The "palette" prompt walks through this.

Nothing here writes to the person's Library. The Laboratory link in a result is the way to hand work back to them.`;

export const GUIDE = `# Super Colour for agents

${INSTRUCTIONS}

## Tools

Every tool is deterministic and read-only. Colours are sent as a hex (#663399) or as oklch(L C h) with L on 0–1 and h in degrees. Distances are Euclidean in OKLab with L on 0–1. Contrast is the WCAG 2.1 ratio on the sRGB values as displayed.

- inspect_colour { colour }: the values the inspector shows (sRGB, HSL, OKLCh, CIELAB with its illuminant, XYZ), the nearest Munsell notations when the renotation table is installed, and the five nearest documented records with distance, status and citation.
- contrast_pair { text, background }: the WCAG 2.1 ratio with every threshold named by its success criterion, plus CIEDE2000 and OKLab differences with their conditions.
- check_palette { colours, names?, pairs?, flagDistance? }: contrast for the pairs you mean to use and for every pair, lightness spread, the closest pair, distinctness under protan, deutan and tritan simulation, the nearest records to each colour, and documented pairs, groups or layerings whose members all lie near the palette. A Laboratory link reproduces it.
- request_palette { roles?, rule?, fixed?, startFrom?, hue?, lightness?, chroma?, contrast?, minimumSeparation?, gamut?, seed?, count? }: draws candidates with the Laboratory's generator under your numbers and returns the first that meets every requirement, or the one with the fewest failures, with a pass or fail per requirement and a Laboratory link. The field "words" exists only to be refused: anything written there is answered with its measurable form.
- find_records { text }: text search over names, transliterations, aliases, labels and titles.
- lookup_record { id }: a concept with its names, representations (space, coordinates, method, approximation), passages, relations, combinations and members, each with its citation; or a source's bibliographic record. A restricted record returns its bibliographic record only.

## Resources

- supercolour://guide: this text.
- supercolour://records/{id}: any concept or source, as lookup_record returns it.
- supercolour://systems/{id}: a documented system (such as the Five Phases or Chevreul's circle) with its members and the passages that document it.
- supercolour://lessons/{id}: a lesson from the Theory section, with its references.

## Prompt

- palette { brief? }: the order of work as steps, from the person's brief to a cited palette.

## Not provided

Saving to a Library, scoring harmonies, naming a colour from a distance, physical matching, and anything that needs a hosted model. Each is either the person's own act or a claim this server cannot source.

## Quota

Every request to the server counts one call on the API key, under the same limits as the rest of the API.`;
