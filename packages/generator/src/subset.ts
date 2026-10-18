import { oklabDistance } from './features';
import type { Candidate } from './types';

/**
 * Farthest-point sampling over the candidates' mapped OKLab coordinates (all roles concatenated).
 * "Diverse" means diverse under this declared method, nothing more. Deterministic: starts from the first candidate.
 */
export function diverseSubset(candidates: Candidate[], k: number): Candidate[] {
  if (k <= 0 || candidates.length === 0) return [];
  if (k >= candidates.length) return [...candidates];
  const dist = (a: Candidate, b: Candidate) => {
    let m = 0;
    for (let i = 0; i < a.colours.length; i++)
      m = Math.max(m, oklabDistance(a.colours[i]!.mapped.oklab, b.colours[i]!.mapped.oklab));
    return m;
  };
  const chosen = [candidates[0]!];
  const best = candidates.map((c) => dist(c, candidates[0]!));
  while (chosen.length < k) {
    let idx = 0;
    for (let i = 1; i < candidates.length; i++) if (best[i]! > best[idx]!) idx = i;
    const next = candidates[idx]!;
    chosen.push(next);
    for (let i = 0; i < candidates.length; i++)
      best[i] = Math.min(best[i]!, dist(candidates[i]!, next));
  }
  return chosen;
}
