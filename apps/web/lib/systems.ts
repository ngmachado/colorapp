/**
 * A documented set the Laboratory can load whole: concept records in source order. The lab shows
 * whichever members have a displayable value. Built from the records by `documentedSets()`.
 */
export interface ColourSet {
  id: string;
  label: string;
  conceptIds: string[];
}

/** Goethe's circle clockwise from the top, as he drew it: purpur at the summit. */
export const GOETHE_ORDER = [
  'goethe-red',
  'goethe-red-yellow',
  'goethe-yellow',
  'goethe-green',
  'goethe-blue',
  'goethe-blue-red',
];

export const WUXING_ORDER = [
  'zh-wuxing-wood',
  'zh-wuxing-fire',
  'zh-wuxing-earth',
  'zh-wuxing-metal',
  'zh-wuxing-water',
];
