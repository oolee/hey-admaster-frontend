import { createRouter, createWebHistory } from 'vue-router'
import { useAdminStore } from '@admin-demo/stores/admin'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@admin-demo/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@admin-demo/layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@admin-demo/views/DashboardView.vue'), meta: { title: '数据看板', group: '总览' } },
      { path: 'users', name: 'users', component: () => import('@admin-demo/views/UsersView.vue'), meta: { title: '用户管理', group: '经营' } },
      { path: 'orders', name: 'orders', component: () => import('@admin-demo/views/OrdersView.vue'), meta: { title: '订单管理', group: '经营' } },
      { path: 'credits', name: 'credits', component: () => import('@admin-demo/views/CreditsView.vue'), meta: { title: '积分与计费', group: '经营' } },
      { path: 'models', name: 'models', component: () => import('@admin-demo/views/ModelsView.vue'), meta: { title: '模型管理', group: '模型' } },
      { path: 'skills', name: 'skills', component: () => import('@admin-demo/views/SkillsView.vue'), meta: { title: '技能管理', group: '模型' } },
      { path: 'usage', name: 'usage', component: () => import('@admin-demo/views/UsageView.vue'), meta: { title: '用量与利润', group: '模型' } },
      { path: 'records', name: 'records', component: () => import('@admin-demo/views/RecordsView.vue'), meta: { title: '调用记录', group: '模型' } },
      { path: 'cases', name: 'cases', component: () => import('@admin-demo/views/CasesView.vue'), meta: { title: '案例管理', group: '内容' } },
      { path: 'templates', name: 'templates', component: () => import('@admin-demo/views/TemplatesView.vue'), meta: { title: '模板管理', group: '内容' } },
      { path: 'audit', name: 'audit', component: () => import('@admin-demo/views/AuditView.vue'), meta: { title: '内容审核', group: '审核' } },
      { path: 'settings', name: 'settings', component: () => import('@admin-demo/views/SettingsView.vue'), meta: { title: '系统设置', group: '系统' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

/* 真实登录校验：向网关确认 token 是否有效（后端会查 Supabase） */
async function verifyToken() {
  const admin = useAdminStore()
  if (!admin.token) return false
  try {
    const resp = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${admin.token}` }
    })
    const json = await resp.json().catch(() => ({}))
    if (json.code === 0 && json.data) {
      // 同步最新用户信息（积分/角色），非 admin 拒绝
      if (json.data.role !== 'admin') {
        admin.logout()
        return false
      }
      admin.admin = {
        id: json.data.id,
        name: json.data.name,
        role: '超级管理员',
        avatar: (json.data.name || 'A')[0]?.toUpperCase() || 'A',
        email: json.data.email
      }
      return true
    }
    admin.logout()
    return false
  } catch {
    admin.logout()
    return false
  }
}

let verifying = false
router.beforeEach(async (to) => {
  const admin = useAdminStore()

  // 公开页（登录页）直接放行
  if (to.meta.public) {
    return true
  }

  // 有 token → 真实验证（只验一次，后续命中缓存路径直接放行）
  if (admin.isLoggedIn && !verifying) {
    verifying = true
    const ok = await verifyToken()
    verifying = false
    if (!ok) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
    return true
  }

  if (!admin.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router