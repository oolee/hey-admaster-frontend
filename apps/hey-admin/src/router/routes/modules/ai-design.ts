import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:robot-outlined',
      keepAlive: true,
      order: 520,
      title: 'AI 设计管理',
    },
    name: 'AiDesignManagement',
    path: '/ai-management',
    children: [
      {
        meta: { title: '模型渠道与计费' },
        name: 'AiDesignChannels',
        path: '/ai-management/channels',
        component: () => import('#/views/ai-management/channels/index.vue'),
      },
      {
        meta: { title: '冲量价档位' },
        name: 'AiDesignBillingTiers',
        path: '/ai-management/billing-tiers',
        component: () => import('#/views/ai-management/billing-tier/index.vue'),
      },
      {
        meta: { title: '对话历史' },
        name: 'AiDesignSessions',
        path: '/ai-management/sessions',
        component: () => import('#/views/ai-management/session/index.vue'),
      },
      {
        meta: { title: '模板管理' },
        name: 'AiDesignTemplates',
        path: '/ai-management/templates',
        component: () => import('#/views/ai-management/templates/index.vue'),
      },
      {
        meta: { title: '钱包管理' },
        name: 'AiDesignWallets',
        path: '/ai-management/wallets',
        component: () => import('#/views/ai-management/wallet/index.vue'),
      },
      {
        meta: { title: '消费记录' },
        name: 'AiDesignUsageRecords',
        path: '/ai-management/usage-records',
        component: () => import('#/views/ai-management/usage-record/index.vue'),
      },
      {
        meta: { title: '充值码管理' },
        name: 'AiDesignRedeemCodes',
        path: '/ai-management/redeem-codes',
        component: () =>
          import('#/views/ai-management/redeem-code/index.vue'),
      },
      {
        meta: { title: '模块设置' },
        name: 'AiDesignSettings',
        path: '/ai-management/settings',
        component: () => import('#/views/ai-management/settings/index.vue'),
      },
      {
        meta: { title: '容器策略' },
        name: 'AiDesignBlobPolicies',
        path: '/ai-management/blob-policy',
        component: () => import('#/views/ai-management/blob-policy/index.vue'),
      },
    ],
  },
];

export default routes;
