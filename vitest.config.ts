import { defineConfig } from 'vitest/config';

// The tests drive the contract through the compact runtime's circuit simulator:
// no node, no proof server, no docker. `npm run compile` first.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
