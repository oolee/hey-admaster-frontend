import type { RouteRecordRaw } from 'vue-router';

const invitationRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'InvitationEditor',
    component: () => import('#/views/editor/index.vue'),
    meta: {
      title: '邀请函编辑器',
    },
  },
  {
    path: '/preview',
    name: 'InvitationPreview',
    component: () => import('#/views/preview/index.vue'),
    meta: {
      title: '邀请函预览',
    },
  },
];

export default invitationRoutes;
