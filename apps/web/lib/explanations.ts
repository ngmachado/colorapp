/**
 * Every explanation the app shows is one of these labelled kinds. The label says what the sentence is:
 * a rule the generator applied, a variable the user changed, a response the user recorded, a documented
 * fact with a source, a measurement, or a prediction. Nothing here asserts that a palette is beautiful.
 */
export type ExplanationKind =
  'rule' | 'variable' | 'response' | 'documented' | 'measured' | 'predicted';

export const LABEL: Record<ExplanationKind, string> = {
  rule: 'Rule used',
  variable: 'Variable changed',
  response: 'Recorded response',
  documented: 'Documented',
  measured: 'Measured',
  predicted: 'Predicted',
};

export interface Explanation {
  kind: ExplanationKind;
  text: string;
}

export const NO_MODEL: Explanation = {
  kind: 'predicted',
  text: 'No preference model in this release; nothing is predicted.',
};

export function rule(text: string): Explanation {
  return { kind: 'rule', text };
}
export function variable(text: string): Explanation {
  return { kind: 'variable', text };
}
export function measured(text: string): Explanation {
  return { kind: 'measured', text };
}
export function documented(text: string): Explanation {
  return { kind: 'documented', text };
}

/** Words an explanation must never use as a claim about a palette. Checked by a unit test over the content and components. */
export const FORBIDDEN_CLAIMS = [
  /\bis harmonious\b/i,
  /(?<!not )\bguarantees? (?:a |of |the )?(?:beauty|attractive)/i,
  /\buniversally (flattering|preferred|beautiful)\b/i,
  /\bobjectively (better|beautiful|correct)\b/i,
];
