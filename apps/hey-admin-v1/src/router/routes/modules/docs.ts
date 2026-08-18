import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:file-text-outlined',
      keepAlive: false,
      order: 530,
      title: '文档管理',
    },
    name: 'DocsManagement',
    path: '/docs-management',
    children: [
      {
        meta: { title: '文档管理' },
        name: 'DocsManagementIndex',
        path: '/docs-management/index',
        component: () => import('#/views/docs/index.vue'),
      },
    ],
  },
];

export default routes;
