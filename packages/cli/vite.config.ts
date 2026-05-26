import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/cli',

  plugins: [nxViteTsPaths()],

  test: {
    watch: false,
    globals: true,
    cache: { dir: '../../node_modules/.vitest/packages/cli' },
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'bin/**/*.{test,spec}.ts',
      'scripts/**/*.{test,spec}.ts',
    ],
    testTimeout: 15000,
    hookTimeout: 15000,
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/cli',
      provider: 'v8',
    },
  },
});
