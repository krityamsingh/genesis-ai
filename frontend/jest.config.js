module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['./setupTests.js'],
  moduleNameMapper: { '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js' },
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' }
}
