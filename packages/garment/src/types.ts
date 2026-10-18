export const GARMENT_ID = 'colour-block-jacket-v1';

export type View = 'front' | 'back';
export const VIEWS: View[] = ['front', 'back'];

export type RegionId =
  | 'body'
  | 'sleeve-left'
  | 'sleeve-right'
  | 'collar'
  | 'lining'
  | 'cuffs'
  | 'trim'
  | 'buttons'
  | 'panel-a'
  | 'panel-b';

export type Role = 'dominant' | 'secondary' | 'accent';
export const ROLES: Role[] = ['dominant', 'secondary', 'accent'];

export interface RegionInfo {
  label: string;
  /** Which garment layer the region belongs to. Lining is the inner layer, visible where documented. */
  layer: 'outer' | 'lining' | 'detail';
  /** Views in which the region is drawn. A region absent from a view has zero visible area there. */
  views: View[];
  /** True for the two optional panels that may carry a two-role repeat pattern. */
  pattern?: boolean;
}

export const REGIONS: Record<RegionId, RegionInfo> = {
  body: { label: 'Body', layer: 'outer', views: ['front', 'back'] },
  'sleeve-left': { label: 'Left sleeve', layer: 'outer', views: ['front', 'back'] },
  'sleeve-right': { label: 'Right sleeve', layer: 'outer', views: ['front', 'back'] },
  collar: { label: 'Collar', layer: 'outer', views: ['front', 'back'] },
  lining: {
    label: 'Lining (visible at collar and turned cuffs)',
    layer: 'lining',
    views: ['front'],
  },
  cuffs: { label: 'Cuffs', layer: 'detail', views: ['front', 'back'] },
  trim: { label: 'Trim (placket and hem band)', layer: 'detail', views: ['front', 'back'] },
  buttons: { label: 'Buttons', layer: 'detail', views: ['front'] },
  'panel-a': { label: 'Panel A (chest pocket)', layer: 'detail', views: ['front'], pattern: true },
  'panel-b': {
    label: 'Panel B (front band, back yoke)',
    layer: 'detail',
    views: ['front', 'back'],
    pattern: true,
  },
};

export const REGION_IDS = Object.keys(REGIONS) as RegionId[];

/** Ordered layers, innermost first. The garment's layer order is fixed; a combination's order maps onto it. */
export const LAYER_ORDER: ('lining' | 'outer' | 'detail')[] = ['lining', 'outer', 'detail'];

export interface PatternFill {
  pattern: 'stripes';
  roles: [Role, Role];
  /** Stripe period in SVG user units (the viewBox is 400 × 500). */
  scale: number;
  /** Degrees; 0 = horizontal stripes. */
  orientation: number;
}

export type RegionAssignment = Role | PatternFill;

export interface Preset {
  id: string;
  label: string;
  /** Every region gets an assignment, so a change to one role can only move the regions mapped to it. */
  roles: Record<RegionId, RegionAssignment>;
  /** Nominal allocation the preset aims for. Measured shares live in measurements.generated.json. */
  target: Record<Role, number>;
}
