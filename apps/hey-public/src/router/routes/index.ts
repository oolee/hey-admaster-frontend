import type { RouteRecordRaw } from 'vue-router';

import { fallbackNotFoundRoute } from './core';
import publicRoutes from './modules/public';

const routes: RouteRecordRaw[] = [...publicRoutes, fallbackNotFoundRoute];

export { routes };
