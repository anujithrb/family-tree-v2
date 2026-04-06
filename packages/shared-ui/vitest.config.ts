import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tree-viewer/**/*.spec.ts', 'services/**/*.spec.ts'],
  },
});
