# Six-lesson specialist review packet

Status: **reviewer unassigned; no specialist sign-off**. Prepared 2026-10-20.

This is a working-tree snapshot of all six lessons, including the Chevreul addition. SHA-256 of `content/curriculum/lessons.yaml`: `61845c2d757e384930b5ed9d2e80197e5d95c87115e77766fe125858b17e42d4`. Record the reviewed commit and deployment before starting; the production links below are intended screen locations and may still show the previous release. Use the corresponding paths on a preview of this snapshot when available.

## Review brief

Seek a reviewer with formal colour-science training and experience teaching introductory colour or applying colorimetry. Allow roughly 60 minutes for a first pass: 5 minutes for scope, 30 for the six lessons, 15 for the exercises and Chevreul entry, 10 for findings. Resolving source gaps may require follow-up. A colour-science review does not certify the Japanese or Chinese historical interpretations.

Review scientific accuracy, prerequisite order, historical attribution, source adequacy and the distinction between perception, coordinates and editorial illustration. Mark each claim **accept**, **revise**, or **needs source**. References listed below are the current lesson citations, not a claim that every citation supports every sentence. Specific gaps are called out beside claim groups.

Reviewer: unassigned. Qualifications: pending. Date: pending. Reviewed commit: pending. Preview URL: pending.

## Proposed invitation (draft; not sent)

Please review six short introductory colour lessons and their adjacent demonstrations. We need corrections to scientific claims and source scope, especially lightness versus luminance, adaptation, gamut, complement terminology and metamerism. Please spend about an hour on an initial pass and return a severity-ranked list with exact wording and a primary reference for each correction. This is an educational demo; we are not seeking certification of a complete university curriculum. The packet contains all lesson text and screen locations. Please flag any area outside your expertise.

## 1. Foundations

