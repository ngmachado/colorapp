# Munsell renotation data (real.dat)

`real.dat` is the Rochester Institute of Technology Munsell Color Science Laboratory transcription of
the 1943 Munsell renotation ("real" colours only: those inside the MacAdam limits, as listed in
Newhall, Nickerson and Judd, "Final Report of the O.S.A. Subcommittee on the Spacing of the Munsell
Colors", JOSA 33, 1943).

## Where it comes from

- <http://www.rit-mcsl.org/MunsellRenotation/real.dat>, linked from
  <https://www.rit.edu/science/munsell-color-science-lab-educational-resources>.
- 2734 rows: hue page, value, chroma, CIE x, y, Y. Illuminant C, CIE 1931 2° observer. Y is on the
  renotation scale where value 10 corresponds to Y = 102.57 (MgO reference); the RIT page advises
  multiplying by 0.975 to reference the perfect reflecting diffuser. The app does that and says so.
- No neutral (N) rows are included; the table holds chromatic samples at values 1 to 9.
- The RIT page warns: "none of these data should be confused with actual measurements from a Munsell
  Book of Color".

## Terms, verified 2026-10-30

- The resources page says the files "are available for download. All come 'as is'", and for the
  re-renotation report adds "If you use this please let us know!". It carries no licence.
- RIT's website Terms of Use (<https://www.rit.edu/terms-of-use>) govern rit.edu: "Unless otherwise
  indicated, you may print or download one copy of material available from our Site on any single
  computer for your personal, noncommercial use only. You may not copy, modify, transmit, distribute,
  sell, license, publicly display or perform, publish, edit, or create derivative works from material
  on our Site." The disclaimer page (<https://www.rit.edu/disclaimer>) repeats the personal,
  noncommercial limit. The file itself is served from rit-mcsl.org, which publishes no terms of its own.
- Third parties (colour-science, the munsellinterpol and munsell R packages, IEEE DataPort, GitHub
  mirrors) redistribute the file with attribution and no licence from RIT; that is practice, not
  permission. The underlying 1943 values are published scientific tables.

## What the app does about it

- The file is not in the repository (`.gitignore`). Run `node scripts/fetch-munsell.mjs` to download
  your own copy for personal use; `MUNSELL_DATA_PATH` can point at a copy elsewhere.
- Without the file, `/munsell` explains that the reference is not installed; the notation parser and
  the conversions still work and are tested.
- The server never sends the table to browsers; a lookup returns a handful of nearest rows.
- Before deploying the lookup publicly, obtain RIT's permission (Munsell Color Science Laboratory,
  via the resources page) and record it here.
- `munsellInterpolate` (apps/web/lib/munsell.ts) interpolates a notation linearly in the table:
  between tabulated chromas on each neighbouring hue page (towards the illuminant C neutral below
  chroma 2), between the two pages, then between whole-value planes; Y comes from the ASTM D1535
  value polynomial; neutrals need no table. Common renotation practice, not a published conversion.
- `jis-z8102-check.json` (committed) holds, per JIS Z 8102 record, the CIEDE2000 difference between
  the Wikipedia page's sRGB value and the standard's notation so interpolated, plus flags for
  notations beyond the tabulated range or outside sRGB, and the difference between the two Wikipedia
  pages' values. Written by `apps/web/scripts/check-jis-munsell.ts`; only differences are stored, no
  derived colours, so the table itself is not redistributed in any form.
