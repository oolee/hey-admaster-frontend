import type { Router } from 'vue-router';

function createRouterGuard(router: Router) {
  router.beforeEach((to) => {
    if (typeof document !== 'undefined' && to.meta?.title) {
      document.title = String(to.meta.title);
    }
    return true;
  });
}

export { createRouterGuard };
