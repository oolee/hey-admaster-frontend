import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('#/layouts/public.vue'),
    children: [
      {
        path: '',
        name: 'PublicHome',
        component: () => import('#/views/home/index.vue'),
      },
      {
        path: 'portfolio',
        name: 'PublicPortfolio',
        component: () => import('#/views/portfolio/index.vue'),
      },
      {
        path: 'services',
        name: 'PublicServices',
        component: () => import('#/views/services/index.vue'),
      },
      {
        path: 'studio',
        name: 'PublicAiStudio',
        component: () => import('#/views/ai-studio/index.vue'),
      },
      {
        path: 'order',
        name: 'PublicOrder',
        component: () => import('#/views/order/index.vue'),
      },
      {
        path: 'about',
        name: 'PublicAbout',
        component: () => import('#/views/about/index.vue'),
      },
      // 工具箱页面
      {
        path: 'tools',
        name: 'PublicTools',
        component: () => import('#/views/tools/index.vue'),
      },
      {
        path: 'tools/remove-bg',
        name: 'PublicToolRemoveBg',
        component: () => import('#/views/tools/RemoveBg.vue'),
      },
      {
        path: 'tools/id-photo',
        name: 'PublicToolIdPhoto',
        component: () => import('#/views/tools/IdPhoto.vue'),
      },
      {
        path: 'tools/compress',
        name: 'PublicToolCompress',
        component: () => import('#/views/tools/Compress.vue'),
      },
    ],
  },
  // 实验页面（独立布局，无菜单）
  {
    path: '/experiments',
    component: () => import('#/layouts/empty.vue'),
    children: [
      {
        path: '',
        name: 'PublicExperiments',
        component: () => import('#/views/_experiments/index.vue'),
      },
      {
        path: 'sn',
        name: 'PublicExperimentsSN',
        component: () => import('#/views/_experiments/SimplexNoise.vue'),
      },
    ],
  },
];

export default routes;
