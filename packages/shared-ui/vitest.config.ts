import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Only run service/model specs — component specs require Angular TestBed
    // and run in the consuming app's test suite instead
    include: [
      'tree-viewer/services/tree-layout.service.spec.ts',
      'tree-viewer/services/tree-zoom.service.spec.ts',
      'services/**/*.spec.ts',
      'wizard/services/**/*.spec.ts',
      'detail-panel/services/**/*.spec.ts',
    ],
  },
  resolve: {
    // Prevent Vite from trying to bundle d3 during vitest runs
    conditions: ['default'],
  },
  optimizeDeps: {
    exclude: ['d3-zoom', 'd3-selection'],
  },
});