Screen: [Theory — Foundations](https://colorapp-taupe.vercel.app/theory#foundations). DOM section: `#foundations`; source: `content/curriculum/lessons.yaml`, topic `foundations`.

**Objective (header):** Explain why a colour needs a viewing context, not just a name or a hex code.

### 1.1 — body paragraph 1

- **Claim 1.1.1:** Light reaches a surface, some wavelengths are absorbed and others are reflected towards the eye.
- **Claim 1.1.2:** The illumination, material and observer all matter.
- **Claim 1.1.3:** A screen instead emits light; a screen swatch is a representation of a material colour.
- **Claim 1.1.4:** Additive mixing combines lights.
- **Claim 1.1.5:** Subtractive mixing involves selective absorption by filters or colorants; an RGB average is not a pigment recipe.

Reference scope / review question: CIE e-ILV and Colorimetry overview: terminology; additive/subtractive explanation needs a more specific primary passage.

Disposition: pending.

### 1.2 — body paragraph 2

- **Claim 1.2.1:** Hue describes colour character.
- **Claim 1.2.2:** Lightness compares brightness with a similarly illuminated white; chroma relates colourfulness to that white, while saturation relates it to the colour's own brightness.
- **Claim 1.2.3:** These perceptual attributes are different from the coordinates used to approximate them.

Reference scope / review question: CIE e-ILV: hue, lightness, chroma, saturation definitions; verify simplification and reference white wording.

Disposition: pending.

### 1.3 — body paragraph 3

- **Claim 1.3.1:** Luminance measures light in a specified direction.
- **Claim 1.3.2:** Brightness describes perception.
- **Claim 1.3.3:** An RGB channel value is neither a luminance measurement nor a promise about how bright a display will look.

Reference scope / review question: CIE e-ILV: luminance and brightness; confirm directional measurement wording.

Disposition: pending.

**Try it (boxed prompt, exact text):** Look at a white sheet beside a screen showing white. Consider the room light and the screen brightness before expecting them to match.

**Limits (inside “Limits and references”, exact text):** These lessons introduce colour literacy. They do not provide a calibrated viewing environment or a complete university course.

**Current references (same disclosure):**

- [e-ILV: hue, lightness, chroma, saturation, brightness and luminance entries](https://cie.co.at/e-ilv) — source record `cie-ilv-2020`.
- [Publication overview: observers, illuminants and viewing conditions](https://www.cie.co.at/publications/colorimetry-4th-edition) — source record `cie-colorimetry-2018`.

## 2. Representing colour

Screen: [Theory — Representing colour](https://colorapp-taupe.vercel.app/theory#representing-colour). DOM section: `#representing-colour`; source: `content/curriculum/lessons.yaml`, topic `representing-colour`.

**Objective (header):** Distinguish colour measurement, display encoding and perceptual editing.

### 2.1 — body paragraph 1

- **Claim 2.1.1:** Colorimetry uses specified observers and illuminants to calculate tristimulus values.
- **Claim 2.1.2:** XYZ and chromaticity coordinates describe colour under defined conditions; a chromaticity diagram is not a map of equally spaced perceptual differences.

Reference scope / review question: CIE Colorimetry overview: specific standard-observer and XYZ passages still needed.

Disposition: pending.

### 2.2 — body paragraph 2

- **Claim 2.2.1:** sRGB and Display P3 specify different RGB spaces.
- **Claim 2.2.2:** Encoded sRGB channels are nonlinear; averaging them differs from averaging linear-light values.
- **Claim 2.2.3:** HSL rearranges sRGB coordinates for editing.

Reference scope / review question: CSS Color 4 §§7, 9: RGB encodings and HSL; confirm the averaging explanation.

Disposition: pending.

### 2.3 — body paragraph 3

- **Claim 2.3.1:** Lab and OKLab aim at more perceptually useful distances; neither is perfectly uniform.
- **Claim 2.3.2:** LCh and OKLCh express their respective a and b coordinates as chroma and hue.
- **Claim 2.3.3:** CIELAB needs a reference white; this app uses D50 for Lab and D65 for OKLab.

Reference scope / review question: CSS Color 4 §§10–10.3: Lab/OKLab and polar forms; app white points also require implementation verification.

Disposition: pending.

### 2.4 — body paragraph 4

- **Claim 2.4.1:** A gamut is the range a device or space can represent.
- **Claim 2.4.2:** Mapping into sRGB can change a colour.
- **Claim 2.4.3:** The sliders below edit OKLCh, while the swatch shows an sRGB approximation.

Reference scope / review question: CSS Color 4 §14: gamut mapping; app clipping/mapping behavior requires implementation verification.

Disposition: pending.

**Try it (boxed prompt, exact text):** Change the readout from OKLCh to HSL below. The numbers change because the coordinate system changes, not because you chose a new colour.

**Limits (inside “Limits and references”, exact text):** A colour difference needs a named metric and conditions. A small numeric distance does not establish cultural similarity or visual harmony.

**Current references (same disclosure):**

- [Publication overview: tristimulus values, chromaticity, spaces and differences](https://www.cie.co.at/publications/colorimetry-4th-edition) — source record `cie-colorimetry-2018`.
- [Sections 7, 9, 10.3 and 14: HSL, Lab/OKLab, linear-light sRGB and gamut mapping](https://www.w3.org/TR/css-color-4/) — source record `w3c-css-color-4`.

## 3. Perception and context

Screen: [Theory — Perception and context](https://colorapp-taupe.vercel.app/theory#perception). DOM section: `#perception`; source: `content/curriculum/lessons.yaml`, topic `perception`.

**Objective (header):** Separate the stimulus on the screen from the appearance you judge.

### 3.1 — body paragraph 1

- **Claim 3.1.1:** Surroundings can change the apparent lightness or colour of a sample.
- **Claim 3.1.2:** Simultaneous contrast is one contextual effect; it does not mean every pair becomes maximally different in every situation.

Reference scope / review question: CIE e-ILV terminology plus historical Chevreul §16; a modern primary treatment of spatial context is still needed.

Disposition: pending.

### 3.2 — body paragraph 2

- **Claim 3.2.1:** Chromatic adaptation helps vision adjust to illumination.
- **Claim 3.2.2:** Colour constancy is approximate, and appearance also depends on the surround and viewing conditions.
- **Claim 3.2.3:** Converting coordinates between reference whites does not reproduce all of these effects.

Reference scope / review question: CIE e-ILV: adaptation and constancy; obtain a specific primary reference for the limits of coordinate conversion.

Disposition: pending.

### 3.3 — body paragraph 3

- **Claim 3.3.1:** Chevreul's nineteenth-century account is a historical observation to examine, not a complete contemporary model of perception.
- **Claim 3.3.2:** Use the experiment below to compare your impression with the actual sample values.

Reference scope / review question: Chevreul §16 supports historical attribution; modern model limitations require specialist judgment.

Disposition: pending.

**Try it (boxed prompt, exact text):** Judge the two central squares before revealing their values. Then compare them on the same background.

**Limits (inside “Limits and references”, exact text):** This informal demonstration measures no visual ability and predicts no individual observer's response. Display settings and viewing conditions affect the result.

**Current references (same disclosure):**

- [e-ILV: simultaneous contrast, chromatic adaptation and colour constancy entries](https://cie.co.at/e-ilv) — source record `cie-ilv-2020`.
- [Paragraph 16: historical statement of simultaneous contrast](https://archive.org/details/b21285676) — source record `chevreul-1890-principles-martel`.

## 4. Designing with colour

Screen: [Theory — Designing with colour](https://colorapp-taupe.vercel.app/theory#designing). DOM section: `#designing`; source: `content/curriculum/lessons.yaml`, topic `designing`.

**Objective (header):** Use palette structures as starting points and evaluate hierarchy, proportion and accessibility separately.

### 4.1 — body paragraph 1

- **Claim 4.1.1:** Start with a brief.
- **Claim 4.1.2:** Decide what should attract attention, what should recede and what information must remain legible.
- **Claim 4.1.3:** Try changing area and placement while holding colours constant, then change one colour attribute at a time.
- **Claim 4.1.4:** These are design exercises, not universal numerical prescriptions.

Reference scope / review question: Design prompt, not a universal scientific claim. No empirical aesthetic claim intended.

Disposition: pending.

### 4.2 — body paragraph 2

- **Claim 4.2.1:** The wheel recipes below are this app's choices of OKLCh angles.
- **Claim 4.2.2:** Opposite hue angles are not automatically additive-light complements, pigment-mixing complements or afterimage matches.
- **Claim 4.2.3:** Compare the results with the free-form baseline rather than treating a scheme name as proof of quality.

Reference scope / review question: CSS Color 4 §9.2 documents OKLCh, not the app recipes or equivalence of complements. Verify app rule definitions; add a primary reference distinguishing types of complement.

Disposition: pending.

### 4.3 — body paragraph 3

- **Claim 4.3.1:** For interfaces, colour must not be the only way to communicate information.
- **Claim 4.3.2:** Add text, symbols or patterns.
- **Claim 4.3.3:** WCAG text contrast checks a specific foreground/background relationship; it does not certify the accessibility of a whole palette or describe harmony.

Reference scope / review question: WCAG Use of Color 1.4.1 and Contrast (Minimum) 1.4.3; these do not establish palette-wide accessibility or harmony.

Disposition: pending.

**Try it (boxed prompt, exact text):** In the Laboratory, open Proportions. Keep three colours fixed, set their weights to 7, 2, 1, then reverse the areas. Compare both arrangements against the same brief and check intended text/background pairs with Contrast.

**Limits (inside “Limits and references”, exact text):** The proportional strip models relative area only; it does not simulate garment placement or a finished composition. Colour-vision simulations are approximations, not substitutes for accessibility checks and user evaluation.

**Current references (same disclosure):**

- [Understanding SC 1.4.1: information must not rely on colour alone](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) — source record `w3c-use-of-color`.
- [Understanding SC 1.4.3: text contrast and exceptions](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — source record `w3c-contrast-minimum`.
- [Section 9.2 supports the coordinate model, not the palette recipes](https://www.w3.org/TR/css-color-4/#ok-lab) — source record `w3c-css-color-4`.

## 5. Colour in production

Screen: [Theory — Colour in production](https://colorapp-taupe.vercel.app/theory#production). DOM section: `#production`; source: `content/curriculum/lessons.yaml`, topic `production`.

**Objective (header):** Explain why a hex code alone cannot specify a reliable printed or textile match.

### 5.1 — body paragraph 1

- **Claim 5.1.1:** Calibration establishes a device's operating condition; characterization describes its response.
- **Claim 5.1.2:** ICC profiles support colour conversion between characterized devices and reference spaces.
- **Claim 5.1.3:** A profile does not make every device reproduce every colour.

Reference scope / review question: ICC white paper: calibration, characterization and profiles; confirm precise distinction.

Disposition: pending.

### 5.2 — body paragraph 2

- **Claim 5.2.1:** CMYK values depend on the printing condition, including inks and substrate.
- **Claim 5.2.2:** Choose the intended output profile and inspect a proof.
- **Claim 5.2.3:** A generic RGB-to-CMYK conversion is not a production specification.

Reference scope / review question: ICC white paper: profile/device dependence; proofing advice requires a specific supporting passage.

Disposition: pending.

### 5.3 — body paragraph 3

- **Claim 5.3.1:** Metameric samples can match under one illuminant and observer but differ under another because their spectra differ.
- **Claim 5.3.2:** A single RGB match cannot establish that two physical materials will keep matching when the light changes.

Reference scope / review question: CIE special metamerism index overview is narrow (observer change); illuminant-change and spectral explanations need a direct primary reference.

Disposition: pending.

### 5.4 — body paragraph 4

- **Claim 5.4.1:** For textiles, evaluate physical samples under the intended lighting and viewing geometry.
- **Claim 5.4.2:** Texture and gloss also need inspection; flat screen swatches do not model them.

Reference scope / review question: Practical review advice; request a primary reference on textile viewing conditions and geometry.

Disposition: pending.

**Try it (boxed prompt, exact text):** Before approving a fabric pairing, compare physical samples under the intended use lighting as well as the supplier's evaluation conditions.

**Limits (inside “Limits and references”, exact text):** This app does not currently implement ICC soft proofing, spectral measurement, dye formulation or material rendering. The lesson explains the workflow; it does not perform it.

**Current references (same disclosure):**

- [White paper: device characterization and profile-based colour management](https://preview.color.org/wpaper1/) — source record `icc-color-management`.
- [Publication overview: matches broken by changes in illuminant or observer](https://www.cie.co.at/publications/special-metamerism-index-change-observer) — source record `cie-metamerism-1989`.

## 6. History and culture

Screen: [Theory — History and culture](https://colorapp-taupe.vercel.app/theory#history). DOM section: `#history`; source: `content/curriculum/lessons.yaml`, topic `history`.

**Objective (header):** Distinguish a historical author's claim, a cultural association and a modern colour calculation.

### 6.1 — body paragraph 1

- **Claim 6.1.1:** Chevreul, Itten and Albers approached colour through different observations and teaching practices.
- **Claim 6.1.2:** Chevreul's law of 1839 is quoted here by paragraph; Itten and Albers have bibliographic entries only.
- **Claim 6.1.3:** Their dates do not decide the usefulness of an exercise; attribution, evidence and scope matter.

Reference scope / review question: Chevreul §16 and bibliographic Itten/Albers records support attribution. The comparative teaching sentence needs more specific sources if retained as a historical claim.

Disposition: pending.

### 6.2 — body paragraph 2

- **Claim 6.2.1:** Japanese colour vocabularies, layering practices and Wuxing correspondences describe different kinds of cultural knowledge.
- **Claim 6.2.2:** A symbolic relationship or historical name does not uniquely determine a modern RGB value or a palette-generation rule.

Reference scope / review question: Follow individual Dictionary evidence for Wuxing and Japanese records. This lesson currently has no direct reference for these cultural claims; add scoped citations or narrow the sentence.

Disposition: pending.

**Try it (boxed prompt, exact text):** Open Chevreul’s circle below and follow a complementary pair into the Laboratory. Compare the historical relationship with its editorial screen swatches. Alternatively, open the Five Phases or Japanese layering record; these are selected examples, not a survey of colour history. Identify the documented association, its source and any modern display approximation.

**Limits (inside “Limits and references”, exact text):** This is a selected collection, not a comprehensive history or a single Western or Asian theory. Read each entry's evidence and representation limits before reusing its claims.

**Current references (same disclosure):**

- [Paragraphs 16 and 159–170; simultaneous contrast and the chromatic circle, 1890 edition](https://archive.org/details/b21285676) — source record `chevreul-1890-principles-martel`.

## Screen walkthrough

1. Theory, after lesson 2: Dimensions. Unlock hue, change it, then switch “Read in space” to HSL. Verify descriptions of conversion, gamut and white points.
2. Theory, after lesson 3: surrounding-colour exercise. Answer before revealing identical #808080 centres; compare on the same background. Check that wording does not promise every observer experiences the same effect.
3. Theory, after lesson 4: structure rows. Check they are labelled as app recipes rather than historical or universal harmony laws.
4. [Laboratory](https://colorapp-taupe.vercel.app/lab?hex=c43d37,e6c84f,3869a6): open Proportions, enter 7, 2, 1 and reverse. Check distinction between relative area, placement and perceived prominence. Open Contrast and inspect pair-specific wording and simulation limits.
5. [Chevreul’s system](https://colorapp-taupe.vercel.app/dictionary/chevreul-circle): read Source and Scope, inspect the diagram, then Meaning. Follow red + green into the Laboratory; verify provenance survives, and the screen values are not presented as historical measurements. Also open Wheel → Load set and select a Chevreul pair.
6. [Historical records](https://colorapp-taupe.vercel.app/theory#traditions): confirm that systems, vocabulary and layering are not presented as equivalent scientific models.

Chevreul source-image checks and display decisions: [source notes](chevreul-source-notes.md). Those checks do not substitute for specialist review.

## Findings and sign-off

For every finding record: claim ID or screen/control; exact text; severity (material factual error / misleading scope / missing source / editorial); proposed wording; primary reference and locator; owner; resolution; reviewed commit.

| Claim or screen | Finding and severity     | Proposed correction + reference | Owner / resolution |
| --------------- | ------------------------ | ------------------------------- | ------------------ |
| Pending review  | No findings received yet | —                               | Unassigned         |

- [ ] Reviewer identity, qualifications, date, commit and preview recorded.
- [ ] Every claim group has a disposition and the source gaps above have been addressed.
- [ ] All six walkthrough steps checked.
- [ ] Material findings corrected and rechecked.
- [ ] Scope of review and remaining limitations recorded.

Decision: **pending**. No content record should be promoted to specialist-reviewed or published on the basis of this packet alone.
