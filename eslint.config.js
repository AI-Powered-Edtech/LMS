import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist/', 'node_modules/', '_archive/', '*.config.*', 'coverage/', 'e2e/'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'simple-import-sort': simpleImportSort,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Base rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/no-floating-promises': 'warn',

      '@typescript-eslint/explicit-function-return-type': 'off',

      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],

      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import sorting
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',

      // Accessibility (WCAG 2.1 AA)
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/tabindex-no-positive': 'warn',

      // File size guard — flag files over 400 lines
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],

      // Prevent deep relative imports — use @/ alias instead
      // Also enforce service layer: supabase client must only be used inside features/*/api/
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: '@/src/services/supabase/client',
              message:
                'Import supabase hanya dari service layer (src/features/*/api/). Lihat AGENTS.md.',
            },
          ],
          patterns: [
            {
              group: ['../../../*'],
              message: 'Max 2 levels of relative imports. Use @/ alias instead.',
            },
          ],
        },
      ],
    },
  },
  // Allow supabase client import inside service files, infrastructure, and AuthContext
  {
    files: [
      'src/features/*/api/**',
      'src/features/*/builder/**',
      'src/features/*/queries/**',
      'src/contexts/AuthContext.tsx',
      'src/services/**',
      'src/utils/**',
    ],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['../../../*'],
              message: 'Max 2 levels of relative imports. Use @/ alias instead.',
            },
          ],
        },
      ],
    },
  },
  // Vitest globals for test files
  {
    files: ['src/**/__tests__/**', 'src/**/*.test.*'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
      },
    },
  },
  // Disable formatting rules that conflict with Prettier
  eslintConfigPrettier,
]
