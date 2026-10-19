import { z } from 'zod';

/** Record ids are stable slugs. They never change once published. */
export const Id = z.string().regex(/^[a-z0-9][a-z0-9-]{1,80}$/, 'id must be a lowercase slug');

export const ReviewState = z.enum([
  'discovered',
  'bibliographic',
  'extracted',
  'rights-checked',
  'specialist-reviewed',
  'published',
]);
export const RightsStatus = z.enum([
  'verified-reusable',
  'verified-restricted',
  'approximate',
  'unreviewed',
  'user-adaptation',
]);
export const ApproximationStatus = z.enum([
  'measured',
  'published-value',
  'modern-approximation',
  'unknown',
]);
export const EdgeType = z.enum([
  'translation-of',
  'measured-from',
  'lining-of',
  'variant-of',
  'adaptation-of',
  'associated-with',
  'member-of',
  'derived-from',
  'generates',
  'controls',
  /** A complementary pairing attributed to a source, not necessarily a hue-angle opposite. */
  'complement-of',
  /** A characteristic pairing attributed to a source. */
  'characteristic-with',
]);
export const SpaceId = z.enum([
  'srgb',
  'srgb-linear',
  'display-p3',
  'hsl',
  'hsv',
  'xyz-d65',
  'xyz-d50',
  'xyy',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'cam16-jmh',
]);

const Score = z.number().min(0).max(1).nullable();

/** Confidence is five separate numbers. Null means "not documented", never 0. */
export const Confidence = z
  .strictObject({
    transcription: Score.optional(),
    translation: Score.optional(),
    attribution: Score.optional(),
    measurement: Score.optional(),
    display: Score.optional(),
  })
  .optional();

/** Where a record's evidence comes from. Required on every record except a source itself. */
export const Evidence = z.strictObject({
  source: Id,
  /** Page, plate, object number, timestamp or URL fragment. */
  locator: z.string().min(1).optional(),
});

const common = {
  id: Id,
  review_state: ReviewState,
  rights_status: RightsStatus,
  confidence: Confidence,
  notes: z.string().optional(),
};

export const SourceRecord = z.strictObject({
  type: z.literal('source'),
  ...common,
  author: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().optional(),
  date: z.string().optional(),
  edition: z.string().optional(),
  isbn: z.string().optional(),
  url: z.string().url().optional(),
  archive_id: z.string().optional(),
  access_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'access_date must be YYYY-MM-DD'),
  rights_notes: z.string().optional(),
});

export const ConceptRecord = z.strictObject({
  type: z.literal('concept'),
  ...common,
  evidence: Evidence,
  label: z.string().min(1),
  description: z.string().optional(),
  scope: z.string().optional(),
  /** Free tags such as tradition, period, season, region, material. Metadata, not coordinates. */
  tags: z.record(z.string(), z.string()).optional(),
});

export const NameRecord = z.strictObject({
  type: z.literal('name'),
  ...common,
  evidence: Evidence,
  concept: Id,
  /** The word in its original script. */
  script: z.string().min(1),
  /** BCP 47 language tag, e.g. ja, zh-Hant, en. */
  language: z.string().min(2),
  transliteration: z
    .strictObject({ system: z.string().min(1), value: z.string().min(1) })
    .optional(),
  aliases: z.array(z.string().min(1)).optional(),
  meaning: z.string().optional(),
  translation_notes: z.string().optional(),
});

export const RepresentationRecord = z
  .strictObject({
    type: z.literal('representation'),
    ...common,
    evidence: Evidence,
    concept: Id,
    space: z.union([SpaceId, z.literal('spectral')]),
    coords: z.tuple([z.number(), z.number(), z.number()]).optional(),
    spectrum: z
      .strictObject({
        wavelengths_nm: z.array(z.number()).min(2),
        values: z.array(z.number()).min(2),
        quantity: z.enum(['reflectance', 'transmittance', 'spd']),
      })
      .optional(),
    white: z.enum(['D65', 'D50']).optional(),
    profile: z.string().optional(),
    conditions: z.string().optional(),
    /** How the numbers were produced: instrument, conversion, or who approximated them. */
    method: z.string().min(1),
    approximation_status: ApproximationStatus,
  })
  .refine((r) => (r.space === 'spectral' ? !!r.spectrum : !!r.coords), {
    message: 'a representation needs coords, or a spectrum when space is spectral',
    path: ['coords'],
  });

