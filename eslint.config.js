// ESLint flat config (ESLint 10+).
// ESM because package.json has "type": "module".

import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import prettier from 'eslint-config-prettier'

// jsx-a11y recommended rules, downgraded to 'warn' as a baseline.
// Tighten back to 'error' once the codebase is clean.
const jsxA11yWarn = Object.fromEntries(
  Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, 'warn'])
)

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'tests/**',
      'edusync-api/**',
      'scripts/**',
      'playwright-*/**',
      'playwright.config.ts',
      'vite.config.ts',
      'vitest.config.ts',
      'storybook-static/**',
      'coverage/**',
      'public/**',
      '**/*.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off',
      // TS handles undefined-identifier checks; the base rule misreads TS types.
      'no-undef': 'off',

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      ...jsxA11yWarn,
      'jsx-a11y/label-has-for': 'off',
      'jsx-a11y/control-has-associated-label': 'off',

      // Codebase uses a logger utility; console.error/warn are still permitted.
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  // Must be last: disables style rules so prettier owns formatting.
  prettier,
]
