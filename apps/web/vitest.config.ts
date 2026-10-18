import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The standalone build copies source files, tests included; they must not run twice.
    exclude: [...configDefaults.exclude, '**/.next/**'],
  },
});
