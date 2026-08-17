import next from 'eslint-config-next';

/**
 * Lint is part of the build gate, so it is configured to be worth running:
 * the rules that catch the mistakes this codebase can actually make stay on,
 * and nothing is switched off to keep the output quiet.
 */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'scripts/.content.json',
    ],
  },
  ...next,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

export default config;