export const MaterialSampleRecord = z.strictObject({
  type: z.literal('material-sample'),
  ...common,
  evidence: Evidence,
  concept: Id.optional(),
  substrate: z.string().min(1),
  colourant: z.string().optional(),
  process: z.string().optional(),
  sample_id: z.string().optional(),
  measurement: z
    .strictObject({
      instrument: z.string().optional(),
      geometry: z.string().optional(),
      illuminant: z.string().optional(),
      observer: z.string().optional(),
      date: z.string().optional(),
    })
    .optional(),
});

export const CombinationItem = z.strictObject({
  concept: Id,
  role: z.string().optional(),
  /** 0 = innermost. Only when the source documents an order. */
  layer_index: z.number().int().min(0).optional(),
  position: z.enum(['inner', 'outer', 'lining']).optional(),
  visibility: z.string().optional(),
  proportion: z.number().min(0).max(1).optional(),
});

export const CombinationRecord = z
  .strictObject({
    type: z.literal('combination'),
    ...common,
    evidence: Evidence,
    label: z.string().min(1),
    items: z.array(CombinationItem).min(2),
    /** Whether the source gives the order of items. If false, layer_index must not be set. */
    order_documented: z.boolean(),
    relationship_type: z.string().optional(),
    season: z.string().optional(),
    intended_context: z.string().optional(),
    interpretation: z
      .enum([
        'historical-description',
        'modern-reconstruction',
        'measured-sample',
        'new-adaptation',
      ])
      .optional(),
  })
  .refine((c) => c.order_documented || c.items.every((i) => i.layer_index === undefined), {
    message: 'layer_index requires order_documented: true',
    path: ['items'],
  });

export const CulturalAssertionRecord = z.strictObject({
  type: z.literal('cultural-assertion'),
  ...common,
  evidence: Evidence,
  concept: Id.optional(),
  claim: z.string().min(1),
  community: z.string().optional(),
  period: z.string().optional(),
  context: z.string().optional(),
  passage: z.string().optional(),
  contributor: z.string().optional(),
});

export const RelationshipRecord = z.strictObject({
  type: z.literal('relationship'),
  ...common,
  evidence: Evidence,
  from: Id,
  to: Id,
  edge: EdgeType,
});

export const Record = z.discriminatedUnion('type', [
  SourceRecord,
  ConceptRecord,
  NameRecord,
  RepresentationRecord,
  MaterialSampleRecord,
  CombinationRecord,
  CulturalAssertionRecord,
  RelationshipRecord,
]);

export type KnowledgeRecord = z.infer<typeof Record>;
export type RecordType = KnowledgeRecord['type'];
export type Source = z.infer<typeof SourceRecord>;
export type Concept = z.infer<typeof ConceptRecord>;
export type Name = z.infer<typeof NameRecord>;
export type Representation = z.infer<typeof RepresentationRecord>;
export type Combination = z.infer<typeof CombinationRecord>;
export type Relationship = z.infer<typeof RelationshipRecord>;

export const RECORD_TYPES: RecordType[] = [
  'source',
  'concept',
  'name',
  'representation',
  'material-sample',
  'combination',
  'cultural-assertion',
  'relationship',
];

/** A content file holds one record or a list of records. */
export const ContentFile = z.union([Record, z.array(Record)]);

/** JSON Schema for editors and CI, generated from the same Zod definitions. */
export function jsonSchema(): object {
  return z.toJSONSchema(ContentFile, { target: 'draft-7', unrepresentable: 'any' });
}
