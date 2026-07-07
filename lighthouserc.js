module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000/login',
        'http://localhost:3000/map',
        'http://localhost:3000/tag',
      ],
      startServerReadyPattern: 'Ready',
      numberOfRuns: 1,
    },
    assert: {
      // Report-only mode — no score thresholds, never fails the build
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
