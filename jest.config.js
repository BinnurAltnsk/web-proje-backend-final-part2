module.exports = {
  testEnvironment: 'node',
  verbose: true,
  // Test dosyaları nerede?
  testMatch: ['**/tests/**/*.test.js'],
  // Kapsama raporu (Coverage) ayarları
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/scripts/**',
    '!src/config/**',
    '!src/models/index.js' 
  ]
};