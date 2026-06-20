import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          // '/.well-known': {
          //   changeOrigin: true,
          //   target: 'https://localhost:7188',
          // },

          // 👇 一次性匹配所有 ABP 接口，转发到真实后端
          // '^/api/abp/*': {
          //   target: 'https://localhost:7188', // ✅ 这里必须是 https
          //   changeOrigin: true,
          //   secure: false, // ✅ 关闭 SSL 验证（本地开发必备）
          //   rewrite: (path) => {
          //     // console.log('Proxying ABP request:', path);
          //     return path;
          //   },
          //   configure: (proxy) => {
          //     proxy.on('proxyReq', (proxyReq, req) => {
          //       if (req.headers.authorization) {
          //         proxyReq.setHeader(
          //           'Authorization',
          //           req.headers.authorization,
          //         );
          //       }
          //     });
          //   },
          // },

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

          '^/api': {
            target: 'https://localhost:7188', // ✅ 这里必须是 https
            changeOrigin: true,
            secure: false, // ✅ 关闭 SSL 验证（本地开发必备）
            rewrite: (path) => {
              // console.log('Proxying ABP request:', path);
              return path.replace(/^\/api/, '');
            },
          },
        },
      },
    },
  };
});
