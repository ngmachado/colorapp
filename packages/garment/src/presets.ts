import type { Preset } from './types';

export const PRESETS: Preset[] = [
  {
    id: 'preset-1-classic',
    label: 'Classic: one body colour, trim accent',
    roles: {
      body: 'dominant',
      'sleeve-left': 'dominant',
      'sleeve-right': 'dominant',
      collar: 'secondary',
      lining: 'secondary',
      cuffs: 'secondary',
      trim: 'accent',
      buttons: 'accent',
      'panel-a': 'dominant',
      'panel-b': 'dominant',
    },
    target: { dominant: 0.8, secondary: 0.15, accent: 0.05 },
  },
  {
    id: 'preset-2-sleeves',
    label: 'Contrast sleeves, collar accent',
    roles: {
      body: 'dominant',
      'sleeve-left': 'secondary',
      'sleeve-right': 'secondary',
      collar: 'accent',
      lining: 'accent',
      cuffs: 'accent',
      trim: 'dominant',
      buttons: 'dominant',
      'panel-a': 'dominant',
      'panel-b': 'dominant',
    },
    target: { dominant: 0.6, secondary: 0.3, accent: 0.1 },
  },
  {
    id: 'preset-3-panels',
    label: 'Chest and band panels carry the accent',
    roles: {
      body: 'dominant',
      'sleeve-left': 'secondary',
      'sleeve-right': 'secondary',
      collar: 'dominant',
      lining: 'secondary',
      cuffs: 'secondary',
      trim: 'dominant',
      buttons: 'dominant',
      'panel-a': 'accent',
      'panel-b': 'accent',
    },
    target: { dominant: 0.55, secondary: 0.3, accent: 0.15 },
  },
  {
    id: 'preset-4-stripe-band',
    label: 'Striped band panel, secondary collar',
    roles: {
      body: 'dominant',
      'sleeve-left': 'dominant',
      'sleeve-right': 'dominant',
      collar: 'secondary',
      lining: 'secondary',
      cuffs: 'secondary',
      trim: 'secondary',
      buttons: 'accent',
      'panel-a': 'dominant',
      'panel-b': { pattern: 'stripes', roles: ['dominant', 'accent'], scale: 16, orientation: 0 },
    },
    target: { dominant: 0.75, secondary: 0.17, accent: 0.08 },
  },
];

export function preset(id: string): Preset {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown preset ${id}`);
  return p;
}
