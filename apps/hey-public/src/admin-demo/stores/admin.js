import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/* AdminDemo：演示用，默认以模拟管理员自动登录，不调用真实服务器 */
const DEMO_ADMIN = {
  id: 'demo-admin',
  name: '演示管理员',
  role: '超级管理员',
  avatar: 'A',
  email: 'demo@hey19.xin',
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref('demo-token')
  const admin = ref({ ...DEMO_ADMIN })
  const loading = ref(false)

  const isLoggedIn = computed(() => true)

  async function login() {
    admin.value = { ...DEMO_ADMIN }
    token.value = 'demo-token'
    return { token: token.value, admin: admin.value }
  }

  function logout() {
    token.value = ''
    admin.value = null
  }

  return { token, admin, loading, isLoggedIn, login, logout }
})
