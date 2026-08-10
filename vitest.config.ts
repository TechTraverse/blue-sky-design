import { defineConfig } from 'vitest/config';

// Standalone test config so tests don't pull in the library build (lib entry,
// dts, css injection). Node environment is sufficient: the tests drive
// MapClassWrapper against a Proxy-recorder stub map, not a real DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
