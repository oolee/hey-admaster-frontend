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
        path: 'portfolio/:id',
        name: 'PublicPortfolioDetail',
        component: () => import('#/views/portfolio/detail.vue'),
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
      {
        path: 'tools/resize',
        name: 'PublicToolResize',
        component: () => import('#/views/tools/Resize.vue'),
      },
      {
        path: 'tools/color-master',
        name: 'PublicToolColorMaster',
        component: () => import('#/views/tools/ColorMaster.vue'),
      },
      {
        path: 'tools/json-format',
        name: 'PublicToolJsonFormat',
        component: () => import('#/views/tools/JsonFormat.vue'),
      },
      {
        path: 'tools/qrcode',
        name: 'PublicToolQrcode',
        component: () => import('#/views/tools/QrcodeGen.vue'),
      },
      {
        path: 'tools/watermark',
        name: 'PublicToolWatermark',
        component: () => import('#/views/tools/Watermark.vue'),
      },
      {
        path: 'tools/base64',
        name: 'PublicToolBase64',
        component: () => import('#/views/tools/Base64.vue'),
      },
    ],
  },
  // 认证页面（独立布局）
  {
    path: '/login',
    name: 'PublicLogin',
    component: () => import('#/views/auth/login.vue'),
  },
  {
    path: '/register',
    name: 'PublicRegister',
    component: () => import('#/views/auth/register.vue'),
  },
  {
    path: '/profile',
    name: 'PublicProfile',
    component: () => import('#/views/auth/profile.vue'),
  },
  // 钱包充值中心（独立布局）
  {
    path: '/recharge',
    name: 'PublicRecharge',
    component: () => import('#/views/Recharge.vue'),
  },
  // AI 设计页面（独立布局，全屏体验）
  {
    path: '/ai-design',
    component: () => import('#/layouts/empty.vue'),
    children: [
      {
        path: '',
        name: 'AiDesign',
        component: () => import('#/views/ai-design/index.vue'),
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
      // 项目展示
      {
        path: 'project-showcase',
        name: 'PublicProjectShowcase',
        component: () =>
          import('#/views/_experiments/project-showcase/index.vue'),
      },
      {
        path: 'project-showcase/list',
        name: 'PublicProjectShowcaseList',
        component: () =>
          import('#/views/_experiments/project-showcase/list.vue'),
      },
      {
        path: 'project-showcase/:slug',
        name: 'PublicProjectShowcaseDetail',
        component: () =>
          import('#/views/_experiments/project-showcase/detail.vue'),
      },
      {
        path: 'project-showcase/about',
        name: 'PublicProjectShowcaseAbout',
        component: () =>
          import('#/views/_experiments/project-showcase/about.vue'),
      },
    ],
  },
];

export default routes;
