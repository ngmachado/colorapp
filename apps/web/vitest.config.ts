import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // The app's `@/` alias, so a module under lib can be tested with the imports it ships with.
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    // The standalone build copies source files, tests included; they must not run twice.
    exclude: [...configDefaults.exclude, '**/.next/**'],
  },
});
