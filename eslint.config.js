import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', '.netlify', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // react-hooks/react-refresh only make sense for React component code —
    // scoped to src/ so they never misfire on Playwright fixtures elsewhere
    // (which use a `use` callback param that isn't a React hook at all,
    // regardless of which directory they happen to live in).
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Playwright fixtures use `async ({}, use) => ...` — the empty
    // destructuring pattern is idiomatic here, not a mistake.
    files: ['fixtures/**/*.ts', 'specs/**/*.ts', 'playwright.config.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
)
