import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:robot-outlined',
      keepAlive: true,
      order: 530,
      title: 'AI Agent 管理',
    },
    name: 'AiAgentManagement',
    path: '/ai-agent',
    children: [
      {
        meta: { title: '能力清单' },
        name: 'AiAgentCapabilities',
        path: '/ai-agent/capabilities',
        component: () => import('#/views/ai-agent/capabilities/index.vue'),
      },
      {
        meta: { title: '模型桥清单' },
        name: 'AiAgentModelBridges',
        path: '/ai-agent/model-bridges',
        component: () => import('#/views/ai-agent/model-bridges/index.vue'),
      },
      {
        meta: { title: '插件清单' },
        name: 'AiAgentPlugins',
        path: '/ai-agent/plugins',
        component: () => import('#/views/ai-agent/plugins/index.vue'),
      },
    ],
  },
];

export default routes;
