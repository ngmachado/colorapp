import type { NextConfig } from 'next';
import { join } from 'node:path';

const config: NextConfig = {
  // Standalone output is for the Docker image; Vercel builds its own functions.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  outputFileTracingRoot: join(import.meta.dirname, '..', '..'),
  // Files read at runtime that no import points at: the knowledge release, the migrations, the
  // workspace marker the knowledge loader walks up to.
  outputFileTracingIncludes: {
    '/**': [
      '../../data/knowledge-current.sqlite',
      '../../packages/db/drizzle/**',
      '../../pnpm-workspace.yaml',
      '../../content/**',
    ],
  },
  transpilePackages: [
    '@sca/colour-engine',
    '@sca/generator',
    '@sca/garment',
    '@sca/knowledge',
    '@sca/db',
  ],
  serverExternalPackages: ['better-sqlite3', '@electric-sql/pglite', 'pg'],
};

export default config;
