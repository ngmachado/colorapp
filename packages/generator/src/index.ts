/**
 * @sca/generator: seeded, constrained palette generation with deterministic candidate ids,
 * a rejection log, measured features and a diverse review subset. Pure; runs in a worker or Node.
 */
export * from './types';
export * from './validate';
export * from './rules';
export * from './id';
export * from './features';
export * from './subset';
export * from './pipeline';
export { Rng, deriveSeed } from './rng';
