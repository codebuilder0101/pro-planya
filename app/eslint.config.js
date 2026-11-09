// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const prettierConfig = require('eslint-config-prettier')

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'src/types/database.ts'],
  },
  {
    rules: {
      // `any` only with a comment explaining why (eslint-disable-next-line + reason).
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // Design tokens only: no hardcoded hex/rgb colors in components.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9A-Fa-f]{3,8}$/]',
          message: 'Use a semantic color from src/theme/tokens.ts instead of a hex literal.',
        },
        {
          selector: 'Literal[value=/^rgba?\\(/]',
          message: 'Use a semantic color from src/theme/tokens.ts instead of an rgb() literal.',
        },
      ],
    },
  },
  {
    // The token and config files are where raw values are allowed to live.
    files: ['src/theme/tokens.ts', 'app.config.ts', '**/*.test.ts', '**/*.test.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Jest module factories must use require().
    files: ['src/test/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
])
