import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  format: ['esm'],
  dts: true,
  clean: true,
  // strips the in-source tests
  define: {
    'import.meta.vitest': 'undefined',
  },
})
