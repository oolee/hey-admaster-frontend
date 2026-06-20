import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          // 官网原型接口（AI 生图 / 作品集 / 定价 / 订单）走 Nitro Mock 服务
          // 由 viteNitroMockPlugin 在 5320 端口启动 backend-mock
          '^/api/(ai|portfolio|pricing|orders)': {
            target: 'http://localhost:5320',
            changeOrigin: true,
            ws: false,
          },

          // 其余 /api/** 转发到真实 ABP 后端
          '^/api': {
            target: 'https://localhost:7188', // ✅ 这里必须是 https
            changeOrigin: true,
            secure: false, // ✅ 关闭 SSL 验证（本地开发必备）
            rewrite: (path) => {
              return path.replace(/^\/api/, '');
            },
          },
        },
      },
    },
  };
});
