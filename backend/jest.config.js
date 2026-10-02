/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  // Real timers in most suites; individual tests opt into fake ones.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/types/**',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      // A floor rather than a target: these numbers must not silently rot.
      statements: 40,
      branches: 30,
      functions: 40,
      lines: 40,
    },
  },
  testTimeout: 60000,
  // Neon is a remote database reached over the network, so parallel workers
  // only add connection pressure and latency rather than finishing sooner.
  maxWorkers: 1,
  // The pg pool holds a socket open after the last test. Suites close it via
  // closePool(); this is only a backstop against a hung handle.
  forceExit: true,
};