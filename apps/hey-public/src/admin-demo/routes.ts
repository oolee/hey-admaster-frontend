import type { RouteRecordRaw } from 'vue-router'

/* AdminDemo 子路由：复用 admin 子app 的全部功能页面（数据均为本地模拟） */
export const adminDemoRoutes: RouteRecordRaw[] = [
  { path: 'dashboard', name: 'ad-dashboard', component: () => import('@admin-demo/views/DashboardView.vue'), meta: { title: '数据看板', group: '总览' } },
  { path: 'users', name: 'ad-users', component: () => import('@admin-demo/views/UsersView.vue'), meta: { title: '用户管理', group: '经营' } },
  { path: 'orders', name: 'ad-orders', component: () => import('@admin-demo/views/OrdersView.vue'), meta: { title: '订单管理', group: '经营' } },
  { path: 'credits', name: 'ad-credits', component: () => import('@admin-demo/views/CreditsView.vue'), meta: { title: '积分与计费', group: '经营' } },
  { path: 'models', name: 'ad-models', component: () => import('@admin-demo/views/ModelsView.vue'), meta: { title: '模型管理', group: '模型' } },
  { path: 'skills', name: 'ad-skills', component: () => import('@admin-demo/views/SkillsView.vue'), meta: { title: '技能管理', group: '模型' } },
  { path: 'usage', name: 'ad-usage', component: () => import('@admin-demo/views/UsageView.vue'), meta: { title: '用量与利润', group: '模型' } },
  { path: 'records', name: 'ad-records', component: () => import('@admin-demo/views/RecordsView.vue'), meta: { title: '调用记录', group: '模型' } },
  { path: 'cases', name: 'ad-cases', component: () => import('@admin-demo/views/CasesView.vue'), meta: { title: '案例管理', group: '内容' } },
  { path: 'templates', name: 'ad-templates', component: () => import('@admin-demo/views/TemplatesView.vue'), meta: { title: '模板管理', group: '内容' } },
  { path: 'audit', name: 'ad-audit', component: () => import('@admin-demo/views/AuditView.vue'), meta: { title: '内容审核', group: '审核' } },
  { path: 'settings', name: 'ad-settings', component: () => import('@admin-demo/views/SettingsView.vue'), meta: { title: '系统设置', group: '系统' } },
]
