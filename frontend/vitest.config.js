import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    testTimeout: 30000,
    include: ['tests/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    css: true,
  },
});
