import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      resolve: {
        alias: {},
      },
      server: {
        proxy: {
          // '/.well-known': {
          //   changeOrigin: true,
          //   target: 'https://localhost:7188',
          // },

          // mock api start
          '/api/user/info': {
            changeOrigin: true,
            rewrite: (path) => {
              // console.log('Proxying API request:', path);
              return path.replace(/^\/api/, '');
            },
            // mock代理目标地址
            target: 'http://localhost:5320/api',
            ws: true,
          },
          '/api/menu/all': {
            changeOrigin: true,
            rewrite: (path) => {
              // console.log('Proxying API request:', path);
              return path.replace(/^\/api/, '');
            },
            // mock代理目标地址
            target: 'http://localhost:5320/api',
            ws: true,
          },
          // mock api end

          '/connect/token': {
            target: 'https://localhost:7188',
            changeOrigin: true,
            secure: false,
          },

          '^/api': {
            target: 'https://localhost:7188', // ✅ 这里必须是 https
            changeOrigin: true,
            secure: false, // ✅ 关闭 SSL 验证（本地开发必备）
            // rewrite: (path) => {
            //   // console.log('Proxying ABP request:', path);
            //   return path.replace(/^\/api/, '');
            // },
          },
        },
      },
    },
  };
});
