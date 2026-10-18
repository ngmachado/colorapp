import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { GENERATOR_VERSION, type GeneratorParams } from './types';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return (
      '{' +
      Object.keys(o)
        .sort()
        .filter((k) => o[k] !== undefined)
        .map((k) => JSON.stringify(k) + ':' + canonical(o[k]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

/** Normalised parameters as a string: the same settings always hash the same way. */
export function paramsKey(params: GeneratorParams): string {
  return canonical({ ...params, batchSize: undefined });
}

/** Deterministic candidate id from generator version, content version, seed, parameters and index. */
export function candidateId(
  params: GeneratorParams,
  contentVersion: string | null,
  index: number,
): string {
  const text = [
    GENERATOR_VERSION,
    contentVersion ?? '',
    params.seed,
    paramsKey(params),
    index,
  ].join('|');
  return bytesToHex(sha256(new TextEncoder().encode(text))).slice(0, 16);
}
