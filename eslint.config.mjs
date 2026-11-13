import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

// Correctness checks for application, reference and tooling code. TypeScript
// type checking and Rust fmt/Clippy remain independent verification gates.
export default [
  { ignores: ['**/node_modules/**', '**/.next*/**', '**/artifacts/**', '**/target/**', '**/test-results/**', '**/playwright-report/**', 'docs/**', '.tools/**', '.superpowers/**', '.impeccable/**'] },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'constructor-super': 'error', 'for-direction': 'error',
      'no-async-promise-executor': 'error', 'no-class-assign': 'error',
      'no-compare-neg-zero': 'error', 'no-cond-assign': ['error', 'except-parens'],
      'no-constant-binary-expression': 'error', 'no-dupe-args': 'error',
      'no-dupe-else-if': 'error', 'no-dupe-keys': 'error',
      'no-duplicate-case': 'error', 'no-empty-character-class': 'error',
      'no-empty-pattern': 'error', 'no-ex-assign': 'error',
      'no-invalid-regexp': 'error', 'no-loss-of-precision': 'error',
      'no-promise-executor-return': 'error', 'no-self-assign': 'error',
      'no-setter-return': 'error', 'no-sparse-arrays': 'error',
      'no-this-before-super': 'error', 'no-unexpected-multiline': 'error',
      'no-unreachable': 'error', 'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error', 'use-isnan': 'error', 'valid-typeof': 'error',
    },
  },
  { files: ['apps/owner/src/**/*.{ts,tsx}'], rules: { 'react-hooks/rules-of-hooks': 'error' } },
  // Playwright requires destructuring its first callback parameter, including
  // the empty fixture selection for tests that launch their own browser.
  { files: ['apps/owner/tests/browser/**/*.ts'], rules: { 'no-empty-pattern': 'off' } },
];
