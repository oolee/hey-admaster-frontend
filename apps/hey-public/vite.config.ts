import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('src', import.meta.url)),
        },
      },
      server: {
        proxy: {
          // Public API（首页 / 案例等公开接口）转发到 Admin Host（7188，已承载 api/app/public/*）
          // 注意：不 rewrite，保留 /api 前缀以匹配后端控制器路由
          '^/api/app/public': {
            target: 'https://localhost:7188',
            changeOrigin: true,
            secure: false,
          },

          // 认证接口（登录、Token、用户信息）转发到 Admin Host
          // OpenIddict 端点是 /connect/token 不带 /api 前缀，需要 rewrite
          '^/api/connect': {
            target: 'https://localhost:7188',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
          // Account 端点保持 /api/account/... 路径不变
          '^/api/account': {
            target: 'https://localhost:7188',
            changeOrigin: true,
            secure: false,
          },

          // 官网原型接口（AI 生图 / 作品集 / 定价 / 订单）走 Nitro Mock 服务
          // 由 viteNitroMockPlugin 在 5320 端口启动 backend-mock
          '^/api/(ai|portfolio|pricing|orders)(?:/|$)': {
            target: 'http://localhost:5320',
            changeOrigin: true,
            ws: false,
          },

          // 其余 /api/** 转发到真实 ABP 后端（保留 /api 前缀，匹配 ABP 控制器路由）
          '^/api': {
            target: 'https://localhost:7188', // ✅ 这里必须是 https
            changeOrigin: true,
            secure: false, // ✅ 关闭 SSL 验证（本地开发必备）
          },
        },
      },
    },
  };
});
