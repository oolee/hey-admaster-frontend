import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';

import { createRouterGuard } from './guard';
import { routes } from './routes';

const router = createRouter({
  history:
    import.meta.env.VITE_ROUTER_HISTORY === 'hash'
      ? createWebHashHistory(import.meta.env.VITE_BASE)
      : createWebHistory(import.meta.env.VITE_BASE),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

createRouterGuard(router);

export { router };
export default router;
