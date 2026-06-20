import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('#/layouts/public.vue'),
    children: [
      { path: '', name: 'PublicHome', component: () => import('#/views/home/index.vue') },
      { path: 'portfolio', name: 'PublicPortfolio', component: () => import('#/views/portfolio/index.vue') },
      { path: 'services', name: 'PublicServices', component: () => import('#/views/services/index.vue') },
      { path: 'studio', name: 'PublicAiStudio', component: () => import('#/views/ai-studio/index.vue') },
      { path: 'order', name: 'PublicOrder', component: () => import('#/views/order/index.vue') },
      { path: 'about', name: 'PublicAbout', component: () => import('#/views/about/index.vue') },
    ],
  },
];

export default routes;
