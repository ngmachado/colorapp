# Release checklist (foundation document, section 23)

Each area lists the automated evidence, then manual checks. `pnpm check` and `pnpm e2e` run everything automated.

| Area                   | Automated evidence                                                                                                                                                                                                                 | Manual                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Colour calculations    | 34 Sharma CIEDE2000 pairs; colour-science oracle fixtures; round-trip property tests; achromatic hue handling (`packages/colour-engine`)                                                                                           | none                                                                     |
| Gamut and profiles     | out-of-gamut fixtures with original, mapped, policy and delta; re-check after mapping (`packages/generator`)                                                                                                                       | unknown-profile input is refused by design: imports must declare a space |
| Knowledge records      | schema and reference checks, missing source fails, Wada bibliographic only, Wuxing relations traceable, Wikipedia-cited records stay discovered, Western passages quote public-domain sources only (`packages/db/src/content.test.ts`) | reviewer checklist per PR                                                |
| Reproducibility        | same seed, rule and content version reproduce the same palette; the URL holds palette, rule and seed (`generator.test.ts`, `lab-generator.e2e.ts`)                                                                                | none                                                                     |
| Claims and wording     | forbidden-claim scan over every app and content file: nothing is called harmonious or universally preferred (`explanations.test.ts`)                                                                                              | read `/about` and `/theory` copy once per release                        |
| Access and performance | axe on every screen; keyboard tests; contrast of all tokens; background stays white under a dark OS preference (`accessibility.e2e.ts`, `tokens.test.ts`); Laboratory, wheel and Theory suites run on Chromium and WebKit (`playwright.config.ts`) | screen-reader walk-through of Laboratory, Theory, Dictionary; one pass at phone width |
| Content into the tool  | records open in the Laboratory from entries, combinations, Theory and the wheel panel; hex lists load from the address and from a paste (`lab-content.e2e.ts`)                                                                | none                                                                     |
| Privacy and security   | owner-scoped data layer with cross-user tests on an embedded Postgres; cross-user 404 in the browser; export and delete leave nothing (`app.test.ts`, `library.e2e.ts`)                                                                                   | rotate `AUTH_SECRET`; confirm the Resend sender and the Neon connection string                                |

## Reproducibility levels

- Candidate coordinates: exact for the same seed, parameters, generator version and content version. Tested.
- Browser rendering: not pixel-guaranteed; the app records settings, not pixels.

## What the interface says about a value

A named colour on screen is a modern sRGB reading of a cited source; the entry states who read it and how. Restricted sources are cited and never reproduced. Review states and rights states are internal to the content pipeline (`content/knowledge`, `pnpm content:check`) and are not shown to users; `/about` explains the two things a reader needs.

## Educational release

- [ ] Six lessons appear in prerequisite order, with historical and cultural records after the modern foundations and design lessons.
- [ ] The two-surroundings exercise reveals values only after a response, allows an equal-background comparison, and resets (`theory.e2e.ts`).
- [ ] Working OKLCh values outside sRGB are identified as gamut-mapped in the dimension playground.
- [ ] Palette recipes are labelled as app choices; tetradic examples show four colours.
- [ ] Every lesson reference states its scope; lesson prose is not described as specialist-reviewed without an actual review.
- [ ] README availability matches the shipped lessons, exercises and production tools.
