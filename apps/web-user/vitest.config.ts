import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
  resolve: {
    alias: {
      'd3-zoom': path.resolve(
        root,
        'node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/index.js',
      ),
      'd3-selection': path.resolve(
        root,
        'node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/index.js',
      ),
    },
  },
});
