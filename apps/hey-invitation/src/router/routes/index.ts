import type { RouteRecordRaw } from 'vue-router';

import { fallbackNotFoundRoute } from './core';
import invitationRoutes from './modules/invitation';

const routes: RouteRecordRaw[] = [...invitationRoutes, fallbackNotFoundRoute];

export { routes };
