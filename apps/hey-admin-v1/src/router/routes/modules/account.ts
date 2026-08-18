import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:user',
      title: $t('page.account.title'),
      hideInMenu: true,
      hideInBreadcrumb: true,
    },
    name: 'Account',
    path: '/account',
    children: [
      {
        meta: {
          title: $t('abp.account.settings.title'),
          icon: 'tdesign:user-setting',
          hideInMenu: true,
        },
        name: 'AccountSettings',
        path: '/account/my-settings',
        component: () => import('#/views/account/my-settings/index.vue'),
      },
    ],
  },
];

export default routes;
