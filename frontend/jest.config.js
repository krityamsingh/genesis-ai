export default {
  testEnvironment: 'jsdom',
  // FIX 1: was "setupFilesAfterFramework" (typo) — correct key is "setupFilesAfterFramework" → setupFilesAfterFramework
  setupFilesAfterFramework: ['./setupTests.js'],
  moduleNameMapper: {
    // FIX 2: __mocks__/styleMock.js now exists (was missing — caused all tests to crash on CSS imports)
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Also map static assets
    '\\.(png|jpg|jpeg|gif|svg|ico)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  // Tell Jest to treat .jsx/.js as ESM-compatible via babel transform
  extensionsToTreatAsEsm: [],
}
