import { xoroshiro128plus } from 'pure-rand/generator/xoroshiro128plus';

/** splitmix32 step, used to derive one independent 32-bit seed per candidate from (seed, index). */
export function deriveSeed(seed: number, index: number): number {
  let z = (seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
}

/** Deterministic uniform generator on [0, 1). Same seed, same sequence, in any JavaScript runtime. */
export class Rng {
  private g;
  constructor(seed: number) {
    this.g = xoroshiro128plus(seed);
  }
  next(): number {
    return (this.g.next() >>> 0) / 4294967296;
  }
  between(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  /** Symmetric triangular noise in [-size, size], for nearby mutation. */
  jitter(size: number): number {
    return (this.next() - this.next()) * size;
  }
}
