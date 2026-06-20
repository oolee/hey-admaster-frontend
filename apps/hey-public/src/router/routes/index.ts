import type { RouteRecordRaw } from 'vue-router';

import publicRoutes from './modules/public';
import { fallbackNotFoundRoute } from './core';

const routes: RouteRecordRaw[] = [...publicRoutes, fallbackNotFoundRoute];

export { routes };
