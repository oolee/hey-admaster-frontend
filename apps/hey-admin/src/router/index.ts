import { createRouter, createWebHistory } from 'vue-router';

import { useAdminStore } from '#/stores/admin';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('#/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('#/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('#/views/DashboardView.vue'),
        meta: { title: '数据看板', group: '总览' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('#/views/UsersView.vue'),
        meta: { title: '用户管理', group: '经营' },
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('#/views/OrdersView.vue'),
        meta: { title: '订单管理', group: '经营' },
      },
      {
        path: 'credits',
        name: 'credits',
        component: () => import('#/views/CreditsView.vue'),
        meta: { title: '积分与计费', group: '经营' },
      },
      {
        path: 'models',
        name: 'models',
        component: () => import('#/views/ModelsView.vue'),
        meta: { title: '模型管理', group: '模型' },
      },
      {
        path: 'skills',
        name: 'skills',
        component: () => import('#/views/SkillsView.vue'),
        meta: { title: '技能管理', group: '模型' },
      },
      {
        path: 'usage',
        name: 'usage',
        component: () => import('#/views/UsageView.vue'),
        meta: { title: '用量与利润', group: '模型' },
      },
      {
        path: 'records',
        name: 'records',
        component: () => import('#/views/RecordsView.vue'),
        meta: { title: '调用记录', group: '模型' },
      },
      {
        path: 'cases',
        name: 'cases',
        component: () => import('#/views/CasesView.vue'),
        meta: { title: '案例管理', group: '内容' },
      },
      {
        path: 'templates',
        name: 'templates',
        component: () => import('#/views/TemplatesView.vue'),
        meta: { title: '模板管理', group: '内容' },
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('#/views/AuditView.vue'),
        meta: { title: '内容审核', group: '审核' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('#/views/SettingsView.vue'),
        meta: { title: '系统设置', group: '系统' },
      },
      /* ── 演示备份：改动出问题时的对照快照，请勿在此改动业务 ── */
      {
        path: 'demo/dashboard',
        name: 'demo-dashboard',
        component: () => import('#/views/demo/DashboardView.vue'),
        meta: { title: '数据看板(演示)', group: '演示' },
      },
      {
        path: 'demo/users',
        name: 'demo-users',
        component: () => import('#/views/demo/UsersView.vue'),
        meta: { title: '用户管理(演示)', group: '演示' },
      },
      {
        path: 'demo/orders',
        name: 'demo-orders',
        component: () => import('#/views/demo/OrdersView.vue'),
        meta: { title: '订单管理(演示)', group: '演示' },
      },
      {
        path: 'demo/credits',
        name: 'demo-credits',
        component: () => import('#/views/demo/CreditsView.vue'),
        meta: { title: '积分与计费(演示)', group: '演示' },
      },
      {
        path: 'demo/models',
        name: 'demo-models',
        component: () => import('#/views/demo/ModelsView.vue'),
        meta: { title: '模型管理(演示)', group: '演示' },
      },
      {
        path: 'demo/skills',
        name: 'demo-skills',
        component: () => import('#/views/demo/SkillsView.vue'),
        meta: { title: '技能管理(演示)', group: '演示' },
      },
      {
        path: 'demo/usage',
        name: 'demo-usage',
        component: () => import('#/views/demo/UsageView.vue'),
        meta: { title: '用量与利润(演示)', group: '演示' },
      },
      {
        path: 'demo/records',
        name: 'demo-records',
        component: () => import('#/views/demo/RecordsView.vue'),
        meta: { title: '调用记录(演示)', group: '演示' },
      },
      {
        path: 'demo/cases',
        name: 'demo-cases',
        component: () => import('#/views/demo/CasesView.vue'),
        meta: { title: '案例管理(演示)', group: '演示' },
      },
      {
        path: 'demo/templates',
        name: 'demo-templates',
        component: () => import('#/views/demo/TemplatesView.vue'),
        meta: { title: '模板管理(演示)', group: '演示' },
      },
      {
        path: 'demo/audit',
        name: 'demo-audit',
        component: () => import('#/views/demo/AuditView.vue'),
        meta: { title: '内容审核(演示)', group: '演示' },
      },
      {
        path: 'demo/settings',
        name: 'demo-settings',
        component: () => import('#/views/demo/SettingsView.vue'),
        meta: { title: '系统设置(演示)', group: '演示' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

/* 路由守卫:所有页面需登录。
   token 有效性校验:本地存在 token 即放行(刷新不丢登录态);
   真实 token 时效校验(调 /api/account/my-profile)在请求层统一处理,401 时前端清 token 回登录页。 */
router.beforeEach((to) => {
  const admin = useAdminStore();

  // 公开页(登录页)直接放行
  if (to.meta.public) {
    return true;
  }

  // 未登录 → 跳登录页(带 redirect)
  if (!admin.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  return true;
});

export default router;
