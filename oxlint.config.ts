import { oxlintConfig } from '@vben/oxlint-config';

import { defineConfig } from 'oxlint';

export default defineConfig({
  ...oxlintConfig,
  rules: {
    ...oxlintConfig.rules,
    // @abp 框架代码中存在动态 delete，不修改第三方代码
    'typescript/no-dynamic-delete': 'off',
    // 项目中使用 confirm/prompt/alert 作为简单交互，不强制替换为自定义 UI
    'eslint/no-alert': 'off',
    // @abp 框架中 emit 重载签名无法合并
    'typescript/unified-signatures': 'off',
    // @abp 框架中的 console.log 调试代码，不修改第三方代码
    'eslint/no-console': 'off',
    // @abp 框架中的 void 类型用法，不修改第三方代码
    'typescript/no-invalid-void-type': 'off',
    // 项目中使用嵌套三元表达式，这是可读的风格选择
    'unicorn/no-nested-ternary': 'off',
    // 项目中使用小写十六进制数字面量，这是风格选择
    'unicorn/number-literal-case': 'off',
  },
});
