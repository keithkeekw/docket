import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['{shared,server,web}/src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
