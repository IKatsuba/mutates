import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/react',

  plugins: [],

  test: {
    watch: false,
    globals: true,
    cache: { dir: '../../node_modules/.vitest/packages/react' },
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: { reportsDirectory: '../../coverage/packages/react', provider: 'v8' },
  },
});
