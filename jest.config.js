/**
 * Configuración de Jest para tests unitarios e integración
 * Cobertura sobre app lógica: services, repositories, utils, middleware
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    'repositories/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/stress-tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/', '/stress-tests/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};
