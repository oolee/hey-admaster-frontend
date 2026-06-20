import type { RouteRecordRaw } from 'vue-router';

const fallbackNotFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  redirect: '/',
};

export { fallbackNotFoundRoute };
