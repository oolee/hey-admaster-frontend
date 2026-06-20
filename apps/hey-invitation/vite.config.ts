import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '^/api/(project|template|publish)': {
            target: 'http://localhost:5320',
            changeOrigin: true,
            ws: false,
          },
          '^/h5': {
            target: 'http://localhost:5320',
            changeOrigin: true,
            ws: false,
          },
        },
      },
    },
  };
});
