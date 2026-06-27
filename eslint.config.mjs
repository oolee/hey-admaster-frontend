import { defineConfig } from '@vben/eslint-config';

export default defineConfig([
  {
    rules: {
      'pnpm/json-valid-catalog': 'off',
      'vue/html-closing-bracket-newline': 'off',
    },
  },
]);
