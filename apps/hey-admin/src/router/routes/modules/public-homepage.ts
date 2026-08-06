import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:home-outlined',
      keepAlive: true,
      order: 500,
      title: '前台首页管理',
    },
    name: 'PublicHomepage',
    path: '/public-homepage',
    children: [
      {
        meta: { title: '轮播图管理' },
        name: 'PublicHomepageCarousel',
        path: '/public-homepage/carousel',
        component: () => import('#/views/public-homepage/carousel/index.vue'),
      },
      {
        meta: { title: '服务项目管理' },
        name: 'PublicHomepageServices',
        path: '/public-homepage/services',
        component: () => import('#/views/public-homepage/services/index.vue'),
      },
      {
        meta: { title: '每日灵感管理' },
        name: 'PublicHomepageDailyPrompts',
        path: '/public-homepage/daily-prompts',
        component: () =>
          import('#/views/public-homepage/daily-prompts/index.vue'),
      },
      {
        meta: { title: '统计数据管理' },
        name: 'PublicHomepageStats',
        path: '/public-homepage/stats',
        component: () => import('#/views/public-homepage/stats/index.vue'),
      },
    ],
  },
  {
    meta: {
      icon: 'ant-design:folder-open-outlined',
      keepAlive: true,
      order: 510,
      title: '案例管理',
    },
    name: 'PortfolioManagement',
    path: '/portfolio',
    children: [
      {
        meta: { title: '案例列表' },
        name: 'PortfolioList',
        path: '/portfolio/list',
        component: () => import('#/views/portfolio/index.vue'),
      },
    ],
  },
];

export default routes;
