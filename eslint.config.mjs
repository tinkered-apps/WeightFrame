// ESLint's recommended rules, run by `npm test`. The app has no build step, so
// this is the only thing that reads every file before it ships.

import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', '.wrangler/', '.marketing/'] },

  js.configs.recommended,
  {
    rules: {
      // An unused name in `catch (e)` and an empty `catch` block are how the app ignores a blocked localStorage.
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // A regular expression may spell out the narrow no-break space that number formatting produces.
      'no-irregular-whitespace': ['error', { skipRegExps: true }],
    },
  },

  // Classic scripts sharing one namespace, window.FH. The engine and the data file are also
  // loaded by Node in the unit tests, so they end with a CommonJS export.
  { files: ['public/**/*.js'], languageOptions: { sourceType: 'script', globals: { ...globals.browser, FH: 'writable' } } },
  { files: ['public/js/core/**', 'public/js/data/**', 'public/js/ui/i18n.js'], languageOptions: { globals: globals.commonjs } },
  // The translation shield marks protected blocks with NUL characters and matches them back.
  { files: ['public/js/ui/i18n.js', 'public/js/ui/methods.js'], rules: { 'no-control-regex': 'off' } },
  { files: ['public/sw.js'], languageOptions: { globals: globals.serviceworker } },

  { files: ['tests/**', 'scripts/**', '*.js'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },
  // Playwright specs run in Node and hand callbacks to the page.
  { files: ['e2e/**'], languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } } },
];
