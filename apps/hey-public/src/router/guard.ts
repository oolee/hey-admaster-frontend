import type { Router } from 'vue-router';

function createRouterGuard(router: Router) {
  router.beforeEach(() => true);
}

export { createRouterGuard };
