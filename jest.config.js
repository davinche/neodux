module.exports = {
  moduleFileExtensions: [
    'js',
    'ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testMatch: [
    '**/__tests__/*.(js|ts)'
  ],
  globals: {
    'ts-jest': {
      diagnostics: true
    }
  }
}
