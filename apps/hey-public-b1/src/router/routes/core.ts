import type { RouteRecordRaw } from 'vue-router';

export const fallbackNotFoundRoute: RouteRecordRaw = {
  path: '/:path(.*)*',
  name: 'PublicNotFound',
  component: () => import('#/views/fallback/not-found.vue'),
};
