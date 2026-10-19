/**
 * A documented set the Laboratory can load whole: concept records in source order. The lab shows
 * whichever members have a displayable value. Built from the records by `documentedSets()`.
 */
export interface ColourSet {
  id: string;
  label: string;
  conceptIds: string[];
}

export const WUXING_ORDER = [
  'zh-wuxing-wood',
  'zh-wuxing-fire',
  'zh-wuxing-earth',
  'zh-wuxing-metal',
  'zh-wuxing-water',
];
