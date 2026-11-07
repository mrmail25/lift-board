/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: false,
      tsconfig: {
        esModuleInterop: true,
        strict: true,
        module: 'commonjs',
        target: 'ES2022',
        types: ['jest', 'node'],
        resolveJsonModule: true,
      },
    }],
  },
};
