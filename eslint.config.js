import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * One flat config for the three workspaces. Prettier owns formatting; ESLint
 * owns correctness. `eslint-config-prettier` goes last so no stylistic rule
 * fights the formatter.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'data/**',
      'mockups/**',
      '**/*.d.ts',
      'web/public/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    files: ['server/src/**/*.ts', 'shared/src/**/*.ts', 'scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
    rules: {
      // Tests cast JSON bodies and mock shapes; that is deliberate.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
      'no-console': 'off',
    },
  },

  prettier,
);
