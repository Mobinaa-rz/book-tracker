import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
      JWT_SECRET: 'test-secret',
    },
  },
});
