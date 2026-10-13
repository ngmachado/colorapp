import type { NextConfig } from 'next';
import { join } from 'node:path';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: join(import.meta.dirname, '..', '..'),
  transpilePackages: [
    '@sca/colour-engine',
    '@sca/generator',
    '@sca/garment',
    '@sca/knowledge',
    '@sca/db',
  ],
  serverExternalPackages: ['better-sqlite3'],
};

export default config;
