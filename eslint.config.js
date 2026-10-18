import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Shared packages must run unchanged in the browser, a Web Worker, Node and React Native.
// Only src/ is pure; a package's scripts/ may use Node to generate files into src/.
const purePackages = [
  'packages/colour-engine/src/**',
  'packages/generator/src/**',
  'packages/garment/src/**',
  'packages/knowledge/src/**',
];
const nodeBuiltins = [
  'fs',
  'path',
  'os',
  'child_process',
  'crypto',
  'http',
  'https',
  'net',
  'stream',
  'worker_threads',
  'url',
  'util',
  'zlib',
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/next-env.d.ts',
      'docs/**',
      'data/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    files: purePackages,
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'localStorage',
        'process',
        'require',
        '__dirname',
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: nodeBuiltins
            .flatMap((m) => [m, `node:${m}`])
            .map((name) => ({ name, message: 'Shared packages must stay free of Node APIs.' })),
        },
      ],
    },
  },
);
