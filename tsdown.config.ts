import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  // strips the in-source tests
  define: {
    'import.meta.vitest': 'undefined',
  },
  outputOptions: {
    // JSDoc already ships in the `.d.mts` files, where editors read it
    comments: { legal: true, annotation: true, jsdoc: false },
  },
})
